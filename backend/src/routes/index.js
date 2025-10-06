// routes/index.js
import { Router } from "express";
import authRoutes from "./authRoutes.js";
import scrimRoutes from "./scrimRoutes.js";
import tournamentsRoutes from "./tournamentsRoutes.js";
import profileRoutes from "./ProfileRoutes.js";
import adminRoutes from "./adminRoutes.js";
import orgRoutes from "./orgRoutes.js";
import promosRoutes from "./promosRoutes.js";
import uploadRoutes from "./uploadRoutes.js";
import diagnosticsRoutes from "./diagnosticRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/scrims", scrimRoutes);
router.use("/upload", uploadRoutes);
router.use("/profile", profileRoutes);
router.use("/admin", adminRoutes);
router.use("/orgs", orgRoutes);
router.use("/organizations", orgRoutes);
router.use("/promos", promosRoutes);
router.use("/tournaments", tournamentsRoutes);
router.use("/diagnostics", diagnosticsRoutes);

export default router;
