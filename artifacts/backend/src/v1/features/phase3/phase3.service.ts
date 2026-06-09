import crypto from "node:crypto";
import sanitizeHtml from "sanitize-html";
import {
  ActivityModel,
  HotelModel,
  PhaseDestinationModel,
  PhaseReviewModel,
  PhaseWishlistModel,
  UserAccountModel,
} from "@workspace/db/src/schema/phase1";
import {
  AnalyticsEventModel,
  BlogModel,
  BookingModel,
  PaymentModel,
  TravelPackageModel,
} from "@workspace/db/src/schema/phase2";
import {
  AdminProfileModel,
  AuditLogModel,
  BackupJobModel,
  ChatSessionModel,
  CouponModel,
  CouponRedemptionModel,
  FeatureFlagModel,
  FileAssetModel,
  LoyaltyAccountModel,
  LoyaltyTransactionModel,
  PushSubscriptionModel,
  RecentlyViewedModel,
  ReferralModel,
  SearchAnalyticsModel,
  SeoMetaModel,
  SupportTicketModel,
} from "@workspace/db/src/schema/phase3";
import { AppError } from "../../shared/errors";
import { cacheGet, cacheSet } from "../../integrations/redis.service";
import { generateTripPlan } from "../../integrations/gemini.service";
import { uploadToCloudinary } from "../../shared/upload.service";
import { sendEmail } from "../../integrations/mail.service";
import { emitToUser } from "../../integrations/realtime.service";
import { getAdminAccess } from "./phase3.permissions";

const page = (query: Record<string, unknown>) => {
  const current = Math.max(1, Number(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
  return { current, limit, skip: (current - 1) * limit };
};

const tierFor = (points: number) => points >= 10000 ? "Platinum" : points >= 5000 ? "Gold" : points >= 1500 ? "Silver" : "Bronze";
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function audit(input: { userId?: string; action: string; entity: string; entityId?: string; metadata?: unknown; ip?: string; userAgent?: string }) {
  return AuditLogModel.create(input);
}

export const phase3Service = {
  async adminDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [totalRevenue, totalUsers, activeUsers, totalBookings, bookingsToday, pendingBookings, topDestinations, topPackages, reviewRatings, recentActivity] = await Promise.all([
      PaymentModel.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      UserAccountModel.countDocuments(),
      UserAccountModel.countDocuments({ updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
      BookingModel.countDocuments(),
      BookingModel.countDocuments({ createdAt: { $gte: today } }),
      BookingModel.countDocuments({ bookingStatus: "pending" }),
      PhaseDestinationModel.find().sort({ rating: -1 }).limit(10),
      TravelPackageModel.find().sort({ bookingCount: -1, rating: -1 }).limit(10),
      PhaseReviewModel.aggregate([{ $group: { _id: "$rating", count: { $sum: 1 } } }, { $sort: { _id: -1 } }]),
      AuditLogModel.find().sort({ timestamp: -1 }).limit(20),
    ]);
    return {
      totalRevenue: totalRevenue[0]?.total ?? 0,
      totalUsers,
      activeUsers,
      totalBookings,
      bookingsToday,
      pendingBookings,
      topDestinations,
      topPackages,
      reviewRatings,
      recentActivity,
    };
  },

  async adminList(entity: string, query: Record<string, unknown>) {
    const p = page(query);
    const models: Record<string, any> = {
      users: UserAccountModel,
      bookings: BookingModel,
      packages: TravelPackageModel,
      reviews: PhaseReviewModel,
      blogs: BlogModel,
      analytics: AnalyticsEventModel,
    };
    const model = models[entity];
    if (!model) throw new AppError(404, "Admin entity not found", "ADMIN_ENTITY_NOT_FOUND");
    const [items, total] = await Promise.all([
      model.find({}).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit),
      model.countDocuments({}),
    ]);
    return { items, pagination: { page: p.current, limit: p.limit, total, pages: Math.ceil(total / p.limit) } };
  },

  async setAdminRole(input: { userId: string; role: string; permissions?: string[] }) {
    const profile = await AdminProfileModel.findOneAndUpdate(
      { userId: input.userId },
      { role: input.role, permissions: input.permissions ?? [], active: true },
      { upsert: true, new: true },
    );
    return { profile };
  },

  async chat(userId: string, input: { sessionId?: string; message: string }) {
    const profile = await UserAccountModel.findById(userId).lean();
    const memory = input.sessionId ? await ChatSessionModel.findOne({ _id: input.sessionId, userId }) : null;
    const session = memory ?? await ChatSessionModel.create({ userId, messages: [] });
    session.messages.push({ role: "user", content: sanitizeHtml(input.message, { allowedTags: [], allowedAttributes: {} }) });
    const history = session.messages.slice(-12).map((m: any) => ({ role: m.role, content: m.content }));
    const response = await generateTripPlan(JSON.stringify({
      task: "AI travel assistant. Answer as JSON with answer, suggestions, recommendedDestinations, hotels, activities, budgetTips, weatherAdvice, packingAdvice, visaGuidance, transportGuidance.",
      user: profile ? { city: profile.city, country: profile.country, preferences: profile.travelPreferences } : {},
      conversation: history,
      latestMessage: input.message,
    }));
    session.messages.push({ role: "assistant", content: JSON.stringify(response) });
    await session.save();
    return { sessionId: session.id, response };
  },

  async recommendations(userId: string, type?: "destinations" | "packages") {
    const key = `recommendations:${userId}:${type ?? "all"}`;
    const cached = await cacheGet(key);
    if (cached) return cached;
    const [user, wishlist, bookings, reviews, recent] = await Promise.all([
      UserAccountModel.findById(userId).lean(),
      PhaseWishlistModel.find({ userId }).populate("destinationId").lean(),
      BookingModel.find({ userId }).populate("packageId").lean(),
      PhaseReviewModel.find({ userId }).lean(),
      RecentlyViewedModel.find({ userId }).sort({ viewedAt: -1 }).limit(20).lean(),
    ]);
    const text = [
      ...(user?.travelPreferences ?? []),
      ...wishlist.map((w: any) => w.destinationId?.state ?? ""),
      ...bookings.map((b: any) => b.packageId?.category ?? ""),
      ...recent.map((r: any) => r.entityType),
    ].filter(Boolean).join(" ");
    const search = text ? { $text: { $search: text } } : {};
    const [destinations, packages, hotels, activities] = await Promise.all([
      type === "packages" ? [] : PhaseDestinationModel.find(search).sort({ rating: -1 }).limit(12),
      type === "destinations" ? [] : TravelPackageModel.find(search).sort({ bookingCount: -1, rating: -1 }).limit(12),
      HotelModel.find().sort({ rating: -1 }).limit(8),
      ActivityModel.find().sort({ price: 1 }).limit(8),
    ]);
    const payload = { destinations, packages, hotels, activities, signals: { wishlist: wishlist.length, bookings: bookings.length, reviews: reviews.length } };
    await cacheSet(key, payload, 300);
    return payload;
  },

  async trackRecentlyViewed(userId: string, input: { entityId: string; entityType: string }) {
    const item = await RecentlyViewedModel.findOneAndUpdate(
      { userId, entityId: input.entityId, entityType: input.entityType },
      { viewedAt: new Date() },
      { upsert: true, new: true },
    );
    return { item };
  },

  async advancedSearch(userId: string | undefined, query: Record<string, unknown>) {
    const q = String(query.q ?? "").trim();
    const fuzzy = q ? new RegExp(escapeRegex(q), "i") : undefined;
    const filters = fuzzy ? { $or: [{ name: fuzzy }, { title: fuzzy }, { description: fuzzy }, { state: fuzzy }, { category: fuzzy }] } : {};
    const [destinations, hotels, packages, activities, blogs] = await Promise.all([
      PhaseDestinationModel.find(fuzzy ? { $or: [{ name: fuzzy }, { description: fuzzy }, { state: fuzzy }, { region: fuzzy }] } : {}).limit(10),
      HotelModel.find(fuzzy ? { $or: [{ name: fuzzy }, { description: fuzzy }, { address: fuzzy }] } : {}).limit(10),
      TravelPackageModel.find(filters).limit(10),
      ActivityModel.find(fuzzy ? { $or: [{ title: fuzzy }, { description: fuzzy }, { difficulty: fuzzy }] } : {}).limit(10),
      BlogModel.find(fuzzy ? { $or: [{ title: fuzzy }, { excerpt: fuzzy }, { category: fuzzy }] } : {}).limit(10),
    ]);
    const resultCount = destinations.length + hotels.length + packages.length + activities.length + blogs.length;
    if (q) await SearchAnalyticsModel.create({ userId, query: q, filters: query, resultCount });
    return { destinations, hotels, packages, activities, blogs, resultCount };
  },

  async searchSuggestions(q: string) {
    const regex = new RegExp(escapeRegex(q), "i");
    const [destinations, packages, popular] = await Promise.all([
      PhaseDestinationModel.find({ name: regex }).select("name slug").limit(6),
      TravelPackageModel.find({ title: regex }).select("title slug").limit(6),
      SearchAnalyticsModel.aggregate([{ $match: { query: regex } }, { $group: { _id: "$query", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 6 }]),
    ]);
    return { destinations, packages, popular: popular.map((item: { _id: string }) => item._id) };
  },

  async trendingSearches() {
    return { items: await SearchAnalyticsModel.aggregate([{ $group: { _id: "$query", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 20 }]) };
  },

  async createTicket(userId: string, input: any) {
    const ticket = await SupportTicketModel.create({ ...input, userId });
    return { ticket };
  },

  async listTickets(userId: string, role: string) {
    const access = await getAdminAccess(userId);
    const canManageSupport = access.permissions.includes("manage:support") || access.permissions.includes("manage:bookings");
    const filters = canManageSupport ? {} : { userId };
    return { items: await SupportTicketModel.find(filters).populate("userId assignedTo").sort({ createdAt: -1 }) };
  },

  async replyTicket(userId: string, id: string, input: any) {
    const ticket = await SupportTicketModel.findByIdAndUpdate(id, { $push: { replies: { ...input, userId } } }, { new: true });
    if (!ticket) throw new AppError(404, "Ticket not found", "TICKET_NOT_FOUND");
    emitToUser(ticket.userId.toString(), "support:reply", ticket);
    return { ticket };
  },

  async closeTicket(id: string) {
    return { ticket: await SupportTicketModel.findByIdAndUpdate(id, { status: "closed" }, { new: true }) };
  },

  async createCoupon(input: any) {
    return { coupon: await CouponModel.create({ ...input, code: input.code.toUpperCase(), startDate: new Date(input.startDate), endDate: new Date(input.endDate) }) };
  },

  async validateCoupon(userId: string, input: any) {
    const coupon = await CouponModel.findOne({ code: input.code.toUpperCase(), active: true });
    if (!coupon) throw new AppError(404, "Coupon not found", "COUPON_NOT_FOUND");
    const now = new Date();
    if (coupon.startDate > now || coupon.endDate < now) throw new AppError(400, "Coupon is not active for this date", "COUPON_EXPIRED");
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) throw new AppError(400, "Coupon usage limit reached", "COUPON_LIMIT");
    if (coupon.firstTimeUserOnly && await BookingModel.exists({ userId })) throw new AppError(400, "Coupon is for first-time users only", "COUPON_FIRST_TIME_ONLY");
    if (coupon.packageId && input.packageId && coupon.packageId.toString() !== input.packageId) throw new AppError(400, "Coupon not valid for this package", "COUPON_PACKAGE_MISMATCH");
    if (coupon.destinationId && input.destinationId && coupon.destinationId.toString() !== input.destinationId) throw new AppError(400, "Coupon not valid for this destination", "COUPON_DESTINATION_MISMATCH");
    const discountAmount = coupon.discountType === "percentage"
      ? Math.min(input.amount, Math.round(input.amount * coupon.discountValue / 100))
      : Math.min(input.amount, coupon.discountValue);
    return { coupon, discountAmount, finalAmount: Math.max(0, input.amount - discountAmount) };
  },

  async applyCoupon(userId: string, input: any) {
    const result = await this.validateCoupon(userId, input);
    await CouponModel.updateOne({ _id: result.coupon.id }, { $inc: { usedCount: 1 } });
    await CouponRedemptionModel.create({ couponId: result.coupon.id, userId, discountAmount: result.discountAmount });
    return result;
  },

  async listCoupons() {
    return { items: await CouponModel.find().sort({ createdAt: -1 }) };
  },

  async referralCode(userId: string) {
    const code = `WNDR${userId.slice(-6).toUpperCase()}`;
    await ReferralModel.updateOne({ referrerId: userId, referralCode: code }, { $setOnInsert: { referrerId: userId, referralCode: code } }, { upsert: true });
    return { code };
  },

  async trackReferral(userId: string, input: any) {
    const referral = await ReferralModel.findOneAndUpdate(
      { referralCode: input.referralCode.toUpperCase(), referredUserId: null },
      { referredUserId: input.referredUserId ?? userId, status: "completed", rewardAmount: 250 },
      { new: true },
    );
    if (!referral) throw new AppError(404, "Referral code not found or already used", "REFERRAL_INVALID");
    await this.adjustLoyalty(referral.referrerId.toString(), { points: 250, reason: "Referral reward", type: "earn" });
    return { referral };
  },

  async referralAnalytics(userId: string) {
    return { items: await ReferralModel.find({ referrerId: userId }).sort({ createdAt: -1 }) };
  },

  async adjustLoyalty(userId: string, input: { points: number; reason: string; referenceId?: string; type?: "earn" | "redeem" | "adjust" }) {
    const type = input.type ?? (input.points >= 0 ? "earn" : "redeem");
    const account = await LoyaltyAccountModel.findOneAndUpdate(
      { userId },
      { $inc: { points: input.points, lifetimePoints: Math.max(0, input.points) } },
      { upsert: true, new: true },
    );
    account.tier = tierFor(account.lifetimePoints);
    if (account.points < 0) throw new AppError(400, "Not enough loyalty points", "LOYALTY_INSUFFICIENT");
    await account.save();
    await LoyaltyTransactionModel.create({ userId, type, points: input.points, reason: input.reason, referenceId: input.referenceId });
    return { account };
  },

  async loyalty(userId: string) {
    const account = await LoyaltyAccountModel.findOneAndUpdate({ userId }, { $setOnInsert: { userId } }, { upsert: true, new: true });
    const history = await LoyaltyTransactionModel.find({ userId }).sort({ createdAt: -1 }).limit(100);
    return { account, history };
  },

  async upsertSeo(input: any) {
    return { seo: await SeoMetaModel.findOneAndUpdate({ path: input.path }, input, { upsert: true, new: true }) };
  },

  async getSeo(path: string) {
    return { seo: await SeoMetaModel.findOne({ path }) };
  },

  async sitemap(baseUrl: string) {
    const [destinations, packages, blogs] = await Promise.all([
      PhaseDestinationModel.find().select("slug updatedAt"),
      TravelPackageModel.find({ status: "published" }).select("slug updatedAt"),
      BlogModel.find({ published: true }).select("slug updatedAt"),
    ]);
    const urls = [
      ...destinations.map((d: any) => `${baseUrl}/destinations/${d.slug}`),
      ...packages.map((p: any) => `${baseUrl}/packages/${p.slug}`),
      ...blogs.map((b: any) => `${baseUrl}/blogs/${b.slug}`),
    ];
    return urls;
  },

  async auditLogs(query: Record<string, unknown>) {
    const p = page(query);
    const [items, total] = await Promise.all([
      AuditLogModel.find().sort({ timestamp: -1 }).skip(p.skip).limit(p.limit),
      AuditLogModel.countDocuments(),
    ]);
    return { items, pagination: { page: p.current, limit: p.limit, total, pages: Math.ceil(total / p.limit) } };
  },

  async uploadFiles(userId: string, input: { files: string[]; folder: string; tags: string[] }) {
    const uploaded = [];
    for (const file of input.files) {
      const result = await uploadToCloudinary({ file, folder: input.folder });
      uploaded.push(await FileAssetModel.create({ userId, publicId: result.publicId, url: result.url, folder: input.folder, tags: input.tags }));
    }
    return { files: uploaded };
  },

  async deleteFile(publicId: string) {
    await FileAssetModel.deleteOne({ publicId });
    return { success: true };
  },

  async flags() {
    return { items: await FeatureFlagModel.find().sort({ key: 1 }) };
  },

  async upsertFlag(input: any) {
    return { flag: await FeatureFlagModel.findOneAndUpdate({ key: input.key }, input, { upsert: true, new: true }) };
  },

  async subscribePush(userId: string, input: any) {
    return { subscription: await PushSubscriptionModel.findOneAndUpdate({ endpoint: input.endpoint }, { ...input, userId, active: true }, { upsert: true, new: true }) };
  },

  async push(userId: string, input: { title: string; message: string }) {
    emitToUser(userId, "push", input);
    return { deliveredRealtime: true };
  },

  async template(name: string, data: Record<string, string>) {
    const templates: Record<string, string> = {
      welcome: "<h1>Welcome to Wandr, {{name}}</h1><p>Your next journey starts here.</p>",
      booking: "<h1>Booking Confirmed</h1><p>Reference: {{reference}}</p>",
      payment: "<h1>Payment Successful</h1><p>Amount: ₹{{amount}}</p>",
      reset: "<h1>Password Reset</h1><p>Use token: {{token}}</p>",
      review: "<h1>How was your trip?</h1><p>Share your review for {{destination}}</p>",
      referral: "<h1>Invite Friends</h1><p>Your referral code is {{code}}</p>",
      newsletter: "<h1>Wandr Newsletter</h1><p>{{content}}</p>",
    };
    const template = templates[name];
    if (!template) throw new AppError(404, "Template not found", "TEMPLATE_NOT_FOUND");
    return Object.entries(data).reduce((html, [key, value]) => html.replaceAll(`{{${key}}}`, value), template);
  },

  async sendTemplateEmail(input: { to: string; template: string; data: Record<string, string>; subject: string }) {
    const html = await this.template(input.template, input.data);
    await sendEmail({ to: input.to, subject: input.subject, html });
    return { success: true };
  },

  async queueBackup(type: "mongo" | "cloudinary") {
    const job = await BackupJobModel.create({
      type,
      status: "queued",
      metadata: {
        strategy: type === "mongo" ? "mongodump --uri=$MONGODB_URI --archive=backup.archive --gzip" : "Cloudinary Admin API export by folder",
      },
    });
    return { job };
  },

  async backupJobs() {
    return { items: await BackupJobModel.find().sort({ createdAt: -1 }) };
  },

  async monitoring() {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid,
      node: process.version,
      env: process.env.NODE_ENV ?? "development",
    };
  },
};
