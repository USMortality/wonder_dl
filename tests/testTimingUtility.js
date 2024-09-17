export class TestTimingUtility {
  constructor(workers) {
    this.totalNumberOfTests = 0
    this.completedTests = 0
    this.testStartTimes = {}
    this.totalDuration = 0
    this.workers = workers
  }

  addTest() {
    this.totalNumberOfTests++
  }

  startTest(testTitle) {
    this.testStartTimes[testTitle] = Date.now()
  }

  completeTest(testTitle, retry) {
    if (retry > 0) this.totalNumberOfTests++

    const testDuration = Date.now() - this.testStartTimes[testTitle]
    delete this.testStartTimes[testTitle]

    this.totalDuration += testDuration
    const averageDuration = this.totalDuration / ++this.completedTests
    const remainingTests = this.totalNumberOfTests - this.completedTests

    // Adjust the remaining time calculation based on the number of workers
    const remainingTimeInSeconds = Math.ceil(
      (averageDuration * remainingTests) / this.workers / 1000
    )

    const remainingTimeFormatted = `${Math.floor(
      remainingTimeInSeconds / 3600
    )}h ${Math.floor((remainingTimeInSeconds % 3600) / 60)}m`

    console.log(`ETA: ${remainingTimeFormatted}`)
  }
}
