import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../shared/errors";
import { validate } from "../../shared/validate";
import { inquiryInputSchema } from "./inquiry.validation";
import { inquiryService } from "./inquiry.service";
import { requireAdmin } from "../../../middleware/requireAdmin";
import { requireAuth } from "../../../middleware/requireAuth";

const router = Router();

router.post(
  "/",
  validate("body", inquiryInputSchema),
  asyncHandler(async (req, res) => {
    const userId = req.session?.userId;
    res.status(201).json(await inquiryService.create({ ...req.body, userId }));
  }),
);

router.get(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    res.json(await inquiryService.list());
  }),
);

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await inquiryService.getById(req.params.id as string, req.session!.userId!));
  }),
);

router.patch(
  "/:id/reply",
  requireAdmin,
  validate("body", z.object({ replyMessage: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    res.json(await inquiryService.reply(req.params.id as string, req.body.replyMessage));
  }),
);
router.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    res.json(await inquiryService.delete(req.params.id as string));
  }),
);

export default router;
