export const delay = (time) =>
  new Promise((resolve) => {
    setTimeout(resolve, time)
  })

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

export const five_year_age_groups = [
  makeSequence(0, 4),
  makeSequence(5, 9),
  makeSequence(10, 14),
  makeSequence(15, 19),
  makeSequence(20, 24),
  makeSequence(25, 29),
  makeSequence(30, 34),
  makeSequence(35, 39),
  makeSequence(40, 44),
  makeSequence(45, 49),
  makeSequence(50, 54),
  makeSequence(55, 59),
  makeSequence(60, 64),
  makeSequence(65, 69),
  makeSequence(70, 74),
  makeSequence(75, 79),
  makeSequence(80, 84),
  makeSequence(85, 89),
  makeSequence(90, 94),
  makeSequence(95, 100),
]

export const age_groups = getUniqueObjects([
  'all',
  ...five_year_age_groups,
  'NS',
])

export const download = async (page, file) => {
  await page.getByLabel('Export Results').check()
  await page.getByLabel('Show Totals').uncheck()
  await page.getByLabel('Show Zero Values').check()
  await waitUntilLoaded(page)

  const downloadPromise = page.waitForEvent('download')
  await page.click('#submit-button1')

  // Run the timeout check concurrently with the download
  await Promise.race([downloadPromise, checkForGatewayTimeout(page)])
    .then(async (result) => {
      if (result && typeof result !== 'string') {
        await result.saveAs(file)
      }
    })
    .catch((error) => {
      throw new Error(error.message)
    })
}

async function checkForGatewayTimeout(page) {
  while (true) {
    const h1 = await page.$('h1')
    if (h1) {
      const text = await h1.textContent()
      if (text?.includes('504 Gateway Time-out')) {
        throw new Error('Download failed due to 504 Gateway Time-out')
      }
    }
    await page.waitForTimeout(1000)
  }
}
