import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  scrimId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scrim', required: true },
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'refunded'], 
    default: 'pending' 
  },
  paymentMethod: String,
  transactionId: String,
  paidAt: Date,
  createdAt: { type: Date, default: Date.now }
});

PaymentSchema.index({ scrimId: 1, playerId: 1 });
PaymentSchema.index({ status: 1 });

export default mongoose.model('Payment', PaymentSchema);