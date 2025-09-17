// backend/src/models/Tournament.js
import mongoose from 'mongoose';

const TeamPlayerSubSchema = new mongoose.Schema({
  slot: { type: Number },         // 1..5
  ignName: { type: String },
  ignId: { type: String },
}, { _id: false });

const ParticipantSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ign:          { type: String, default: '' },              // legacy fallback
  // NEW: contact + team info
  teamName: { type: String, default: '' },
  realName:     { type: String, default: '' },
  phone:        { type: String, default: '' },
  teamName:     { type: String, default: '' },
  players:      { type: [TeamPlayerSubSchema], default: [] },
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
    capacity: { type: Number, default: 20000 },
    price: { type: Number, default: 0 },
    rules: String,
    prizes: String,

    participants: [ParticipantSchema],
    registeredCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    groups: [GroupSchema],
  },
  { timestamps: true }
);

TournamentSchema.index({ organizationId: 1, startAt: 1 });
TournamentSchema.index({ isActive: 1, startAt: 1 });
TournamentSchema.index({ 'participants.userId': 1 });
TournamentSchema.index({ createdBy: 1 });

export default mongoose.models.Tournament ||
  mongoose.model('Tournament', TournamentSchema);
