import type { Response } from "express";
import type { AuthenticatedRequest } from "../../shared/auth";
import { asyncHandler } from "../../shared/errors";
import { param } from "../../shared/params";
import { phase2Service } from "./phase2.service";

export const phase2Controller = {
  listPackages: asyncHandler(async (req, res) => res.json(await phase2Service.listPackages(req.query))),
  createPackage: asyncHandler(async (req, res) => res.status(201).json(await phase2Service.createPackage(req.body))),
  updatePackage: asyncHandler(async (req, res) => res.json(await phase2Service.updatePackage(param(req.params.id, "id"), req.body))),
  deletePackage: asyncHandler(async (req, res) => res.json(await phase2Service.deletePackage(param(req.params.id, "id")))),
  getPackage: asyncHandler(async (req, res) => res.json(await phase2Service.getPackage(param(req.params.slug, "slug")))),
  featuredPackages: asyncHandler(async (_req, res) => res.json(await phase2Service.featuredPackages())),
  trendingPackages: asyncHandler(async (_req, res) => res.json(await phase2Service.trendingPackages())),

  upsertItinerary: asyncHandler(async (req, res) => res.json(await phase2Service.upsertItinerary(req.body.packageId, req.body.days))),

  createBooking: asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
    res.status(201).json(await phase2Service.createBooking(req.auth!.id, req.body)),
  ),
  cancelBooking: asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
    res.json(await phase2Service.cancelBooking(req.auth!.id, req.auth!.role, param(req.params.id, "id"))),
  ),
  getBooking: asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
    res.json(await phase2Service.getBooking(req.auth!.id, req.auth!.role, param(req.params.id, "id"))),
  ),
  bookingHistory: asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
    res.json(await phase2Service.bookingHistory(req.auth!.id)),
  ),

  setInventory: asyncHandler(async (req, res) => res.json(await phase2Service.setInventory(req.body))),
  availability: asyncHandler(async (req, res) => res.json(await phase2Service.availability(req.query))),

  createOrder: asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
    res.status(201).json(await phase2Service.createPaymentOrder(req.auth!.id, req.body.bookingId)),
  ),
  verifyPayment: asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
    res.json(await phase2Service.verifyPayment(req.auth!.id, req.body)),
  ),
  refundPayment: asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
    res.json(await phase2Service.refundPayment(req.auth!.id, req.auth!.role, req.body.paymentId, req.body.amount)),
  ),
  paymentHistory: asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
    res.json(await phase2Service.paymentHistory(req.auth!.id)),
  ),

  weather: asyncHandler(async (req, res) => res.json(await phase2Service.weather(param(req.params.destination, "destination")))),
  planner: asyncHandler(async (req, res) => res.json(await phase2Service.planner(req.body))),

  listNotifications: asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
    res.json(await phase2Service.listNotifications(req.auth!.id)),
  ),
  markNotificationRead: asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
    res.json(await phase2Service.markNotificationRead(req.auth!.id, param(req.params.id, "id"))),
  ),

  listBlogs: asyncHandler(async (req, res) => res.json(await phase2Service.listBlogs(req.query))),
  createBlog: asyncHandler(async (req, res) => res.status(201).json(await phase2Service.createBlog(req.body))),
  getBlog: asyncHandler(async (req, res) => res.json(await phase2Service.getBlog(param(req.params.slug, "slug")))),
  updateBlog: asyncHandler(async (req, res) => res.json(await phase2Service.updateBlog(param(req.params.id, "id"), req.body))),
  deleteBlog: asyncHandler(async (req, res) => res.json(await phase2Service.deleteBlog(param(req.params.id, "id")))),

  analyticsDashboard: asyncHandler(async (_req, res) => res.json(await phase2Service.analyticsDashboard())),
  revenue: asyncHandler(async (_req, res) => res.json(await phase2Service.revenue())),
  bookingAnalytics: asyncHandler(async (_req, res) => res.json(await phase2Service.bookingsAnalytics())),
  userAnalytics: asyncHandler(async (_req, res) => res.json(await phase2Service.usersAnalytics())),
};
