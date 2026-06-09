import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";

let io: Server | null = null;

export function initRealtime(server: HttpServer) {
  io = new Server(server, {
    cors: { origin: true, credentials: true },
  });
  io.on("connection", (socket) => {
    const userId = String(socket.handshake.auth?.userId ?? socket.handshake.query?.userId ?? "");
    if (userId) socket.join(`user:${userId}`);
  });
  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}
