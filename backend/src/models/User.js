import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    // used by your UI to render the avatar everywhere
    avatarUrl: { type: String, default: null },

    role: {
      type: String,
      enum: ["player", "organization", "admin"],
      default: "player",
    },

    // keep legacy fields if you want, but prefer avatarUrl everywhere
    profileImage: { type: String, default: "" },

    // ✅ match the UI (orgName/location/verified/ranking)
    organizationInfo: {
      orgName: { type: String, default: "" },
      location: { type: String, default: "" },
      verified: { type: Boolean, default: false },
      ranking: { type: Number, default: 1000 },

      // optional extras if you still want them
      description: { type: String, default: "" },
      logo: { type: String, default: "" },
    },

    // For players (optional)
    playerInfo: {
      ign: { type: String },
      rank: { type: String },
      team: { type: String },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password
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

// Compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);
