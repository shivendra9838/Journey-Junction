import { Router } from "express";
import { requireJwtAuth, type AuthenticatedRequest } from "../../shared/auth";
import { asyncHandler } from "../../shared/errors";
import { param } from "../../shared/params";
import { validate } from "../../shared/validate";
import { reviewInputSchema, reviewUpdateSchema } from "./review.validation";
import { reviewService } from "./review.service";

const router = Router();

router.get("/featured", asyncHandler(async (req, res) => res.json(await reviewService.getFeatured())));
router.get("/", asyncHandler(async (req, res) => res.json(await reviewService.list(req.query))));

router.post("/:id/like", requireJwtAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  res.json(await reviewService.toggleLike(req.auth!.id, param(req.params.id, "id")));
}));

router.post("/:id/save", requireJwtAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  res.json(await reviewService.toggleSave(req.auth!.id, param(req.params.id, "id")));
}));

router.post("/:id/comment", requireJwtAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  res.json(await reviewService.addComment(req.auth!.id, param(req.params.id, "id"), req.body.text));
}));
router.post(
  "/",
  requireJwtAuth,
  validate("body", reviewInputSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    res.status(201).json(await reviewService.create(req.auth!.id, req.body));
  }),
);
router.patch(
  "/:id",
  requireJwtAuth,
  validate("body", reviewUpdateSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    res.json(await reviewService.update(req.auth!.id, req.auth!.role, param(req.params.id, "id"), req.body));
  }),
);
router.delete(
  "/:id",
  requireJwtAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    res.json(await reviewService.remove(req.auth!.id, req.auth!.role, param(req.params.id, "id")));
  }),
);

export default router;
