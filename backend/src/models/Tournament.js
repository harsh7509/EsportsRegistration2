// backend/src/models/Tournament.js
import mongoose from 'mongoose';

const ParticipantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ign: { type: String, default: '' },
  registeredAt: { type: Date, default: Date.now },
}, { _id: false });

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
}, { _id: true });

const TournamentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    bannerUrl: String,
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    game: String,
    startAt: Date,
    endAt: Date,
    capacity: { type: Number, default: 20000 }, // large default, org can set higher/lower
    price: { type: Number, default: 0 }, // registration fee (₹)
    rules: String,
    prizes: String,
    participants: [ParticipantSchema],               // ✅ अब controller के साथ मैच करेगा
    registeredCount: { type: Number, default: 0 },   // ✅ registerTournament में $inc के लिए
    isActive: { type: Boolean, default: true },      // ✅ listTournaments filter के लिए
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    groups: [GroupSchema],    
  },
  { timestamps: true }
);

TournamentSchema.index({ organizationId: 1, startAt: 1 });


// Keep only one of these per schema:
TournamentSchema.index({ isActive: 1, startAt: 1 });
TournamentSchema.index({ 'participants.userId': 1 });
TournamentSchema.index({ createdBy: 1 });

export default mongoose.models.Tournament ||
  mongoose.model('Tournament', TournamentSchema);

