import { test } from '@playwright/test'
import { download, waitUntilLoaded } from './common.js'
import { existsSync } from 'fs'

import states from '../data_wonder/states.json'
import { TestTimingUtility } from './testTimingUtility.js'

const url_1 = 'https://wonder.cdc.gov/mcd-icd10.html'
const url_2 = 'https://wonder.cdc.gov/mcd-icd10-provisional.html'

const dl = async (page, url, prefix, isNational, state, file) => {
  await page.goto(url)
  await page.getByRole('button', { name: 'I Agree' }).click()

  // group by: year
  await page.locator('#SB_1').selectOption(`${prefix}.V1-level1`)

  // group by: single year ages
  await page.locator('#SB_2').selectOption(`${prefix}.V52`)

  if (!isNational) {
    // Select State
    await page.locator(`#codes-${prefix}\\.V9`).selectOption(state)
    await waitUntilLoaded(page)
  }

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

for (let type of ['1999_2020', '2021_n']) {
  for (let state of states) {
    const file = `./data_wonder/yearly/${type}/${state}.txt`
    if (existsSync(file)) continue
    const name = `Download CDC Wonder Data by: ${type}/${state}: `
    testTimingUtility.addTest()
    test(name, async ({ page }) => {
      await dl(
        page,
        type === '1999_2020' ? url_1 : url_2,
        type === '1999_2020' ? 'D77' : 'D176',
        state === 'all',
        state,
        file
      )
      await page.close()
    })
  }
}
