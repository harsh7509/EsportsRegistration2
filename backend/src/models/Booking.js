import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema({
  scrimId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scrim', required: true },
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  playerInfo: {
    teamName: String,
    contactNumber: String,
    discordId: String
  },
  bookedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'cancelled', 'expired'], default: 'active' },
  paid: { type: Boolean, default: false }
});

BookingSchema.index({ scrimId: 1, playerId: 1 }, { unique: true });
BookingSchema.index({ playerId: 1 });
// BookingSchema.index({ scrimId: 1 });

export default mongoose.model('Booking', BookingSchema);