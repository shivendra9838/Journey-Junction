import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

type RequestPart = "body" | "query" | "params";

export const validate =
  (part: RequestPart, schema: ZodTypeAny) =>
  (req: Request, _res: Response, next: NextFunction) => {
    req[part] = schema.parse(req[part]);
    next();
  };
