import { test } from '@playwright/test'
import { makeSequence, waitUntilLoaded } from '../common.js'

const dl = async (page) => {
  await page.goto('https://wonder.cdc.gov/mcd-icd10-provisional.html')
  await page.getByRole('button', { name: 'I Agree' }).click()

  await page.locator('#SB_1').selectOption('D176.V9-level1') // group by: state
  await page.locator('#SB_2').selectOption('D176.V1-level2') // group by: month
  await waitUntilLoaded(page)

  await page.locator('select#codes-D176\\.V1').selectOption('2023') // Select partial 2023
  await waitUntilLoaded(page)
  const yearOptions = await page.evaluate(() =>
    Array.from(document.querySelectorAll('select#codes-D176\\.V1 option'))
      .map(el => {
        if (!el.textContent.includes('partial')) return el.value
      }).filter(el => el)
  )
  await page.locator('#finder-buttons-D176\\.V1 > input:nth-child(1)').dblclick() // Open 2023
  await waitUntilLoaded(page)
  const dateOptions = await page.evaluate(() =>
    Array.from(document.querySelectorAll('select#codes-D176\\.V1 option'))
      .map(el => {
        if (el.value.includes('/') && !el.textContent.includes('partial')) return el.value
      }).filter(el => el)
  )
  const dates = makeSequence(2021, yearOptions[yearOptions.length - 1])
    .concat(dateOptions)
  await page.locator('select#codes-D176\\.V1').selectOption(dates) // select months of latest year
  await waitUntilLoaded(page)
  await page.click('#submit-button1') // submit form
  await page.waitForSelector('#wonderform > table > tbody > tr > td > div.wonder-content > div > table.response-form')
  await waitUntilLoaded(page)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export' }).dblclick()
  const download = await downloadPromise
  await download.saveAs('./out/monthly/us_states_2021-n_all.txt')
}

test('Download CDC Wonder Data 2021-n [all].', async ({ page }) => {
  await dl(page)
  await page.close()
})
