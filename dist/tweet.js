import { TwitterApi } from 'twitter-api-v2';
import * as fs from 'fs';
import * as https from 'https';
import * as csv from 'csv';
import * as Minio from 'minio';
import { stringify } from 'csv-stringify/sync';
import { program } from 'commander';
program.option('-r, --reset');
program.option('-t, --test');
program.parse();
const options = program.opts();
let _s3Client = undefined;
const s3Client = () => {
    if (!process.env.AWS_ACCESS_KEY_ID) {
        console.warn('KEYS MISING');
        return {
            fPutObject: (...args) => {
                console.log('fPutObject');
            },
        };
    }
    if (!_s3Client)
        _s3Client = new Minio.Client({
            endPoint: process.env.AWS_DEFAULT_REGION + '.' + process.env.AWS_S3_ENDPOINT,
            accessKey: process.env.AWS_ACCESS_KEY_ID,
            secretKey: process.env.AWS_SECRET_ACCESS_KEY,
        });
    return _s3Client;
};
let _twitterClient = undefined;
const twitterClient = () => {
    if (!process.env.TWITTER_API_KEY) {
        console.warn('KEYS MISING');
        return {
            v1: {
                uploadMedia: (...args) => {
                    console.log('uploadMedia');
                },
            },
            v2: {
                tweet: (...args) => {
                    console.log('tweet');
                },
            },
        };
    }
    if (!_twitterClient)
        _twitterClient = new TwitterApi({
            appKey: process.env.TWITTER_API_KEY,
            appSecret: process.env.TWITTER_API_SECRET,
            accessToken: process.env.TWITTER_ACCESS_TOKEN,
            accessSecret: process.env.TWITTER_ACCESS_SECRET,
        });
    return _twitterClient;
};
const url_base = 'https://s3.mortality.watch/charts/mortality/cmr/';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const downloadImage = (url, filepath) => new Promise((resolve, reject) => {
    https.get(url, (res) => {
        if (res.statusCode === 200) {
            res
                .pipe(fs.createWriteStream(filepath))
                .on('error', reject)
                .once('close', () => resolve(filepath));
        }
        else {
            res.resume();
            reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));
        }
    });
});
const downloadCsv = (url) => new Promise((resolve) => {
    https.get(url, (res) => {
        const result = [];
        res
            .pipe(csv.parse({ columns: true }))
            .on('data', (data) => result.push(data))
            .on('end', () => resolve(result));
    });
});
const tweet = async (iso3c, jurisdiction, max) => {
    if (iso3c.startsWith('USA-') || iso3c.startsWith('DEU-'))
        return;
    console.log(`Tweeting for ${jurisdiction}...`);
    await downloadImage(`${url_base}${iso3c}.png`, './out/twitter.png');
    const message = `📊 Mortality data for ${jurisdiction} just updated!\n` +
        `🗓️ Data now available through ${max}.\n` +
        `🔗 https://mortality.watch/explorer/?t=cmr&ct=weekly_52w_sma&v=2&c=` +
        `${iso3c}\n` +
        `#️⃣ #COVID #COVID19 #Vaccine #CovidVaccine #mRNA`;
    const mediaId = await twitterClient().v1.uploadMedia('./out/twitter.png');
    await twitterClient().v2.tweet(message, { media: { media_ids: [mediaId] } });
};
const main = async () => {
    fs.mkdirSync('./out', { recursive: true });
    const countries = await downloadCsv('https://s3.mortality.watch/data/mortality/world_meta.csv');
    const max_dates_old = await downloadCsv('https://s3.mortality.watch/data/mortality/world_max_date.csv');
    const unique_countries = [];
    const jurisdictions = {};
    // Get list of unique countries and latest date
    for (const country of countries) {
        jurisdictions[country.iso3c] = country.jurisdiction;
        const c = unique_countries.filter((it) => it.iso3c == country.iso3c)[0];
        if (!c) {
            unique_countries.push({
                iso3c: country.iso3c,
                max_date: country.max_date,
            });
            continue;
        }
        if (Date.parse(c.max_date) < Date.parse(country.max_date)) {
            c.max_date = country.max_date;
        }
    }
    const updated = [];
    // Find current max date
    for (const country of unique_countries) {
        const old = max_dates_old.filter((it) => it.iso3c == country.iso3c)[0];
        const dn = old && Date.parse(old.max_date) < Date.parse(country.max_date);
        const is_state = country.iso3c.includes('DEU-') || country.iso3c.includes('USA-');
        if (!is_state && (!old || dn))
            updated.push(country);
    }
    if (!options.reset) {
        if (options.test)
            updated.push(unique_countries[1]);
        for (const country of updated) {
            tweet(country.iso3c, jurisdictions[country.iso3c], country.max_date);
            if (updated.length > 1)
                await sleep(15 * 60 * 1000);
        }
    }
    const writeCsv = async (obj, path) => new Promise((resolve) => {
        if (fs.existsSync(path))
            fs.unlinkSync(path);
        const data = stringify(obj, { header: true });
        fs.writeFileSync(path, data);
        resolve();
    });
    // Only update when we have new tweets.
    console.log(`Updated tweets: ${updated.length}`);
    if (options.reset || updated.length > 0) {
        const path = './out/world_max_date.csv';
        await writeCsv(unique_countries, path);
        s3Client().fPutObject('data', 'mortality/world_max_date.csv', path, {}, (err) => {
            if (err)
                return console.log(err);
            console.log('uploaded');
        });
    }
};
main().catch(console.log);
//# sourceMappingURL=tweet.js.map