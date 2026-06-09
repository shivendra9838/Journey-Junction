const fs = require('fs');
const code = fs.readFileSync('e:/Downloads/wandr-project/artifacts/wandr/src/pages/DestinationPage.tsx', 'utf8');

const destStr = code.substring(code.indexOf('const destinations = {'));
const split = destStr.split('function WeatherSection');
if (split.length < 2) {
  console.log('Failed to parse');
  process.exit(1);
}

// Remove the function GettingThereSection part from the middle
let topCode = split[0];
const gettingThereStart = topCode.indexOf('function GettingThereSection');
const gettingThereEnd = topCode.indexOf('const MONTHS =', gettingThereStart);
if (gettingThereStart !== -1 && gettingThereEnd !== -1) {
  topCode = topCode.substring(0, gettingThereStart) + topCode.substring(gettingThereEnd);
}

let dataCode = topCode.replace('const destinations =', 'const destInfo =');

let outCode = `
const mongoose = require('mongoose');

// Extracted from DestinationPage.tsx
${dataCode}

// Construct doc
const slug = 'goa';
const stateSlug = destInfo.state ? destInfo.state.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : 'goa';

const doc = {
  ...destInfo,
  slug,
  stateSlug,
  isPublished: true,
  flights,
  trains,
  transfers,
  weatherData,
  seasons
};

// Add default fields if missing
if (!doc.city) doc.city = doc.name;
if (!doc.state) doc.state = 'Goa';
if (!doc.region) doc.region = 'West Coast';
if (!doc.about) doc.about = { heading: '', para1: '', para2: '', tags: [], label: '', ctaHeading: '', ctaDesc: '' };
if (!doc.botReplies) doc.botReplies = { default: '', hotel: '', activity: '', weather: '', price: '', food: '' };
if (!doc.quickAdds) doc.quickAdds = [];
if (!doc.communityPhotos) doc.communityPhotos = [];
if (!doc.reviewsData) doc.reviewsData = [];
if (!doc.mapPoints) doc.mapPoints = [];
if (!doc.airportName) doc.airportName = 'Goa International Airport';
if (!doc.airportCode) doc.airportCode = 'GOI';
if (!doc.flightIntro) doc.flightIntro = '';
if (!doc.flightTip) doc.flightTip = '';
if (!doc.trainIntro) doc.trainIntro = '';
if (!doc.trainTip) doc.trainTip = '';
if (!doc.transferIntro) doc.transferIntro = '';
if (!doc.transferTip) doc.transferTip = '';

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wandr')
  .then(async () => {
    const db = mongoose.connection.db;
    await db.collection('customdestinations').updateOne(
      { slug },
      { $set: doc },
      { upsert: true }
    );
    console.log('Successfully seeded Goa to MongoDB!');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
`;

fs.writeFileSync('e:/Downloads/wandr-project/lib/db/run-seed-goa.cjs', outCode);
console.log('Wrote run-seed-goa.cjs');
