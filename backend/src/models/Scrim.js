import mongoose from 'mongoose';

const ScrimSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  game: String,
  platform: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  timeSlot: { 
    start: Date, 
    end: Date 
  },
  capacity: { type: Number, default: 10 },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  room: {
    id: { type: String },
    password: { type: String }, // store encrypted
    revealToParticipants: { type: Boolean, default: false }
  },
  pointsTableUrl: String,
  promoImageUrl: String,
  rankScore: { type: Number, default: 0 },
  isPaid: { type: Boolean, default: false },
  price: { type: Number, default: 0 },
  entryFee: { type: Number, default: 0 },
  prizePool: { type: String },
  ratings: [{
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    ratedAt: { type: Date, default: Date.now }
  }],
  averageRating: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], 
    default: 'upcoming' 
  },
  createdAt: { type: Date, default: Date.now }
});

ScrimSchema.index({ date: 1, 'timeSlot.start': 1 });
ScrimSchema.index({ rankScore: -1 });
ScrimSchema.index({ game: 1 });
ScrimSchema.index({ status: 1 });
ScrimSchema.index({ entryFee: 1 });

export default mongoose.model('Scrim', ScrimSchema);