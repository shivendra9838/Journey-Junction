import { Router } from "express";
import { requireJwtAuth, requireRole } from "../../shared/auth";
import { asyncHandler } from "../../shared/errors";
import { param } from "../../shared/params";
import { validate } from "../../shared/validate";
import { destinationInputSchema, destinationUpdateSchema } from "./destination.validation";
import { destinationService } from "./destination.service";

const router = Router();
const admin = [requireJwtAuth, requireRole("admin")];

router.get("/", asyncHandler(async (req, res) => res.json(await destinationService.list(req.query))));
router.post("/", ...admin, validate("body", destinationInputSchema), asyncHandler(async (req, res) => res.status(201).json(await destinationService.create(req.body))));
router.get("/:slug", asyncHandler(async (req, res) => res.json(await destinationService.detail(param(req.params.slug, "slug")))));
router.patch("/:id", ...admin, validate("body", destinationUpdateSchema), asyncHandler(async (req, res) => res.json(await destinationService.update(param(req.params.id, "id"), req.body))));
router.delete("/:id", ...admin, asyncHandler(async (req, res) => res.json(await destinationService.remove(param(req.params.id, "id")))));

export default router;
