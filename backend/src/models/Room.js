import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, default: '' },
  type: { type: String, enum: ['text', 'image', 'system', 'deleted'], default: 'text' },
  imageUrl: { type: String, default: null },
  timestamp: { type: Date, default: Date.now },
  editedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
}, { _id: true });


const ParticipantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  joinedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'removed', 'banned'], default: 'active' }
}, { _id: false });

const RoomSchema = new mongoose.Schema({
  scrimId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Scrim', default: null }, // optional for tournaments
  // For tournament group rooms (no scrimId)
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    default: null,
    required: function () { return !this.scrimId; } // only required if not a scrim room
  },
   groupId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    required: function () { return !this.scrimId; } // only required if not a scrim room
  },
   createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  groupName: {
    type: String,
    default: null,
    // only required for tournament rooms
    required: function () { return !this.scrimId; }
  }, // <-- make it required (no empty '')
  roomId: {
    type: String,
    default: () => `RM-${Date.now()}-${Math.floor(Math.random() * 10000)}`
  },
  password: { type: String },
  participants: [ParticipantSchema],
  messages: [MessageSchema],
  settings: {
    onlyOrgCanMessage: { type: Boolean, default: true },
    autoRevealCredentials: { type: Boolean, default: false },
    credentialsRevealed: { type: Boolean, default: false }
  }
}, { timestamps: true }); // <-- use timestamps instead of manual createdAt


// Conditional required: if it's a tournament room, groupId is required.
RoomSchema.path('groupId').validate(function (v) {
  if (this.tournamentId && !v) return false;
  return true;
}, 'groupId is required for tournament rooms');

// INDEXES
// 1) One room per scrim (but allow many tournament rooms where scrimId is null)
RoomSchema.index({ scrimId: 1 }, { unique: true, sparse: true });

// 2) One room per group per tournament
RoomSchema.index({ tournamentId: 1, groupId: 1 }, { unique: true });

// 3) Useful lookup for room membership
RoomSchema.index({ 'participants.userId': 1 });

export default mongoose.model('Room', RoomSchema);
