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

export const roles = ["SUPER_ADMIN", "ADMIN", "EDITOR", "SUPPORT", "USER"] as const;

const adminProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", required: true, unique: true, index: true },
    role: { type: String, enum: roles, default: "USER", index: true },
    permissions: [{ type: String }],
    active: { type: Boolean, default: true, index: true },
    lastSeenAt: { type: Date, default: null },
  },
  { timestamps: true },
);
export const AdminProfileModel = model("AdminProfile", adminProfileSchema);

const chatSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", required: true, index: true },
    title: { type: String, default: "Travel assistant" },
    messages: [
      {
        role: { type: String, enum: ["system", "user", "assistant"], required: true },
        content: { type: String, required: true },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);
export const ChatSessionModel = model("ChatSession", chatSessionSchema);

const recentlyViewedSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", required: true, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    entityType: { type: String, enum: ["destination", "hotel", "package", "activity"], required: true, index: true },
    viewedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);
recentlyViewedSchema.index({ userId: 1, entityId: 1, entityType: 1 }, { unique: true });
export const RecentlyViewedModel = model("RecentlyViewed", recentlyViewedSchema);

const searchAnalyticsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", default: null, index: true },
    query: { type: String, required: true, index: true },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    resultCount: { type: Number, default: 0 },
    clickedEntityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    clickedEntityType: { type: String, default: "" },
  },
  { timestamps: true },
);
searchAnalyticsSchema.index({ query: "text" });
export const SearchAnalyticsModel = model("SearchAnalytics", searchAnalyticsSchema);

const supportReplySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", required: true },
    message: { type: String, required: true },
    internal: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const supportTicketSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", required: true, index: true },
    subject: { type: String, required: true },
    category: { type: String, required: true, index: true },
    description: { type: String, required: true },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium", index: true },
    status: { type: String, enum: ["open", "in_progress", "resolved", "closed"], default: "open", index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", default: null, index: true },
    replies: [supportReplySchema],
  },
  { timestamps: true },
);
supportTicketSchema.index({ subject: "text", description: "text", category: "text" });
export const SupportTicketModel = model("SupportTicket", supportTicketSchema);

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    discountType: { type: String, enum: ["flat", "percentage"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    maxUses: { type: Number, default: 0, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true, index: true },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: "TravelPackage", default: null, index: true },
    destinationId: { type: mongoose.Schema.Types.ObjectId, ref: "PhaseDestination", default: null, index: true },
    firstTimeUserOnly: { type: Boolean, default: false },
  },
  { timestamps: true },
);
export const CouponModel = model("Coupon", couponSchema);

const couponRedemptionSchema = new mongoose.Schema(
  {
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", required: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    discountAmount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);
export const CouponRedemptionModel = model("CouponRedemption", couponRedemptionSchema);

const referralSchema = new mongoose.Schema(
  {
    referrerId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", required: true, index: true },
    referredUserId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", default: null, index: true },
    referralCode: { type: String, required: true, uppercase: true, index: true },
    rewardAmount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["pending", "completed", "rewarded"], default: "pending", index: true },
  },
  { timestamps: true },
);
export const ReferralModel = model("Referral", referralSchema);

const loyaltySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", required: true, unique: true, index: true },
    points: { type: Number, default: 0, min: 0 },
    lifetimePoints: { type: Number, default: 0, min: 0 },
    tier: { type: String, enum: ["Bronze", "Silver", "Gold", "Platinum"], default: "Bronze", index: true },
  },
  { timestamps: true },
);
export const LoyaltyAccountModel = model("LoyaltyAccount", loyaltySchema);

const loyaltyTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", required: true, index: true },
    type: { type: String, enum: ["earn", "redeem", "adjust"], required: true, index: true },
    points: { type: Number, required: true },
    reason: { type: String, required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true },
);
export const LoyaltyTransactionModel = model("LoyaltyTransaction", loyaltyTransactionSchema);

const seoSchema = new mongoose.Schema(
  {
    entityType: { type: String, enum: ["page", "blog", "destination", "package"], required: true, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    path: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    canonicalUrl: { type: String, required: true },
    openGraph: { type: mongoose.Schema.Types.Mixed, default: {} },
    twitter: { type: mongoose.Schema.Types.Mixed, default: {} },
    structuredData: { type: mongoose.Schema.Types.Mixed, default: {} },
    robots: { type: String, default: "index,follow" },
  },
  { timestamps: true },
);
export const SeoMetaModel = model("SeoMeta", seoSchema);

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", default: null, index: true },
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);
export const AuditLogModel = model("AuditLog", auditLogSchema);

const featureFlagSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: "" },
    enabled: { type: Boolean, default: false, index: true },
    rules: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);
export const FeatureFlagModel = model("FeatureFlag", featureFlagSchema);

const fileAssetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", default: null, index: true },
    publicId: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    folder: { type: String, required: true, index: true },
    resourceType: { type: String, default: "image" },
    format: { type: String, default: "" },
    bytes: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    tags: [{ type: String }],
  },
  { timestamps: true },
);
export const FileAssetModel = model("FileAsset", fileAssetSchema);

const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: { type: mongoose.Schema.Types.Mixed, required: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);
export const PushSubscriptionModel = model("PushSubscription", pushSubscriptionSchema);

const backupJobSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["mongo", "cloudinary"], required: true, index: true },
    status: { type: String, enum: ["queued", "running", "completed", "failed"], default: "queued", index: true },
    location: { type: String, default: "" },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    error: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);
export const BackupJobModel = model("BackupJob", backupJobSchema);
