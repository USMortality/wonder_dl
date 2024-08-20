import { test } from '@playwright/test'
import * as fs from 'fs/promises'
import * as Minio from 'minio'
import { waitUntilLoaded } from './common'
import { readFileSync } from 'fs'

const s3Client = new Minio.Client({
  endPoint: process.env.AWS_DEFAULT_REGION + '.' + process.env.AWS_S3_ENDPOINT,
  accessKey: process.env.AWS_ACCESS_KEY_ID,
  secretKey: process.env.AWS_SECRET_ACCESS_KEY,
})

test.use({ deviceScaleFactor: 2, viewport: { width: 700, height: 1200 } })

const saveChart = async (page, type, iso) => {
  const canvas = await page.locator('canvas')
  const image = await canvas.evaluate((x) => x.toDataURL().substring(22))
  const file = `${iso}.png`
  const filepath = `./out/${type}/${file}`

  try {
    await fs.mkdir(`./out/${type}`, { recursive: true })
    await fs.writeFile(filepath, image, 'base64')
    console.log(`File saved: ${filepath}`)

    await s3Client.fPutObject(
      'charts',
      `mortality/${type}/${file}`,
      filepath,
      {}
    )
    console.log(`File uploaded to S3: mortality/${type}/${file}`)
  } catch (err) {
    console.error(`Error in saveChart for ${iso}:`, err)
    throw err
  }
}

const countries = JSON.parse(readFileSync('./out/countries.json'))

test.describe('Save Mortality Charts', () => {
  countries.cmr.forEach((iso) => {
    test(`Save 52W Mortality, CMR [${iso}]`, async ({ browser }) => {
      const page = await browser.newPage()
      try {
        const url = `https://www.mortality.watch/explorer/?c=${iso}&t=cmr&ct=weekly_52w_sma&v=2`
        console.log(`Navigating to: ${url}`)
        await page.goto(url)
        await waitUntilLoaded(page)
        await saveChart(page, 'cmr', iso)
      } finally {
        await page.close()
      }
    })
  })

  countries.asmr.forEach((iso) => {
    test(`Save 52W Mortality, ASMR [${iso}]`, async ({ browser }) => {
      const page = await browser.newPage()
      try {
        const url = `https://www.mortality.watch/explorer/?c=${iso}&t=asmr&ct=weekly_52w_sma&v=2`
        console.log(`Navigating to: ${url}`)
        await page.goto(url)
        await waitUntilLoaded(page)
        await saveChart(page, 'asmr', iso)
      } finally {
        await page.close()
      }
    })
  })
})
