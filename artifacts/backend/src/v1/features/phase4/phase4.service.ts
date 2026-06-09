import {
  ActivityModel,
  HotelModel,
  PhaseDestinationModel,
  PhaseWishlistModel,
} from "@workspace/db/src/schema/phase1";
import { BookingModel, TravelPackageModel } from "@workspace/db/src/schema/phase2";
import { SearchAnalyticsModel } from "@workspace/db/src/schema/phase3";
import {
  ApiMetricModel,
  BookingQueueModel,
  BusinessInsightModel,
  CacheEntryModel,
  DynamicPricingRuleModel,
  PerformanceAuditModel,
  SentryEventModel,
  TransportSearchModel,
} from "@workspace/db/src/schema/phase4";
import { cacheGet, cacheSet, getRedisClient } from "../../integrations/redis.service";
import { AppError } from "../../shared/errors";
import { flightProvider, searchBuses, searchTrains, trainDetails } from "./transport.adapters";
import { calculateDynamicPrice } from "./pricing.engine";
import { captureSentryMessage } from "../../integrations/sentry.service";

const cacheGroups = ["destinations", "packages", "hotels", "weather", "search"];

export const phase4Service = {
  async searchFlights(userId: string | undefined, query: any) {
    const started = Date.now();
    const results = await flightProvider.search(query);
    await TransportSearchModel.create({ userId, type: "flight", provider: flightProvider.name, query, results, resultCount: results.length, durationMs: Date.now() - started });
    return { provider: flightProvider.name, items: results };
  },

  async flightDetails(id: string) {
    const recent = await TransportSearchModel.findOne({ type: "flight", "results.id": id }).sort({ createdAt: -1 }).lean();
    const results = Array.isArray(recent?.results) ? recent.results as Array<Record<string, unknown>> : [];
    const offer = results.find((item) => String(item.id) === id);
    if (offer) return { provider: recent?.provider, flight: offer };
    return flightProvider.details(id);
  },

  async trains(userId: string | undefined, query: Record<string, unknown>) {
    const started = Date.now();
    const results = await searchTrains(query);
    await TransportSearchModel.create({ userId, type: "train", provider: "internal-train-adapter", query, results, resultCount: results.length, durationMs: Date.now() - started });
    return { items: results };
  },

  async train(id: string) {
    const recent = await TransportSearchModel.findOne({ type: "train", "results.id": id }).sort({ createdAt: -1 }).lean();
    const results = Array.isArray(recent?.results) ? recent.results as Array<Record<string, unknown>> : [];
    const train = results.find((item) => String(item.id) === id) ?? await trainDetails(id);
    return { train };
  },

  async buses(userId: string | undefined, query: Record<string, unknown>) {
    const started = Date.now();
    const results = await searchBuses(query);
    await TransportSearchModel.create({ userId, type: "bus", provider: "internal-bus-adapter", query, results, resultCount: results.length, durationMs: Date.now() - started });
    return { items: results };
  },

  async pricing(input: any) {
    const rule = await DynamicPricingRuleModel.findOne({
      entityType: input.entityType,
      active: true,
      $or: [{ entityId: input.entityId ?? null }, { entityId: null }],
    }).sort({ entityId: -1 });
    return calculateDynamicPrice({
      basePrice: input.basePrice,
      date: input.date ? new Date(input.date) : new Date(),
      demand: input.demand,
      occupancy: input.occupancy,
      holiday: input.holiday,
      rule,
    });
  },

  async upsertPricingRule(input: any) {
    return { rule: await DynamicPricingRuleModel.findOneAndUpdate({ entityType: input.entityType, entityId: input.entityId ?? null, name: input.name }, input, { upsert: true, new: true }) };
  },

  async personalizedHomepage(userId: string) {
    const key = `homepage:${userId}`;
    const cached = await cacheGet(key);
    if (cached) return cached;
    const [wishlist, bookings, searches, packages, destinations] = await Promise.all([
      PhaseWishlistModel.find({ userId }).populate("destinationId").limit(20).lean(),
      BookingModel.find({ userId }).populate("packageId").limit(20).lean(),
      SearchAnalyticsModel.find({ userId }).sort({ createdAt: -1 }).limit(10).lean(),
      TravelPackageModel.find({ status: "published" }).sort({ bookingCount: -1, rating: -1 }).limit(12),
      PhaseDestinationModel.find().sort({ rating: -1 }).limit(12),
    ]);
    const payload = {
      recommendedPackages: packages,
      recommendedDestinations: destinations,
      trendingNearUser: destinations.slice(0, 6),
      signals: { wishlist: wishlist.length, bookings: bookings.length, previousSearches: searches.map(s => s.query) },
    };
    await cacheSet(key, payload, 300);
    return payload;
  },

  async queueBooking(userId: string, input: any) {
    const item = await BookingQueueModel.create({
      userId,
      packageId: input.packageId,
      bookingId: input.bookingId,
      priority: input.priority,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    return { queueItem: item };
  },

  async processBookingQueue() {
    const item = await BookingQueueModel.findOneAndUpdate({ status: "queued", expiresAt: { $gt: new Date() } }, { status: "processing" }, { sort: { priority: -1, createdAt: 1 }, new: true });
    if (!item) return { processed: false };
    item.status = "completed";
    await item.save();
    return { processed: true, queueItem: item };
  },

  async cacheWarm() {
    const [destinations, packages, hotels] = await Promise.all([
      PhaseDestinationModel.find().sort({ rating: -1 }).limit(50),
      TravelPackageModel.find({ status: "published" }).sort({ rating: -1 }).limit(50),
      HotelModel.find().sort({ rating: -1 }).limit(50),
    ]);
    await Promise.all([
      cacheSet("warm:destinations", { items: destinations }, 600),
      cacheSet("warm:packages", { items: packages }, 600),
      cacheSet("warm:hotels", { items: hotels }, 600),
      ...cacheGroups.map(group => CacheEntryModel.findOneAndUpdate({ key: `warm:${group}` }, { key: `warm:${group}`, group, ttlSeconds: 600, warmedAt: new Date() }, { upsert: true })),
    ]);
    return { warmed: cacheGroups };
  },

  async cacheInvalidate(group: string) {
    const redis = await getRedisClient();
    if (redis) {
      const keys = await redis.keys(`${group}:*`);
      if (keys.length) await redis.del(keys);
    }
    await CacheEntryModel.updateMany({ group }, { invalidatedAt: new Date() });
    return { invalidated: group };
  },

  async atlasSearch(query: Record<string, unknown>) {
    const q = String(query.q ?? "").trim();
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const [destinations, packages, hotels, activities] = await Promise.all([
      PhaseDestinationModel.find({ $or: [{ name: regex }, { state: regex }, { description: regex }] }).sort({ rating: -1 }).limit(20),
      TravelPackageModel.find({ $or: [{ title: regex }, { category: regex }, { description: regex }] }).sort({ bookingCount: -1, rating: -1 }).limit(20),
      HotelModel.find({ $or: [{ name: regex }, { address: regex }, { description: regex }] }).sort({ rating: -1 }).limit(20),
      ActivityModel.find({ $or: [{ title: regex }, { description: regex }] }).sort({ price: 1 }).limit(20),
    ]);
    return { destinations, packages, hotels, activities, relevance: "regex-fallback-atlas-search-ready" };
  },

  async apiMetrics() {
    return { items: await ApiMetricModel.aggregate([{ $group: { _id: "$path", avgMs: { $avg: "$durationMs" }, count: { $sum: 1 }, p95: { $max: "$durationMs" } } }, { $sort: { avgMs: -1 } }, { $limit: 50 }]) };
  },

  async performanceAudit() {
    const metrics = await ApiMetricModel.aggregate([{ $group: { _id: "$path", avgMs: { $avg: "$durationMs" } } }]);
    const created = await PerformanceAuditModel.insertMany(metrics.map((m: any) => ({
      category: "api",
      metric: `avg:${m._id}`,
      value: Math.round(m.avgMs),
      threshold: 300,
      status: m.avgMs <= 300 ? "pass" : m.avgMs <= 600 ? "warn" : "fail",
      metadata: m,
    })), { ordered: false }).catch(() => []);
    return { items: created };
  },

  async imageTransform(url: string) {
    if (!url.includes("res.cloudinary.com")) return { url };
    return {
      webp: url.replace("/upload/", "/upload/f_auto,q_auto,c_limit,w_1200/"),
      avif: url.replace("/upload/", "/upload/f_avif,q_auto,c_limit,w_1200/"),
      responsive: [480, 768, 1200].map(width => url.replace("/upload/", `/upload/f_auto,q_auto,c_limit,w_${width}/`)),
    };
  },

  async mobileResponse(data: unknown) {
    return { success: true, apiVersion: "v2", data, meta: { serverTime: new Date().toISOString() } };
  },

  async businessInsights() {
    const [revenue, bookings, users, abandoned] = await Promise.all([
      BookingModel.aggregate([{ $match: { paymentStatus: "paid" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      BookingModel.countDocuments(),
      BookingModel.countDocuments({ bookingStatus: "completed" }),
      BookingModel.countDocuments({ bookingStatus: "pending", createdAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) } }),
    ]);
    const conversion = bookings ? users / bookings : 0;
    const insights = [
      { key: "revenue_forecast", label: "Revenue Forecast", value: Math.round((revenue[0]?.total ?? 0) * 1.15), trend: 15 },
      { key: "booking_conversion", label: "Booking Conversion", value: conversion, trend: 0 },
      { key: "abandoned_bookings", label: "Abandoned Bookings", value: abandoned, trend: 0 },
      { key: "customer_retention", label: "Customer Retention", value: bookings ? users / bookings : 0, trend: 0 },
    ];
    await BusinessInsightModel.bulkWrite(insights.map(item => ({ updateOne: { filter: { key: item.key }, update: item, upsert: true } })));
    return { items: insights };
  },

  async captureError(input: { source: string; message: string; level?: string; metadata?: unknown }) {
    const eventId = await captureSentryMessage(input);
    const item = await SentryEventModel.create({ ...input, eventId });
    return { item };
  },
};
