import { test } from '@playwright/test'
import { waitUntilLoaded } from '../common.js'

const dl = async (page) => {
  await page.goto('https://wonder.cdc.gov/mcd-icd10.html')
  await page.getByRole('button', { name: 'I Agree' }).click()

  await page.locator('#SB_1').selectOption('D77.V1-level2') // group by: month
  await waitUntilLoaded(page)

  await page.click('#submit-button1') // submit form
  await page.waitForSelector('#wonderform > table > tbody > tr > td > div.wonder-content > div > table.response-form')
  await waitUntilLoaded(page)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export' }).dblclick()
  const download = await downloadPromise
  await download.saveAs('./out/monthly/us_1999-2020_all.txt')
}

test('Download CDC Wonder Data 1999-2020 [all].', async ({ page }) => {
  await dl(page)
  await page.close()
})
