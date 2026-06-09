import { Router } from "express";
import { z } from "zod";
import { requireJwtAuth } from "../../shared/auth";
import { validate } from "../../shared/validate";
import { PERMISSIONS, authorize, permissionGuard } from "./phase3.permissions";
import { phase3Controller } from "./phase3.controller";
import {
  applyCouponSchema,
  chatSchema,
  couponSchema,
  featureFlagSchema,
  fileUploadSchema,
  loyaltySchema,
  pushSubscriptionSchema,
  referralSchema,
  seoSchema,
  ticketReplySchema,
  ticketSchema,
  viewedSchema,
} from "./phase3.validation";

const router = Router();
const admin = [requireJwtAuth, authorize("SUPER_ADMIN", "ADMIN", "EDITOR", "SUPPORT")];
const superAdmin = [requireJwtAuth, authorize("SUPER_ADMIN")];

router.get("/admin/dashboard", ...admin, phase3Controller.adminDashboard);
router.get("/admin/users", requireJwtAuth, permissionGuard(PERMISSIONS.MANAGE_USERS), phase3Controller.adminList("users"));
router.get("/admin/bookings", requireJwtAuth, permissionGuard(PERMISSIONS.MANAGE_BOOKINGS), phase3Controller.adminList("bookings"));
router.get("/admin/packages", requireJwtAuth, permissionGuard(PERMISSIONS.MANAGE_PACKAGES), phase3Controller.adminList("packages"));
router.get("/admin/reviews", requireJwtAuth, permissionGuard(PERMISSIONS.MANAGE_CONTENT), phase3Controller.adminList("reviews"));
router.get("/admin/blogs", requireJwtAuth, permissionGuard(PERMISSIONS.MANAGE_BLOGS), phase3Controller.adminList("blogs"));
router.get("/admin/analytics", requireJwtAuth, permissionGuard(PERMISSIONS.MANAGE_ANALYTICS), phase3Controller.adminList("analytics"));
router.put("/admin/roles", ...superAdmin, validate("body", z.object({ userId: z.string(), role: z.string(), permissions: z.array(z.string()).optional() })), phase3Controller.setAdminRole);

router.post("/chat", requireJwtAuth, validate("body", chatSchema), phase3Controller.chat);
router.get("/recommendations", requireJwtAuth, phase3Controller.recommendations);
router.get("/recommendations/packages", requireJwtAuth, phase3Controller.recommendationPackages);
router.get("/recommendations/destinations", requireJwtAuth, phase3Controller.recommendationDestinations);
router.post("/recently-viewed", requireJwtAuth, validate("body", viewedSchema), phase3Controller.recentlyViewed);

router.get("/search/advanced", phase3Controller.search);
router.get("/search/suggestions", phase3Controller.suggestions);
router.get("/search/trending", phase3Controller.trendingSearch);

router.post("/support/tickets", requireJwtAuth, validate("body", ticketSchema), phase3Controller.createTicket);
router.get("/support/tickets", requireJwtAuth, phase3Controller.listTickets);
router.post("/support/tickets/:id/replies", requireJwtAuth, validate("body", ticketReplySchema), phase3Controller.replyTicket);
router.post("/support/tickets/:id/close", requireJwtAuth, phase3Controller.closeTicket);

router.get("/coupons", requireJwtAuth, permissionGuard(PERMISSIONS.MANAGE_CONTENT), phase3Controller.listCoupons);
router.post("/coupons", requireJwtAuth, permissionGuard(PERMISSIONS.MANAGE_CONTENT), validate("body", couponSchema), phase3Controller.createCoupon);
router.post("/coupons/validate", requireJwtAuth, validate("body", applyCouponSchema), phase3Controller.validateCoupon);
router.post("/coupons/apply", requireJwtAuth, validate("body", applyCouponSchema), phase3Controller.applyCoupon);

router.get("/referrals/code", requireJwtAuth, phase3Controller.referralCode);
router.post("/referrals/track", requireJwtAuth, validate("body", referralSchema), phase3Controller.trackReferral);
router.get("/referrals/analytics", requireJwtAuth, phase3Controller.referralAnalytics);

router.get("/loyalty", requireJwtAuth, phase3Controller.loyalty);
router.post("/loyalty/earn", requireJwtAuth, permissionGuard(PERMISSIONS.MANAGE_USERS), validate("body", loyaltySchema), phase3Controller.earnLoyalty);
router.post("/loyalty/redeem", requireJwtAuth, validate("body", loyaltySchema), phase3Controller.redeemLoyalty);

router.get("/seo/meta", phase3Controller.getSeo);
router.put("/seo/meta", requireJwtAuth, permissionGuard(PERMISSIONS.MANAGE_CONTENT), validate("body", seoSchema), phase3Controller.upsertSeo);
router.get("/seo/sitemap", phase3Controller.sitemap);
router.get("/seo/robots.txt", phase3Controller.robots);

router.get("/audit-logs", requireJwtAuth, permissionGuard(PERMISSIONS.MANAGE_SECURITY), phase3Controller.auditLogs);
router.post("/files/upload", requireJwtAuth, validate("body", fileUploadSchema), phase3Controller.uploadFiles);
router.delete("/files/:publicId", requireJwtAuth, phase3Controller.deleteFile);

router.get("/feature-flags", phase3Controller.flags);
router.put("/feature-flags", requireJwtAuth, permissionGuard(PERMISSIONS.MANAGE_SECURITY), validate("body", featureFlagSchema), phase3Controller.upsertFlag);

router.post("/push/subscribe", requireJwtAuth, validate("body", pushSubscriptionSchema), phase3Controller.subscribePush);
router.post("/push/test", requireJwtAuth, validate("body", z.object({ title: z.string(), message: z.string() })), phase3Controller.push);
router.post("/email/templates/send", requireJwtAuth, permissionGuard(PERMISSIONS.MANAGE_CONTENT), validate("body", z.object({ to: z.string().email(), template: z.string(), data: z.record(z.string()), subject: z.string() })), phase3Controller.sendTemplateEmail);

router.post("/backups", requireJwtAuth, permissionGuard(PERMISSIONS.MANAGE_SECURITY), validate("body", z.object({ type: z.enum(["mongo", "cloudinary"]) })), phase3Controller.queueBackup);
router.get("/backups", requireJwtAuth, permissionGuard(PERMISSIONS.MANAGE_SECURITY), phase3Controller.backupJobs);
router.get("/monitoring", requireJwtAuth, permissionGuard(PERMISSIONS.MANAGE_SECURITY), phase3Controller.monitoring);

export default router;
