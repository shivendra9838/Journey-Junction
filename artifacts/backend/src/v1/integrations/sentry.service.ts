import crypto from "node:crypto";
import { logger } from "../../lib/logger";

export async function captureSentryMessage(input: { source: string; message: string; level?: string; metadata?: unknown }) {
  const eventId = crypto.randomUUID();
  logger[input.level === "fatal" || input.level === "error" ? "error" : "warn"](
    { eventId, source: input.source, metadata: input.metadata },
    input.message,
  );
  return eventId;
}
