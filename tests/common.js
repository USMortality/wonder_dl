export const delay = (time) => new Promise((resolve) => { setTimeout(resolve, time) })

export const makeSequence = (start, end) => {
  const result = []
  for (let i = start; i <= end; i++) result.push(i.toString())
  return result
}

export const waitUntilLoaded = async (page) => {
  await page.waitForFunction(() => document.readyState === 'complete')
  await delay(1000)
}

export const getUniqueObjects = (array) => {
  const uniqueJSONs = new Set()
  const uniqueObjects = []

  for (const object of array) {
    const json = JSON.stringify(object)

    if (!uniqueJSONs.has(json)) {
      uniqueJSONs.add(json)
      uniqueObjects.push(object)
    }
  }

  return uniqueObjects
}

export const ten_year_age_groups = [
  makeSequence(0, 9),
  makeSequence(10, 19),
  makeSequence(20, 29),
  makeSequence(30, 39),
  makeSequence(40, 49),
  makeSequence(50, 59),
  makeSequence(60, 69),
  makeSequence(70, 79),
  makeSequence(80, 89),
  makeSequence(90, 100)
]

export const age_groups = getUniqueObjects([
  'all',
  ...ten_year_age_groups,
  'NS']
)

export const download = async (page, file) => {
  await page.check('#export-option')
  await page.check('#CO_show_zeros')
  await page.check('#CO_show_suppressed')
  await waitUntilLoaded(page)

  const downloadPromise = page.waitForEvent('download')
  await page.click('#submit-button1')
  const download = await downloadPromise
  await download.saveAs(file)
}
