import mongoose from 'mongoose';

const OrgRatingSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  playerId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scrimId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Scrim', required: false }, // optional for ratings page
  rating:         { type: Number, min: 1, max: 5, required: true },
  comment:        { type: String, default: '' },
  categories: {
    organization:  { type: Number, min: 1, max: 5 },
    communication: { type: Number, min: 1, max: 5 },
    fairness:      { type: Number, min: 1, max: 5 },
    experience:    { type: Number, min: 1, max: 5 },
  },
  createdAt:      { type: Date, default: Date.now },
  updatedAt:      { type: Date, default: Date.now },
});

OrgRatingSchema.index({ organizationId: 1, playerId: 1 }, { unique: true });
OrgRatingSchema.index({ organizationId: 1 });
OrgRatingSchema.index({ playerId: 1 });
OrgRatingSchema.index({ scrimId: 1 });

OrgRatingSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (typeof this.rating === 'number') {
    this.rating = Math.min(5, Math.max(1, this.rating));
  }
  next();
});

export default mongoose.model('OrgRating', OrgRatingSchema);
