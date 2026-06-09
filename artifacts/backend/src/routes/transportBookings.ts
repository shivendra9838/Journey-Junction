import { Router, type IRouter } from "express";
import nodemailer from "nodemailer";
import { z } from "zod";
import {
  isDBConnected,
  PickupLocationModel,
  TransportBookingModel,
  TransportCategoryModel,
  VehicleModel,
} from "@workspace/db";
import { PendingTransportCheckoutModel } from "@workspace/db/src/schema/bookingTransport";
import { requireAdmin } from "../middleware/requireAdmin";
import { requireAuth } from "../middleware/requireAuth";
import { buildTripConfirmedEmail, notifyAdminUsers, notifyUser } from "../lib/notifications";
import { createStripeCheckoutSession, retrieveStripeCheckoutSession } from "../v1/integrations/stripe.service";

const router: IRouter = Router();

const Mode = z.enum(["Normal", "VIP", "VVIP"]);

const CategoryBody = z.object({
  name: z.string().min(1),
  mode: Mode,
  description: z.string().default(""),
  isActive: z.boolean().default(true),
});

const VehicleBody = z.object({
  categoryId: z.string().min(1),
  mode: Mode,
  name: z.string().min(1),
  type: z.string().default(""),
  price: z.coerce.number().min(0),
  capacity: z.coerce.number().int().min(1).default(4),
  image: z.string().default(""),
  description: z.string().default(""),
  isAvailable: z.boolean().default(true),
});

const PickupBody = z.object({
  destinationSlug: z.string().min(1),
  destinationName: z.string().min(1),
  label: z.string().min(1),
  type: z.string().default("Custom Location"),
  address: z.string().min(1),
  latitude: z.coerce.number().default(0),
  longitude: z.coerce.number().default(0),
  isActive: z.boolean().default(true),
});

const BookingBody = z.object({
  travelerName: z.string().min(1),
  travelerAge: z.coerce.number().int().min(0).default(0),
  email: z.string().email(),
  phone: z.string().min(5),
  destinationSlug: z.string().min(1),
  destinationName: z.string().min(1),
  checkInDate: z.string().min(1),
  checkOutDate: z.string().min(1),
  pickupLocation: z.object({
    label: z.string().default(""),
    type: z.string().default("Custom Location"),
    address: z.string().min(1),
    latitude: z.coerce.number().default(0),
    longitude: z.coerce.number().default(0),
  }),
  travelMode: Mode,
  vehicleId: z.string().min(1),
  travelers: z.coerce.number().int().min(1).default(1),
  totalAmount: z.coerce.number().min(0).optional(),
  stepPrices: z.object({
    destination: z.coerce.number().min(0).default(0),
    pickup: z.coerce.number().min(0).default(0),
    vehicle: z.coerce.number().min(0).default(0),
    hotel: z.coerce.number().min(0).default(0),
    flight: z.coerce.number().min(0).default(0),
    activities: z.coerce.number().min(0).default(0),
    meal: z.coerce.number().min(0).default(0),
    service: z.coerce.number().min(0).default(0),
  }),
  notes: z.string().default(""),
});

const BookingUpdateBody = z.object({
  status: z.enum(["Pending", "Assigned", "Picked Up", "In Progress", "Completed"]).optional(),
  assignedDriver: z.string().optional(),
  assignedStaff: z.string().optional(),
  assignmentConfirmed: z.boolean().optional(),
});

function toPublicDoc(doc: any) {
  const json = typeof doc.toJSON === "function" ? doc.toJSON() : doc;
  return {
    ...json,
    id: json.id ?? json._id?.toString?.(),
    _id: undefined,
    __v: undefined,
  };
}

function bookingReference() {
  return `WNDR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function appOrigin(req: any) {
  return process.env.FRONTEND_URL
    || process.env.APP_BASE_URL
    || req.get?.("origin")
    || "http://localhost:5173";
}

function stripeRouteError(res: any, err: unknown) {
  const candidate = err as { statusCode?: number; code?: string; message?: string };
  res.status(candidate.statusCode && candidate.statusCode >= 400 ? candidate.statusCode : 502).json({
    error: candidate.message || "Stripe request failed.",
    code: candidate.code || "STRIPE_CHECKOUT_FAILED",
  });
}

async function validatedBookingPayload(body: unknown) {
  const parsed = BookingBody.safeParse(body);
  if (!parsed.success) return { error: parsed.error.flatten() as unknown, data: null, vehicle: null, totalAmount: 0 };
  const vehicle = await VehicleModel.findById(parsed.data.vehicleId).lean<any>();
  if (!vehicle || !vehicle.isAvailable || vehicle.mode !== parsed.data.travelMode) {
    return { error: "Selected vehicle is not available for this travel mode.", data: null, vehicle: null, totalAmount: 0 };
  }
  const totalAmount = Object.values(parsed.data.stepPrices).reduce((sum, value) => sum + Number(value || 0), 0);
  if (parsed.data.totalAmount !== undefined && Math.round(parsed.data.totalAmount) !== totalAmount) {
    return { error: "Booking total does not match selected item prices. Please refresh and try again.", data: null, vehicle: null, totalAmount: 0 };
  }
  if (Number(parsed.data.stepPrices.vehicle || 0) !== Number(vehicle.price || 0)) {
    return { error: "Vehicle price changed. Please reselect the vehicle and try again.", data: null, vehicle: null, totalAmount: 0 };
  }
  return { error: null, data: parsed.data, vehicle, totalAmount };
}

function smtpTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function notifyAdmin(booking: any) {
  const transport = smtpTransport();
  const to = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  if (!transport || !to) return;
  const subject = `New ${booking.travelMode} pickup booking - ${booking.destinationName}`;
  const text = [
    `Traveler booked a ${booking.travelMode} ${booking.vehicle?.name || "vehicle"} pickup from ${booking.pickupLocation?.label || booking.pickupLocation?.address}.`,
    "",
    `Traveler: ${booking.travelerName}`,
    `Destination: ${booking.destinationName}`,
    `Pickup: ${booking.pickupLocation?.address}`,
    `Travel Mode: ${booking.travelMode}`,
    `Vehicle: ${booking.vehicle?.name}`,
    `Travelers: ${booking.travelers}`,
    `Booking Date & Time: ${new Date(booking.createdAt || Date.now()).toLocaleString("en-IN")}`,
    `Contact: ${booking.phone} / ${booking.email}`,
    `Reference: ${booking.bookingReference}`,
  ].join("\n");
  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
  });
}

router.get("/transport/options", async (req, res) => {
  if (!isDBConnected()) {
    res.json({ categories: [], vehicles: [], pickupLocations: [] });
    return;
  }
  const destinationSlug = String(req.query.destinationSlug ?? "");
  const mode = String(req.query.mode ?? "");
  const vehicleQuery: Record<string, unknown> = { isAvailable: true };
  if (mode) vehicleQuery.mode = mode;
  const [categories, vehicles, pickupLocations] = await Promise.all([
    TransportCategoryModel.find({ isActive: true }).sort({ mode: 1, name: 1 }),
    VehicleModel.find(vehicleQuery).sort({ mode: 1, price: 1 }),
    PickupLocationModel.find({ destinationSlug, isActive: true }).sort({ type: 1, label: 1 }),
  ]);
  res.json({
    categories: categories.map(toPublicDoc),
    vehicles: vehicles.map(toPublicDoc),
    pickupLocations: pickupLocations.map(toPublicDoc),
  });
});

router.get("/locations/search", async (req, res) => {
  const input = String(req.query.input ?? "").trim();
  const destination = String(req.query.destination ?? "").trim();
  if (!input) {
    res.json({ predictions: [] });
    return;
  }
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${input} ${destination}`.trim());
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "in");
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Wandr Travel Platform (OpenStreetMap Leaflet integration)",
      "Accept-Language": "en-IN,en;q=0.9",
    },
  });
  if (!response.ok) {
    res.json({ predictions: [] });
    return;
  }
  const data = await response.json() as Array<{ display_name?: string; lat?: string; lon?: string; type?: string }>;
  res.json({
    predictions: data.map(item => ({
      description: item.display_name ?? "",
      latitude: Number(item.lat ?? 0),
      longitude: Number(item.lon ?? 0),
      type: item.type ?? "Custom Location",
    })).filter(item => item.description),
  });
});

router.post("/bookings/transport/checkout", requireAuth, async (req, res) => {
  try {
    if (!isDBConnected()) {
      res.status(503).json({ error: "Database is required for bookings." });
      return;
    }
    const result = await validatedBookingPayload(req.body);
    if (result.error || !result.data || !result.vehicle) {
      res.status(400).json({ error: typeof result.error === "string" ? result.error : "Invalid booking", details: typeof result.error === "string" ? undefined : result.error });
      return;
    }
    if (result.totalAmount <= 0) {
      res.status(400).json({ error: "Booking amount must be greater than zero." });
      return;
    }

    const userId = String(req.session.userId);
    const pending = await PendingTransportCheckoutModel.create({
      userId,
      bookingPayload: result.data,
      totalAmount: result.totalAmount,
      currency: "inr",
      status: "created",
    });

    const origin = appOrigin(req).replace(/\/$/, "");
    const session = await createStripeCheckoutSession({
      amount: result.totalAmount,
      currency: "inr",
      name: `Wandr trip to ${result.data.destinationName}`,
      description: `${result.data.travelMode} ${result.vehicle.name} pickup, ${result.data.checkInDate} to ${result.data.checkOutDate}`,
      customerEmail: result.data.email,
      successUrl: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/payment/cancel?session_id={CHECKOUT_SESSION_ID}`,
      clientReferenceId: pending._id.toString(),
      metadata: {
        pendingCheckoutId: pending._id.toString(),
        userId,
        destinationSlug: result.data.destinationSlug,
        destinationName: result.data.destinationName,
      },
    });

    pending.checkoutSessionId = session.id;
    await pending.save();
    res.status(201).json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    stripeRouteError(res, err);
  }
});

router.post("/bookings/transport/checkout/confirm", requireAuth, async (req, res) => {
  try {
  if (!isDBConnected()) {
    res.status(503).json({ error: "Database is required for bookings." });
    return;
  }
  const sessionId = String(req.body?.sessionId ?? "");
  if (!sessionId) {
    res.status(400).json({ error: "Stripe session id is required." });
    return;
  }
  const session = await retrieveStripeCheckoutSession(sessionId);
  if (session.payment_status !== "paid" || session.status !== "complete") {
    const pending = await PendingTransportCheckoutModel.findOne({ checkoutSessionId: sessionId, userId: req.session.userId });
    if (pending) {
      pending.status = session.status === "expired" ? "cancelled" : "failed";
      await pending.save();
    }
    res.status(402).json({ error: "Payment is not complete.", paymentStatus: session.payment_status, checkoutStatus: session.status });
    return;
  }
  const pending = await PendingTransportCheckoutModel.findOne({ checkoutSessionId: sessionId, userId: req.session.userId });
  if (!pending) {
    res.status(404).json({ error: "Checkout session not found." });
    return;
  }
  if (pending.bookingId) {
    const existing = await TransportBookingModel.findById(pending.bookingId);
    if (existing) {
      res.json({ booking: toPublicDoc(existing), alreadyConfirmed: true });
      return;
    }
  }
  const parsed = BookingBody.safeParse(pending.bookingPayload);
  if (!parsed.success) {
    pending.status = "failed";
    await pending.save();
    res.status(400).json({ error: "Stored checkout data is invalid." });
    return;
  }
  const vehicle = await VehicleModel.findById(parsed.data.vehicleId).lean<any>();
  if (!vehicle || !vehicle.isAvailable || vehicle.mode !== parsed.data.travelMode) {
    pending.status = "failed";
    await pending.save();
    res.status(400).json({ error: "Selected vehicle is no longer available." });
    return;
  }
  const totalAmount = Object.values(parsed.data.stepPrices).reduce((sum, value) => sum + Number(value || 0), 0);
  const stripeAmount = Math.round((session.amount_total ?? 0) / 100);
  if (stripeAmount !== totalAmount) {
    pending.status = "failed";
    await pending.save();
    res.status(400).json({ error: "Paid amount does not match booking amount." });
    return;
  }
  const booking = await TransportBookingModel.create({
    ...parsed.data,
    userId: req.session.userId,
    vehicle: {
      id: vehicle._id.toString(),
      name: vehicle.name,
      type: vehicle.type,
      price: vehicle.price,
      capacity: vehicle.capacity,
    },
    totalAmount,
    paymentStatus: "paid",
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: session.payment_intent ?? "",
    paidAt: new Date(),
    bookingReference: bookingReference(),
  } as Record<string, unknown>);
  pending.status = "paid";
  pending.bookingId = booking._id.toString();
  pending.stripePaymentIntentId = session.payment_intent ?? "";
  await pending.save();
  void notifyAdmin((booking as any).toJSON()).catch(() => {});
  const tripConfirmedEmail = buildTripConfirmedEmail({
    name: parsed.data.travelerName,
    email: parsed.data.email,
    destination: parsed.data.destinationName,
    checkInDate: parsed.data.checkInDate,
    checkOutDate: parsed.data.checkOutDate,
    travelMode: parsed.data.travelMode,
    vehicle: vehicle.name,
    amount: totalAmount,
    bookingReference: booking.bookingReference,
    paymentId: session.payment_intent ?? session.id,
  });
  void notifyUser({
    userId: req.session.userId,
    email: parsed.data.email,
    subject: `Your Journey Junction trip to ${parsed.data.destinationName} is confirmed`,
    title: "Trip confirmed",
    message: `Your ${parsed.data.destinationName} trip is confirmed. Booking reference: ${booking.bookingReference}. Please pack your bags and get ready for your trip.`,
    html: tripConfirmedEmail.html,
    type: "booking_confirmed",
  }).catch(() => {});
  void notifyAdminUsers(
    `New paid booking - ${parsed.data.destinationName}`,
    `${parsed.data.travelerName} booked a ${parsed.data.travelMode} ${vehicle.name} pickup from ${parsed.data.pickupLocation.label || parsed.data.pickupLocation.address}. Reference: ${booking.bookingReference}.`,
    "booking_confirmed",
  ).catch(() => {});
  res.status(201).json({ booking: toPublicDoc(booking) });
  } catch (err) {
    stripeRouteError(res, err);
  }
});

router.post("/bookings/transport/checkout/cancel", requireAuth, async (req, res) => {
  const sessionId = String(req.body?.sessionId ?? "");
  if (sessionId && isDBConnected()) {
    await PendingTransportCheckoutModel.findOneAndUpdate(
      { checkoutSessionId: sessionId, userId: req.session.userId, status: "created" },
      { $set: { status: "cancelled" } },
    );
  }
  res.json({ ok: true });
});

router.post("/bookings/transport", (_req, res) => {
  res.status(409).json({ error: "Bookings are created only after successful Stripe payment. Use /bookings/transport/checkout." });
});

router.get("/users/me/transport-bookings", requireAuth, async (req, res) => {
  if (!isDBConnected()) {
    res.json({ bookings: [] });
    return;
  }
  const docs = await TransportBookingModel.find({ userId: req.session.userId }).sort({ createdAt: -1 }).limit(100);
  res.json({ bookings: docs.map(toPublicDoc) });
});

router.use("/admin", requireAdmin);

router.get("/admin/transport-categories", async (_req, res) => {
  if (!isDBConnected()) {
    res.json({ categories: [] });
    return;
  }
  const docs = await TransportCategoryModel.find().sort({ mode: 1, name: 1 });
  res.json({ categories: docs.map(toPublicDoc) });
});

router.post("/admin/transport-categories", async (req, res) => {
  const parsed = CategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid category", details: parsed.error.flatten() });
    return;
  }
  const doc = await TransportCategoryModel.create(parsed.data);
  res.status(201).json({ category: toPublicDoc(doc) });
});

router.patch("/admin/transport-categories/:id", async (req, res) => {
  const parsed = CategoryBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid category", details: parsed.error.flatten() });
    return;
  }
  const doc = await TransportCategoryModel.findByIdAndUpdate(req.params.id, { $set: parsed.data }, { returnDocument: "after" });
  if (!doc) {
    res.status(404).json({ error: "Category not found." });
    return;
  }
  res.json({ category: toPublicDoc(doc) });
});

router.delete("/admin/transport-categories/:id", async (req, res) => {
  await TransportCategoryModel.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

router.get("/admin/vehicles", async (_req, res) => {
  if (!isDBConnected()) {
    res.json({ vehicles: [] });
    return;
  }
  const docs = await VehicleModel.find().sort({ mode: 1, price: 1 });
  res.json({ vehicles: docs.map(toPublicDoc) });
});

router.post("/admin/vehicles", async (req, res) => {
  const parsed = VehicleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid vehicle", details: parsed.error.flatten() });
    return;
  }
  const doc = await VehicleModel.create(parsed.data);
  res.status(201).json({ vehicle: toPublicDoc(doc) });
});

router.patch("/admin/vehicles/:id", async (req, res) => {
  const parsed = VehicleBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid vehicle", details: parsed.error.flatten() });
    return;
  }
  const doc = await VehicleModel.findByIdAndUpdate(req.params.id, { $set: parsed.data }, { returnDocument: "after" });
  if (!doc) {
    res.status(404).json({ error: "Vehicle not found." });
    return;
  }
  res.json({ vehicle: toPublicDoc(doc) });
});

router.delete("/admin/vehicles/:id", async (req, res) => {
  await VehicleModel.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

router.get("/admin/pickup-locations", async (_req, res) => {
  if (!isDBConnected()) {
    res.json({ pickupLocations: [] });
    return;
  }
  const docs = await PickupLocationModel.find().sort({ destinationName: 1, type: 1, label: 1 });
  res.json({ pickupLocations: docs.map(toPublicDoc) });
});

router.post("/admin/pickup-locations", async (req, res) => {
  const parsed = PickupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid pickup location", details: parsed.error.flatten() });
    return;
  }
  const doc = await PickupLocationModel.create(parsed.data);
  res.status(201).json({ pickupLocation: toPublicDoc(doc) });
});

router.patch("/admin/pickup-locations/:id", async (req, res) => {
  const parsed = PickupBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid pickup location", details: parsed.error.flatten() });
    return;
  }
  const doc = await PickupLocationModel.findByIdAndUpdate(req.params.id, { $set: parsed.data }, { returnDocument: "after" });
  if (!doc) {
    res.status(404).json({ error: "Pickup location not found." });
    return;
  }
  res.json({ pickupLocation: toPublicDoc(doc) });
});

router.delete("/admin/pickup-locations/:id", async (req, res) => {
  await PickupLocationModel.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

router.get("/admin/transport-bookings", async (_req, res) => {
  if (!isDBConnected()) {
    res.json({ bookings: [] });
    return;
  }
  const docs = await TransportBookingModel.find().sort({ createdAt: -1 }).limit(200);
  res.json({ bookings: docs.map(toPublicDoc) });
});

router.patch("/admin/transport-bookings/:id", async (req, res) => {
  const parsed = BookingUpdateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid booking update", details: parsed.error.flatten() });
    return;
  }
  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.assignmentConfirmed) {
    updates.assignmentConfirmedAt = new Date();
    if (!parsed.data.status) updates.status = "Assigned";
  }
  if (parsed.data.assignmentConfirmed === false) {
    updates.assignmentConfirmedAt = null;
  }
  const doc = await TransportBookingModel.findByIdAndUpdate(req.params.id, { $set: updates }, { returnDocument: "after" });
  if (!doc) {
    res.status(404).json({ error: "Booking not found." });
    return;
  }
  if (parsed.data.assignmentConfirmed) {
    const booking = doc.toJSON() as any;
    void notifyUser({
      userId: booking.userId,
      email: booking.email,
      subject: `Driver assigned for your Wandr trip`,
      title: "Driver assigned",
      message: `${booking.assignedDriver || "Your driver"} has been assigned for your ${booking.destinationName} trip. Booking reference: ${booking.bookingReference}.`,
      type: "system",
    }).catch(() => {});
  }
  res.json({ booking: toPublicDoc(doc) });
});
router.delete("/admin/transport-bookings/:id", async (req, res) => {
  await TransportBookingModel.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
