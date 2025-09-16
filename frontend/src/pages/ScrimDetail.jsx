import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Users, Trophy, DollarSign, Lock, ExternalLink, MessageSquare, Star, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { X } from 'lucide-react';
import BookingModal from '../components/BookingModal';
import PaymentModal from '../components/PaymentModal';
import ScrimManagement from '../components/ScrimManagement';
import RoomView from '../components/RoomView';
import RatingModal from '../components/RateOrgModal';
import OrgRatingModal from '../components/OrgRatingModal';
import { scrimsAPI } from '../services/api';
import toast from 'react-hot-toast';

const ScrimDetail = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { socket } = useSocket();
  const [scrim, setScrim] = useState(null);
  const [isBooked, setIsBooked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [roomCredentials, setRoomCredentials] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showManagement, setShowManagement] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showRoom, setShowRoom] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showOrgRatingModal, setShowOrgRatingModal] = useState(false);

  useEffect(() => {
    fetchScrimDetails();
  }, [id]);

  useEffect(() => {
    if (socket && scrim) {
      socket.emit('join-scrim', scrim._id);

      socket.on('scrim:participant_added', (data) => {
        if (data.scrimId === scrim._id) {
          setScrim(prev => ({
            ...prev,
            participants: [...prev.participants, data.participant]
          }));
          toast.success('New participant joined!');
        }
      });

      socket.on('scrim:points_updated', (data) => {
        if (data.scrimId === scrim._id) {
          setScrim(prev => ({
            ...prev,
            pointsTableUrl: data.pointsTableUrl
          }));
          toast.success('Points table updated!');
        }
      });

      return () => {
        socket.off('scrim:participant_added');
        socket.off('scrim:points_updated');
      };
    }
  }, [socket, scrim]);

  const fetchScrimDetails = async () => {
    try {
      const response = await scrimsAPI.getDetails(id);
      setScrim(response.data.scrim);
      setIsBooked(response.data.isBooked);
    } catch (error) {
      console.error('Failed to fetch scrim details:', error);
      toast.error('Failed to load scrim details');
    } finally {
      setLoading(false);
    }
  };

  const handleViewRoom = async () => {
    try {
      const response = await scrimsAPI.getRoomCredentials(id);
      setRoomCredentials(response.data);
    } catch (error) {
      toast.error('Failed to get room credentials');
    }
  };

  const handleBookingSuccess = () => {
    setIsBooked(true);
    
    // Check if payment is required
    if (scrim.entryFee > 0) {
      setShowBookingModal(false);
      setShowPaymentModal(true);
    } else {
      fetchScrimDetails(); // Refresh to get updated participant count
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    fetchScrimDetails();
    toast.success('You have been added to the scrim room!');
  };

  const handleScrimUpdate = (updatedScrim) => {
    setScrim(updatedScrim);
  };

  const handleRatingSubmitted = () => {
    fetchScrimDetails();
  };

  const handleDeleteScrim = async () => {
    try {
      await scrimsAPI.deleteScrim(scrim._id);
      toast.success('Scrim deleted successfully');
      navigate('/dashboard/org');
    } catch (error) {
      toast.error('Failed to delete scrim');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gaming-purple"></div>
      </div>
    );
  }

  if (!scrim) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Scrim Not Found</h2>
          <Link to="/scrims" className="btn-primary">
            Back to Scrims
          </Link>
        </div>
      </div>
    );
  }

  const isFull = scrim.participants?.length >= scrim.capacity;
  const isOwner = user && scrim.createdBy?._id === user.id;
  const canBook = isAuthenticated && user?.role === 'player' && !isBooked && !isFull && scrim.status === 'upcoming';

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">{scrim.title}</h1>
            {scrim.rankScore > 0 && (
              <div className="flex items-center bg-gaming-purple/20 text-gaming-purple px-3 py-1 rounded-lg">
                <Trophy className="h-4 w-4 mr-2" />
                Rank: {scrim.rankScore.toFixed(1)}
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {new Date(scrim.date).toLocaleDateString()}
            </div>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              {scrim.participants?.length || 0} / {scrim.capacity} players
            </div>
            {scrim.isPaid && (
              <div className="flex items-center text-green-400">
                <DollarSign className="h-4 w-4 mr-1" />
                ${scrim.price}
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Promo Image */}
            {scrim.promoImageUrl && (
              <div className="rounded-lg overflow-hidden">
                <img 
                  src={scrim.promoImageUrl} 
                  alt={scrim.title}
                  className="w-full h-64 object-cover"
                />
              </div>
            )}

            {/* Description */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">About This Scrim</h2>
              <p className="text-gray-300 leading-relaxed">
                {scrim.description || 'No description provided.'}
              </p>
            </div>

            {/* Points Table */}
            {scrim.pointsTableUrl && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">Points Table</h2>
                <a 
                  href={scrim.pointsTableUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-gaming-cyan hover:text-gaming-cyan/80"
                >
                  View Points Table
                  <ExternalLink className="h-4 w-4 ml-1" />
                </a>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Booking Card */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Join This Scrim</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-400">Game:</span>
                  <span>{scrim.game}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Platform:</span>
                  <span>{scrim.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Time:</span>
                  <span>
                    {new Date(scrim.timeSlot?.start).toLocaleTimeString()} - 
                    {new Date(scrim.timeSlot?.end).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Participants</span>
                  <span>{scrim.participants?.length || 0} / {scrim.capacity}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gaming-purple h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${((scrim.participants?.length || 0) / scrim.capacity) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {isBooked ? (
                  <>
                    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-center">
                      <span className="text-green-400 font-medium">✓ You're registered!</span>
                    </div>
                    <button
                      onClick={handleViewRoom}
                      className="w-full btn-primary"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      View Room Credentials
                    </button>
                    <button
                      onClick={() => setShowRoom(!showRoom)}
                      className="w-full btn-secondary"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {showRoom ? 'Hide' : 'Show'} Room Chat
                    </button>
                    {scrim.status === 'completed' && (
                      <button
                        onClick={() => setShowRatingModal(true)}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg transition-colors"
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Rate Scrim
                      </button>
                    )}
                    {scrim.status === 'completed' && (
                      <button
                        onClick={() => setShowOrgRatingModal(true)}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors"
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Rate Organization
                      </button>
                    )}
                  </>
                ) : canBook ? (
                  <button
                    onClick={() => setShowBookingModal(true)}
                    className="w-full btn-primary"
                  >
                    Book Slot
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full bg-gray-600 text-gray-400 py-2 px-4 rounded-lg cursor-not-allowed"
                  >
                    {!isAuthenticated ? 'Login to Book' : 
                     isFull ? 'Scrim Full' : 
                     user?.role !== 'player' ? 'Players Only' : 'Cannot Book'}
                  </button>
                )}

                {isOwner && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowManagement(!showManagement)}
                      className="w-full btn-secondary"
                    >
                      {showManagement ? 'Hide Management' : 'Manage Scrim'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Scrim
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Organization Info */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Organized By</h3>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gaming-purple rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold">
                    {scrim.createdBy?.name?.charAt(0) || 'O'}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{scrim.createdBy?.name}</p>
                  {scrim.createdBy?.organizationInfo?.verified && (
                    <span className="text-xs text-green-400">✓ Verified</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scrim Management Section */}
        {isOwner && showManagement && (
          <div className="mt-8">
            <ScrimManagement 
              scrim={scrim} 
              onScrimUpdate={handleScrimUpdate}
            />
          </div>
        )}

        {/* Room View for Players */}
        {isBooked && showRoom && (
          <div className="mt-8">
            <RoomView scrimId={scrim._id} isOwner={false} />
          </div>
        )}

        {/* Room Credentials Modal */}
        {roomCredentials && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Room Credentials</h3>
                <button 
                  onClick={() => setRoomCredentials(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 mb-6">
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

              <button
                onClick={() => setRoomCredentials(null)}
                className="w-full btn-primary"
              >
                Got it!
              </button>
            </div>
          </div>
        )}

        {/* Booking Modal */}
        <BookingModal
          scrim={scrim}
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          onBookingSuccess={handleBookingSuccess}
        />

        {/* Payment Modal */}
        <PaymentModal
          scrim={scrim}
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={handlePaymentSuccess}
        />

        {/* Rating Modal */}
        <RatingModal
          scrim={scrim}
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          onRatingSubmitted={handleRatingSubmitted}
        />

        {/* Organization Rating Modal */}
        <OrgRatingModal
          organization={scrim.createdBy}
          scrim={scrim}
          isOpen={showOrgRatingModal}
          onClose={() => setShowOrgRatingModal(false)}
          onRatingSubmitted={handleRatingSubmitted}
        />

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">Delete Scrim</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete "{scrim.title}"? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteScrim}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScrimDetail;