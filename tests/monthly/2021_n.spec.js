import { test } from '@playwright/test'
import { makeSequence, waitUntilLoaded } from '../common.js'

const dl = async (page, ageGroups) => {
  await page.goto('https://wonder.cdc.gov/mcd-icd10-provisional.html')
  await page.getByRole('button', { name: 'I Agree' }).click()

  await page.locator('#SB_1').selectOption('D176.V9-level1') // group by: state
  await page.locator('#SB_2').selectOption('D176.V1-level2') // group by: month

  await waitUntilLoaded(page)
  await page.locator('#RO_ageD176\\.V52').click()
  await waitUntilLoaded(page)
  await page.locator('#SD176\\.V52').selectOption(ageGroups) // select ages
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
  const ag = Array.isArray(ageGroups)
    ? `${ageGroups[0]}-${ageGroups[ageGroups.length - 1]}` : ageGroups
  await download.saveAs(`./out/monthly/us_states_2021-n_${ag}.txt`)
}

test('Download CDC Wonder Data 2021-n [10y groups].', async ({ page }) => {
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

test('Download CDC Wonder Data 2021-n [5y groups].', async ({ page }) => {
  await dl(page, makeSequence(0, 4))
  await dl(page, makeSequence(5, 9))
  await dl(page, makeSequence(10, 14))
  await dl(page, makeSequence(15, 19))
  await dl(page, makeSequence(20, 24))
  await dl(page, makeSequence(25, 29))
  await dl(page, makeSequence(30, 34))
  await dl(page, makeSequence(35, 39))
  await dl(page, makeSequence(40, 44))
  await dl(page, makeSequence(45, 49))
  await dl(page, makeSequence(50, 54))
  await dl(page, makeSequence(55, 59))
  await dl(page, makeSequence(60, 64))
  await dl(page, makeSequence(65, 69))
  await dl(page, makeSequence(70, 74))
  await dl(page, makeSequence(75, 79))
  await dl(page, makeSequence(80, 84))
  await dl(page, makeSequence(85, 89))
  await dl(page, makeSequence(90, 94))
  await dl(page, makeSequence(95, 100))
  await dl(page, 'NS')
  await page.close()
})
