// config/corsConfig.js
import cors from "cors";
import { ALLOWED_ORIGINS } from "./constants.js";

export default cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    const clean = origin.replace(/\/+$/, '');
    return ALLOWED_ORIGINS.includes(clean)
      ? cb(null, true)
      : cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
});
