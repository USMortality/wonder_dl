import * as https from 'https'
import { parse } from 'csv-parse'
import { writeFileSync } from 'fs'

const getCountryList = () => new Promise((resolve) => {
  const cmr = new Set()
  const asmr = new Set()
  https.get('https://s3.mortality.watch/data/mortality/world_meta.csv',
    csvResponse => {
      csvResponse.pipe(parse({ columns: true, delimiter: ',' }))
        .on('data', (row) => {
          cmr.add(row.iso3c)
          if (row.age_groups.split(', ').length > 1) asmr.add(row.iso3c)
        })
        .on('end', () => {
          resolve({ cmr: Array.from(cmr), asmr: Array.from(asmr) })
        })
    }).end()
})

const countries = await getCountryList()

writeFileSync('out/countries.json', JSON.stringify(countries, null, 2))
