import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema({
  scrimId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scrim', required: true, unique: true },
  roomId: { type: String, required: true },
  password: { type: String }, // encrypted
  participants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'removed', 'banned'], default: 'active' }
  }],
  messages: [{
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    type: { type: String, enum: ['text', 'credentials', 'system'], default: 'text' },
    timestamp: { type: Date, default: Date.now }
  }],
  settings: {
    onlyOrgCanMessage: { type: Boolean, default: true },
    autoRevealCredentials: { type: Boolean, default: false },
    credentialsRevealed: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now }
});

RoomSchema.index({ scrimId: 1 });
RoomSchema.index({ 'participants.userId': 1 });

export default mongoose.model('Room', RoomSchema);