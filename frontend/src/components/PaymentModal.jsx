import React, { useState } from 'react';
import { X, CreditCard, DollarSign } from 'lucide-react';
import { scrimsAPI } from '../services/api';
import toast from 'react-hot-toast';

const PaymentModal = ({ scrim, isOpen, onClose, onPaymentSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });

  const handlePayment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate payment processing
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await scrimsAPI.processPayment(scrim._id, {
        paymentMethod,
        transactionId,
        amount: scrim.entryFee
      });

      toast.success('Payment successful! You have been added to the room.');
      onPaymentSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCardChange = (field, value) => {
    setCardDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Complete Payment</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          <div className="bg-gaming-purple/20 border border-gaming-purple/30 rounded-lg p-4 mb-4">
            <h4 className="font-semibold mb-2">{scrim.title}</h4>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Entry Fee:</span>
              <span className="text-2xl font-bold text-green-400">
                <DollarSign className="inline h-5 w-5" />
                {scrim.entryFee}
              </span>
            </div>
            {scrim.prizePool && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-gray-300">Prize Pool:</span>
                <span className="text-yellow-400 font-medium">{scrim.prizePool}</span>
              </div>
            )}
          </div>

          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="input w-full"
              >
                <option value="card">Credit/Debit Card</option>
                <option value="upi">UPI</option>
                <option value="netbanking">Net Banking</option>
              </select>
            </div>

            {paymentMethod === 'card' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    className="input w-full"
                    value={cardDetails.name}
                    onChange={(e) => handleCardChange('name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Card Number
                  </label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    className="input w-full"
                    value={cardDetails.number}
                    onChange={(e) => handleCardChange('number', e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Expiry
                    </label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      className="input w-full"
                      value={cardDetails.expiry}
                      onChange={(e) => handleCardChange('expiry', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      CVV
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      className="input w-full"
                      value={cardDetails.cvv}
                      onChange={(e) => handleCardChange('cvv', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'upi' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  UPI ID
                </label>
                <input
                  type="text"
                  placeholder="yourname@paytm"
                  className="input w-full"
                  required
                />
              </div>
            )}

            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-yellow-400 text-sm">
                <CreditCard className="inline h-4 w-4 mr-1" />
                This is a demo payment. No real charges will be made.
              </p>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 btn-primary"
                disabled={loading}
              >
                {loading ? 'Processing...' : `Pay ₹${scrim.entryFee}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;