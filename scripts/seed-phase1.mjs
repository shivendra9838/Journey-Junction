import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is required");
  process.exit(1);
}

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  password: String,
  avatar: String,
  role: String,
  isVerified: Boolean,
  travelPreferences: [String],
}, { timestamps: true });

const destinationSchema = new mongoose.Schema({
  name: String,
  slug: { type: String, unique: true },
  state: String,
  region: String,
  description: String,
  heroImage: String,
  gallery: [String],
  bestTime: String,
  temperature: String,
  language: String,
  currency: String,
  latitude: Number,
  longitude: Number,
  location: Object,
  rating: Number,
}, { timestamps: true });

const hotelSchema = new mongoose.Schema({
  name: String,
  destinationId: mongoose.Schema.Types.ObjectId,
  description: String,
  images: [String],
  amenities: [String],
  rating: Number,
  address: String,
  location: Object,
  pricePerNight: Number,
}, { timestamps: true });

const activitySchema = new mongoose.Schema({
  title: String,
  destinationId: mongoose.Schema.Types.ObjectId,
  description: String,
  duration: String,
  difficulty: String,
  images: [String],
  price: Number,
}, { timestamps: true });

const User = mongoose.model("UserAccount", userSchema);
const Destination = mongoose.model("PhaseDestination", destinationSchema);
const Hotel = mongoose.model("Hotel", hotelSchema);
const Activity = mongoose.model("Activity", activitySchema);

await mongoose.connect(uri);
const password = await bcrypt.hash("Admin@12345", 12);
await User.updateOne(
  { email: "admin@wandr.local" },
  { $setOnInsert: { name: "Wandr Admin", email: "admin@wandr.local", password, role: "admin", isVerified: true } },
  { upsert: true },
);

const destination = await Destination.findOneAndUpdate(
  { slug: "agra" },
  {
    name: "Agra",
    slug: "agra",
    state: "Uttar Pradesh",
    region: "North India",
    description: "Agra is home to the Taj Mahal, Mughal-era architecture, heritage markets and rich North Indian food culture.",
    heroImage: "https://images.unsplash.com/photo-1564507592333-c60657eea523",
    gallery: ["https://images.unsplash.com/photo-1548013146-72479768bada"],
    bestTime: "October to March",
    temperature: "18-32 C",
    language: "Hindi",
    currency: "INR",
    latitude: 27.1767,
    longitude: 78.0081,
    location: { type: "Point", coordinates: [78.0081, 27.1767] },
    rating: 4.8,
  },
  { upsert: true, new: true },
);

await Hotel.updateOne(
  { name: "Heritage Stay Agra", destinationId: destination._id },
  { $set: { description: "Comfortable stay near major heritage landmarks.", images: [], amenities: ["WiFi", "Breakfast"], rating: 4.5, address: "Agra, Uttar Pradesh", location: { type: "Point", coordinates: [78.0081, 27.1767] }, pricePerNight: 4500 } },
  { upsert: true },
);
await Activity.updateOne(
  { title: "Taj Mahal Sunrise Walk", destinationId: destination._id },
  { $set: { description: "Guided sunrise visit around the Taj Mahal complex.", duration: "3 hours", difficulty: "easy", images: [], price: 1200 } },
  { upsert: true },
);

await mongoose.disconnect();
console.log("Phase 1 seed complete. Admin: admin@wandr.local / Admin@12345");
