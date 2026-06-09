import mongoose from "mongoose";

const highlightSchema = new mongoose.Schema({ icon: String, label: String, value: String }, { _id: false });
const activitySchema = new mongoose.Schema({ title: String, category: String, duration: String, price: String, image: String, badge: String }, { _id: false });
const hotelSchema = new mongoose.Schema({ name: String, stars: Number, price: String, perNight: String, image: String, tag: String }, { _id: false });
const transportPlanSchema = new mongoose.Schema({ tier: String, title: String, vehicles: String, price: String, description: String, image: String }, { _id: false });
const mealPlanSchema = new mongoose.Schema({ tier: String, title: String, includes: String, price: String, description: String, image: String }, { _id: false });
const flightSchema = new mongoose.Schema({ from: String, code: String, flag: String, airline: String, duration: String, frequency: String, price: String, direct: Boolean }, { _id: false });
const trainSchema = new mongoose.Schema({ from: String, duration: String, type: String, operator: String, price: String, icon: String, note: String }, { _id: false });
const transferSchema = new mongoose.Schema({ type: String, desc: String, duration: String, price: String, icon: String, recommended: Boolean }, { _id: false });
const mapPointSchema = new mongoose.Schema({ to: String, dist: String, time: String, color: String }, { _id: false });
const weatherSchema = new mongoose.Schema({ month: String, high: Number, low: Number, rain: Number, sun: Number, crowd: Number }, { _id: false });
const seasonSchema = new mongoose.Schema({ label: String, months: String, color: String, ring: String, text: String, bg: String, border: String, icon: String, desc: String }, { _id: false });
const reviewDataSchema = new mongoose.Schema({ id: String, name: String, location: String, avatar: String, tripType: String, date: String, rating: Number, title: String, review: String, photos: [String], helpful: Number }, { _id: false });
const quickAddSchema = new mongoose.Schema({ id: String, name: String, type: { type: String }, duration: String, price: Number, emoji: String }, { _id: false });
const aboutSectionSchema = new mongoose.Schema({ label: String, heading: String, para1: String, para2: String, tags: [String], ctaHeading: String, ctaDesc: String }, { _id: false });
const botRepliesSchema = new mongoose.Schema({ default: String, hotel: String, activity: String, weather: String, price: String, food: String }, { _id: false });

const destSchema = new mongoose.Schema(
  {
    slug:         { type: String, required: true, lowercase: true },
    name:         { type: String, required: true },
    city:         { type: String, default: "" },
    state:        { type: String, required: true },
    stateSlug:    { type: String, default: "", lowercase: true },
    country:      { type: String, default: "India" },
    region:       { type: String, required: true },
    heroImage:    { type: String, required: true },
    images:       [{ type: String }],
    photos:       [{ type: String }],
    gallery:      [{ type: String }], // Add gallery for compatibility
    tagline:      { type: String, required: true },
    rating:       { type: Number, required: true, min: 0, max: 5 },
    reviewCount:  { type: Number, default: 0 },
    reviews:      { type: Number, default: 0 }, // For frontend compatibility
    latitude:     { type: Number, default: null },
    longitude:    { type: Number, default: null },
    climateLabel: { type: String, default: "" },
    climate:      { type: String, default: "" },
    tags:         [{ type: String }],
    about:        { type: mongoose.Schema.Types.Mixed, default: "" }, // Can be string or aboutSection object
    isPublished:  { type: Boolean, default: true },
    
    // New nested fields
    highlights:      [highlightSchema],
    activities:      [activitySchema],
    hotels:          [hotelSchema],
    transports:      [transportPlanSchema],
    meals:           [mealPlanSchema],
    flights:         [flightSchema],
    flightIntro:     { type: String, default: "" },
    flightTip:       { type: String, default: "" },
    trains:          [trainSchema],
    trainIntro:      { type: String, default: "" },
    trainTip:        { type: String, default: "" },
    transfers:       [transferSchema],
    transferIntro:   { type: String, default: "" },
    transferTip:     { type: String, default: "" },
    airportName:     { type: String, default: "" },
    airportCode:     { type: String, default: "" },
    mapPoints:       [mapPointSchema],
    weatherData:     [weatherSchema],
    seasons:         [seasonSchema],
    reviewsData:     [reviewDataSchema],
    communityPhotos: [{ type: String }],
    quickAdds:       [quickAddSchema],
    botReplies:      { type: botRepliesSchema },
  },
  { timestamps: true },
);

destSchema.index({ stateSlug: 1, slug: 1 }, { unique: true });
destSchema.index({ state: 1, city: 1, name: 1 });
destSchema.index({ isPublished: 1, stateSlug: 1 });

destSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret["id"] = (ret["_id"] as { toString(): string }).toString();
    delete ret["_id"];
    delete ret["__v"];
    return ret;
  },
});

export const CustomDestModel = mongoose.model("CustomDest", destSchema);
