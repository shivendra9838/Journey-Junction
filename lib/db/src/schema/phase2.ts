import mongoose from "mongoose";

const jsonTransform = (_doc: unknown, ret: Record<string, unknown>) => {
  ret["id"] = (ret["_id"] as { toString(): string }).toString();
  delete ret["_id"];
  delete ret["__v"];
  return ret;
};

const model = <T extends mongoose.Schema>(name: string, schema: T) => {
  schema.set("toJSON", { virtuals: true, transform: jsonTransform });
  return mongoose.models[name] ?? mongoose.model(name, schema);
};

const travelPackageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    destinationId: { type: mongoose.Schema.Types.ObjectId, ref: "PhaseDestination", required: true, index: true },
    duration: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    coverImage: { type: String, required: true },
    gallery: [{ type: String }],
    description: { type: String, required: true },
    highlights: [{ type: String }],
    included: [{ type: String }],
    excluded: [{ type: String }],
    maxTravellers: { type: Number, required: true, min: 1 },
    availableSeats: { type: Number, required: true, min: 0 },
    category: { type: String, index: true, default: "standard" },
    featured: { type: Boolean, default: false, index: true },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft", index: true },
    viewCount: { type: Number, default: 0 },
    bookingCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);
travelPackageSchema.index({ title: "text", description: "text", category: "text", highlights: "text" });
travelPackageSchema.index({ featured: 1, rating: -1, bookingCount: -1 });
export const TravelPackageModel = model("TravelPackage", travelPackageSchema);

const itineraryDaySchema = new mongoose.Schema(
  {
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: "TravelPackage", required: true, index: true },
    dayNumber: { type: Number, required: true, min: 1 },
    title: { type: String, required: true },
    description: { type: String, required: true },
    activities: [{ type: String }],
    mealsIncluded: [{ type: String }],
  },
  { timestamps: true },
);
itineraryDaySchema.index({ packageId: 1, dayNumber: 1 }, { unique: true });
export const ItineraryDayModel = model("ItineraryDay", itineraryDaySchema);

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", required: true, index: true },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: "TravelPackage", required: true, index: true },
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", default: null, index: true },
    travellers: { type: Number, required: true, min: 1 },
    checkInDate: { type: Date, required: true, index: true },
    checkOutDate: { type: Date, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    paymentStatus: { type: String, enum: ["unpaid", "paid", "refunded"], default: "unpaid", index: true },
    bookingStatus: { type: String, enum: ["pending", "confirmed", "cancelled", "completed"], default: "pending", index: true },
    bookingReference: { type: String, required: true, unique: true, index: true },
    inventoryLockId: { type: mongoose.Schema.Types.ObjectId, ref: "InventoryLock", default: null },
  },
  { timestamps: true },
);
bookingSchema.index({ userId: 1, createdAt: -1 });
export const BookingModel = model("Booking", bookingSchema);

const packageInventorySchema = new mongoose.Schema(
  {
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: "TravelPackage", required: true, unique: true, index: true },
    availableSeats: { type: Number, required: true, min: 0 },
    blockedSeats: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);
export const PackageInventoryModel = model("PackageInventory", packageInventorySchema);

const hotelInventorySchema = new mongoose.Schema(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true, unique: true, index: true },
    totalRooms: { type: Number, required: true, min: 0 },
    availableRooms: { type: Number, required: true, min: 0 },
    blockedDates: [{ type: Date }],
  },
  { timestamps: true },
);
export const HotelInventoryModel = model("HotelInventory", hotelInventorySchema);

const inventoryLockSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", required: true, index: true },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: "TravelPackage", required: true, index: true },
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", default: null, index: true },
    seats: { type: Number, required: true, min: 1 },
    rooms: { type: Number, default: 0, min: 0 },
    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, required: true },
    status: { type: String, enum: ["active", "released", "consumed"], default: "active", index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true },
);
export const InventoryLockModel = model("InventoryLock", inventoryLockSchema);

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", required: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    provider: { type: String, enum: ["stripe"], default: "stripe", index: true },
    providerOrderId: { type: String, required: true, index: true },
    providerPaymentId: { type: String, default: "", index: true },
    stripePaymentIntentId: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["created", "paid", "failed", "refunded"], default: "created", index: true },
  },
  { timestamps: true },
);
export const PaymentModel = model("Payment", paymentSchema);

const weatherSchema = new mongoose.Schema(
  {
    destinationId: { type: mongoose.Schema.Types.ObjectId, ref: "PhaseDestination", required: true, unique: true, index: true },
    temperature: { type: Number, required: true },
    humidity: { type: Number, required: true },
    rainChance: { type: Number, default: 0 },
    forecast: { type: mongoose.Schema.Types.Mixed, default: {} },
    refreshedAt: { type: Date, required: true },
  },
  { timestamps: true },
);
export const WeatherModel = model("Weather", weatherSchema);

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["booking_confirmed", "payment_successful", "booking_cancelled", "review_request", "trip_reminder", "system", "admin_reply"],
      default: "system",
      index: true,
    },
    isRead: { type: Boolean, default: false, index: true },
    emailSent: { type: Boolean, default: false, index: true },
    link: { type: String, default: "" },
    relatedEntityId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    relatedEntityType: { type: String, default: "" },
  },
  { timestamps: true },
);
export const NotificationModel = model("Notification", notificationSchema);

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    content: { type: String, required: true },
    excerpt: { type: String, required: true },
    coverImage: { type: String, required: true },
    author: { type: String, required: true },
    category: { type: String, required: true, index: true },
    tags: [{ type: String }],
    readTime: { type: Number, required: true, min: 1 },
    published: { type: Boolean, default: false, index: true },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);
blogSchema.index({ title: "text", content: "text", excerpt: "text", category: "text", tags: "text" });
export const BlogModel = model("Blog", blogSchema);

const analyticsEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", default: null, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    entityType: { type: String, enum: ["destination", "package", "booking", "user"], required: true, index: true },
    eventType: { type: String, enum: ["view", "booking_created", "payment_success", "signup"], required: true, index: true },
    amount: { type: Number, default: 0 },
  },
  { timestamps: true },
);
analyticsEventSchema.index({ entityType: 1, eventType: 1, createdAt: -1 });
export const AnalyticsEventModel = model("AnalyticsEvent", analyticsEventSchema);
