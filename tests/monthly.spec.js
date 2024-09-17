import { test } from '@playwright/test'
import { download, makeSequence, waitUntilLoaded } from './common.js'
import { existsSync } from 'fs'

import states from '../data_wonder/states.json'
import { TestTimingUtility } from './testTimingUtility.js'

const url_1 = 'https://wonder.cdc.gov/mcd-icd10.html'
const url_2 = 'https://wonder.cdc.gov/mcd-icd10-provisional.html'

const dl = async (
  page,
  url,
  prefix,
  isNational,
  states,
  file,
  year,
  by_age
) => {
  await page.goto(url)
  await page.getByRole('button', { name: 'I Agree' }).click()

  // group by: month
  await page.locator('#SB_1').selectOption(`${prefix}.V1-level2`)

  if (by_age) {
    // group by: single year ages
    await page.locator('#SB_2').selectOption(`${prefix}.V52`)
  } else {
    // group by: states
    await page.locator('#SB_2').selectOption(`${prefix}.V9-level1`)
  }

  if (!isNational) {
    // Select State
    await page.locator(`#codes-${prefix}\\.V9`).selectOption(states)
    await waitUntilLoaded(page)
  }

  // Select year
  await page.locator(`#codes-${prefix}\\.V1`).selectOption(year)

  await download(page, file)
}

// ETA
const testTimingUtility = new TestTimingUtility(10)
test.beforeEach(async ({}, testInfo) =>
  testTimingUtility.startTest(testInfo.title)
)

test.afterEach(async ({}, testInfo) =>
  testTimingUtility.completeTest(testInfo.title, testInfo.retry)
)

async function downloadData(by_age, year, type, file, state = null) {
  const name = `Download CDC Wonder Data by: ${by_age}/${year}${
    state ? '/' + state : ''
  }: `

  testTimingUtility.addTest()
  test(name, async ({ page }) => {
    await dl(
      page,
      type === '1999_2020' ? url_1 : url_2,
      type === '1999_2020' ? 'D77' : 'D176',
      state === 'all',
      states.filter((x) => x !== state && x !== 'all'),
      file,
      year,
      by_age === 'age'
    )
    await page.close()
  })
}

// Combined loop for age-specific data and totals
for (let year of makeSequence(1999, 2024)) {
  const type = year <= 2020 ? '1999_2020' : '2021_n'

  // For age-specific data
  let by_age = 'age'
  for (let state of states) {
    const file = `./data_wonder/monthly/${by_age}/${year}/${state}.txt`
    if (!existsSync(file)) {
      downloadData(by_age, year, type, file, state)
    }
  }

  // For totals
  by_age = 'all'
  const file = `./data_wonder/monthly/${by_age}/${year}.txt`
  if (!existsSync(file)) {
    downloadData(by_age, year, type, file)
  }
}
