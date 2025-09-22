import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const OrgKycSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ["unsubmitted", "pending", "approved", "rejected"], default: "unsubmitted" },
    legalName: { type: String, default: "" },
    email: { type: String, default: "" },
    dob: { type: Date },
    aadhaarNumber: { type: String, default: "" },
    aadhaarImageUrl: { type: String, default: "" },
    selfieWithAadhaarUrl: { type: String, default: "" },
    notes: { type: String, default: "" },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const LoginOtpSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ["email"], default: "email" },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: "" },

    // (hashed) password is stored here
    password: { type: String, required: true },

    avatarUrl: { type: String, default: null },

    role: {
      type: String,
      enum: ["player", "organization", "admin"],
      default: "player",
    },

    organizationInfo: {
      orgName: { type: String, default: "" },
      location: { type: String, default: "" },
      verified: { type: Boolean, default: false },
      ranking: { type: Number, default: 1000 },
      description: { type: String, default: "" },
      logo: { type: String, default: "" },
    },

    orgKyc: { type: OrgKycSchema, default: () => ({}) },

    playerInfo: {
      ign: { type: String },
      rank: { type: String },
      team: { type: String },
    },

    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },

    // signup email OTP (not used for password hashing)
    loginOtp: { type: LoginOtpSchema, default: null },

    isActive: { type: Boolean, default: true },

    // Set this to true ONLY when you already provide a bcrypt hash in .password
    isPasswordHashed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/**
 * Single safe pre-save hook:
 * - Skip if password unchanged
 * - If isPasswordHashed=true, accept the provided hash once and clear the flag
 * - Otherwise, hash normally
 */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  if (this.isPasswordHashed) {
    this.isPasswordHashed = false; // consume the flag
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

export default mongoose.models.User || mongoose.model("User", userSchema);
