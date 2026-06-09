import type { Response } from "express";
import type { AuthenticatedRequest } from "../../shared/auth";
import { asyncHandler } from "../../shared/errors";
import { param } from "../../shared/params";
import { phase3Service } from "./phase3.service";

export const phase3Controller = {
  adminDashboard: asyncHandler(async (_req, res) => res.json(await phase3Service.adminDashboard())),
  adminList: (entity: string) => asyncHandler(async (req, res) => res.json(await phase3Service.adminList(entity, req.query))),
  setAdminRole: asyncHandler(async (req, res) => res.json(await phase3Service.setAdminRole(req.body))),

  chat: asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json(await phase3Service.chat(req.auth!.id, req.body))),
  recommendations: asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json(await phase3Service.recommendations(req.auth!.id))),
  recommendationPackages: asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json(await phase3Service.recommendations(req.auth!.id, "packages"))),
  recommendationDestinations: asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json(await phase3Service.recommendations(req.auth!.id, "destinations"))),
  recentlyViewed: asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.status(201).json(await phase3Service.trackRecentlyViewed(req.auth!.id, req.body))),

  search: asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json(await phase3Service.advancedSearch(req.auth?.id, req.query))),
  suggestions: asyncHandler(async (req, res) => res.json(await phase3Service.searchSuggestions(String(req.query.q ?? "")))),
  trendingSearch: asyncHandler(async (_req, res) => res.json(await phase3Service.trendingSearches())),

  createTicket: asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.status(201).json(await phase3Service.createTicket(req.auth!.id, req.body))),
  listTickets: asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json(await phase3Service.listTickets(req.auth!.id, req.auth!.role))),
  replyTicket: asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json(await phase3Service.replyTicket(req.auth!.id, param(req.params.id, "id"), req.body))),
  closeTicket: asyncHandler(async (req, res) => res.json(await phase3Service.closeTicket(param(req.params.id, "id")))),

  createCoupon: asyncHandler(async (req, res) => res.status(201).json(await phase3Service.createCoupon(req.body))),
  listCoupons: asyncHandler(async (_req, res) => res.json(await phase3Service.listCoupons())),
  validateCoupon: asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json(await phase3Service.validateCoupon(req.auth!.id, req.body))),
  applyCoupon: asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json(await phase3Service.applyCoupon(req.auth!.id, req.body))),

  referralCode: asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json(await phase3Service.referralCode(req.auth!.id))),
  trackReferral: asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json(await phase3Service.trackReferral(req.auth!.id, req.body))),
  referralAnalytics: asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json(await phase3Service.referralAnalytics(req.auth!.id))),

  loyalty: asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json(await phase3Service.loyalty(req.auth!.id))),
  earnLoyalty: asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json(await phase3Service.adjustLoyalty(req.body.userId ?? req.auth!.id, { ...req.body, type: "earn" }))),
  redeemLoyalty: asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json(await phase3Service.adjustLoyalty(req.auth!.id, { ...req.body, points: -Math.abs(req.body.points), type: "redeem" }))),

  upsertSeo: asyncHandler(async (req, res) => res.json(await phase3Service.upsertSeo(req.body))),
  getSeo: asyncHandler(async (req, res) => res.json(await phase3Service.getSeo(String(req.query.path ?? "/")))),
  sitemap: asyncHandler(async (req, res) => res.json({ urls: await phase3Service.sitemap(`${req.protocol}://${req.get("host")}`) })),
  robots: asyncHandler(async (_req, res) => {
    res.type("text/plain").send("User-agent: *\nAllow: /\nSitemap: /api/v1/seo/sitemap\n");
  }),

  auditLogs: asyncHandler(async (req, res) => res.json(await phase3Service.auditLogs(req.query))),
  uploadFiles: asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.status(201).json(await phase3Service.uploadFiles(req.auth!.id, req.body))),
  deleteFile: asyncHandler(async (req, res) => res.json(await phase3Service.deleteFile(param(req.params.publicId, "publicId")))),

  flags: asyncHandler(async (_req, res) => res.json(await phase3Service.flags())),
  upsertFlag: asyncHandler(async (req, res) => res.json(await phase3Service.upsertFlag(req.body))),
  subscribePush: asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.status(201).json(await phase3Service.subscribePush(req.auth!.id, req.body))),
  push: asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json(await phase3Service.push(req.auth!.id, req.body))),
  sendTemplateEmail: asyncHandler(async (req, res) => res.json(await phase3Service.sendTemplateEmail(req.body))),
  queueBackup: asyncHandler(async (req, res) => res.status(201).json(await phase3Service.queueBackup(req.body.type))),
  backupJobs: asyncHandler(async (_req, res) => res.json(await phase3Service.backupJobs())),
  monitoring: asyncHandler(async (_req, res) => res.json(await phase3Service.monitoring())),
};
