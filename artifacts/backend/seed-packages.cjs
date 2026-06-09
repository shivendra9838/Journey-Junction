const mongoose = require("mongoose");
const MONGODB_URI = "mongodb://localhost:27017/wandr";

const packages = [
  {
    title: "Goa Escape",
    slug: "goa-escape",
    duration: "4D/3N",
    rating: 4.8,
    price: 12999,
    coverImage: "/images/unsplash-be41aa2e4372.jpg",
    highlights: ["Beach resort stay", "Dolphin cruise", "Old Goa walk"],
    description: "Experience the vibrant beaches and rich Portuguese heritage of Goa.",
    maxTravellers: 10,
    availableSeats: 10,
    featured: true,
    status: "published"
  },
  {
    title: "Kerala Backwaters",
    slug: "kerala-backwaters",
    duration: "6D/5N",
    rating: 4.9,
    price: 24999,
    coverImage: "/images/unsplash-7916115aeef0.jpg",
    highlights: ["Houseboat night", "Spice plantation", "Munnar tea trails"],
    description: "Navigate the serene backwaters and lush tea gardens of God's Own Country.",
    maxTravellers: 10,
    availableSeats: 10,
    featured: true,
    status: "published"
  },
  {
    title: "Kashmir Paradise",
    slug: "kashmir-paradise",
    duration: "7D/6N",
    rating: 4.9,
    price: 31999,
    coverImage: "/images/unsplash-67cfe84b31d8.jpg",
    highlights: ["Dal Lake stay", "Gulmarg day trip", "Pahalgam valley"],
    description: "Discover paradise on earth with snow-capped peaks and pristine lakes.",
    maxTravellers: 10,
    availableSeats: 10,
    featured: true,
    status: "published"
  },
  {
    title: "Royal Rajasthan",
    slug: "royal-rajasthan",
    duration: "5D/4N",
    rating: 4.8,
    price: 19499,
    coverImage: "/images/unsplash-7ad0e26a32dc.jpg",
    highlights: ["Jaipur forts", "Desert camp", "Heritage haveli"],
    description: "Live like royalty exploring the majestic forts and golden deserts of Rajasthan.",
    maxTravellers: 10,
    availableSeats: 10,
    featured: true,
    status: "published"
  }
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  
  const dests = await db.collection("phasedestinations").find().toArray();
  let destId = null;
  if (dests.length > 0) {
    destId = dests[0]._id;
  } else {
    const res = await db.collection("phasedestinations").insertOne({
      name: "Default Destination", slug: "default", city: "Default", state: "Default", 
      country: "India", region: "North India", rating: 5, reviewCount: 0, 
      coverImage: "/images/unsplash-be41aa2e4372.jpg", gallery: [], 
      climateLabel: "Tropical", climate: {}, tags: [], about: "Default", isPublished: true, createdAt: new Date(), updatedAt: new Date()
    });
    destId = res.insertedId;
  }

  for (const pkg of packages) {
    pkg.destinationId = destId;
    pkg.createdAt = new Date();
    pkg.updatedAt = new Date();
    await db.collection("travelpackages").updateOne(
      { slug: pkg.slug },
      { $set: pkg },
      { upsert: true }
    );
  }
  
  console.log("Seeded packages!");
  process.exit(0);
}

seed().catch(console.error);
