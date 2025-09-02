import React, { useState } from 'react';
import { X, Lock, Users } from 'lucide-react';
import { scrimsAPI } from '../services/api';
import toast from 'react-hot-toast';

const BookingModal = ({ scrim, isOpen, onClose, onBookingSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [roomCredentials, setRoomCredentials] = useState(null);
  const [playerInfo, setPlayerInfo] = useState({
    teamName: '',
    contactNumber: '',
    discordId: ''
  });

  const handleBooking = async () => {
    setLoading(true);
    try {
      const response = await scrimsAPI.book(scrim._id, { playerInfo });
      
      toast.success('Successfully booked scrim!');
      onBookingSuccess(response.data.requiresPayment);
      
      // Get room credentials for free scrims
      if (!response.data.requiresPayment) {
        // Get room credentials after successful booking for free scrims
        const roomResponse = await scrimsAPI.getRoomCredentials(scrim._id);
        setRoomCredentials(roomResponse.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {roomCredentials ? 'Room Credentials' : 'Confirm Booking'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!roomCredentials ? (
          <>
            <div className="mb-6">
              <h4 className="font-medium mb-2">{scrim.title}</h4>
              <div className="text-sm text-gray-400 space-y-1">
                <p>Game: {scrim.game}</p>
                <p>Date: {new Date(scrim.date).toLocaleDateString()}</p>
                <p>Time: {new Date(scrim.timeSlot?.start).toLocaleTimeString()} - {new Date(scrim.timeSlot?.end).toLocaleTimeString()}</p>
                {scrim.entryFee > 0 && <p className="text-green-400">Entry Fee: ${scrim.entryFee}</p>}
                {scrim.entryFee > 0 && (
                  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                    <p className="text-yellow-400 text-sm">
                      💳 Payment will be required after booking confirmation
                    </p>
                  </div>
                )}
              </div>
              
              {/* Player Info Form */}
              <div className="mt-4 space-y-3">
                <h5 className="font-medium text-gray-300">Contact Information</h5>
                <input
                  type="text"
                  placeholder="Team Name (optional)"
                  className="input w-full"
                  value={playerInfo.teamName}
                  onChange={(e) => setPlayerInfo({...playerInfo, teamName: e.target.value})}
                />
                <input
                  type="tel"
                  placeholder="Contact Number"
                  className="input w-full"
                  value={playerInfo.contactNumber}
                  onChange={(e) => setPlayerInfo({...playerInfo, contactNumber: e.target.value})}
                  required
                />
                <input
                  type="text"
                  placeholder="Discord ID (optional)"
                  className="input w-full"
                  value={playerInfo.discordId}
                  onChange={(e) => setPlayerInfo({...playerInfo, discordId: e.target.value})}
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleBooking}
                className="flex-1 btn-primary"
                disabled={loading || !playerInfo.contactNumber}
              >
                {loading ? 'Booking...' : scrim.entryFee > 0 ? 'Book & Pay' : 'Confirm Booking'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6">
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-center text-green-400 mb-2">
                  <Users className="h-4 w-4 mr-2" />
                  Booking Confirmed!
                </div>
                <p className="text-sm text-gray-300">
                  You've successfully booked this scrim. Here are your room credentials:
                </p>
              </div>

              <div className="space-y-3">
                <div className="bg-gray-700 rounded-lg p-3">
                  <label className="text-xs text-gray-400 uppercase tracking-wide">Room ID</label>
                  <div className="flex items-center justify-between">
                    <code className="text-gaming-cyan font-mono">{roomCredentials.roomId}</code>
                    <button
                      onClick={() => navigator.clipboard.writeText(roomCredentials.roomId)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="bg-gray-700 rounded-lg p-3">
                  <label className="text-xs text-gray-400 uppercase tracking-wide">Password</label>
                  <div className="flex items-center justify-between">
                    <code className="text-gaming-cyan font-mono">{roomCredentials.roomPassword}</code>
                    <button
                      onClick={() => navigator.clipboard.writeText(roomCredentials.roomPassword)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                <div className="flex items-center text-yellow-400 text-sm">
                  <Lock className="h-4 w-4 mr-2" />
                  Keep these credentials safe and don't share them with others.
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full btn-primary"
            >
              Got it!
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BookingModal;