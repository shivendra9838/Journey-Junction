import { connectDB, CustomDestModel } from "@workspace/db";
import { loadRootEnv } from "./lib/env";
import { logger } from "./lib/logger";
import { initRealtime } from "./v1/integrations/realtime.service";

loadRootEnv();

const rawPort = process.env["API_PORT"] ?? process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function startServer() {
  if (process.env["SKIP_MONGODB"] === "true") {
    logger.warn("Starting without MongoDB; database-backed routes will be limited");
  } else {
    await connectDB();
    await migrateDestinationSchema();
    logger.info("Connected to MongoDB");
  }

  const { default: app } = await import("./app.js");
  const server = app.listen(port, (err?: Error) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
  initRealtime(server);
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function migrateDestinationSchema() {
  try {
    const indexes = await CustomDestModel.collection.indexes();
    if (indexes.some(index => index.name === "slug_1")) {
      await CustomDestModel.collection.dropIndex("slug_1");
    }
  } catch (err) {
    logger.warn({ err }, "Could not drop legacy destination slug index");
  }

  const docs = await CustomDestModel.find({
    $or: [
      { city: { $in: [null, ""] } },
      { stateSlug: { $in: [null, ""] } },
      { photos: { $exists: false } },
      { photos: { $size: 0 } },
      { climate: { $in: [null, ""] } },
    ],
  }).lean<Array<{ _id: unknown; name: string; state: string; images?: string[]; climateLabel?: string }>>();

  await Promise.all(docs.map(doc => CustomDestModel.updateOne(
    { _id: doc._id },
    {
      $set: {
        city: doc.name,
        stateSlug: slugify(doc.state),
        photos: doc.images ?? [],
        climate: doc.climateLabel ?? "",
      },
    },
  )));
}

startServer().catch((err: unknown) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
