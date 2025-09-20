// backend/src/models/TempSignup.js
import mongoose from 'mongoose';

const tempSignupSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['player', 'organization'], default: 'player' },

    // store HASHED password here (never plaintext)
    passwordHash: { type: String, required: true },

    // OTP state
    otpHash: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0 },

    // housekeeping
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'temp_signups' }
);

// clean up old pending rows occasionally (optional TTL-ish)
tempSignupSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 }); // auto-delete after 24h

export default mongoose.model('TempSignup', tempSignupSchema);
