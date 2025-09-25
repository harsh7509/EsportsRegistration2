import React, { useEffect, useState } from 'react';
import {
  Users, MessageSquare, Edit, Trash2, Send, Image as ImageIcon, X,
  AlertTriangle, ClipboardList, Check, XCircle
} from 'lucide-react';
import { scrimsAPI, uploadAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext'; // ⬅️ NEW
import { NormalizeImageUrl } from '../utils/img.js';
import toast from 'react-hot-toast';

const ScrimManagement = ({ scrim, onScrimUpdate }) => {
  const { user } = useAuth();
  const { socket } = useSocket() || {};

  const [participants, setParticipants] = useState(scrim.participants || []);
  const [roomMessages, setRoomMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    title: scrim.title,
    description: scrim.description,
    capacity: scrim.capacity,
    room: { id: scrim?.room?.id || '', password: '' },
  });

  // 🔴 Kick Requests state
  const [kickOpen, setKickOpen] = useState(false);
  const [kickRequests, setKickRequests] = useState([]);
  const [krLoading, setKrLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(null); // reqId currently resolving
  const [orgNotes, setOrgNotes] = useState({}); // { [reqId]: string }

  const pendingCount = kickRequests.filter(r => r.status === 'pending').length;

  useEffect(() => {
    fetchParticipantDetails();
    fetchRoomMessages();
    fetchKickRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

 
  // 🔔 socket: realtime room chat (append messages as they arrive)
useEffect(() => {
  if (!socket || !scrim?._id) return;
  const roomId = scrim._id;

  socket.emit('join-scrim', roomId);

  const onRoomMessage = (evt) => {
    if (evt?.scrimId !== roomId) return;
    setRoomMessages((prev) => [...prev, evt.message]);
  };

  socket.on('room:message', onRoomMessage);

  return () => {
    socket.off('room:message', onRoomMessage);
  };
}, [socket, scrim?._id]);

// 🔔 socket: kick requests (new / update)
useEffect(() => {
  if (!socket || !scrim?._id) return;
  const roomId = scrim._id;

   const join = () => socket.emit('join-scrim', roomId);
  join();                  // initial mount
  socket.on('connect', join); 

  const onNew = (evt) => {
    if (evt?.scrimId !== roomId) return;
    setKickRequests((prev) => [evt.request, ...prev]);
  };

  const onUpdate = (evt) => {
    if (evt?.scrimId !== roomId) return;
    setKickRequests((prev) =>
      prev.map((r) => (r._id === evt.request._id ? evt.request : r))
    );
  };

  socket.on('kickRequest:new', onNew);
  socket.on('kickRequest:update', onUpdate);

  return () => {
    socket.off('kickRequest:new', onNew);
    socket.off('kickRequest:update', onUpdate);
  };
}, [socket, scrim?._id]);

  const fetchKickRequests = async () => {
    try {
      setKrLoading(true);
      const res = await scrimsAPI.listKickRequests(scrim._id);
      setKickRequests(res?.data || []);
    } catch (err) {
      console.error('Failed to fetch kick requests:', err);
    } finally {
      setKrLoading(false);
    }
  };

  const handleResolve = async (reqId, action) => {
    try {
      setActionBusy(reqId);
      const note = (orgNotes[reqId] || '').trim();
      await scrimsAPI.resolveKickRequest(scrim._id, reqId, { action, orgNote: note });
      // optimism: update UI locally
      setKickRequests(prev =>
        prev.map(r => (r._id === reqId ? { ...r, status: action === 'approve' ? 'approved' : 'rejected', orgNote: note, resolvedAt: new Date().toISOString() } : r))
      );
      toast.success(action === 'approve' ? 'Approved' : 'Rejected');
    } catch (err) {
      console.error('resolve error', err);
      toast.error(err?.response?.data?.message || 'Action failed');
    } finally {
      setActionBusy(null);
    }
  };

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

  const handlePickFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setUploading(true);
    try {
      const res = await uploadAPI.uploadImage(file);
      const url = res?.data?.url || res?.data?.imageUrl;
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

      const res = await scrimsAPI.sendRoomMessage(scrim._id, payload);
     setNewMessage('');
     setSelectedFile(null);
     setUploadedUrl('');
     // optional optimistic update
     if (res?.data?.message) {
       setRoomMessages((prev) => [...prev, res.data.message]);
     }
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
        type: 'text',
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
        <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
          Manage Scrim
        </h2>

        <div className="flex items-center gap-2">
          {/* 🔴 Kick Requests indicator button */}
          <button
            onClick={() => setKickOpen(true)}
            className={[
              'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              pendingCount
                ? 'bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/20'
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
            ].join(' ')}
            title={pendingCount ? 'Pending kick requests' : 'No kick requests'}
          >
            <ClipboardList className="h-4 w-4" />
            {pendingCount ? `Kick Requests • ${pendingCount}` : 'Kick Requests • OK'}
          </button>

          <button onClick={() => setShowEditModal(true)} className="btn-primary">
            <Edit className="h-4 w-4 mr-2" />
            Edit Scrim
          </button>
        </div>
      </div>

      {/* Participants */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
        <div className="px-5 pt-5">
          <h3 className="text-lg font-semibold mb-1 flex items-center">
            <Users className="h-5 w-5 mr-2 text-gaming-cyan" />
            Participants
          </h3>
          <div className="text-xs text-gray-400 mb-4">
            {participants.length}/{scrim.capacity} registered
          </div>
        </div>

        <div className="px-5 pb-5">
          {participants.length ? (
            <div className="grid md:grid-cols-2 gap-4">
              {participants.map((booking) => {
                const initials =
                  booking?.playerId?.name?.split(' ')
                    .map(s => s[0])
                    .slice(0, 2)
                    .join('')
                    ?.toUpperCase() || 'P';

                return (
                  <div
                    key={booking._id}
                    className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {booking.playerId?.avatarUrl ? (
                          <img
                            src={NormalizeImageUrl(booking.playerId.avatarUrl)}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gaming-purple/30 grid place-items-center text-white/90 text-sm font-semibold">
                            {initials}
                          </div>
                        )}
                        <div>
                          <p className="font-medium leading-tight">{booking.playerId?.name}</p>
                          <p className="text-xs text-gray-400">{booking.playerId?.email}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveParticipant(booking.playerId._id)}
                        className="text-red-300/90 hover:text-red-200 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Remove participant"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="grid grid-cols-2 gap-3 text-sm">
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

                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span
                          className={`px-2 py-1 rounded-full border ${
                            booking.paid
                              ? 'border-emerald-600/40 bg-emerald-500/10 text-emerald-300'
                              : 'border-yellow-600/40 bg-yellow-500/10 text-yellow-300'
                          }`}
                        >
                          {booking.paid ? '✓ Paid' : 'Payment Pending'}
                        </span>
                        <span className="text-gray-500">
                          Booked: {new Date(booking.bookedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-white/5 grid place-items-center">
                <Users className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-gray-300 font-medium">No participants yet</p>
              <p className="text-gray-500 text-sm">Share your scrim to get the first registrations.</p>
            </div>
          )}
        </div>
      </div>

      {/* Room Communication */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
        <div className="px-5 pt-5">
          <h3 className="text-lg font-semibold mb-1 flex items-center">
            <MessageSquare className="h-5 w-5 mr-2 text-gaming-purple" />
            Room Communication
          </h3>
          <p className="text-xs text-gray-400 mb-4">Send updates, images, and credentials to all participants.</p>
        </div>

        {/* Messages */}
        <div className="px-5">
          <div className="rounded-xl border border-white/10 bg-black/20 backdrop-blur h-72 overflow-y-auto p-3 space-y-3">
            {roomMessages.length ? (
              roomMessages.map((m, i) => (
                <MessageBubble key={i} message={m} isImage={isImage(m)} />
              ))
            ) : (
              <div className="h-full grid place-items-center text-gray-400 text-sm">
                No messages yet
              </div>
            )}
          </div>

          {/* Selected image preview */}
          {uploadedUrl && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur p-2">
              <img src={uploadedUrl} alt="preview" className="h-14 rounded-lg" />
              <button
                className="btn-secondary"
                onClick={() => { setUploadedUrl(''); setSelectedFile(null); }}
              >
                <X className="h-4 w-4 mr-1" /> Remove
              </button>
            </div>
          )}

          {/* Composer */}
          <form onSubmit={handleSendMessage} className="sticky bottom-0 mt-3 flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Write a message…"
              className="input flex-1 bg-white/5 border-white/10 placeholder:text-gray-500"
            />

            <label className="btn-secondary cursor-pointer flex items-center justify-center">
              <input type="file" accept="image/*" onChange={handlePickFile} hidden />
              {uploading ? 'Uploading…' : <ImageIcon className="h-4 w-4" />}
            </label>

            <button type="submit" className="btn-primary" disabled={uploading}>
              <Send className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Actions */}
          <div className="mt-4 pb-5">
            <button onClick={handleSendCredentials} className="btn-secondary text-sm">
              Send Room Credentials
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-[0_10px_40px_rgba(0,0,0,0.55)]">
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
                  className="input w-full bg-white/5 border-white/10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="input w-full h-24 resize-none bg-white/5 border-white/10"
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
                  className="input w-full bg-white/5 border-white/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Room ID</label>
                  <input
                    type="text"
                    value={editData.room.id}
                    onChange={(e) => setEditData({ ...editData, room: { ...editData.room, id: e.target.value } })}
                    className="input w-full bg-white/5 border-white/10"
                    placeholder="Discord/Game room ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Room Password</label>
                  <input
                    type="text"
                    value={editData.room.password}
                    onChange={(e) => setEditData({ ...editData, room: { ...editData.room, password: e.target.value } })}
                    className="input w-full bg-white/5 border-white/10"
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

      {/* 🔴 Kick Requests Modal */}
      {kickOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-[0_10px_40px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-300" />
                Kick Requests
              </h3>
              <button onClick={() => setKickOpen(false)} className="text-gray-400 hover:text-white">×</button>
            </div>

            <div className="mb-3 text-sm text-gray-400">
              {krLoading ? 'Loading…' : pendingCount
                ? `${pendingCount} pending request(s)`
                : 'No pending requests'}
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {kickRequests.length ? kickRequests.map(req => (
                <div key={req._id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <div className="font-medium text-white">
                        Slot #{req.slotNumber} — <span className="text-gaming-cyan">{req.targetName}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Requested by: {req?.requester?.name || 'Player'} • {new Date(req.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <span className={[
                      'px-2 py-1 rounded-full text-[11px] border',
                      req.status === 'pending' ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
                        : req.status === 'approved' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    ].join(' ')}>{req.status}</span>
                  </div>

                  {req.reason && (
                    <div className="mt-2 text-sm text-gray-200">
                      <span className="text-gray-400">Reason:</span> {req.reason}
                    </div>
                  )}

                  {req.status === 'pending' ? (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Note (optional)"
                        className="md:col-span-2 input bg-white/5 border-white/10 text-sm"
                        value={orgNotes[req._id] || ''}
                        onChange={(e) => setOrgNotes(s => ({ ...s, [req._id]: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResolve(req._id, 'approve')}
                          disabled={actionBusy === req._id}
                          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 text-sm disabled:opacity-60"
                        >
                          <Check className="h-4 w-4" /> Approve
                        </button>
                        <button
                          onClick={() => handleResolve(req._id, 'reject')}
                          disabled={actionBusy === req._id}
                          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white px-3 py-2 text-sm disabled:opacity-60"
                        >
                          <XCircle className="h-4 w-4" /> Reject
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-gray-400">
                      Resolved {req.resolvedAt ? `on ${new Date(req.resolvedAt).toLocaleString()}` : ''} {req.orgNote ? `• Note: ${req.orgNote}` : ''}
                    </div>
                  )}
                </div>
              )) : (
                <div className="text-center text-gray-400">No kick requests yet</div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => fetchKickRequests()}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
              >
                Refresh
              </button>
              <button onClick={() => setKickOpen(false)} className="btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------- Small presentational piece for nicer bubbles ---------- */
function MessageBubble({ message, isImage }) {
  const isCredential = message.type === 'credentials';
  return (
    <div
      className={[
        'p-3 rounded-xl border',
        isCredential
          ? 'border-gaming-purple/40 bg-gaming-purple/10'
          : 'border-white/10 bg-white/5 backdrop-blur'
      ].join(' ')}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">{message.senderId?.name || 'Organizer'}</span>
        <span className="text-xs text-gray-400">{new Date(message.timestamp).toLocaleTimeString()}</span>
      </div>

      {message.content && (
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      )}

      {isImage && (
        <img
          src={NormalizeImageUrl(message.imageUrl)}
          alt="Shared"
          className="mt-2 max-w-xs rounded-lg cursor-pointer"
          onClick={() => window.open(message.imageUrl, '_blank')}
        />
      )}

      {isCredential && (
        <span className="text-[11px] mt-2 inline-block text-gaming-purple">🔐 Room Credentials</span>
      )}
    </div>
  );
}

export default ScrimManagement;
