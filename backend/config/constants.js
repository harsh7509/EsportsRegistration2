// config/constants.js
export const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://arenapulse-orcin.vercel.app').replace(/\/+$/, '');
export const ALLOWED_ORIGINS = [
  FRONTEND_URL,
  'http://localhost:5173',
  'https://thearenapulse.xyz',
  'https://www.thearenapulse.xyz',
];
