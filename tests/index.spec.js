import { test } from '@playwright/test'
import * as fs from 'fs'
import * as https from 'https'
import { parse } from 'csv-parse'
import * as Minio from 'minio'
import { waitUntilLoaded } from './common'

const s3Client = new Minio.Client({
  endPoint: process.env.AWS_DEFAULT_REGION + '.' + process.env.AWS_S3_ENDPOINT,
  accessKey: process.env.AWS_ACCESS_KEY_ID,
  secretKey: process.env.AWS_SECRET_ACCESS_KEY
})

test.use({ deviceScaleFactor: 2, viewport: { width: 700, height: 1200 } })

const wait = ms => new Promise(r => setTimeout(r, ms));

const retryOperation = (operation, delay, retries, ...args) => new Promise((resolve, reject) => {
  return operation(...args)
    .then(resolve)
    .catch((reason) => {
      if (retries > 0) {
        return wait(delay)
          .then(retryOperation.bind(null, operation, delay, retries - 1))
          .then(resolve)
          .catch(reject);
      }
      return reject(reason);
    });
});

const getCountryList = () => new Promise((resolve) => {
  const cmr = new Set();
  const asmr = new Set();
  https.get('https://s3.mortality.watch/data/mortality/world_meta.csv', csvResponse => {
    csvResponse.pipe(parse({ columns: true, delimiter: ',' }))
      .on('data', (row) => {
        cmr.add(row.iso3c)
        if (row.age_groups.split(', ').length > 1) asmr.add(row.iso3c)
      })
      .on('end', () => {
        resolve({ cmr, asmr })
      })
  }).end()
})

const saveChart = async (page, type, iso) => {
  const canvas = await page.locator('canvas')
  const image = await canvas.evaluate(x => x.toDataURL().substring(22))
  const file = `${iso}.png`
  const filepath = `./out/${type}/${file}`
  return new Promise((resolve, reject) => {
    fs.mkdir(`./out/${type}`, { recursive: true }, (err) => {
      fs.writeFile(filepath, image, 'base64', (err) => {
        if (err) console.log(err)
        s3Client.fPutObject('charts', `mortality/${type}/${file}`, filepath, {}, err => {
          if (err) return reject(err)
          resolve()
        })
      })
    })
  })
}

test('Save 52W Mortality, CMR', async ({ page }) => {
  const countries = await getCountryList()
  await page.evaluate(() => window.disableToast = true)

  for (const iso of countries.cmr) {
    console.log(iso)
    await page.goto(`https://www.mortality.watch/explorer/?c=${iso}&t=cmr&ct=weekly_52w_sma&v=2`)
    await waitUntilLoaded(page)
    await page.waitForSelector('canvas')
    retryOperation(saveChart, 1000, 5, page, "cmr", iso)
      .then(console.log)
      .catch(console.log)
  }

  await page.close()
})

test('Save 52W Mortality, ASMR', async ({ page }) => {
  const countries = await getCountryList()
  await page.evaluate(() => window.disableToast = true)

  for (const iso of countries.asmr) {
    console.log(iso)
    await page.goto(`https://www.mortality.watch/explorer/?c=${iso}&t=asmr&ct=weekly_52w_sma&v=2`)
    await waitUntilLoaded(page)
    await page.waitForSelector('canvas')
    retryOperation(saveChart, 1000, 5, page, "cmr", iso)
      .then(console.log)
      .catch(console.log)
  }

  await page.close()
})
