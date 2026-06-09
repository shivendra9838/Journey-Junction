import { Router } from "express";
import { requireJwtAuth, requireRole } from "../../shared/auth";
import { asyncHandler } from "../../shared/errors";
import { param } from "../../shared/params";
import { validate } from "../../shared/validate";
import { hotelInputSchema, hotelUpdateSchema } from "./hotel.validation";
import { hotelService } from "./hotel.service";

const router = Router();
const admin = [requireJwtAuth, requireRole("admin")];

router.get("/", asyncHandler(async (req, res) => res.json(await hotelService.list(req.query))));
router.post("/", ...admin, validate("body", hotelInputSchema), asyncHandler(async (req, res) => res.status(201).json(await hotelService.create(req.body))));
router.get("/:id", asyncHandler(async (req, res) => res.json(await hotelService.get(param(req.params.id, "id")))));
router.patch("/:id", ...admin, validate("body", hotelUpdateSchema), asyncHandler(async (req, res) => res.json(await hotelService.update(param(req.params.id, "id"), req.body))));
router.delete("/:id", ...admin, asyncHandler(async (req, res) => res.json(await hotelService.remove(param(req.params.id, "id")))));

export default router;
