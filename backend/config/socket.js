import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { ALLOWED_ORIGINS } from "./constants.js";

export default function initSocket(server) {
  const io = new SocketIOServer(server, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    pingTimeout: 20000,
    cors: {
      origin: ALLOWED_ORIGINS,
      methods: ["GET", "POST"],
      allowedHeaders: ["Authorization"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const raw =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization ||
        "";
      const token = raw?.startsWith("Bearer ") ? raw.slice(7) : raw;
      if (token) jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch (e) {
      console.warn("[socket] auth failed:", e?.message || e);
      next();
    }
  });

  io.on("connection", (socket) => {
    console.log("[socket] connected:", socket.id);
    socket.on("join-scrim", (scrimId) => {
      const room = "scrim:" + String(scrimId);
      socket.join(room);
      console.log(`[socket] ${socket.id} joined ${room}`);
    });
    socket.on("disconnect", (reason) => {
      console.log("[socket] disconnected:", socket.id, reason);
    });
  });

  return io;
}
