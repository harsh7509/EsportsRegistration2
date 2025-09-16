//models/promo.js

import mongoose from 'mongoose';

const PromoSchema = new mongoose.Schema({
  title: String,
  type: { type: String, enum: ['scrim', 'tournament'], default: 'scrim' },
  imageUrl: String,
  targetScrimId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scrim' },
  activeFrom: Date,
  activeTo: Date,
  createdAt: { type: Date, default: Date.now }
});

PromoSchema.index({ activeFrom: 1, activeTo: 1 });

export default mongoose.model('Promo', PromoSchema);