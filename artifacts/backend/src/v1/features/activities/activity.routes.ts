import { Router } from "express";
import { requireJwtAuth, requireRole } from "../../shared/auth";
import { asyncHandler } from "../../shared/errors";
import { param } from "../../shared/params";
import { validate } from "../../shared/validate";
import { activityInputSchema, activityUpdateSchema } from "./activity.validation";
import { activityService } from "./activity.service";

const router = Router();
const admin = [requireJwtAuth, requireRole("admin")];

router.get("/", asyncHandler(async (req, res) => res.json(await activityService.list(req.query))));
router.post("/", ...admin, validate("body", activityInputSchema), asyncHandler(async (req, res) => res.status(201).json(await activityService.create(req.body))));
router.get("/:id", asyncHandler(async (req, res) => res.json(await activityService.get(param(req.params.id, "id")))));
router.patch("/:id", ...admin, validate("body", activityUpdateSchema), asyncHandler(async (req, res) => res.json(await activityService.update(param(req.params.id, "id"), req.body))));
router.delete("/:id", ...admin, asyncHandler(async (req, res) => res.json(await activityService.remove(param(req.params.id, "id")))));

export default router;
