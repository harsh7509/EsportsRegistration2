import mongoose from "mongoose";

const supportMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, required: true, trim: true, maxlength: 140 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // optional
    status: { type: String, enum: ["open", "closed"], default: "open" },
  },
  { timestamps: true }
);

export default mongoose.model("SupportMessage", supportMessageSchema);
