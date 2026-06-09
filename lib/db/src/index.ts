import mongoose from "mongoose";
import dns from "node:dns";

let _connecting: Promise<typeof mongoose> | null = null;

function configureMongoDns() {
  const servers = (process.env.MONGODB_DNS_SERVERS ?? "8.8.8.8,1.1.1.1")
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);
  if (servers.length > 0) dns.setServers(servers);
}

export async function connectDB(): Promise<void> {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI must be set.");
  }
  if (mongoose.connection.readyState === 1) return;
  if (!_connecting) {
    configureMongoDns();
    _connecting = mongoose.connect(MONGODB_URI, {
      dbName: "wandr",
      serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS ?? 15000),
    });
  }
  await _connecting;
}

export function isDBConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export * from "./schema";
export * from "./schema/bookingTransport";
