import { TwitterApi } from 'twitter-api-v2'
import * as fs from 'fs'
import * as https from 'https'
import * as csv from 'csv'
import * as Minio from 'minio'
import { stringify } from 'csv-stringify/sync';

const s3Client = new Minio.Client({
  endPoint: process.env.AWS_DEFAULT_REGION + '.' + process.env.AWS_S3_ENDPOINT,
  accessKey: process.env.AWS_ACCESS_KEY_ID,
  secretKey: process.env.AWS_SECRET_ACCESS_KEY
})
const url_base = "https://s3.mortality.watch/charts/mortality/cmr/"

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET
})

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        res.pipe(fs.createWriteStream(filepath))
          .on('error', reject)
          .once('close', () => resolve(filepath))
      } else {
        res.resume()
        reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`))
      }
    })
  })
}

const downloadCsv = url => new Promise((resolve) => {
  https.get(url, (res) => {
    const result = []
    res.pipe(csv.parse({ columns: true }))
      .on('data', (data) => result.push(data))
      .on('end', () => resolve(result))
  })
})
const tweet = async (iso3c, jurisdiction, max) => {
  await downloadImage(`${url_base}${iso3c}.png`, './out/twitter.png')
  const message = `📊 Mortality data for ${jurisdiction} just updated!\n` +
    `🗓️ Data now available through ${max}.\n` +
    `🔗 https://mortality.watch/explorer/?t=cmr&ct=weekly_52w_sma&v=2&c=${iso3c}\n` +
    `#️⃣ #COVID #COVID19 #Vaccine #CovidVaccine #mRNA`
  const mediaId = await client.v1.uploadMedia('./out/twitter.png')
  await client.v2.tweet(message, { media: { media_ids: [mediaId] } })
}

fs.mkdirSync('./out', { recursive: true })

const meta = await downloadCsv('https://s3.mortality.watch/data/mortality/world_meta.csv')
const data_old = await downloadCsv('https://s3.mortality.watch/data/mortality/world_max_date.csv')
const data_ytd = await downloadCsv('https://s3.mortality.watch/data/mortality/world_ytd.csv')

// Find iso - jurisdictions
const jurisdictions = {}
for (const row of meta) jurisdictions[row.iso3c] = row.jurisdiction

// Find last date
const df_old = {}
for (const row of data_old) if (!df_old[row.iso3c]) df_old[row.iso3c] = row.max

// Find current max date
const df = {}
for (const row of data_ytd) {
  if (!df[row.iso3c]) df[row.iso3c] = []
  df[row.iso3c].push(row.max_date_cmr)
}
for (const [iso3c, date] of Object.entries(df)) {
  df[iso3c] = date[date.length - 1]
}

let tweets = 0
for (const [iso3c, date] of Object.entries(df)) {
  if (iso3c.length > 3) continue
  const val_old = df_old[iso3c]
  if (!val_old || val_old !== date) {
    console.log(`changed: ${iso3c}, date_old: ${val_old}, date_new: ${date}`)
    tweet(iso3c, jurisdictions[iso3c], date)
    for (const row of data_old) if (row.iso3c === iso3c) row.max = date
    await sleep(15 * 60 * 1000)
    tweets++
  }
}

const writeCsv = async (obj, path) => new Promise((resolve) => {
  if (fs.existsSync(path)) fs.unlinkSync(path)
  const data = stringify(obj, { header: true })
  fs.writeFileSync(path, data)
  resolve()
})

console.log(`Updated tweets: ${tweets}`)

// Only update when we have new tweets.
if (tweets > 0) {
  const path = "./out/world_max_date.csv"
  await writeCsv(data_old, path)
  s3Client.fPutObject(
    'data',
    'mortality/world_max_date.csv',
    path,
    {},
    err => {
      if (err) return console.log(err)
      console.log('uploaded')
    }
  )
}