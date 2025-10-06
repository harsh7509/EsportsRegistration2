import { Router } from "express";
import rateLimit from "express-rate-limit";
import { postContact } from "../controllers/SupportController.js";

const router = Router();

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 30,                  // 30 requests/10min per IP
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/contact", limiter, postContact);

export default router;
