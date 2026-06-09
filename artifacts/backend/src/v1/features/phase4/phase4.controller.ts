import type { Response } from "express";
import type { AuthenticatedRequest } from "../../shared/auth";
import { asyncHandler } from "../../shared/errors";
import { param } from "../../shared/params";
import { phase4Service } from "./phase4.service";

export const phase4Controller = {
  flights: asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json(await phase4Service.searchFlights(req.auth?.id, req.query))),
  flightDetails: asyncHandler(async (req, res) => res.json(await phase4Service.flightDetails(String(req.query.id ?? "")))),
  trains: asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json(await phase4Service.trains(req.auth?.id, req.query))),
  train: asyncHandler(async (req, res) => res.json(await phase4Service.train(param(req.params.id, "id")))),
  buses: asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json(await phase4Service.buses(req.auth?.id, req.query))),
  pricing: asyncHandler(async (req, res) => res.json(await phase4Service.pricing(req.body))),
  pricingRule: asyncHandler(async (req, res) => res.json(await phase4Service.upsertPricingRule(req.body))),
  homepage: asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.json(await phase4Service.personalizedHomepage(req.auth!.id))),
  queueBooking: asyncHandler(async (req: AuthenticatedRequest, res: Response) => res.status(201).json(await phase4Service.queueBooking(req.auth!.id, req.body))),
  processQueue: asyncHandler(async (_req, res) => res.json(await phase4Service.processBookingQueue())),
  cacheWarm: asyncHandler(async (_req, res) => res.json(await phase4Service.cacheWarm())),
  cacheInvalidate: asyncHandler(async (req, res) => res.json(await phase4Service.cacheInvalidate(param(req.params.group, "group")))),
  optimizedSearch: asyncHandler(async (req, res) => res.json(await phase4Service.atlasSearch(req.query))),
  apiMetrics: asyncHandler(async (_req, res) => res.json(await phase4Service.apiMetrics())),
  performanceAudit: asyncHandler(async (_req, res) => res.json(await phase4Service.performanceAudit())),
  imageTransform: asyncHandler(async (req, res) => res.json(await phase4Service.imageTransform(String(req.query.url ?? "")))),
  businessInsights: asyncHandler(async (_req, res) => res.json(await phase4Service.businessInsights())),
  captureError: asyncHandler(async (req, res) => res.status(201).json(await phase4Service.captureError(req.body))),
};
