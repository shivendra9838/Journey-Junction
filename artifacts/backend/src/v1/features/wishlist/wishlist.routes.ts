import { Router } from "express";
import { requireJwtAuth, type AuthenticatedRequest } from "../../shared/auth";
import { asyncHandler } from "../../shared/errors";
import { param } from "../../shared/params";
import { validate } from "../../shared/validate";
import { wishlistRepository } from "./wishlist.repository";
import { wishlistInputSchema } from "./wishlist.validation";

const router = Router();
router.use(requireJwtAuth);

router.get(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const items = await wishlistRepository.list(req.auth!.id);
    res.json({ items });
  }),
);

router.post(
  "/",
  validate("body", wishlistInputSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const item = await wishlistRepository.add(req.auth!.id, req.body.destinationId);
    res.status(201).json({ item });
  }),
);

router.delete(
  "/:destinationId",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await wishlistRepository.remove(req.auth!.id, param(req.params.destinationId, "destinationId"));
    res.json({ success: true });
  }),
);

export default router;
