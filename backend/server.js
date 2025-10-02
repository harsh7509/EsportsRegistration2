import dotenv from "dotenv";
import http from "http";
import mongoose from "mongoose";
import app from "./app.js";
import initSocket from "./config/socket.js";
import { purgeOldScrims, scheduleScrimCleanup } from "./src/services/scrimCleanup.js";
import { initMailer } from "./src/utils/mailer.js";

dotenv.config();

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ Missing MONGO_URI in env");
  process.exit(1);
}

const server = http.createServer(app);
initSocket(server);

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    await initMailer();
    server.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log("🗄️  MongoDB connected");
    });

    purgeOldScrims();
    scheduleScrimCleanup();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
