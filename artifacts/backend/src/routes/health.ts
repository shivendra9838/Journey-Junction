import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function sendHealth(_req: unknown, res: { json(data: unknown): void }) {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
}

router.get("/health", sendHealth);
router.get("/healthz", sendHealth);

export default router;
