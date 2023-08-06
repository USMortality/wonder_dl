import { test } from '@playwright/test'
import * as fs from 'fs'
import * as https from 'https'
import { parse } from 'csv-parse'
import * as Minio from 'minio'

const s3Client = new Minio.Client({
  endPoint: process.env.AWS_DEFAULT_REGION + '.' + process.env.AWS_S3_ENDPOINT,
  accessKey: process.env.AWS_ACCESS_KEY_ID,
  secretKey: process.env.AWS_SECRET_ACCESS_KEY
})

test.use({ deviceScaleFactor: 2, viewport: { width: 700, height: 1200 } })

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

const getPopulationList = () => new Promise((resolve) => {
  const records = new Map();
  https.get('https://s3.mortality.watch/data/population/world.csv', csvResponse => {
    csvResponse.pipe(parse({ columns: true, delimiter: ',' }))
      .on('data', (row) => {
        records.set(row.iso3c, row.jurisdiction);
      })
      .on('end', () => {
        resolve(records)
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
  const population = await getPopulationList()

  await page.goto('https://www.mortality.watch/explorer')
  await page.evaluate(() => window.disableToast = true)

  // 52W SMA
  await page.locator('#chart-type-select').click()
  await page.keyboard.type('52')
  await page.keyboard.press('Enter');

  // ASMR
  await page.locator('#type-select').click()
  await page.keyboard.type('Crude Mortality Rate (CMR)')
  await page.keyboard.press('Enter');

  for (const iso of countries.cmr) {
    let country = population.get(iso)
    country = country === 'Deutschland' ? 'Germany' : country
    if (!country) throw new Error('No country name for iso3c found: ' + iso)

    // Country
    await page.locator('#country-select').click()
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.locator('#country-select > div > div.multiselect__tags > input')
      .fill(country)
    await page.keyboard.press('Enter');

    await page.locator('#country-select > div > div.multiselect__select').click()
    await saveChart(page, "cmr", iso)
  }

  await page.close()
})

test('Save 52W Mortality, ASMR', async ({ page }) => {
  const countries = await getCountryList()
  const population = await getPopulationList()

  await page.goto('https://www.mortality.watch/explorer')
  await page.evaluate(() => window.disableToast = true)

  // 52W SMA
  await page.locator('#chart-type-select').click()
  await page.keyboard.type('52')
  await page.keyboard.press('Enter');

  // ASMR
  await page.locator('#type-select').click()
  await page.keyboard.type('Age Std. Mortality Rate (ASMR)')
  await page.keyboard.press('Enter');

  for (const iso of countries.asmr) {
    let country = population.get(iso)
    country = country === 'Deutschland' ? 'Germany' : country
    if (!country) throw new Error('No country name for iso3c found: ' + iso)

    // Country
    await page.locator('#country-select').click()
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.locator('#country-select > div > div.multiselect__tags > input')
      .fill(country)
    await page.keyboard.press('Enter');

    await page.locator('#country-select > div > div.multiselect__select').click()

    await saveChart(page, "asmr", iso)
  }

  await page.close()
})