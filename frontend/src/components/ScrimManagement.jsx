import React, { useState, useEffect } from 'react';
import { Users, MessageSquare, Edit, Trash2, Send, Image as ImageIcon, X } from 'lucide-react';
import { scrimsAPI, uploadAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ScrimManagement = ({ scrim, onScrimUpdate }) => {
  const { user } = useAuth();

  const [participants, setParticipants] = useState(scrim.participants || []);
  const [roomMessages, setRoomMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  // ⬇️ NEW: local image upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    title: scrim.title,
    description: scrim.description,
    capacity: scrim.capacity,
    room: { id: scrim?.room?.id || '', password: '' }, // do not prefill password
  });

  useEffect(() => {
    fetchParticipantDetails();
    fetchRoomMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchParticipantDetails = async () => {
    try {
      const res = await scrimsAPI.getParticipantDetails(scrim._id);
      setParticipants(res?.data?.participants || []);
    } catch (err) {
      console.error('Failed to fetch participant details:', err);
    }
  };

  const fetchRoomMessages = async () => {
    try {
      const res = await scrimsAPI.getRoomMessages(scrim._id);
      // backend might return array OR {room:{messages:[]}} — support both
      const data = res?.data;
      const msgs = Array.isArray(data) ? data : data?.room?.messages || data?.messages || [];
      setRoomMessages(msgs);
    } catch (err) {
      console.error('Failed to fetch room messages:', err);
    }
  };

  const handleRemoveParticipant = async (playerId) => {
    if (!window.confirm('Remove this participant?')) return;
    try {
      await scrimsAPI.removeParticipant(scrim._id, playerId);
      await fetchParticipantDetails();
      toast.success('Participant removed');
    } catch {
      toast.error('Failed to remove participant');
    }
  };

  // ⬇️ NEW: handle choosing a local image
  const handlePickFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setUploading(true);
    try {
      const res = await uploadAPI.uploadImage(file); // POST /api/upload/image (multipart)
      const url = res?.data?.url;
      if (!url) throw new Error('No URL returned');
      setUploadedUrl(url);
      toast.success('Image uploaded');
    } catch (err) {
      console.error(err);
      setSelectedFile(null);
      setUploadedUrl('');
      toast.error('Image upload failed');
    } finally {
      setUploading(false);
      // clear the file input so user can reselect the same file if needed
      e.target.value = '';
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = (newMessage || '').trim();

    if (!text && !uploadedUrl) return;

    try {
      const payload = uploadedUrl
        ? { content: text, type: 'image', imageUrl: uploadedUrl }
        : { content: text, type: 'text' };

      await scrimsAPI.sendRoomMessage(scrim._id, payload);
      setNewMessage('');
      setSelectedFile(null);
      setUploadedUrl('');
      await fetchRoomMessages();
      toast.success('Message sent');
    } catch (err) {
      console.error('Send message error:', err);
      toast.error('Failed to send message');
    }
  };

  const handleSendCredentials = async () => {
    if (!editData.room.id || !editData.room.password) {
      toast.error('Set room ID and password first');
      return;
    }
    try {
      await scrimsAPI.sendRoomMessage(scrim._id, {
        content: `Room ID: ${editData.room.id}\nPassword: ${editData.room.password}`,
        type: 'credentials',
      });
      await fetchRoomMessages();
      toast.success('Credentials sent');
    } catch (err) {
      console.error('Send credentials error:', err);
      toast.error('Failed to send credentials');
    }
  };

  const handleUpdateScrim = async (e) => {
    e.preventDefault();
    try {
      const res = await scrimsAPI.updateScrim(scrim._id, editData);
      onScrimUpdate?.(res?.data?.scrim || res?.data);
      setShowEditModal(false);
      toast.success('Scrim updated');
    } catch {
      toast.error('Failed to update scrim');
    }
  };

  const isImage = (m) => m?.type === 'image' && m?.imageUrl;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Manage Scrim</h2>
        <button onClick={() => setShowEditModal(true)} className="btn-primary">
          <Edit className="h-4 w-4 mr-2" />
          Edit Scrim
        </button>
      </div>

      {/* Participants */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Participants ({participants.length}/{scrim.capacity})
        </h3>

        <div className="space-y-3">
          {participants.length ? (
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

                {/* Info */}
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {booking.playerInfo?.teamName && (
                      <div><span className="text-gray-400">Team:</span> <span className="ml-2">{booking.playerInfo.teamName}</span></div>
                    )}
                    {booking.playerInfo?.contactNumber && (
                      <div><span className="text-gray-400">Contact:</span> <span className="ml-2">{booking.playerInfo.contactNumber}</span></div>
                    )}
                    {booking.playerInfo?.discordId && (
                      <div className="col-span-2"><span className="text-gray-400">Discord:</span> <span className="ml-2">{booking.playerInfo.discordId}</span></div>
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
          {roomMessages.length ? (
            <div className="space-y-3">
              {roomMessages.map((m, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg ${
                    m.type === 'credentials'
                      ? 'bg-gaming-purple/20 border border-gaming-purple/30'
                      : 'bg-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{m.senderId?.name || 'Organizer'}</span>
                    <span className="text-xs text-gray-400">{new Date(m.timestamp).toLocaleTimeString()}</span>
                  </div>
                  {m.content && <p className="text-sm whitespace-pre-wrap">{m.content}</p>}

                  {isImage(m) && (
                    <img
                      src={m.imageUrl}
                      alt="Shared"
                      className="mt-2 max-w-xs rounded-lg cursor-pointer"
                      onClick={() => window.open(m.imageUrl, '_blank')}
                    />
                  )}

                  {m.type === 'credentials' && (
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
        <div className="space-y-3">
          {/* Selected image preview */}
          {uploadedUrl && (
            <div className="flex items-center gap-3">
              <img src={uploadedUrl} alt="preview" className="h-16 rounded" />
              <button className="btn-secondary" onClick={() => { setUploadedUrl(''); setSelectedFile(null); }}>
                <X className="h-4 w-4" /> Remove
              </button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Send a message to participants…"
              className="input flex-1"
            />

            {/* File picker */}
            <label className="btn-secondary cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handlePickFile}
                hidden
              />
              {uploading ? 'Uploading…' : <ImageIcon className="h-4 w-4" />}
            </label>

            <button type="submit" className="btn-primary" disabled={uploading}>
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Quick Actions */}
        <div className="mt-4 flex space-x-2">
          <button onClick={handleSendCredentials} className="btn-secondary text-sm">
            Send Room Credentials
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Edit Scrim</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white">×</button>
            </div>

            <form onSubmit={handleUpdateScrim} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="input w-full h-24 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Capacity</label>
                <input
                  type="number"
                  min="2"
                  max="100"
                  value={editData.capacity}
                  onChange={(e) => setEditData({ ...editData, capacity: parseInt(e.target.value, 10) || 0 })}
                  className="input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Room ID</label>
                  <input
                    type="text"
                    value={editData.room.id}
                    onChange={(e) => setEditData({ ...editData, room: { ...editData.room, id: e.target.value } })}
                    className="input w-full"
                    placeholder="Discord/Game room ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Room Password</label>
                  <input
                    type="text"
                    value={editData.room.password}
                    onChange={(e) => setEditData({ ...editData, room: { ...editData.room, password: e.target.value } })}
                    className="input w-full"
                    placeholder="Room password"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" className="flex-1 btn-primary">Update Scrim</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScrimManagement;
