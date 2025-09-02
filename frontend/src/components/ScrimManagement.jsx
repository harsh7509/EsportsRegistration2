import React, { useState, useEffect } from 'react';
import { Users, Settings, MessageSquare, DollarSign, Edit, Trash2, Send } from 'lucide-react';
import { scrimsAPI } from '../services/api';
import toast from 'react-hot-toast';

const ScrimManagement = ({ scrim, onScrimUpdate }) => {
  const [participants, setParticipants] = useState(scrim.participants || []);
  const [roomMessages, setRoomMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    title: scrim.title,
    description: scrim.description,
    capacity: scrim.capacity,
    room: {
      id: '',
      password: ''
    }
  });

  const fetchParticipantDetails = async () => {
    try {
      const response = await scrimsAPI.getParticipantDetails(scrim._id);
      setParticipants(response.data.participants || []);
    } catch (error) {
      console.error('Failed to fetch participant details:', error);
    }
  };

  useEffect(() => {
    fetchRoomMessages();
    fetchParticipantDetails();
    // Initialize edit data with current scrim room info
    if (scrim.room) {
      setEditData(prev => ({
        ...prev,
        room: {
          id: scrim.room.id || '',
          password: '' // Don't pre-fill password for security
        }
      }));
    }
  }, []);

  const fetchRoomMessages = async () => {
    try {
      const response = await scrimsAPI.getRoomMessages(scrim._id);
      setRoomMessages(response.data.room.messages || []);
    } catch (error) {
      console.error('Failed to fetch room messages:', error);
    }
  };

  const handleRemoveParticipant = async (playerId) => {
    if (!window.confirm('Are you sure you want to remove this participant? They will be able to rebook.')) return;

    try {
      await scrimsAPI.removeParticipant(scrim._id, playerId);
      fetchParticipantDetails(); // Refresh participant list
      toast.success('Participant removed successfully');
    } catch (error) {
      toast.error('Failed to remove participant');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await scrimsAPI.sendRoomMessage(scrim._id, {
        content: newMessage,
        type: 'text'
      });
      setNewMessage('');
      fetchRoomMessages(); // Refresh messages
      toast.success('Message sent');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleSendCredentials = async () => {
    if (!editData.room.id || !editData.room.password) {
      toast.error('Please set room ID and password first');
      return;
    }
    
    try {
      await scrimsAPI.sendRoomMessage(scrim._id, {
        content: `Room ID: ${editData.room.id}\nPassword: ${editData.room.password}`,
        type: 'credentials'
      });
      toast.success('Room credentials sent to all participants');
      fetchRoomMessages();
    } catch (error) {
      console.error('Send credentials error:', error);
      toast.error('Failed to send credentials');
    }
  };

  const handleUpdateScrim = async (e) => {
    e.preventDefault();
    try {
      const response = await scrimsAPI.updateScrim(scrim._id, editData);
      onScrimUpdate(response.data.scrim);
      setShowEditModal(false);
      toast.success('Scrim updated successfully');
    } catch (error) {
      toast.error('Failed to update scrim');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Manage Scrim</h2>
        <button
          onClick={() => setShowEditModal(true)}
          className="btn-primary"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Scrim
        </button>
      </div>

      {/* Participants Management */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Participants ({participants.length}/{scrim.capacity})
        </h3>
        
        <div className="space-y-3">
          {participants.length > 0 ? (
            participants.map((booking) => (
              <div key={booking._id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{booking.playerId?.name}</p>
                    <p className="text-xs text-gray-400">{booking.playerId?.email}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveParticipant(booking.playerId._id)}
                    className="text-red-400 hover:text-red-300 p-2"
                    title="Remove participant"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Contact Information */}
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {booking.playerInfo?.teamName && (
                      <div>
                        <span className="text-gray-400">Team:</span>
                        <span className="ml-2">{booking.playerInfo.teamName}</span>
                      </div>
                    )}
                    {booking.playerInfo?.contactNumber && (
                      <div>
                        <span className="text-gray-400">Contact:</span>
                        <span className="ml-2">{booking.playerInfo.contactNumber}</span>
                      </div>
                    )}
                    {booking.playerInfo?.discordId && (
                      <div className="col-span-2">
                        <span className="text-gray-400">Discord:</span>
                        <span className="ml-2">{booking.playerInfo.discordId}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center text-xs">
                    <span className={`px-2 py-1 rounded ${booking.paid ? 'bg-green-900/20 text-green-400' : 'bg-yellow-900/20 text-yellow-400'}`}>
                      {booking.paid ? '✓ Paid' : 'Payment Pending'}
                    </span>
                    <span className="ml-2 text-gray-500">
                      Booked: {new Date(booking.bookedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-center py-4">No participants yet</p>
          )}
        </div>
      </div>

      {/* Room Communication */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          Room Communication
        </h3>

        {/* Messages */}
        <div className="bg-gray-700 rounded-lg p-4 h-64 overflow-y-auto mb-4">
          {roomMessages.length > 0 ? (
            <div className="space-y-3">
              {roomMessages.map((message, index) => (
                <div key={index} className={`p-3 rounded-lg ${
                  message.type === 'credentials' 
                    ? 'bg-gaming-purple/20 border border-gaming-purple/30' 
                    : 'bg-gray-600'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{message.senderId?.name}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.type === 'credentials' && (
                    <span className="text-xs text-gaming-purple">🔐 Room Credentials</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center">No messages yet</p>
          )}
        </div>

        {/* Send Message */}
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Send a message to participants..."
            className="input flex-1"
          />
          <button type="submit" className="btn-primary">
            <Send className="h-4 w-4" />
          </button>
        </form>

        {/* Quick Actions */}
        <div className="mt-4 flex space-x-2">
          <button
            onClick={handleSendCredentials}
            className="btn-secondary text-sm"
          >
            Send Room Credentials
          </button>
        </div>
      </div>

      {/* Edit Scrim Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Edit Scrim</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateScrim} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({...editData, title: e.target.value})}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({...editData, description: e.target.value})}
                  className="input w-full h-24 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Capacity
                </label>
                <input
                  type="number"
                  min="2"
                  max="100"
                  value={editData.capacity}
                  onChange={(e) => setEditData({...editData, capacity: parseInt(e.target.value)})}
                  className="input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Room ID
                  </label>
                  <input
                    type="text"
                    value={editData.room.id}
                    onChange={(e) => setEditData({
                      ...editData, 
                      room: {...editData.room, id: e.target.value}
                    })}
                    className="input w-full"
                    placeholder="Discord/Game room ID"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Room Password
                  </label>
                  <input
                    type="text"
                    value={editData.room.password}
                    onChange={(e) => setEditData({
                      ...editData, 
                      room: {...editData.room, password: e.target.value}
                    })}
                    className="input w-full"
                    placeholder="Room password"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Update Scrim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScrimManagement;