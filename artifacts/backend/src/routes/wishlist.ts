import { Router, type IRouter } from "express";
import { z } from "zod";
import { isDBConnected, WishlistDestModel, WishlistActivityModel, WishlistHotelModel } from "@workspace/db";
import { requireAuth } from "../middleware/requireAuth";
import { localWishlist } from "../lib/localStore";

const router: IRouter = Router();

function p(v: string | string[]): string {
  return Array.isArray(v) ? v[0]! : v;
}

router.get("/wishlist", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  if (!isDBConnected()) {
    res.json(localWishlist(userId));
    return;
  }

  const [destinations, activities, hotels] = await Promise.all([
    WishlistDestModel.find({ userId }),
    WishlistActivityModel.find({ userId }),
    WishlistHotelModel.find({ userId }),
  ]);
  res.json({ destinations, activities, hotels });
});

const AddDestBody = z.object({
  destId:    z.string(),
  name:      z.string(),
  state:     z.string(),
  heroImage: z.string(),
  rating:    z.number(),
  region:    z.string(),
  tagline:   z.string(),
});

router.post("/wishlist/destinations", requireAuth, async (req, res) => {
  const parse = AddDestBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
    return;
  }
  const userId = req.session.userId!;

  if (!isDBConnected()) {
    const wishlist = localWishlist(userId);
    const existing = wishlist.destinations.some((item) => item.destId === parse.data.destId);
    if (existing) {
      res.status(409).json({ error: "Already in wishlist." });
      return;
    }
    const item = { userId, ...parse.data };
    wishlist.destinations.push(item);
    res.status(201).json({ item });
    return;
  }

  const existing = await WishlistDestModel.findOne({ userId, destId: parse.data.destId }).lean();
  if (existing) {
    res.status(409).json({ error: "Already in wishlist." });
    return;
  }

  const item = await WishlistDestModel.create({ userId, ...parse.data });
  res.status(201).json({ item });
});

router.delete("/wishlist/destinations/:destId", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  if (!isDBConnected()) {
    const wishlist = localWishlist(userId);
    wishlist.destinations = wishlist.destinations.filter((item) => item.destId !== p(req.params.destId));
    res.json({ ok: true });
    return;
  }

  await WishlistDestModel.deleteOne({ userId, destId: p(req.params.destId) });
  res.json({ ok: true });
});

const AddActivityBody = z.object({
  destId:   z.string(),
  destName: z.string(),
  title:    z.string(),
  category: z.string(),
  duration: z.string(),
  price:    z.string(),
  image:    z.string(),
});

router.post("/wishlist/activities", requireAuth, async (req, res) => {
  const parse = AddActivityBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
    return;
  }
  const userId = req.session.userId!;

  if (!isDBConnected()) {
    const wishlist = localWishlist(userId);
    const existing = wishlist.activities.some(
      (item) => item.destId === parse.data.destId && item.title === parse.data.title,
    );
    if (existing) {
      res.status(409).json({ error: "Already in wishlist." });
      return;
    }
    const item = { userId, ...parse.data };
    wishlist.activities.push(item);
    res.status(201).json({ item });
    return;
  }

  const existing = await WishlistActivityModel.findOne({
    userId,
    destId: parse.data.destId,
    title:  parse.data.title,
  }).lean();
  if (existing) {
    res.status(409).json({ error: "Already in wishlist." });
    return;
  }

  const item = await WishlistActivityModel.create({ userId, ...parse.data });
  res.status(201).json({ item });
});

router.delete("/wishlist/activities/:destId/:title", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  if (!isDBConnected()) {
    const wishlist = localWishlist(userId);
    const destId = p(req.params.destId);
    const title = decodeURIComponent(p(req.params.title));
    wishlist.activities = wishlist.activities.filter((item) => !(item.destId === destId && item.title === title));
    res.json({ ok: true });
    return;
  }

  await WishlistActivityModel.deleteOne({
    userId,
    destId: p(req.params.destId),
    title:  decodeURIComponent(p(req.params.title)),
  });
  res.json({ ok: true });
});

const AddHotelBody = z.object({
  destId:   z.string(),
  destName: z.string(),
  name:     z.string(),
  stars:    z.number().int(),
  price:    z.string(),
  image:    z.string(),
  tag:      z.string(),
});

router.post("/wishlist/hotels", requireAuth, async (req, res) => {
  const parse = AddHotelBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
    return;
  }
  const userId = req.session.userId!;

  if (!isDBConnected()) {
    const wishlist = localWishlist(userId);
    const existing = wishlist.hotels.some(
      (item) => item.destId === parse.data.destId && item.name === parse.data.name,
    );
    if (existing) {
      res.status(409).json({ error: "Already in wishlist." });
      return;
    }
    const item = { userId, ...parse.data };
    wishlist.hotels.push(item);
    res.status(201).json({ item });
    return;
  }

  const existing = await WishlistHotelModel.findOne({
    userId,
    destId: parse.data.destId,
    name:   parse.data.name,
  }).lean();
  if (existing) {
    res.status(409).json({ error: "Already in wishlist." });
    return;
  }

  const item = await WishlistHotelModel.create({ userId, ...parse.data });
  res.status(201).json({ item });
});

router.delete("/wishlist/hotels/:destId/:name", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  if (!isDBConnected()) {
    const wishlist = localWishlist(userId);
    const destId = p(req.params.destId);
    const name = decodeURIComponent(p(req.params.name));
    wishlist.hotels = wishlist.hotels.filter((item) => !(item.destId === destId && item.name === name));
    res.json({ ok: true });
    return;
  }

  await WishlistHotelModel.deleteOne({
    userId,
    destId: p(req.params.destId),
    name:   decodeURIComponent(p(req.params.name)),
  });
  res.json({ ok: true });
});

router.delete("/wishlist", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  if (!isDBConnected()) {
    const wishlist = localWishlist(userId);
    wishlist.destinations = [];
    wishlist.activities = [];
    wishlist.hotels = [];
    res.json({ ok: true });
    return;
  }

  await Promise.all([
    WishlistDestModel.deleteMany({ userId }),
    WishlistActivityModel.deleteMany({ userId }),
    WishlistHotelModel.deleteMany({ userId }),
  ]);
  res.json({ ok: true });
});

export default router;
