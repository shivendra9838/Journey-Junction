import { Router } from "express";
import { requireJwtAuth, requireRole } from "../../shared/auth";
import { validate } from "../../shared/validate";
import { phase2Controller } from "./phase2.controller";
import {
  blogSchema,
  bookingSchema,
  createOrderSchema,
  inventorySchema,
  itinerarySchema,
  packageSchema,
  plannerSchema,
  refundSchema,
  verifyPaymentSchema,
} from "./phase2.validation";

const router = Router();
const admin = [requireJwtAuth, requireRole("admin")];

router.get("/packages", phase2Controller.listPackages);
router.get("/packages/featured", phase2Controller.featuredPackages);
router.get("/packages/trending", phase2Controller.trendingPackages);
router.get("/packages/:slug", phase2Controller.getPackage);
router.post("/packages", ...admin, validate("body", packageSchema), phase2Controller.createPackage);
router.put("/packages/:id", ...admin, validate("body", packageSchema.partial()), phase2Controller.updatePackage);
router.delete("/packages/:id", ...admin, phase2Controller.deletePackage);

router.post("/itineraries", ...admin, validate("body", itinerarySchema), phase2Controller.upsertItinerary);

router.post("/bookings", requireJwtAuth, validate("body", bookingSchema), phase2Controller.createBooking);
router.get("/bookings/history", requireJwtAuth, phase2Controller.bookingHistory);
router.get("/bookings/:id", requireJwtAuth, phase2Controller.getBooking);
router.post("/bookings/:id/cancel", requireJwtAuth, phase2Controller.cancelBooking);

router.get("/inventory/availability", phase2Controller.availability);
router.put("/inventory", ...admin, validate("body", inventorySchema), phase2Controller.setInventory);

router.post("/payments/create-order", requireJwtAuth, validate("body", createOrderSchema), phase2Controller.createOrder);
router.post("/payments/verify", requireJwtAuth, validate("body", verifyPaymentSchema), phase2Controller.verifyPayment);
router.post("/payments/refund", requireJwtAuth, validate("body", refundSchema), phase2Controller.refundPayment);
router.get("/payments/history", requireJwtAuth, phase2Controller.paymentHistory);

router.get("/weather/:destination", phase2Controller.weather);
router.post("/planner/generate", requireJwtAuth, validate("body", plannerSchema), phase2Controller.planner);

router.get("/notifications", requireJwtAuth, phase2Controller.listNotifications);
router.patch("/notifications/:id/read", requireJwtAuth, phase2Controller.markNotificationRead);

router.get("/blogs", phase2Controller.listBlogs);
router.get("/blogs/:slug", phase2Controller.getBlog);
router.post("/blogs", ...admin, validate("body", blogSchema), phase2Controller.createBlog);
router.put("/blogs/:id", ...admin, validate("body", blogSchema.partial()), phase2Controller.updateBlog);
router.delete("/blogs/:id", ...admin, phase2Controller.deleteBlog);

router.get("/analytics/dashboard", ...admin, phase2Controller.analyticsDashboard);
router.get("/analytics/revenue", ...admin, phase2Controller.revenue);
router.get("/analytics/bookings", ...admin, phase2Controller.bookingAnalytics);
router.get("/analytics/users", ...admin, phase2Controller.userAnalytics);

export default router;
