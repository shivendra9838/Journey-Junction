import crypto from "node:crypto";
import mongoose from "mongoose";
import {
  ActivityModel,
  HotelModel,
  PhaseDestinationModel,
  UserAccountModel,
} from "@workspace/db/src/schema/phase1";
import {
  AnalyticsEventModel,
  BlogModel,
  BookingModel,
  HotelInventoryModel,
  InventoryLockModel,
  ItineraryDayModel,
  NotificationModel,
  PackageInventoryModel,
  PaymentModel,
  TravelPackageModel,
  WeatherModel,
} from "@workspace/db/src/schema/phase2";
import { AppError } from "../../shared/errors";
import { slugify } from "../../shared/slug";
import { cacheGet, cacheSet } from "../../integrations/redis.service";
import { fetchOpenWeather } from "../../integrations/openweather.service";
import { generateTripPlan } from "../../integrations/gemini.service";
import { createStripePaymentIntent, refundStripePaymentIntent, verifyStripePaymentIntent } from "../../integrations/stripe.service";
import { sendEmail } from "../../integrations/mail.service";
import { emitToUser } from "../../integrations/realtime.service";

const page = (query: Record<string, unknown>) => {
  const current = Math.max(1, Number(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 12)));
  return { current, limit, skip: (current - 1) * limit };
};

const ref = () => `WNDR-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

async function notify(userId: string, title: string, message: string, type: string) {
  const notification = await NotificationModel.create({ userId, title, message, type });
  emitToUser(userId, "notification", notification.toJSON());
  const user = await UserAccountModel.findById(userId).lean();
  if (user?.email) {
    await sendEmail({
      to: user.email,
      subject: title,
      text: message,
      html: `<p>${message}</p>`,
    });
  }
  return notification;
}

async function acquireInventoryLock(input: {
  userId: string;
  packageId: string;
  hotelId?: string;
  travellers: number;
  checkInDate: Date;
  checkOutDate: Date;
}) {
  const packageInventory = await PackageInventoryModel.findOneAndUpdate(
    { packageId: input.packageId, availableSeats: { $gte: input.travellers } },
    { $inc: { availableSeats: -input.travellers, blockedSeats: input.travellers } },
    { new: true },
  );
  if (!packageInventory) throw new AppError(409, "Package seats are not available", "PACKAGE_OVERBOOKING_PREVENTED");

  let rooms = 0;
  if (input.hotelId) {
    rooms = Math.ceil(input.travellers / 2);
    const hotelInventory = await HotelInventoryModel.findOneAndUpdate(
      {
        hotelId: input.hotelId,
        availableRooms: { $gte: rooms },
        blockedDates: { $not: { $elemMatch: { $gte: input.checkInDate, $lt: input.checkOutDate } } },
      },
      { $inc: { availableRooms: -rooms } },
      { new: true },
    );
    if (!hotelInventory) {
      await PackageInventoryModel.updateOne(
        { packageId: input.packageId },
        { $inc: { availableSeats: input.travellers, blockedSeats: -input.travellers } },
      );
      throw new AppError(409, "Hotel rooms are not available", "HOTEL_OVERBOOKING_PREVENTED");
    }
  }

  return InventoryLockModel.create({
    userId: input.userId,
    packageId: input.packageId,
    hotelId: input.hotelId,
    seats: input.travellers,
    rooms,
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
}

async function releaseLock(lockId: string) {
  const lock = await InventoryLockModel.findById(lockId);
  if (!lock || lock.status !== "active") return;
  await PackageInventoryModel.updateOne(
    { packageId: lock.packageId },
    { $inc: { availableSeats: lock.seats, blockedSeats: -lock.seats } },
  );
  if (lock.hotelId && lock.rooms > 0) {
    await HotelInventoryModel.updateOne({ hotelId: lock.hotelId }, { $inc: { availableRooms: lock.rooms } });
  }
  lock.status = "released";
  await lock.save();
}

export const phase2Service = {
  async listPackages(query: Record<string, unknown>) {
    const p = page(query);
    const filters: Record<string, unknown> = {};
    if (query.q) filters.$text = { $search: String(query.q) };
    if (query.category) filters.category = query.category;
    if (query.featured) filters.featured = query.featured === "true";
    if (query.status) filters.status = query.status;
    const [items, total] = await Promise.all([
      TravelPackageModel.find(filters).populate("destinationId").sort({ featured: -1, rating: -1, bookingCount: -1 }).skip(p.skip).limit(p.limit),
      TravelPackageModel.countDocuments(filters),
    ]);
    return { items, pagination: { page: p.current, limit: p.limit, total, pages: Math.ceil(total / p.limit) } };
  },

  async createPackage(input: any) {
    const payload = { ...input, slug: slugify(input.slug || input.title) };
    const item = await TravelPackageModel.create(payload);
    await PackageInventoryModel.findOneAndUpdate(
      { packageId: item.id },
      { packageId: item.id, availableSeats: input.availableSeats, blockedSeats: 0 },
      { upsert: true, new: true },
    );
    if (input.itinerary?.length) await this.upsertItinerary(item.id, input.itinerary);
    return this.getPackage(item.slug);
  },

  async updatePackage(id: string, input: any) {
    const payload = { ...input };
    if (payload.title || payload.slug) payload.slug = slugify(payload.slug || payload.title);
    const item = await TravelPackageModel.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    if (!item) throw new AppError(404, "Package not found", "PACKAGE_NOT_FOUND");
    if (typeof input.availableSeats === "number") {
      await PackageInventoryModel.findOneAndUpdate({ packageId: id }, { $set: { availableSeats: input.availableSeats } }, { upsert: true });
    }
    if (input.itinerary?.length) await this.upsertItinerary(id, input.itinerary);
    return { package: item };
  },

  async deletePackage(id: string) {
    const item = await TravelPackageModel.findByIdAndDelete(id);
    if (!item) throw new AppError(404, "Package not found", "PACKAGE_NOT_FOUND");
    await Promise.all([ItineraryDayModel.deleteMany({ packageId: id }), PackageInventoryModel.deleteOne({ packageId: id })]);
    return { success: true };
  },

  async getPackage(slug: string) {
    const item = await TravelPackageModel.findOneAndUpdate({ slug }, { $inc: { viewCount: 1 } }, { new: true }).populate("destinationId");
    if (!item) throw new AppError(404, "Package not found", "PACKAGE_NOT_FOUND");
    const itinerary = await ItineraryDayModel.find({ packageId: item.id }).sort({ dayNumber: 1 });
    await AnalyticsEventModel.create({ entityId: item.destinationId, entityType: "destination", eventType: "view" });
    return { package: item, itinerary };
  },

  async featuredPackages() {
    return { items: await TravelPackageModel.find({ featured: true, status: "published" }).sort({ rating: -1 }).limit(12) };
  },

  async trendingPackages() {
    return { items: await TravelPackageModel.find({ status: "published" }).sort({ bookingCount: -1, viewCount: -1, rating: -1 }).limit(12) };
  },

  async upsertItinerary(packageId: string, days: any[]) {
    await Promise.all(days.map(day => ItineraryDayModel.findOneAndUpdate(
      { packageId, dayNumber: day.dayNumber },
      { ...day, packageId },
      { upsert: true, new: true, runValidators: true },
    )));
    return { items: await ItineraryDayModel.find({ packageId }).sort({ dayNumber: 1 }) };
  },

  async createBooking(userId: string, input: any) {
    const pkg = await TravelPackageModel.findById(input.packageId);
    if (!pkg) throw new AppError(404, "Package not found", "PACKAGE_NOT_FOUND");
    const checkInDate = new Date(input.checkInDate);
    const checkOutDate = new Date(input.checkOutDate);
    if (checkOutDate <= checkInDate) throw new AppError(400, "checkOutDate must be after checkInDate", "INVALID_DATES");
    const lock = await acquireInventoryLock({ userId, packageId: input.packageId, hotelId: input.hotelId, travellers: input.travellers, checkInDate, checkOutDate });
    const amount = (pkg.discountPrice || pkg.price) * input.travellers;
    const booking = await BookingModel.create({
      userId,
      packageId: input.packageId,
      hotelId: input.hotelId,
      travellers: input.travellers,
      checkInDate,
      checkOutDate,
      amount,
      bookingReference: ref(),
      inventoryLockId: lock.id,
    });
    await AnalyticsEventModel.create({ userId, entityId: booking.id, entityType: "booking", eventType: "booking_created", amount });
    return { booking, lock };
  },

  async cancelBooking(userId: string, role: string, id: string) {
    const booking = await BookingModel.findById(id);
    if (!booking) throw new AppError(404, "Booking not found", "BOOKING_NOT_FOUND");
    if (role !== "admin" && booking.userId.toString() !== userId) throw new AppError(403, "Forbidden", "FORBIDDEN");
    if (booking.bookingStatus === "cancelled") return { booking };
    booking.bookingStatus = "cancelled";
    if (booking.inventoryLockId) await releaseLock(booking.inventoryLockId.toString());
    await booking.save();
    await notify(booking.userId.toString(), "Booking Cancelled", `Booking ${booking.bookingReference} has been cancelled.`, "booking_cancelled");
    return { booking };
  },

  async getBooking(userId: string, role: string, id: string) {
    const booking = await BookingModel.findById(id).populate("packageId hotelId");
    if (!booking) throw new AppError(404, "Booking not found", "BOOKING_NOT_FOUND");
    if (role !== "admin" && booking.userId.toString() !== userId) throw new AppError(403, "Forbidden", "FORBIDDEN");
    return { booking };
  },

  async bookingHistory(userId: string) {
    return { items: await BookingModel.find({ userId }).populate("packageId hotelId").sort({ createdAt: -1 }) };
  },

  async setInventory(input: any) {
    if (input.packageId) {
      return { inventory: await PackageInventoryModel.findOneAndUpdate({ packageId: input.packageId }, input, { upsert: true, new: true }) };
    }
    if (input.hotelId) {
      return { inventory: await HotelInventoryModel.findOneAndUpdate(
        { hotelId: input.hotelId },
        { ...input, blockedDates: input.blockedDates?.map((date: string) => new Date(date)) },
        { upsert: true, new: true },
      ) };
    }
    throw new AppError(400, "packageId or hotelId is required", "INVENTORY_TARGET_REQUIRED");
  },

  async availability(query: Record<string, unknown>) {
    const [packageInventory, hotelInventory] = await Promise.all([
      query.packageId ? PackageInventoryModel.findOne({ packageId: query.packageId }) : null,
      query.hotelId ? HotelInventoryModel.findOne({ hotelId: query.hotelId }) : null,
    ]);
    return { packageInventory, hotelInventory };
  },

  async createPaymentOrder(userId: string, bookingId: string) {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) throw new AppError(404, "Booking not found", "BOOKING_NOT_FOUND");
    if (booking.userId.toString() !== userId) throw new AppError(403, "Forbidden", "FORBIDDEN");
    const paymentIntent = await createStripePaymentIntent({ amount: booking.amount, receipt: booking.bookingReference, notes: { bookingId } });
    const payment = await PaymentModel.create({
      userId,
      bookingId,
      provider: "stripe",
      providerOrderId: paymentIntent.id,
      stripePaymentIntentId: paymentIntent.id,
      amount: booking.amount,
      currency: paymentIntent.currency.toUpperCase(),
      status: "created",
    });
    return { paymentIntent, payment };
  },

  async verifyPayment(userId: string, input: any) {
    const { paymentIntent, isPaid } = await verifyStripePaymentIntent(input.stripePaymentIntentId);
    if (!isPaid) throw new AppError(400, "Stripe payment is not completed", "PAYMENT_NOT_COMPLETED");
    const payment = await PaymentModel.findOneAndUpdate(
      { userId, bookingId: input.bookingId, stripePaymentIntentId: input.stripePaymentIntentId },
      { providerPaymentId: paymentIntent.latest_charge ?? paymentIntent.id, status: "paid" },
      { new: true },
    );
    if (!payment) throw new AppError(404, "Payment not found", "PAYMENT_NOT_FOUND");
    const booking = await BookingModel.findByIdAndUpdate(input.bookingId, { paymentStatus: "paid", bookingStatus: "confirmed" }, { new: true });
    if (booking?.inventoryLockId) await InventoryLockModel.findByIdAndUpdate(booking.inventoryLockId, { status: "consumed" });
    await TravelPackageModel.findByIdAndUpdate(booking?.packageId, { $inc: { bookingCount: 1 } });
    await AnalyticsEventModel.create({ userId, entityId: booking?.id, entityType: "booking", eventType: "payment_success", amount: payment.amount });
    await notify(userId, "Payment Successful", `Payment for booking ${booking?.bookingReference} is successful.`, "payment_successful");
    await notify(userId, "Booking Confirmed", `Booking ${booking?.bookingReference} is confirmed.`, "booking_confirmed");
    return { payment, booking };
  },

  async refundPayment(userId: string, role: string, paymentId: string, amount?: number) {
    const payment = await PaymentModel.findById(paymentId);
    if (!payment) throw new AppError(404, "Payment not found", "PAYMENT_NOT_FOUND");
    if (role !== "admin" && payment.userId.toString() !== userId) throw new AppError(403, "Forbidden", "FORBIDDEN");
    const refund = await refundStripePaymentIntent(payment.stripePaymentIntentId, amount ?? payment.amount);
    payment.status = "refunded";
    await payment.save();
    await BookingModel.findByIdAndUpdate(payment.bookingId, { paymentStatus: "refunded", bookingStatus: "cancelled" });
    return { payment, refund };
  },

  async paymentHistory(userId: string) {
    return { items: await PaymentModel.find({ userId }).populate("bookingId").sort({ createdAt: -1 }) };
  },

  async weather(destinationIdOrSlug: string) {
    const destination = mongoose.isValidObjectId(destinationIdOrSlug)
      ? await PhaseDestinationModel.findById(destinationIdOrSlug)
      : await PhaseDestinationModel.findOne({ slug: destinationIdOrSlug });
    if (!destination) throw new AppError(404, "Destination not found", "DESTINATION_NOT_FOUND");
    const key = `weather:${destination.id}`;
    const cached = await cacheGet(key);
    if (cached) return cached;
    const fresh = await fetchOpenWeather(destination.latitude, destination.longitude);
    const first = fresh.list[0];
    const payload = {
      destinationId: destination.id,
      temperature: first.main.temp,
      humidity: first.main.humidity,
      rainChance: Math.round((first.pop ?? 0) * 100),
      forecast: fresh.list.slice(0, 8),
      refreshedAt: new Date(),
    };
    const weather = await WeatherModel.findOneAndUpdate({ destinationId: destination.id }, payload, { upsert: true, new: true });
    const response = { weather };
    await cacheSet(key, response, 15 * 60);
    return response;
  },

  async planner(input: any) {
    const [destinations, hotels, activities] = await Promise.all([
      PhaseDestinationModel.find({ $text: { $search: input.destination } }).limit(5),
      HotelModel.find().sort({ rating: -1, pricePerNight: 1 }).limit(5),
      ActivityModel.find().sort({ price: 1 }).limit(10),
    ]);
    return generateTripPlan(JSON.stringify({
      instruction: "Generate budget optimized day-wise JSON with itinerary, hotels, activities, estimatedCost, recommendations.",
      input,
      availableDestinations: destinations,
      availableHotels: hotels,
      availableActivities: activities,
    }));
  },

  async listNotifications(userId: string) {
    return { items: await NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(100) };
  },

  async markNotificationRead(userId: string, id: string) {
    return { notification: await NotificationModel.findOneAndUpdate({ _id: id, userId }, { isRead: true }, { new: true }) };
  },

  async listBlogs(query: Record<string, unknown>) {
    const p = page(query);
    const filters: Record<string, unknown> = {};
    if (query.q) filters.$text = { $search: String(query.q) };
    if (query.category) filters.category = query.category;
    if (query.published !== undefined) filters.published = query.published === "true";
    const [items, total] = await Promise.all([
      BlogModel.find(filters).sort({ published: -1, createdAt: -1 }).skip(p.skip).limit(p.limit),
      BlogModel.countDocuments(filters),
    ]);
    return { items, pagination: { page: p.current, limit: p.limit, total, pages: Math.ceil(total / p.limit) } };
  },

  async createBlog(input: any) {
    return { blog: await BlogModel.create({ ...input, slug: slugify(input.slug || input.title) }) };
  },

  async getBlog(slug: string) {
    const blog = await BlogModel.findOneAndUpdate({ slug }, { $inc: { viewCount: 1 } }, { new: true });
    if (!blog) throw new AppError(404, "Blog not found", "BLOG_NOT_FOUND");
    return { blog };
  },

  async updateBlog(id: string, input: any) {
    const payload = { ...input };
    if (payload.title || payload.slug) payload.slug = slugify(payload.slug || payload.title);
    const blog = await BlogModel.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    if (!blog) throw new AppError(404, "Blog not found", "BLOG_NOT_FOUND");
    return { blog };
  },

  async deleteBlog(id: string) {
    await BlogModel.findByIdAndDelete(id);
    return { success: true };
  },

  async analyticsDashboard() {
    const startMonth = new Date();
    startMonth.setDate(1);
    startMonth.setHours(0, 0, 0, 0);
    const [totalUsers, totalBookings, revenue, topPackages, mostViewed] = await Promise.all([
      UserAccountModel.countDocuments(),
      BookingModel.countDocuments(),
      PaymentModel.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      TravelPackageModel.find().sort({ bookingCount: -1, rating: -1 }).limit(5),
      AnalyticsEventModel.aggregate([
        { $match: { entityType: "destination", eventType: "view" } },
        { $group: { _id: "$entityId", views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 1 },
      ]),
    ]);
    const destination = mostViewed[0]?._id ? await PhaseDestinationModel.findById(mostViewed[0]._id) : null;
    return { totalUsers, totalBookings, totalRevenue: revenue[0]?.total ?? 0, mostViewedDestination: destination, topPackages };
  },

  async revenue() {
    return { items: await PaymentModel.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, revenue: { $sum: "$amount" } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]) };
  },

  async bookingsAnalytics() {
    return { items: await BookingModel.aggregate([
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" }, status: "$bookingStatus" }, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]) };
  },

  async usersAnalytics() {
    return { items: await UserAccountModel.aggregate([
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]) };
  },
};
