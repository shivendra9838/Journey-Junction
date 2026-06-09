import { Router, type IRouter } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import {
  isDBConnected,
  UserModel,
  ReviewModel,
  WishlistDestModel,
  WishlistActivityModel,
  WishlistHotelModel,
  CustomDestModel,
} from "@workspace/db";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  localCustomDests,
  localReviews,
  localUserById,
  localUsers,
  localWishlist,
  localWishlistCount,
  type LocalCustomDestination,
} from "../lib/localStore";
import { DESTINATIONS } from "../data/destinations";
import { coordinatesForDestination } from "../lib/geo";

const router: IRouter = Router();
router.use("/admin", requireAdmin);

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type AdminDestinationRecord = {
  _id?: { toString(): string };
  id?: string;
  slug: string;
  name: string;
  city?: string;
  state: string;
  stateSlug?: string;
  country: string;
  region: string;
  heroImage: string;
  images?: string[];
  photos?: string[];
  tagline: string;
  rating: number;
  latitude?: number | null;
  longitude?: number | null;
  reviewCount?: number;
  climateLabel?: string;
  climate?: string;
  tags?: string[];
  about?: string;
  isPublished?: boolean;
  activities?: { title: string; category: string; duration: string; price: string; image: string; badge?: string | null }[];
  hotels?: { name: string; stars: number; price: string; perNight: string; image: string; tag?: string | null }[];
  transports?: { tier: string; title: string; vehicles: string; price: string; description: string; image?: string | null }[];
  meals?: { tier: string; title: string; includes: string; price: string; description: string; image?: string | null }[];
  flights?: { from: string; code: string; flag: string; airline: string; duration: string; frequency: string; price: string; direct: boolean }[];
  trains?: { from: string; duration: string; type: string; operator: string; price: string; icon: string; note?: string | null }[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

const PLACEHOLDER_DESTINATION_IMAGE = "/images/unsplash-bd9404f5e774.jpg";
const compactImage = (value: string | undefined) => value?.startsWith("data:") ? PLACEHOLDER_DESTINATION_IMAGE : value || "";
function hasAnyField(item: unknown, keys: string[]) {
  if (!item || typeof item !== "object") return false;
  const record = item as Record<string, unknown>;
  return keys.some(key => String(record[key] ?? "").trim().length > 0);
}
function cleanDraftRows(value: unknown, keys: string[]) {
  if (!Array.isArray(value)) return value;
  return value.filter(item => hasAnyField(item, keys));
}
function aboutToText(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const about = value as { para1?: unknown; para2?: unknown; heading?: unknown };
    return [about.para1, about.para2].map(item => String(item ?? "").trim()).filter(Boolean).join("\n\n")
      || String(about.heading ?? "");
  }
  return "";
}

function normalizeAdminDestination(dest: AdminDestinationRecord, options: { compact?: boolean } = {}) {
  const photos = dest.photos?.length ? dest.photos : dest.images ?? [];
  const normalizedPhotos = options.compact ? photos.map(compactImage) : photos;
  const stateSlug = dest.stateSlug || slugify(dest.state);
  const climate = dest.climate || dest.climateLabel || "";
  const coordinates = coordinatesForDestination(dest);
  return {
    id: dest._id?.toString?.() ?? dest.id ?? dest.slug,
    slug: dest.slug,
    name: dest.name,
    city: dest.city || dest.name,
    state: dest.state,
    stateSlug,
    country: dest.country,
    region: dest.region,
    heroImage: options.compact ? compactImage(dest.heroImage || photos[0]) : dest.heroImage || photos[0] || "",
    images: normalizedPhotos,
    photos: normalizedPhotos,
    tagline: dest.tagline,
    rating: dest.rating,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    reviewCount: dest.reviewCount ?? 0,
    climateLabel: climate,
    climate,
    tags: dest.tags ?? [],
    about: aboutToText(dest.about),
    isPublished: dest.isPublished ?? true,
    activities: options.compact ? [] : dest.activities ?? [],
    hotels: options.compact ? [] : dest.hotels ?? [],
    transports: options.compact ? [] : dest.transports ?? [],
    meals: options.compact ? [] : dest.meals ?? [],
    flights: options.compact ? [] : dest.flights ?? [],
    trains: options.compact ? [] : dest.trains ?? [],
    createdAt: dest.createdAt,
    updatedAt: dest.updatedAt,
  };
}

router.get("/admin/stats", async (_req, res) => {
  if (!isDBConnected()) {
    const wishlistItems = Array.from(localUsers.values()).reduce((sum, user) => sum + localWishlistCount(user.id), 0);
    const publishedDestinations = localCustomDests.filter((dest) => dest.isPublished).length;
    const liveDestinationRoutes = new Set(DESTINATIONS.map((dest) => `${dest.stateSlug || slugify(dest.state)}/${dest.slug}`));
    for (const dest of localCustomDests.filter((item) => item.isPublished)) {
      liveDestinationRoutes.add(`${dest.stateSlug || slugify(dest.state)}/${dest.slug}`);
    }
    res.json({
      users: localUsers.size,
      reviews: localReviews.length,
      wishlistItems,
      destinations: localCustomDests.length,
      publishedDestinations,
      staticDestinations: DESTINATIONS.length,
      liveDestinations: liveDestinationRoutes.size,
    });
    return;
  }

  const [users, reviews, wDest, wAct, wHotel, destinations, publishedDestinations, publishedDestinationRoutes] = await Promise.all([
    UserModel.countDocuments(),
    ReviewModel.countDocuments(),
    WishlistDestModel.countDocuments(),
    WishlistActivityModel.countDocuments(),
    WishlistHotelModel.countDocuments(),
    CustomDestModel.countDocuments(),
    CustomDestModel.countDocuments({ isPublished: true }),
    CustomDestModel.find({ isPublished: true }).select("slug state stateSlug").lean<Array<{ slug: string; state: string; stateSlug?: string }>>(),
  ]);
  const liveDestinationRoutes = new Set(DESTINATIONS.map((dest) => `${dest.stateSlug || slugify(dest.state)}/${dest.slug}`));
  for (const dest of publishedDestinationRoutes) {
    liveDestinationRoutes.add(`${dest.stateSlug || slugify(dest.state)}/${dest.slug}`);
  }
  res.json({
    users,
    reviews,
    wishlistItems: wDest + wAct + wHotel,
    destinations,
    publishedDestinations,
    staticDestinations: DESTINATIONS.length,
    liveDestinations: liveDestinationRoutes.size,
  });
});

router.get("/admin/users", async (_req, res) => {
  if (!isDBConnected()) {
    res.json({
      users: Array.from(localUsers.values()).map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
        reviewCount: localReviews.filter((review) => review.userId === user.id).length,
        wishlistCount: localWishlistCount(user.id),
      })),
    });
    return;
  }

  const users = await UserModel.find().sort({ createdAt: -1 }).lean();
  const ids = users.map(u => u._id.toString());

  const [rCounts, wCounts] = await Promise.all([
    ReviewModel.aggregate<{ _id: string; count: number }>([
      { $match: { userId: { $in: ids } } },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]),
    WishlistDestModel.aggregate<{ _id: string; count: number }>([
      { $match: { userId: { $in: ids } } },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]),
  ]);

  const rMap: Record<string, number> = Object.fromEntries(rCounts.map(r => [r._id, r.count]));
  const wMap: Record<string, number> = Object.fromEntries(wCounts.map(w => [w._id, w.count]));

  const result = users.map(u => {
    const id = u._id.toString();
    return {
      id,
      name: u.name,
      email: u.email,
      avatar: u.avatar ?? null,
      createdAt: (u as { createdAt?: Date }).createdAt,
      reviewCount: rMap[id] ?? 0,
      wishlistCount: wMap[id] ?? 0,
    };
  });
  res.json({ users: result });
});

router.delete("/admin/users/:id", async (req, res) => {
  if (!isDBConnected()) {
    res.json({ ok: true });
    return;
  }

  const id = req.params.id;
  await Promise.all([
    UserModel.findByIdAndDelete(id),
    ReviewModel.deleteMany({ userId: id }),
    WishlistDestModel.deleteMany({ userId: id }),
    WishlistActivityModel.deleteMany({ userId: id }),
    WishlistHotelModel.deleteMany({ userId: id }),
  ]);
  res.json({ ok: true });
});

function adminReviewPayload(review: any, includePhotos = false) {
  return {
    id: review._id?.toString?.() ?? review.id,
    userId: review.userId,
    destId: review.destId,
    authorName: review.authorName,
    authorAvatar: review.authorAvatar ?? null,
    tripType: review.tripType,
    rating: review.rating,
    title: review.title,
    review: review.review,
    photos: includePhotos ? (review.photos ?? []).slice(0, 3) : [],
    helpful: review.helpful ?? 0,
    createdAt: review.createdAt,
  };
}

router.get("/admin/reviews", async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 100);
  const includePhotos = req.query.photos === "1";

  if (!isDBConnected()) {
    const reviews = localReviews
      .slice()
      .reverse()
      .slice(0, limit)
      .map(review => ({ ...review, photos: includePhotos ? (review.photos ?? []).slice(0, 3) : [] }));
    res.json({ reviews });
    return;
  }

  const selectFields = includePhotos
    ? "userId destId authorName authorAvatar tripType rating title review photos helpful createdAt"
    : "userId destId authorName authorAvatar tripType rating title review helpful createdAt";

  const reviews = await ReviewModel.find()
    .select(selectFields)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  res.json({ reviews: reviews.map(review => adminReviewPayload(review, includePhotos)) });
});

router.delete("/admin/reviews/:id", async (req, res) => {
  if (!isDBConnected()) {
    const index = localReviews.findIndex((review) => review.id === req.params.id);
    if (index >= 0) localReviews.splice(index, 1);
    res.json({ ok: true });
    return;
  }

  await ReviewModel.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

import { PhaseReviewModel } from "@workspace/db/src/schema/phase1";

router.get("/admin/stories", async (req, res) => {
  if (!isDBConnected()) {
    res.json({ stories: [] });
    return;
  }
  const stories = await PhaseReviewModel.find().populate("userId", "name avatar").populate("destinationId", "name slug").sort({ createdAt: -1 }).lean();
  res.json({ stories: stories.map((s: any) => ({ ...s, id: s._id.toString() })) });
});

router.patch("/admin/stories/:id/status", async (req, res) => {
  if (!isDBConnected()) {
    res.json({ ok: false });
    return;
  }
  const { status, isFeatured } = req.body;
  const update: any = {};
  if (status !== undefined) update.status = status;
  if (isFeatured !== undefined) update.isFeatured = isFeatured;
  
  const review = await PhaseReviewModel.findByIdAndUpdate(req.params.id, update, { new: true });
  res.json({ ok: true, review });
});

router.delete("/admin/stories/:id", async (req, res) => {
  if (!isDBConnected()) {
    res.json({ ok: false });
    return;
  }
  await PhaseReviewModel.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

router.get("/admin/activity", async (_req, res) => {
  try {
    if (!isDBConnected()) {
      res.json({ users: [], timeline: [] });
      return;
    }

    const [users, reviews, destinations, activities, hotels] = await Promise.all([
      UserModel.find().select("name email avatar createdAt").sort({ createdAt: -1 }).limit(100).lean(),
      ReviewModel.find().select("userId destId rating title createdAt").sort({ createdAt: -1 }).limit(300).lean(),
      WishlistDestModel.find().limit(1000).lean(),
      WishlistActivityModel.find().limit(1000).lean(),
      WishlistHotelModel.find().limit(1000).lean(),
    ]);

    const result = users.map((user) => {
      const id = user._id.toString();
      const userReviews = reviews.filter((review) => review.userId === id);
      const userDestinations = destinations.filter((item) => item.userId === id);
      const userActivities = activities.filter((item) => item.userId === id);
      const userHotels = hotels.filter((item) => item.userId === id);
      return {
        user: {
          id,
          name: user.name,
          email: user.email,
          avatar: user.avatar ?? null,
          createdAt: (user as { createdAt?: Date }).createdAt,
        },
        wishlist: {
          destinations: userDestinations,
          activities: userActivities,
          hotels: userHotels,
        },
        reviews: userReviews.map(review => adminReviewPayload(review, false)),
        totals: {
          destinations: userDestinations.length,
          activities: userActivities.length,
          hotels: userHotels.length,
          reviews: userReviews.length,
        },
      };
    });

    res.json({ users: result, timeline: [] });
  } catch (error) {
    console.error("Error in /admin/activity:", error);
    res.status(500).json({ error: String(error) });
  }
});

router.get("/admin/destinations", async (req, res) => {
  const search = String(req.query.search ?? "").toLowerCase().trim();
  const state = String(req.query.state ?? "all").toLowerCase().trim();
  const status = String(req.query.status ?? "all");
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit ?? 12), 1), 100);

  if (!isDBConnected()) {
    let destinations = localCustomDests.map(dest => normalizeAdminDestination(dest));
    if (search) {
      destinations = destinations.filter(dest =>
        dest.name.toLowerCase().includes(search) ||
        dest.city.toLowerCase().includes(search) ||
        dest.state.toLowerCase().includes(search)
      );
    }
    if (state !== "all") destinations = destinations.filter(dest => dest.stateSlug === state || dest.state.toLowerCase() === state);
    if (status === "published") destinations = destinations.filter(dest => dest.isPublished);
    if (status === "draft") destinations = destinations.filter(dest => !dest.isPublished);
    const total = destinations.length;
    const paged = destinations.slice((page - 1) * limit, page * limit);
    const states = Array.from(new Map(localCustomDests.map(dest => {
      const normalized = normalizeAdminDestination(dest);
      return [normalized.stateSlug, { state: normalized.state, stateSlug: normalized.stateSlug }];
    })).values()).sort((a, b) => a.state.localeCompare(b.state));
    res.json({ destinations: paged.map(dest => normalizeAdminDestination(dest, { compact: true })), states, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
    return;
  }

  const query: Record<string, unknown> = {};
  if (status === "published") query.isPublished = true;
  if (status === "draft") query.isPublished = false;
  if (state !== "all") query.$or = [{ stateSlug: state }, { state: new RegExp(`^${state}$`, "i") }];
  if (search) {
    query.$and = [
      ...(query.$and as Record<string, unknown>[] | undefined ?? []),
      { $or: [
        { name: new RegExp(search, "i") },
        { city: new RegExp(search, "i") },
        { state: new RegExp(search, "i") },
      ] },
    ];
  }

  const [destinations, total, stateDocs] = await Promise.all([
    CustomDestModel.find(query)
      .select("slug name city state stateSlug country region heroImage images photos tagline rating reviewCount climateLabel climate tags isPublished createdAt updatedAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<AdminDestinationRecord[]>(),
    CustomDestModel.countDocuments(query),
    CustomDestModel.find().select("state stateSlug").lean<Array<{ state: string; stateSlug?: string }>>(),
  ]);
  const states = Array.from(new Map(stateDocs.map(dest => {
    const stateSlug = dest.stateSlug || slugify(dest.state);
    return [stateSlug, { state: dest.state, stateSlug }];
  })).values()).sort((a, b) => a.state.localeCompare(b.state));
  res.json({ destinations: destinations.map(dest => normalizeAdminDestination(dest, { compact: true })), states, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
});

router.get("/admin/destinations/:id", async (req, res) => {
  if (!isDBConnected()) {
    const destination = localCustomDests.find((dest) => dest.id === req.params.id || dest.slug === req.params.id);
    if (!destination) {
      res.status(404).json({ error: "Destination not found." });
      return;
    }
    res.json({ destination: normalizeAdminDestination(destination) });
    return;
  }

  const destination = await CustomDestModel.findById(req.params.id).lean<AdminDestinationRecord | null>();
  if (!destination) {
    res.status(404).json({ error: "Destination not found." });
    return;
  }
  res.json({ destination: normalizeAdminDestination(destination) });
});

const DestBody = z.object({
  slug:         z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and hyphens only"),
  name:         z.string().min(1).max(100),
  city:         z.string().max(100).default(""),
  state:        z.string().min(1).max(100),
  stateSlug:    z.string().max(100).optional(),
  country:      z.string().default("India"),
  region:       z.string().min(1).max(100),
  images:       z.array(z.string().min(1)).min(1, "At least one image is required").max(20),
  photos:       z.array(z.string().min(1)).optional(),
  tagline:      z.string().min(1).max(200),
  rating:       z.number().min(0).max(5),
  latitude:     z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude:    z.coerce.number().min(-180).max(180).optional().nullable(),
  reviewCount:  z.number().int().min(0).default(0),
  climateLabel: z.string().max(50).default(""),
  climate:      z.string().max(50).optional(),
  tags:         z.array(z.string()).default([]),
  about:        z.preprocess(aboutToText, z.string().max(5000).default("")),
  isPublished:  z.boolean().default(true),
  activities:   z.preprocess((value) => cleanDraftRows(value, ["title", "category", "duration", "price", "image", "badge"]), z.array(
    z.object({
      title: z.string().min(1),
      category: z.string().min(1),
      duration: z.string().min(1),
      price: z.string().min(1),
      image: z.string().default(""),
      badge: z.string().nullable().optional(),
    })
  ).default([])),
  hotels: z.preprocess((value) => cleanDraftRows(value, ["name", "price", "image", "tag"]), z.array(
    z.object({
      name: z.string().min(1),
      stars: z.coerce.number().min(1).max(5),
      price: z.string().min(1),
      perNight: z.string().min(1),
      image: z.string().default(""),
      tag: z.string().nullable().optional(),
    })
  ).default([])),
  transports: z.preprocess((value) => cleanDraftRows(value, ["title", "vehicles", "price", "description", "image"]), z.array(
    z.object({
      tier: z.string().min(1),
      title: z.string().min(1),
      vehicles: z.string().min(1),
      price: z.string().min(1),
      description: z.string().min(1),
      image: z.string().optional().nullable(),
    })
  ).default([])),
  meals: z.preprocess((value) => cleanDraftRows(value, ["title", "includes", "price", "description", "image"]), z.array(
    z.object({
      tier: z.string().min(1),
      title: z.string().min(1),
      includes: z.string().min(1),
      price: z.string().min(1),
      description: z.string().min(1),
      image: z.string().optional().nullable(),
    })
  ).default([])),
  flights: z.preprocess((value) => cleanDraftRows(value, ["from", "code", "flag", "airline", "duration", "frequency", "price"]), z.array(
    z.object({
      from: z.string().min(1),
      code: z.string().min(1),
      flag: z.string().min(1),
      airline: z.string().min(1),
      duration: z.string().min(1),
      frequency: z.string().min(1),
      price: z.string().min(1),
      direct: z.boolean(),
    })
  ).default([])),
  trains: z.preprocess((value) => cleanDraftRows(value, ["from", "duration", "type", "operator", "price", "icon", "note"]), z.array(
    z.object({
      from: z.string().min(1),
      duration: z.string().min(1),
      type: z.string().min(1),
      operator: z.string().min(1),
      price: z.string().min(1),
      icon: z.string().min(1),
      note: z.string().nullable().optional(),
    })
  ).default([])),
});

router.post("/admin/destinations", async (req, res) => {
  const parse = DestBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
    return;
  }
  if (!isDBConnected()) {
    const stateSlug = parse.data.stateSlug || slugify(parse.data.state);
    const photos = parse.data.photos?.length ? parse.data.photos : parse.data.images;
    const existing = localCustomDests.some((dest) => dest.slug === parse.data.slug && (dest.stateSlug || slugify(dest.state)) === stateSlug);
    if (existing) {
      res.status(409).json({ error: "A destination with this slug already exists in this state." });
      return;
    }
    const now = new Date().toISOString();
    const destination: LocalCustomDestination = {
      id: randomUUID(),
      ...parse.data,
      city: parse.data.city || parse.data.name,
      stateSlug,
      images: photos,
      photos,
      climateLabel: parse.data.climate || parse.data.climateLabel,
      climate: parse.data.climate || parse.data.climateLabel,
      heroImage: photos[0]!,
      createdAt: now,
      updatedAt: now,
    };
    localCustomDests.unshift(destination);
    res.status(201).json({ destination: normalizeAdminDestination(destination) });
    return;
  }

  const stateSlug = parse.data.stateSlug || slugify(parse.data.state);
  const existing = await CustomDestModel.findOne({ slug: parse.data.slug, stateSlug }).lean();
  if (existing) {
    res.status(409).json({ error: "A destination with this slug already exists in this state." });
    return;
  }
  const photos = parse.data.photos?.length ? parse.data.photos : parse.data.images;
  const destination = await CustomDestModel.create({
    ...parse.data,
    city: parse.data.city || parse.data.name,
    stateSlug,
    images: photos,
    photos,
    climateLabel: parse.data.climate || parse.data.climateLabel,
    climate: parse.data.climate || parse.data.climateLabel,
    heroImage: photos[0],
  } as Record<string, unknown>);
  res.status(201).json({ destination: normalizeAdminDestination(destination.toJSON() as AdminDestinationRecord) });
});

router.patch("/admin/destinations/:id", async (req, res) => {
  const parse = DestBody.partial().safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
    return;
  }
  if (!isDBConnected()) {
    const destination = localCustomDests.find((dest) => dest.id === req.params.id);
    if (!destination) {
      res.status(404).json({ error: "Destination not found." });
      return;
    }
    const update = { ...parse.data };
    if (update.state) destination.stateSlug = update.stateSlug || slugify(update.state);
    if (update.name && !update.city) update.city = update.name;
    if (update.images) {
      update.photos = update.photos?.length ? update.photos : update.images;
      destination.heroImage = update.photos[0]!;
    }
    if (update.climate || update.climateLabel) {
      update.climate = update.climate || update.climateLabel;
      update.climateLabel = update.climate;
    }
    Object.assign(destination, update);
    destination.updatedAt = new Date().toISOString();
    res.json({ destination: normalizeAdminDestination(destination) });
    return;
  }

  const updateData: Record<string, unknown> = { ...parse.data };
  if (parse.data.state) updateData.stateSlug = parse.data.stateSlug || slugify(parse.data.state);
  if (parse.data.name && !parse.data.city) updateData.city = parse.data.name;
  if (parse.data.images) {
    const photos = parse.data.photos?.length ? parse.data.photos : parse.data.images;
    updateData.images = photos;
    updateData.photos = photos;
    updateData.heroImage = photos[0];
  }
  if (parse.data.climate || parse.data.climateLabel) {
    updateData.climate = parse.data.climate || parse.data.climateLabel;
    updateData.climateLabel = updateData.climate;
  }
  const destination = await CustomDestModel.findByIdAndUpdate(
    req.params.id,
    { $set: updateData },
    { returnDocument: "after" },
  );
  if (!destination) {
    res.status(404).json({ error: "Destination not found." });
    return;
  }
  res.json({ destination: normalizeAdminDestination(destination.toJSON() as AdminDestinationRecord) });
});

router.delete("/admin/destinations/:id", async (req, res) => {
  if (!isDBConnected()) {
    const index = localCustomDests.findIndex((dest) => dest.id === req.params.id);
    if (index >= 0) localCustomDests.splice(index, 1);
    res.json({ ok: true });
    return;
  }

  await CustomDestModel.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
