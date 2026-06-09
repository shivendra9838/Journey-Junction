
const mongoose = require('mongoose');

// Extracted from DestinationPage.tsx
const destInfo = {
  name: "Goa",
  country: "India",
  tagline: "Where golden shores meet endless adventure",
  rating: 4.8,
  reviews: 5241,
  heroImage:
    "/images/unsplash-be41aa2e4372.jpg",
  gallery: [
    "/images/unsplash-451710d2942a.jpg",
    "/images/unsplash-7c5d196ce843.jpg",
    "/images/unsplash-a6836391f181.jpg",
    "/images/unsplash-bb9ea81a21c3.jpg",
    "/images/unsplash-c8d3ea75cbab.jpg",
    "/images/unsplash-1925bee154dc.jpg",
  ],
  highlights: [
    { icon: "☀️", label: "Best Season", value: "Nov – Feb" },
    { icon: "🌡️", label: "Avg Temp", value: "28°C / 82°F" },
    { icon: "✈️", label: "Nearest Airport", value: "GOI — 25 min" },
    { icon: "💬", label: "Language", value: "Konkani / English" },
    { icon: "💱", label: "Currency", value: "Rupee (₹)" },
    { icon: "⏱️", label: "Ideal Stay", value: "5 – 7 Days" },
  ],
  activities: [
    {
      title: "Dolphin Watching Cruise",
      category: "Adventure",
      duration: "3 hrs",
      price: "₹899",
      image:
        "/images/unsplash-2921425bce51.jpg",
      badge: "Best Seller",
    },
    {
      title: "Spice Plantation Tour",
      category: "Culture",
      duration: "4 hrs",
      price: "₹1,299",
      image:
        "/images/unsplash-88294ae03d7b.jpg",
      badge: "Local Favourite",
    },
    {
      title: "Old Goa Heritage Walk",
      category: "History",
      duration: "3 hrs",
      price: "₹699",
      image:
        "/images/unsplash-d93f09a412f0.jpg",
      badge: "Top Rated",
    },
    {
      title: "Dudhsagar Falls Trek",
      category: "Nature",
      duration: "Full Day",
      price: "₹1,799",
      image:
        "/images/unsplash-d98d573f32bd.jpg",
      badge: null,
    },
  ],
  hotels: [
    {
      name: "Taj Exotica Resort & Spa",
      stars: 5,
      price: "₹18,000",
      perNight: "/night",
      image:
        "/images/unsplash-c98480910ba0.jpg",
      tag: "Beach Front",
    },
    {
      name: "The Leela Goa",
      stars: 5,
      price: "₹14,500",
      perNight: "/night",
      image:
        "/images/unsplash-13bd5084b599.jpg",
      tag: "Infinity Pool",
    },
    {
      name: "Novotel Goa Resort",
      stars: 4,
      price: "₹7,200",
      perNight: "/night",
      image:
        "/images/unsplash-13bd5084b599.jpg",
      tag: "Family Friendly",
    },
  ],
};

const flights = [
  {
    from: "Mumbai",
    code: "BOM",
    flag: "🇮🇳",
    airline: "IndiGo / Air India",
    duration: "1h 10m",
    frequency: "Daily",
    price: "From ₹2,499",
    direct: true,
  },
  {
    from: "Delhi",
    code: "DEL",
    flag: "🇮🇳",
    airline: "Air India / IndiGo",
    duration: "2h 15m",
    frequency: "Daily",
    price: "From ₹3,299",
    direct: true,
  },
  {
    from: "Bangalore",
    code: "BLR",
    flag: "🇮🇳",
    airline: "IndiGo / SpiceJet",
    duration: "1h 05m",
    frequency: "Daily",
    price: "From ₹1,999",
    direct: true,
  },
  {
    from: "Chennai",
    code: "MAA",
    flag: "🇮🇳",
    airline: "Air India / Akasa Air",
    duration: "1h 25m",
    frequency: "Daily",
    price: "From ₹2,199",
    direct: true,
  },
  {
    from: "Hyderabad",
    code: "HYD",
    flag: "🇮🇳",
    airline: "IndiGo / Air India",
    duration: "1h 20m",
    frequency: "Daily",
    price: "From ₹2,099",
    direct: true,
  },
];

const trains = [
  {
    from: "Mumbai CST",
    duration: "10–12 hrs",
    type: "Konkan Railway",
    operator: "Indian Railways",
    price: "From ₹450",
    icon: "🌊",
    note: "Scenic coastal route",
  },
  {
    from: "Delhi (H. Nizamuddin)",
    duration: "~26 hrs",
    type: "Goa Express",
    operator: "Indian Railways",
    price: "From ₹850",
    icon: "🌙",
    note: "Overnight sleeper berth",
  },
  {
    from: "Bangalore (Yesvantpur)",
    duration: "12–14 hrs",
    type: "Vasco Express",
    operator: "Indian Railways",
    price: "From ₹380",
    icon: "⚡",
    note: "Budget-friendly overnight",
  },
  {
    from: "Pune",
    duration: "8–9 hrs",
    type: "Mandovi Express",
    operator: "Indian Railways",
    price: "From ₹320",
    icon: "🏔️",
    note: "Scenic Ghats crossing",
  },
];

const transfers = [
  {
    type: "Pre-paid Taxi",
    desc: "Government-regulated counters at GOI arrivals — fixed fares to all beach zones, no haggling needed",
    duration: "25–45 min",
    price: "From ₹700",
    icon: "🚗",
    recommended: true,
  },
  {
    type: "App Cab (Goa Miles / Uber)",
    desc: "Book directly on your phone from the airport. Reliable and cheaper than taxis.",
    duration: "25–45 min",
    price: "From ₹450",
    icon: "📱",
    recommended: false,
  },
  {
    type: "Rented Scooter / Bike",
    desc: "The most popular way to explore Goa — available at every beach shack and rental agency",
    duration: "Self-paced",
    price: "From ₹300/day",
    icon: "🛵",
    recommended: false,
  },
  {
    type: "Kadamba Bus (KTCL)",
    desc: "State-run bus from Dabolim Airport to Panaji (Kadamba Bus Stand). Budget option.",
    duration: "45–60 min",
    price: "₹45",
    icon: "🚌",
    recommended: false,
  },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const weatherData = [
  { month: "Jan", high: 32, low: 20, rain: 10,  sun: 9,  crowd: 5 },
  { month: "Feb", high: 33, low: 21, rain:  8,  sun: 9,  crowd: 5 },
  { month: "Mar", high: 34, low: 23, rain: 14,  sun: 8,  crowd: 4 },
  { month: "Apr", high: 35, low: 26, rain: 18,  sun: 7,  crowd: 3 },
  { month: "May", high: 33, low: 27, rain: 110, sun: 5,  crowd: 1 },
  { month: "Jun", high: 30, low: 26, rain: 560, sun: 2,  crowd: 1 },
  { month: "Jul", high: 29, low: 25, rain: 620, sun: 2,  crowd: 1 },
  { month: "Aug", high: 29, low: 25, rain: 530, sun: 2,  crowd: 1 },
  { month: "Sep", high: 30, low: 25, rain: 240, sun: 4,  crowd: 1 },
  { month: "Oct", high: 32, low: 24, rain: 85,  sun: 6,  crowd: 2 },
  { month: "Nov", high: 32, low: 22, rain: 18,  sun: 8,  crowd: 4 },
  { month: "Dec", high: 31, low: 20, rain: 12,  sun: 9,  crowd: 5 },
];

const seasons = [
  {
    label: "Best time",
    months: "Nov · Dec · Jan · Feb",
    color: "bg-emerald-500",
    ring: "ring-emerald-200",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    icon: "✨",
    desc: "Dry, sunny and cool. Perfect beach weather, all attractions open, and vibrant shack culture.",
  },
  {
    label: "Peak season",
    months: "Dec · Jan",
    color: "bg-amber-400",
    ring: "ring-amber-200",
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-100",
    icon: "🌞",
    desc: "Christmas & New Year bring the biggest crowds and highest prices. Book 3–4 months ahead.",
  },
  {
    label: "Shoulder season",
    months: "Mar · Oct · Nov",
    color: "bg-sky-400",
    ring: "ring-sky-200",
    text: "text-sky-700",
    bg: "bg-sky-50",
    border: "border-sky-100",
    icon: "🌤️",
    desc: "Good deals, fewer tourists. October marks the end of monsoon — beaches are pristine.",
  },
  {
    label: "Monsoon season",
    months: "Jun · Jul · Aug · Sep",
    color: "bg-stone-300",
    ring: "ring-stone-200",
    text: "text-stone-600",
    bg: "bg-stone-50",
    border: "border-stone-100",
    icon: "🌧️",
    desc: "Heavy rains close many shacks and water sports. Some resorts offer steep off-season discounts.",
  },
];



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
