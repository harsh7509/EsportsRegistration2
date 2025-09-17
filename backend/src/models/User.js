import mongoose from "mongoose";
import bcrypt from "bcryptjs";






const OrgKycSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ["unsubmitted", "pending", "approved", "rejected"], default: "unsubmitted" },
    legalName: { type: String, default: "" },
    email: { type: String, default: "" },
    dob: { type: Date },
    aadhaarNumber: { type: String, default: "" },          // TIP: display me mask karna
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

    // Store the (hashed) password in this field
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

    // Used for the signup email OTP step
    loginOtp: { type: LoginOtpSchema, default: null },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password on save if modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (pwd) {
  return bcrypt.compare(pwd, this.password);
};

export default mongoose.models.User || mongoose.model("User", userSchema);
