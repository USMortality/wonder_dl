import { test } from '@playwright/test'
import * as fs from 'fs'
import * as Minio from 'minio'
import { waitUntilLoaded } from './common'
import { readFileSync } from 'fs'

const s3Client = new Minio.Client({
  endPoint: process.env.AWS_DEFAULT_REGION + '.' + process.env.AWS_S3_ENDPOINT,
  accessKey: process.env.AWS_ACCESS_KEY_ID,
  secretKey: process.env.AWS_SECRET_ACCESS_KEY
})

test.use({ deviceScaleFactor: 2, viewport: { width: 700, height: 1200 } })

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

const countries = JSON.parse(readFileSync('./out/countries.json'))

for (const iso of countries.cmr) {
  test(`Save 52W Mortality, CMR [${iso}]`, async ({ page }) => {
    await page.evaluate(() => window.disableToast = true)
    await page.goto(`https://www.mortality.watch/explorer/?c=${iso}&t=cmr&ct=weekly_52w_sma&v=2`)
    await waitUntilLoaded(page)
    await saveChart(page, "cmr", iso)
    await page.close()
  })
}

for (const iso of countries.asmr) {
  test(`Save 52W Mortality, ASMR [${iso}]`, async ({ page }) => {
    await page.evaluate(() => window.disableToast = true)
    await page.goto(`https://www.mortality.watch/explorer/?c=${iso}&t=asmr&ct=weekly_52w_sma&v=2`)
    await waitUntilLoaded(page)
    await saveChart(page, "asmr", iso)
    await page.close()
  })
}
