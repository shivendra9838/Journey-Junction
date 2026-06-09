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

const transportSearchSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", default: null, index: true },
    type: { type: String, enum: ["flight", "train", "bus"], required: true, index: true },
    provider: { type: String, required: true, index: true },
    query: { type: mongoose.Schema.Types.Mixed, required: true },
    results: { type: mongoose.Schema.Types.Mixed, default: [] },
    resultCount: { type: Number, default: 0 },
    durationMs: { type: Number, default: 0 },
  },
  { timestamps: true },
);
transportSearchSchema.index({ type: 1, createdAt: -1 });
export const TransportSearchModel = model("TransportSearch", transportSearchSchema);

const dynamicPricingRuleSchema = new mongoose.Schema(
  {
    entityType: { type: String, enum: ["package", "hotel"], required: true, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    name: { type: String, required: true },
    seasonMultiplier: { type: Number, default: 1 },
    demandMultiplier: { type: Number, default: 1 },
    occupancyMultiplier: { type: Number, default: 1 },
    holidayMultiplier: { type: Number, default: 1 },
    weekendMultiplier: { type: Number, default: 1 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);
export const DynamicPricingRuleModel = model("DynamicPricingRule", dynamicPricingRuleSchema);

const bookingQueueSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", required: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null, index: true },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: "TravelPackage", required: true, index: true },
    status: { type: String, enum: ["queued", "processing", "completed", "failed", "expired"], default: "queued", index: true },
    priority: { type: Number, default: 0, index: true },
    expiresAt: { type: Date, required: true, index: true },
    error: { type: String, default: "" },
  },
  { timestamps: true },
);
bookingQueueSchema.index({ status: 1, priority: -1, createdAt: 1 });
export const BookingQueueModel = model("BookingQueue", bookingQueueSchema);

const cacheEntrySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    group: { type: String, required: true, index: true },
    ttlSeconds: { type: Number, required: true },
    warmedAt: { type: Date, default: null },
    invalidatedAt: { type: Date, default: null },
    hitCount: { type: Number, default: 0 },
    missCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);
export const CacheEntryModel = model("CacheEntry", cacheEntrySchema);

const apiMetricSchema = new mongoose.Schema(
  {
    path: { type: String, required: true, index: true },
    method: { type: String, required: true, index: true },
    statusCode: { type: Number, required: true, index: true },
    durationMs: { type: Number, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", default: null, index: true },
    ip: { type: String, default: "" },
  },
  { timestamps: true },
);
apiMetricSchema.index({ path: 1, createdAt: -1 });
export const ApiMetricModel = model("ApiMetric", apiMetricSchema);

const performanceAuditSchema = new mongoose.Schema(
  {
    category: { type: String, enum: ["database", "api", "frontend", "image", "bundle"], required: true, index: true },
    metric: { type: String, required: true },
    value: { type: Number, required: true },
    threshold: { type: Number, required: true },
    status: { type: String, enum: ["pass", "warn", "fail"], required: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);
export const PerformanceAuditModel = model("PerformanceAudit", performanceAuditSchema);

const businessInsightSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, index: true },
    label: { type: String, required: true },
    value: { type: Number, required: true },
    trend: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);
export const BusinessInsightModel = model("BusinessInsight", businessInsightSchema);

const sentryEventSchema = new mongoose.Schema(
  {
    source: { type: String, enum: ["frontend", "backend", "payment", "booking"], required: true, index: true },
    level: { type: String, enum: ["info", "warning", "error", "fatal"], default: "error", index: true },
    message: { type: String, required: true },
    eventId: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);
export const SentryEventModel = model("SentryEvent", sentryEventSchema);
