import { test } from '@playwright/test'
import { makeSequence, waitUntilLoaded } from '../common.js'

const dl = async (page, s) => {
  await page.goto('https://wonder.cdc.gov/mcd-icd10-provisional.html')
  await page.getByRole('button', { name: 'I Agree' }).click()

  await page.locator('#SB_1').selectOption('D176.V9-level2') // group by: county
  await page.locator('#SB_2').selectOption('D176.V100-level2') // group by: mmwr week
  await waitUntilLoaded(page)

  await page.locator('select#codes-D176\\.V9').selectOption(s) // Select individual state
  await page.locator('#RO_datesMMWR').check(); // select weekly
  await waitUntilLoaded(page)

  await page.click('#submit-button1') // submit form
  await page.waitForSelector('#wonderform > table > tbody > tr > td > div.wonder-content > div > table.response-form')
  await waitUntilLoaded(page)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export' }).dblclick()
  const download = await downloadPromise
  await download.saveAs(`./out/weekly/us_county_${s}_2018-n_all.txt`)
}

test('Download CDC Wonder Data 2018-n [all].', async ({ page }) => {
  for (const s of makeSequence(20, 56)) {
    if (['3', '7', '14', '43', '52'].includes(s)) continue
    console.log(`${s} of 56`)
    await dl(page, s.padStart(2, '0'))
  }
  await page.close()
})
