import mongoose from 'mongoose';

const PromotionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  imageUrl: String,

  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scrimId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scrim' },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' }, // ⬅️ NEW

  type: { type: String, enum: ['scrim', 'tournament', 'announcement'], default: 'scrim' },
  priority: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  startDate: { type: Date, default: Date.now },
  endDate: Date,
  clickCount: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

PromotionSchema.index({ isActive: 1, priority: -1, startDate: 1 });
PromotionSchema.index({ organizationId: 1 });

export default mongoose.models.Promotion || mongoose.model('Promotion', PromotionSchema);
