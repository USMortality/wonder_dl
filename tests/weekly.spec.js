import { test } from '@playwright/test'
import { age_groups, download, makeSequence, waitUntilLoaded } from './common.js'
import { existsSync } from 'fs'

const START_YEAR = 2018
const TRANCHE_SIZE = 3
const currentYear = new Date().getFullYear()
const year_tranches = []
for (let y = START_YEAR; y <= currentYear; y += TRANCHE_SIZE) {
  year_tranches.push(makeSequence(y, Math.min(y + TRANCHE_SIZE - 1, currentYear)))
}

const dl = async (page, jurisdiction, ageGroups, years, file) => {
  await page.goto('https://wonder.cdc.gov/mcd-icd10-provisional.html')
  await page.getByRole('button', { name: 'I Agree' }).click()

  if (jurisdiction === 'usa-state') {
    await page.locator('#SB_2').selectOption('D176.V9-level1')
  }

  await page.click('#RO_datesMMWR')
  // group by: week
  await page.locator('#SB_1').selectOption('D176.V100-level2')

  await waitUntilLoaded(page)

  // Select MMWR year tranche (element is hidden, use evaluate to set directly)
  await page.evaluate((yrs) => {
    const select = document.querySelector('#codes-D176\\.V100')
    for (const opt of select.options) {
      opt.selected = yrs.includes(opt.value)
    }
    select.dispatchEvent(new Event('change'))
  }, years)
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
  for (let i = 0; i < age_groups.length; i++) {
    const ag = age_groups[i]
    const ag_str = Array.isArray(ag) ? `${ag.at(0)}-${ag.at(-1)}` : ag
    const ags = ['all'].includes(ag)
      ? ag
      : [].concat(
          ...age_groups.slice(1, i),
          ...age_groups.slice(i + 1, age_groups.length - 1)
        )

    for (const years of year_tranches) {
      const tranche = `${years[0]}-${years.at(-1)}`
      const file = `./data_wonder/weekly/${jurisdiction}_${ag_str}_${tranche}.txt`
      if (existsSync(file)) continue

      test(
        `Download CDC Wonder Data by: weekly/${jurisdiction}/${tranche}: ` +
          `Age Groups: ${Array.isArray(ag) ? ag.join(', ') : ag}`,
        async ({ page }) => {
          await dl(page, jurisdiction, ags, years, file)
          await page.close()
        }
      )
    }
  }
}
