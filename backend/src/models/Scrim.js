// backend/src/models/Scrim.js
import mongoose from 'mongoose';

const ParticipantsMetaSchema = new mongoose.Schema(
  {
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ign: { type: String },
    phone: { type: String },
    teamName: { type: String },
  },
  { _id: false }
);

const scrimSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },

    game: { type: String, required: true },
    platform: { type: String },

    date: { type: Date, required: true },
    timeSlot: {
      start: { type: Date, required: true },
      end:   { type: Date, required: true },
    },

    capacity: { type: Number, default: 100 },

    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    participantsMeta: [ParticipantsMetaSchema],

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
      password: { type: String },
      revealToParticipants: { type: Boolean, default: false },
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },

    ratings: [{
      playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      rating:   { type: Number, min: 1, max: 5 },
      comment:  { type: String },
      ratedAt:  { type: Date, default: Date.now },
    }],

    averageRating: { type: Number, default: 0 },
    rankScore:     { type: Number, default: 0 },
  },
  { timestamps: true }
);

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

scrimSchema.index({ createdBy: 1 });
scrimSchema.index({ 'timeSlot.start': 1 });
scrimSchema.index({ status: 1, 'timeSlot.start': 1 });

export default mongoose.model('Scrim', scrimSchema);
