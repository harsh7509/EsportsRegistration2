import express from "express";
import corsConfig from "./config/corsConfig.js";
import routes from "./src/routes/index.js";
import supportRoutes from "./src/routes/support.js";

const app = express();
app.set("trust proxy", 1);

// Middleware
app.use(corsConfig);
app.use(express.json());

// Routes
app.use("/api", routes);
app.use("/api/support", supportRoutes);

// Static
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

export default app;
