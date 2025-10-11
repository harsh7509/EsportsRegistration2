import React from 'react';
import { X, CreditCard, IndianRupeeIcon, Smartphone, Globe } from 'lucide-react';
import { scrimsAPI } from '../services/api';
import toast from 'react-hot-toast';

const fmtINR = (n) => (Number.isFinite(+n) ? Number(n) : 0);

const PaymentModal = ({ scrim, isOpen, onClose, onPaymentSuccess }) => {
  // ---- hooks (always top-level) ----
  const [loading, setLoading] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState('card'); // 'card' | 'upi' | 'netbanking'
  const [cardDetails, setCardDetails] = React.useState({
    number: '',
    expiry: '',
    cvv: '',
    name: '',
  });
  const [upiId, setUpiId] = React.useState('');

  // esc to close
  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // input helpers
  const setCard = (k, v) =>
    setCardDetails((s) => ({ ...s, [k]: v }));

  const onNumber = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 16);
    const spaced = digits.replace(/(.{4})/g, '$1 ').trim();
    setCard('number', spaced);
  };

  const onExpiry = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    const mm = digits.slice(0, 2);
    const yy = digits.slice(2, 4);
    const withSlash = yy ? `${mm}/${yy}` : mm;
    setCard('expiry', withSlash);
  };

  const onCVV = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    setCard('cvv', digits);
  };

  const amount = fmtINR(scrim?.entryFee || 0);

  const validate = () => {
    if (paymentMethod === 'card') {
      const clean = cardDetails.number.replace(/\s/g, '');
      if (!cardDetails.name.trim()) return 'Enter cardholder name';
      if (clean.length < 16) return 'Enter a valid card number';
      if (!/^\d{2}\/\d{2}$/.test(cardDetails.expiry)) return 'Enter expiry as MM/YY';
      if (+cardDetails.expiry.slice(0, 2) < 1 || +cardDetails.expiry.slice(0, 2) > 12)
        return 'Invalid expiry month';
      if (cardDetails.cvv.length < 3) return 'Enter a valid CVV';
    }
    if (paymentMethod === 'upi') {
      if (!/^[\w.\-]+@[\w\-]+$/i.test(upiId.trim())) return 'Enter a valid UPI ID (e.g., name@bank)';
    }
    return '';
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    setLoading(true);
    try {
      // Simulated payment
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      await scrimsAPI.processPayment(scrim._id, {
        paymentMethod,
        transactionId,
        amount: amount,
      });

      toast.success('Payment successful! You have been added to the room.');
      onPaymentSuccess?.();
      onClose?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const TabBtn = ({ id, icon: Icon, children }) => (
    <button
      type="button"
      onClick={() => setPaymentMethod(id)}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition
        ${paymentMethod === id
          ? 'border-indigo-400/40 bg-indigo-500/20 text-white'
          : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'}`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,#6d28d9_0,#111827_55%,#0b0f1a_100%)] opacity-60" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">Complete Payment</h3>
            <p className="mt-0.5 text-xs text-white/70">{scrim?.title}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/70 hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Summary */}
        <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">Entry Fee</span>
            <span className="inline-flex items-center gap-1 text-2xl font-bold text-emerald-300">
              <IndianRupeeIcon className="h-5 w-5" />
              {amount}
            </span>
          </div>
          {!!scrim?.prizePool && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-white/70">Prize Pool</span>
              <span className="text-yellow-300">{scrim.prizePool}</span>
            </div>
          )}
        </div>

        {/* Method Tabs */}
        <div className="mb-4 flex flex-wrap gap-2">
          <TabBtn id="card" icon={CreditCard}>Card</TabBtn>
          <TabBtn id="upi" icon={Smartphone}>UPI</TabBtn>
          <TabBtn id="netbanking" icon={Globe}>Net Banking</TabBtn>
        </div>

        {/* Form */}
        <form onSubmit={handlePayment} noValidate className="space-y-4">
          {paymentMethod === 'card' && (
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs text-white/70">Cardholder Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30"
                  value={cardDetails.name}
                  onChange={(e) => setCard('name', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-white/70">Card Number</label>
                <div className="relative">
                  <CreditCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="1234 5678 9012 3456"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-10 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30"
                    value={cardDetails.number}
                    onChange={(e) => onNumber(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs text-white/70">Expiry (MM/YY)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="MM/YY"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30"
                    value={cardDetails.expiry}
                    onChange={(e) => onExpiry(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-white/70">CVV</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    placeholder="123"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30"
                    value={cardDetails.cvv}
                    onChange={(e) => onCVV(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'upi' && (
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs text-white/70">UPI ID</label>
                <input
                  type="text"
                  placeholder="yourname@bank"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  required
                />
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                You’ll receive a collect request in your UPI app (demo).
              </div>
            </div>
          )}

          {paymentMethod === 'netbanking' && (
            <div className="space-y-3">
              <label className="mb-1.5 block text-xs text-white/70">Select Bank</label>
              <select
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30"
                defaultValue="SBI"
              >
                <option className="bg-slate-800" value="SBI">SBI</option>
                <option className="bg-slate-800" value="HDFC">HDFC</option>
                <option className="bg-slate-800" value="ICICI">ICICI</option>
                <option className="bg-slate-800" value="AXIS">AXIS</option>
                <option className="bg-slate-800" value="PNB">PNB</option>
              </select>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                You’ll be redirected to your bank (demo).
              </div>
            </div>
          )}

          {/* Demo notice */}
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-900/20 p-3">
            <p className="text-xs text-yellow-300">
              <CreditCard className="mr-1 inline h-4 w-4" />
              This is a demo payment. No real charges will be made.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="group relative flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/90 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || amount <= 0}
              className="group relative flex-1 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Processing…' : `Pay ₹${amount}`}
              <span className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-indigo-400/20 opacity-0 blur transition group-hover:opacity-100" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
