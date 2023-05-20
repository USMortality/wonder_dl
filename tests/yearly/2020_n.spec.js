import { test } from '@playwright/test'
import { makeSequence, waitUntilLoaded } from './../common.js'

const dl = async (page, ageGroups) => {
  await page.goto('https://wonder.cdc.gov/mcd-icd10-provisional.html')
  await page.getByRole('button', { name: 'I Agree' }).click()

  await page.locator('#SB_1').selectOption('D176.V9-level1') // group by: state
  await page.locator('#SB_2').selectOption('D176.V1-level1') // group by: month

  await waitUntilLoaded(page)
  await page.locator('#RO_ageD176\\.V52').click()
  await waitUntilLoaded(page)
  await page.locator('#SD176\\.V52').selectOption(ageGroups) // select ages
  await waitUntilLoaded(page)

  await page.click('#submit-button1') // submit form
  await page.waitForSelector('#wonderform > table > tbody > tr > td > div.wonder-content > div > table.response-form')
  await waitUntilLoaded(page)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export' }).dblclick()
  const download = await downloadPromise
  const ag = Array.isArray(ageGroups)
    ? `${ageGroups[0]}-${ageGroups[ageGroups.length - 1]}` : ageGroups
  await download.saveAs(`./out/yearly/us_states_2020-n_${ag}.txt`)
}

test('Download CDC Wonder Data 2020-n [10y groups].', async ({ page }) => {
  await dl(page, makeSequence(0, 9))
  await dl(page, makeSequence(10, 19))
  await dl(page, makeSequence(20, 29))
  await dl(page, makeSequence(30, 39))
  await dl(page, makeSequence(40, 49))
  await dl(page, makeSequence(50, 59))
  await dl(page, makeSequence(60, 69))
  await dl(page, makeSequence(70, 79))
  await dl(page, makeSequence(80, 89))
  await dl(page, makeSequence(90, 100))
  await dl(page, 'NS')
  await page.close()
})
