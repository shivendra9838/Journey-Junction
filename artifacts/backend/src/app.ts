import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import pinoHttp from "pino-http";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import router from "./routes";
import v1Router from "./v1/routes";
import { logger } from "./lib/logger";
import { apiRateLimit, requestContext, sanitizeRequest } from "./v1/shared/security";
import { apiMetricsMiddleware } from "./v1/shared/metrics";
import { v2ResponseEnvelope } from "./v1/shared/versioning";
import path from "path";
import fs from "fs";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required");
}

const app: Express = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(compression());
app.use(morgan("combined"));
app.use(apiMetricsMiddleware);
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use("/uploads", express.static(uploadsDir));
app.use(requestContext);
app.use(sanitizeRequest);
app.use("/api/v1", apiRateLimit);

app.use(
  session({
    name: "wandr.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

app.use("/api/v1", v1Router);
app.use("/api/v2", v2ResponseEnvelope, v1Router);
app.use("/api", router);

export default app;
