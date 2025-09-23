// models/Booking.js
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    scrimId: { type: mongoose.Schema.Types.ObjectId, ref: "Scrim", required: true },
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    playerInfo: {
      ign: { type: String, required: true },   // in-game name
      rank: { type: String },
      team: { type: String },
    },

    status: {
      type: String,
      enum: ["active", "cancelled", "completed"],
      default: "active",
    },
    // in Scrim schema:
participantsMeta: [{
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ign: String,
  phone: String,
  teamName: String,
}],


    paid: { type: Boolean, default: false }, // ✅ mark after successful payment
    slotNumber: { type: Number }, // optional: if you want to assign seat numbers

    bookedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ✅ Prevent duplicate booking: one player cannot book same scrim twice
bookingSchema.index({ scrimId: 1, playerId: 1 }, { unique: true });

export default mongoose.model("Booking", bookingSchema);
