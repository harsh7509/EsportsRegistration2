import React, { useState } from 'react';
import { X, Lock, Users, Phone, Hash, Shield } from 'lucide-react';
import { scrimsAPI } from '../services/api';
import toast from 'react-hot-toast';

const BookingModal = ({ scrim, isOpen, onClose, onBookingSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [roomCredentials, setRoomCredentials] = useState(null);
  const [playerInfo, setPlayerInfo] = useState({
    ign: '',           // ✅ REQUIRED by backend
    ignId: '',         // optional
    teamName: '',
    contactNumber: '',
    discordId: ''
  });

  if (!isOpen) return null;

  const onChange = (k) => (e) =>
    setPlayerInfo((s) => ({ ...s, [k]: e.target.value }));

  const handleBooking = async () => {
    // ✅ Frontend validations to match backend requirements
    if (!playerInfo.ign.trim()) {
      toast.error('Please enter your in-game name (IGN)');
      return;
    }
    if (!playerInfo.contactNumber.trim()) {
      toast.error('Please enter your contact number');
      return;
    }

    // Optionally trim before sending
    const payload = {
      playerInfo: {
        ign: playerInfo.ign.trim(),
        ignId: playerInfo.ignId?.trim() || undefined,
        teamName: playerInfo.teamName?.trim() || undefined,
        contactNumber: playerInfo.contactNumber.trim(),
        discordId: playerInfo.discordId?.trim() || undefined,
      }
    };

    setLoading(true);
    try {
      const response = await scrimsAPI.book(scrim._id, payload);

      toast.success('Successfully booked scrim!');
      onBookingSuccess?.(response.data.requiresPayment);

      // Auto-fetch room credentials for free scrims
      if (!response.data.requiresPayment) {
        const roomResponse = await scrimsAPI.getRoomCredentials(scrim._id);
        setRoomCredentials(roomResponse.data);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const dateStr = (() => {
    try {
      return new Date(scrim.date).toLocaleDateString();
    } catch {
      return '—';
    }
  })();

  const timeStr = (() => {
    try {
      const s = scrim.timeSlot?.start ? new Date(scrim.timeSlot.start).toLocaleTimeString() : '—';
      const e = scrim.timeSlot?.end ? new Date(scrim.timeSlot.end).toLocaleTimeString() : '—';
      return `${s} – ${e}`;
    } catch {
      return '—';
    }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-black/70" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,#6d28d9_0,#111827_55%,#0b0f1a_100%)] opacity-60" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/10">
              {roomCredentials ? (
                <Shield className="h-5 w-5 text-white" />
              ) : (
                <Users className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold">
                {roomCredentials ? 'Room Credentials' : 'Confirm Booking'}
              </h3>
              <p className="mt-0.5 text-xs text-white/60">
                {roomCredentials ? 'Access details for your scrim room' : 'Review details and provide contact'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/70 hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        {!roomCredentials ? (
          <>
            {/* Scrim summary */}
            <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4">
              <h4 className="font-medium">{scrim.title}</h4>
              <div className="mt-2 grid gap-1 text-sm text-white/70">
                <p>Game: <span className="text-white/90">{scrim.game}</span></p>
                <p>Date: <span className="text-white/90">{dateStr}</span></p>
                <p>Time: <span className="text-white/90">{timeStr}</span></p>
                {Number(scrim.entryFee) > 0 && (
                  <p className="text-emerald-300">Entry Fee: ₹{scrim.entryFee}</p>
                )}
              </div>

              {Number(scrim.entryFee) > 0 && (
                <div className="mt-3 rounded-lg border border-yellow-500/30 bg-yellow-900/20 p-3">
                  <p className="text-xs text-yellow-300">
                    💳 Payment will be required after booking confirmation.
                  </p>
                </div>
              )}
            </div>

            {/* Form */}
            <div className="space-y-3">
              {/* IGN (required) */}
              <div>
                <label className="mb-1.5 block text-xs text-white/70">In-Game Name (IGN) *</label>
                <div className="relative">
                  <Shield className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  <input
                    type="text"
                    placeholder="e.g., NightRaider"
                    className="w-full rounded-xl border px-10 py-2.75 text-sm text-white outline-none placeholder:text-white/40 bg-white/5 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30 border-white/10"
                    value={playerInfo.ign}
                    onChange={onChange('ign')}
                    required
                  />
                </div>
              </div>

              {/* IGN ID (optional) */}
              <div>
                <label className="mb-1.5 block text-xs text-white/70">IGN ID (optional)</label>
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  <input
                    type="text"
                    placeholder="e.g., 5123456789"
                    className="w-full rounded-xl border px-10 py-2.75 text-sm text-white outline-none placeholder:text-white/40 bg-white/5 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30 border-white/10"
                    value={playerInfo.ignId}
                    onChange={onChange('ignId')}
                  />
                </div>
              </div>

              {/* Team Name (optional unless your backend requires for squads) */}
              <div>
                <label className="text-xs text-white/70">Team Name</label>
                <div className="relative">
                  <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  <input
                    type="text"
                    placeholder="e.g., Night Raiders"
                    className="w-full rounded-xl border px-10 py-2.75 text-sm text-white outline-none placeholder:text-white/40 bg-white/5 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30 border-white/10"
                    value={playerInfo.teamName}
                    onChange={onChange('teamName')}
                  />
                </div>
              </div>

              {/* Contact (required) */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs text-white/70">Contact Number *</label>
                </div>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  <input
                    type="tel"
                    placeholder="Your phone number"
                    className="w-full rounded-xl border px-10 py-2.75 text-sm text-white outline-none placeholder:text-white/40 bg-white/5 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30 border-white/10"
                    value={playerInfo.contactNumber}
                    onChange={onChange('contactNumber')}
                    required
                  />
                </div>
              </div>

              {/* Discord (optional) */}
              <div>
                <label className="mb-1.5 block text-xs text-white/70">Discord ID (optional)</label>
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  <input
                    type="text"
                    placeholder="e.g., gamer#1234"
                    className="w-full rounded-xl border px-10 py-2.75 text-sm text-white outline-none placeholder:text-white/40 bg-white/5 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30 border-white/10"
                    value={playerInfo.discordId}
                    onChange={onChange('discordId')}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="group relative flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/90 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Cancel
              </button>
              <button
                onClick={handleBooking}
                disabled={loading || !playerInfo.ign || !playerInfo.contactNumber}
                className="group relative flex-1 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {loading ? 'Booking…' : Number(scrim.entryFee) > 0 ? 'Book & Pay' : 'Confirm Booking'}
                </span>
                <span className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-indigo-400/20 opacity-0 blur transition group-hover:opacity-100" />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Success + Credentials */}
            <div className="mb-5 rounded-xl border border-green-500/30 bg-green-900/20 p-4">
              <div className="mb-1.5 flex items-center text-green-300">
                <Users className="mr-2 h-4 w-4" />
                Booking Confirmed!
              </div>
              <p className="text-sm text-white/80">
                You’ve successfully booked this scrim. Here are your room credentials:
              </p>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <label className="text-xs text-white/60 uppercase tracking-wide">Room ID</label>
                <div className="mt-1 flex items-center justify-between">
                  <code className="font-mono text-indigo-300">{roomCredentials.roomId}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(roomCredentials.roomId);
                      toast.success('Room ID copied!');
                    }}
                    className="rounded-md px-2 py-1 text-xs text-white/70 hover:bg-white/10"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <label className="text-xs text-white/60 uppercase tracking-wide">Password</label>
                <div className="mt-1 flex items-center justify-between">
                  <code className="font-mono text-indigo-300">{roomCredentials.roomPassword}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(roomCredentials.roomPassword);
                      toast.success('Password copied!');
                    }}
                    className="rounded-md px-2 py-1 text-xs text-white/70 hover:bg-white/10"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-900/20 p-3">
              <div className="flex items-center text-sm text-yellow-300">
                <Lock className="mr-2 h-4 w-4" />
                Keep these credentials safe and don’t share them with others.
              </div>
            </div>

            <button
              onClick={onClose}
              className="group relative mt-6 w-full rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white hover:bg-indigo-600 active:scale-[0.99]"
            >
              <span className="inline-flex items-center justify-center">Got it!</span>
              <span className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-indigo-400/20 opacity-0 blur transition group-hover:opacity-100" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BookingModal;
