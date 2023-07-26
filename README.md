# Download CDC Wonder Data Deaths

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
