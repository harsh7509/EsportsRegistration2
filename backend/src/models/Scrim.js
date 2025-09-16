// backend/src/models/Scrim.js
import mongoose from 'mongoose';

const scrimSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },

    game: { type: String, required: true },
    platform: { type: String },

    // Keep date + full timeslot
    date: { type: Date, required: true },
    timeSlot: {
      start: { type: Date, required: true }, // full ISO datetime
      end:   { type: Date, required: true },
    },

    capacity: { type: Number, default: 100 },

    // If you’re tracking participants here (in addition to Bookings)
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    entryFee: { type: Number, default: 0 },
    prizePool: { type: Number, default: 0 },

    isPaid: { type: Boolean, default: false },
    price:  { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming',
    },

    room: {
      id: { type: String },
      password: { type: String }, // encrypted JSON string
      revealToParticipants: { type: Boolean, default: false },
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },

    ratings: [
      {
        playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rating:   { type: Number, min: 1, max: 5 },
        comment:  { type: String },
        ratedAt:  { type: Date, default: Date.now },
      },
    ],

    averageRating: { type: Number, default: 0 },
    rankScore:     { type: Number, default: 0 },
  },
  { timestamps: true }
);

/**
 * Validation / normalization
 * - Ensure end > start
 * - Auto-fill `date` from `timeSlot.start` if missing
 */
scrimSchema.pre('validate', function(next) {
  if (this.timeSlot?.start && this.timeSlot?.end) {
    if (new Date(this.timeSlot.end) <= new Date(this.timeSlot.start)) {
      return next(new Error('timeSlot.end must be after timeSlot.start'));
    }
  }

  if (!this.date && this.timeSlot?.start) {
    this.date = new Date(this.timeSlot.start);
  }

  next();
});

/**
 * Helpful indexes
 */
scrimSchema.index({ createdBy: 1 });                // ✅ FIXED: use the right variable name
scrimSchema.index({ 'timeSlot.start': 1 });         // query upcoming/ongoing efficiently
scrimSchema.index({ status: 1, 'timeSlot.start': 1 });

export default mongoose.model('Scrim', scrimSchema);
