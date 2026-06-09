import { Router } from "express";
import { z } from "zod";
import { requireJwtAuth } from "../../shared/auth";
import { validate } from "../../shared/validate";
import { PERMISSIONS, permissionGuard } from "../phase3/phase3.permissions";
import { phase4Controller } from "./phase4.controller";
import { bookingQueueSchema, flightSearchSchema, pricingRuleSchema, pricingSchema } from "./phase4.validation";

const router = Router();

router.get("/flights/search", validate("query", flightSearchSchema), phase4Controller.flights);
router.get("/flights/details", phase4Controller.flightDetails);
router.get("/trains/search", phase4Controller.trains);
router.get("/trains/:id", phase4Controller.train);
router.get("/buses/search", phase4Controller.buses);

router.post("/pricing/quote", validate("body", pricingSchema), phase4Controller.pricing);
router.put("/pricing/rules", requireJwtAuth, permissionGuard(PERMISSIONS.MANAGE_CONTENT), validate("body", pricingRuleSchema), phase4Controller.pricingRule);
router.get("/homepage/personalized", requireJwtAuth, phase4Controller.homepage);

router.post("/booking-queue", requireJwtAuth, validate("body", bookingQueueSchema), phase4Controller.queueBooking);
router.post("/booking-queue/process", requireJwtAuth, permissionGuard(PERMISSIONS.MANAGE_BOOKINGS), phase4Controller.processQueue);

router.post("/cache/warm", requireJwtAuth, permissionGuard(PERMISSIONS.MANAGE_SECURITY), phase4Controller.cacheWarm);
router.delete("/cache/:group", requireJwtAuth, permissionGuard(PERMISSIONS.MANAGE_SECURITY), phase4Controller.cacheInvalidate);

router.get("/search/optimized", phase4Controller.optimizedSearch);
router.get("/metrics/api", requireJwtAuth, permissionGuard(PERMISSIONS.MANAGE_SECURITY), phase4Controller.apiMetrics);
router.post("/performance/audit", requireJwtAuth, permissionGuard(PERMISSIONS.MANAGE_SECURITY), phase4Controller.performanceAudit);
router.get("/images/optimize", phase4Controller.imageTransform);
router.get("/business-insights", requireJwtAuth, permissionGuard(PERMISSIONS.MANAGE_ANALYTICS), phase4Controller.businessInsights);
router.post("/errors/capture", validate("body", z.object({ source: z.string(), message: z.string(), level: z.string().optional(), metadata: z.unknown().optional() })), phase4Controller.captureError);

export default router;
