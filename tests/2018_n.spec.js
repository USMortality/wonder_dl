import { test } from '@playwright/test'
import { age_groups, download, waitUntilLoaded } from './common.js'
import { existsSync } from 'fs'

const dl = async (page, jurisdiction, period, ageGroups, file) => {
  await page.goto('https://wonder.cdc.gov/mcd-icd10-provisional.html')
  await page.getByRole('button', { name: 'I Agree' }).click()

  if (period == 'year') {
    await page.locator('#SB_1').selectOption('D176.V1-level1') // group by: year
  } else {
    await page.locator('#SB_1').selectOption('D176.V1-level2') // group by: month
  }
  if (jurisdiction === 'usa-state') {
    await page.locator('#SB_2').selectOption('D176.V9-level1') // group by: state
  }
  await waitUntilLoaded(page)

  if (ageGroups !== 'all') {
    await page.locator('#RO_ageD176\\.V52').click() // single ages
    await waitUntilLoaded(page)
    await page.locator('#SD176\\.V52').selectOption(ageGroups) // select ages
    await waitUntilLoaded(page)
  }

  await download(page, file)
}

for (const jurisdiction of ['usa', 'usa-state']) {
  for (const period of ['year', 'month']) {
    for (const ag of age_groups) {
      const ag_str = Array.isArray(ag) ? `${ag.at(0)}-${ag.at(-1)}` : ag
      const file = `./out/${jurisdiction}_${period}_${ag_str}_2018_n.txt`
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