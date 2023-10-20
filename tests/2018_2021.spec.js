import { test } from '@playwright/test'
import { age_groups, download, makeSequence, twenty_year_age_groups, waitUntilLoaded } from './common.js'
import { existsSync } from 'fs'

const YEARS = makeSequence(2018, 2021)

const dl = async (page, jurisdiction, period, ageGroups, file) => {
  await page.goto('https://wonder.cdc.gov/mcd-icd10-provisional.html')
  await page.getByRole('button', { name: 'I Agree' }).click()

  if (period == 'year') {
    // group by: year
    await page.locator('#SB_1').selectOption('D176.V1-level1')
  } else if (period == 'month') {
    // group by: month
    await page.locator('#SB_1').selectOption('D176.V1-level2')
  } else {
    await page.click('#RO_datesMMWR')
    // group by: week
    await page.locator('#SB_1').selectOption('D176.V100-level2')
  }

  if (jurisdiction === 'usa-state') {
    // group by: state
    await page.locator('#SB_2').selectOption('D176.V9-level1')
  }
  await waitUntilLoaded(page)

  if (ageGroups !== 'all') {
    await page.locator('#RO_ageD176\\.V52').click() // single ages
    await waitUntilLoaded(page)
    await page.locator('#SD176\\.V52').selectOption(ageGroups) // select ages
    await waitUntilLoaded(page)
  }

  // select years
  await page.locator('#codes-D176\\.V1').selectOption(YEARS)

  await download(page, file)
}

for (const jurisdiction of ['usa', 'usa-state']) {
  for (const period of ['year', 'month', 'week']) {
    for (const ag of age_groups) {
      // Weekly only process 20y age groups.
      if (period === 'week' && !twenty_year_age_groups.includes(ag)) continue
      const ag_str = Array.isArray(ag) ? `${ag.at(0)}-${ag.at(-1)}` : ag
      const file = `./out/${jurisdiction}_${period}_${ag_str}_` +
        `${YEARS.at(0)}_${YEARS.at(-1)}.txt`
      if (existsSync(file)) continue
      test(
        `Download CDC Wonder Data by: ${jurisdiction}/${period}/10y/2018-n: ` +
        `Age Groups: ${Array.isArray(ag) ? ag.join(', ') : ag}`,
        async ({ page }) => {
          await dl(page, jurisdiction, period, ag, file)
          await page.close()
        }
      )
    }
  }
}