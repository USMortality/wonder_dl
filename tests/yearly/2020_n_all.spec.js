import { test } from '@playwright/test'
import { makeSequence, waitUntilLoaded } from './../common.js'

const dl = async (page) => {
  await page.goto('https://wonder.cdc.gov/mcd-icd10-provisional.html')
  await page.getByRole('button', { name: 'I Agree' }).click()

  await page.locator('#SB_1').selectOption('D176.V9-level1') // group by: state
  await page.locator('#SB_2').selectOption('D176.V1-level1') // group by: year
  await waitUntilLoaded(page)

  await page.click('#submit-button1') // submit form
  await page.waitForSelector('#wonderform > table > tbody > tr > td > div.wonder-content > div > table.response-form')
  await waitUntilLoaded(page)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export' }).dblclick()
  const download = await downloadPromise
  await download.saveAs('./out/yearly/us_states_2020-n_all.txt')
}

test('Download CDC Wonder Data 2020-n [all].', async ({ page }) => {
  await dl(page)
  await page.close()
})
