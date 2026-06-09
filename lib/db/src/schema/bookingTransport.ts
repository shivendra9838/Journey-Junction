import mongoose from "mongoose";

const transportCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    mode: { type: String, enum: ["Normal", "VIP", "VVIP"], required: true },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const vehicleSchema = new mongoose.Schema(
  {
    categoryId: { type: String, required: true },
    mode: { type: String, enum: ["Normal", "VIP", "VVIP"], required: true },
    name: { type: String, required: true },
    type: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    capacity: { type: Number, default: 4, min: 1 },
    image: { type: String, default: "" },
    description: { type: String, default: "" },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const pickupLocationSchema = new mongoose.Schema(
  {
    destinationSlug: { type: String, required: true },
    destinationName: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, default: "Custom Location" },
    address: { type: String, required: true },
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const bookingPickupSchema = new mongoose.Schema(
  {
    label: String,
    type: String,
    address: String,
    latitude: Number,
    longitude: Number,
  },
  { _id: false },
);

const bookingVehicleSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    type: String,
    price: Number,
    capacity: Number,
  },
  { _id: false },
);

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: String, default: "" },
    travelerName: { type: String, required: true },
    travelerAge: { type: Number, default: 0 },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    destinationSlug: { type: String, required: true },
    destinationName: { type: String, required: true },
    checkInDate: { type: String, required: true },
    checkOutDate: { type: String, required: true },
    pickupLocation: bookingPickupSchema,
    travelMode: { type: String, enum: ["Normal", "VIP", "VVIP"], required: true },
    vehicle: bookingVehicleSchema,
    travelers: { type: Number, default: 1, min: 1 },
    stepPrices: {
      destination: { type: Number, default: 0 },
      pickup: { type: Number, default: 0 },
      vehicle: { type: Number, default: 0 },
      service: { type: Number, default: 0 },
    },
    totalAmount: { type: Number, required: true },
    paymentStatus: { type: String, enum: ["unpaid", "paid", "refunded"], default: "unpaid" },
    stripeCheckoutSessionId: { type: String, default: "" },
    stripePaymentIntentId: { type: String, default: "" },
    paidAt: { type: Date },
    status: { type: String, enum: ["Pending", "Assigned", "Picked Up", "In Progress", "Completed"], default: "Pending" },
    assignedDriver: { type: String, default: "" },
    assignedStaff: { type: String, default: "" },
    assignmentConfirmed: { type: Boolean, default: false },
    assignmentConfirmedAt: { type: Date },
    notes: { type: String, default: "" },
    bookingReference: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

const pendingCheckoutSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    checkoutSessionId: { type: String, default: "", index: true },
    bookingId: { type: String, default: "" },
    bookingPayload: { type: mongoose.Schema.Types.Mixed, required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "inr" },
    status: { type: String, enum: ["created", "paid", "cancelled", "failed"], default: "created" },
    stripePaymentIntentId: { type: String, default: "" },
  },
  { timestamps: true },
);

transportCategorySchema.index({ mode: 1, name: 1 }, { unique: true });
vehicleSchema.index({ mode: 1, categoryId: 1, isAvailable: 1 });
pickupLocationSchema.index({ destinationSlug: 1, isActive: 1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ stripeCheckoutSessionId: 1 });
pendingCheckoutSchema.index({ userId: 1, createdAt: -1 });

export const TransportCategoryModel = mongoose.model("TransportCategory", transportCategorySchema);
export const VehicleModel = mongoose.model("Vehicle", vehicleSchema);
export const PickupLocationModel = mongoose.model("PickupLocation", pickupLocationSchema);
export const TransportBookingModel = mongoose.model("TransportBooking", bookingSchema);
export const PendingTransportCheckoutModel = mongoose.model("PendingTransportCheckout", pendingCheckoutSchema);
