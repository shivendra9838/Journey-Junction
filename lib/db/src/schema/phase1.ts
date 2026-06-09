import mongoose from "mongoose";

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: [0, 0] },
  },
  { _id: false },
);

const jsonTransform = (_doc: unknown, ret: Record<string, unknown>) => {
  ret["id"] = (ret["_id"] as { toString(): string }).toString();
  delete ret["_id"];
  delete ret["__v"];
  delete ret["password"];
  return ret;
};

const userAccountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: "" },
    password: { type: String, required: true },
    avatar: { type: String, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isVerified: { type: Boolean, default: false },
    bio: { type: String, default: "" },
    city: { type: String, default: "" },
    country: { type: String, default: "" },
    travelPreferences: [{ type: String }],
  },
  { timestamps: true },
);
userAccountSchema.set("toJSON", { virtuals: true, transform: jsonTransform });
export const UserAccountModel = mongoose.model("UserAccount", userAccountSchema);

const tokenSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
export const RefreshTokenModel = mongoose.model("RefreshToken", tokenSchema);
export const PasswordResetTokenModel = mongoose.model("PasswordResetToken", tokenSchema);
export const EmailVerificationTokenModel = mongoose.model("EmailVerificationToken", tokenSchema);

const phaseDestinationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    state: { type: String, required: true, index: true },
    region: { type: String, required: true, index: true },
    description: { type: String, required: true },
    heroImage: { type: String, required: true },
    gallery: [{ type: String }],
    bestTime: { type: String, default: "" },
    temperature: { type: String, default: "" },
    language: { type: String, default: "" },
    currency: { type: String, default: "INR" },
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
    location: { type: pointSchema, default: () => ({ type: "Point", coordinates: [0, 0] }) },
    rating: { type: Number, default: 0, min: 0, max: 5 },
  },
  { timestamps: true },
);
phaseDestinationSchema.index({ name: "text", state: "text", region: "text", description: "text" });
phaseDestinationSchema.index({ location: "2dsphere" });
phaseDestinationSchema.set("toJSON", { virtuals: true, transform: jsonTransform });
export const PhaseDestinationModel = mongoose.model("PhaseDestination", phaseDestinationSchema);

const hotelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    destinationId: { type: mongoose.Schema.Types.ObjectId, ref: "PhaseDestination", required: true, index: true },
    description: { type: String, required: true },
    images: [{ type: String }],
    amenities: [{ type: String }],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    address: { type: String, default: "" },
    location: { type: pointSchema, default: () => ({ type: "Point", coordinates: [0, 0] }) },
    pricePerNight: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);
hotelSchema.index({ name: "text", description: "text", address: "text", amenities: "text" });
hotelSchema.index({ pricePerNight: 1, rating: -1 });
hotelSchema.set("toJSON", { virtuals: true, transform: jsonTransform });
export const HotelModel = mongoose.model("Hotel", hotelSchema);

const activitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    destinationId: { type: mongoose.Schema.Types.ObjectId, ref: "PhaseDestination", required: true, index: true },
    description: { type: String, required: true },
    duration: { type: String, default: "" },
    difficulty: { type: String, enum: ["easy", "moderate", "hard"], default: "easy" },
    images: [{ type: String }],
    price: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);
activitySchema.index({ title: "text", description: "text", difficulty: "text" });
activitySchema.index({ price: 1, difficulty: 1 });
activitySchema.set("toJSON", { virtuals: true, transform: jsonTransform });
export const ActivityModel = mongoose.model("Activity", activitySchema);

const phaseWishlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    destinationId: { type: mongoose.Schema.Types.ObjectId, ref: "PhaseDestination", required: true, index: true },
  },
  { timestamps: true },
);
phaseWishlistSchema.index({ userId: 1, destinationId: 1 }, { unique: true });
phaseWishlistSchema.set("toJSON", { virtuals: true, transform: jsonTransform });
export const PhaseWishlistModel = mongoose.model("PhaseWishlist", phaseWishlistSchema);

const phaseCommentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const phaseReviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    destinationId: { type: mongoose.Schema.Types.ObjectId, ref: "PhaseDestination", required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true },
    review: { type: String, required: true },
    images: [{ type: String }],
    verified: { type: Boolean, default: false },
    // Moderation & Social Features
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "approved" },
    isFeatured: { type: Boolean, default: false },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    saves: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [phaseCommentSchema],
  },
  { timestamps: true },
);
phaseReviewSchema.index({ userId: 1, destinationId: 1 });
phaseReviewSchema.set("toJSON", { virtuals: true, transform: jsonTransform });
export const PhaseReviewModel = mongoose.model("PhaseReview", phaseReviewSchema);

const inquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    travelDates: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    status: { type: String, enum: ["Pending", "Replied"], default: "Pending" },
    replyMessage: { type: String, default: "" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", default: null },
    repliedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
inquirySchema.set("toJSON", { virtuals: true, transform: jsonTransform });
export const InquiryModel = mongoose.model("Inquiry", inquirySchema);
