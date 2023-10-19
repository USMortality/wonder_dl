# Download CDC Wonder Data Deaths by state, month, 10y age-groups

## Installation
```
npm i
```

## Run
Files will be downloaded to `~/Downloads/.`
```
npx playwright test
```

## Convert downloaded txt files to csv
```
find ./out -name '*.txt' -exec ./tools/wonderTxt2Csv.sh {} \;
```

## File Format
`<jurisdiction>_<period>_<age_group>_<date_from>_<date_to>.<ext>`

- jurisdiction: `[usa, usa-state, usa-county]`
- period: `[year, month, week]`
- age_group: `[all, 80y, 40y, 20y, 10y]`
- date_from: year, e.g. 1999
- date_to: year or n, for latest
- ext:
  - tests: `.spec.js`
  - output: `.txt` and `.csv`

### Age Groups:
- all
- 80y: `[0-39, 40+]`
- 40y: `[0-39, 40-79, 80+]`
- 20y: `[0-19, 20-39, 40-59, 60-79, 80+]`
- 10y: `[0-9, 10-19, 20-29, 30-39, 40-49, 50-59, 60-69, 70-79, 80-89, 90+]`
