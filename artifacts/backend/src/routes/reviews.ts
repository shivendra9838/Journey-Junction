import { Router, type IRouter } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { isDBConnected, ReviewModel, UserModel } from "@workspace/db";
import { requireAuth } from "../middleware/requireAuth";
import { localReviews, localUserById, type LocalReview } from "../lib/localStore";

const router: IRouter = Router();

function p(v: string | string[]): string {
  return Array.isArray(v) ? v[0]! : v;
}

router.get("/destinations/:destId/reviews", async (req, res) => {
  if (!isDBConnected()) {
    const destId = p(req.params.destId);
    res.json({ reviews: localReviews.filter((review) => review.destId === destId).slice().reverse() });
    return;
  }

  const reviews = await ReviewModel.find({ destId: p(req.params.destId) }).sort({ createdAt: -1 });
  res.json({ reviews });
});

const CreateReviewBody = z.object({
  tripType: z.enum(["Couple", "Solo", "Family", "Business", "Friends"]),
  rating:   z.number().min(1).max(5),
  title:    z.string().min(1).max(200),
  review:   z.string().min(10).max(2000),
  photos:   z.array(z.string().min(1).max(5000000)).max(6).default([]),
});

router.post("/destinations/:destId/reviews", requireAuth, async (req, res) => {
  const parse = CreateReviewBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
    return;
  }
  const userId = req.session.userId!;
  const destId = p(req.params.destId);

  if (!isDBConnected()) {
    const user = localUserById(userId);
    const review: LocalReview = {
      id: randomUUID(),
      userId,
      destId,
      authorName: user?.name ?? "Local Traveller",
      authorAvatar: user?.avatar ?? null,
      helpful: 0,
      createdAt: new Date().toISOString(),
      ...parse.data,
    };
    localReviews.push(review);
    res.status(201).json({ review });
    return;
  }

  const user = await UserModel.findById(userId).lean();
  if (!user) {
    res.status(401).json({ error: "User not found." });
    return;
  }

  const review = await ReviewModel.create({
    userId,
    destId,
    authorName:   user.name,
    authorAvatar: user.avatar ?? null,
    ...parse.data,
  });

  res.status(201).json({ review });
});

router.get("/users/me/reviews", requireAuth, async (req, res) => {
  if (!isDBConnected()) {
    const reviews = localReviews.filter((review) => review.userId === req.session.userId!).slice().reverse();
    res.json({ reviews });
    return;
  }

  const reviews = await ReviewModel.find({ userId: req.session.userId! }).sort({ createdAt: -1 });
  res.json({ reviews });
});

router.post("/destinations/:destId/reviews/:reviewId/helpful", requireAuth, async (req, res) => {
  const reviewId = p(req.params.reviewId);

  if (!isDBConnected()) {
    const review = localReviews.find((item) => item.id === reviewId);
    if (!review) {
      res.status(404).json({ error: "Review not found." });
      return;
    }
    review.helpful += 1;
    res.json({ helpful: review.helpful });
    return;
  }

  const updated = await ReviewModel.findByIdAndUpdate(
    reviewId,
    { $inc: { helpful: 1 } },
    { new: true },
  );

  if (!updated) {
    res.status(404).json({ error: "Review not found." });
    return;
  }

  res.json({ helpful: updated.helpful });
});

export default router;
