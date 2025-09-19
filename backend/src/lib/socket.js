// src/lib/socket.js
import { io } from "socket.io-client";

const ORIGIN = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000").replace(/\/+$/, "");

// NOTE: Vercel (https) => use wss automatically when URL is https
export const socket = io(ORIGIN, {
  path: "/socket.io",
  transports: ["websocket"],     // बेहतर stability
  withCredentials: true,
  autoConnect: true,
  // auth: { token: localStorage.getItem("accessToken") } // अगर भेजना हो
});

socket.on("connect_error", (err) => {
  console.warn("[socket] connect_error:", err?.message || err);
});

socket.on("connect", () => {
  console.log("[socket] connected:", socket.id);
});
