
import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Lock, Upload, RotateCw } from 'lucide-react';
import { scrimsAPI, uploadAPI } from '../services/api';
import { NormalizeImageUrl } from '../utils/img.js';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

import toast from 'react-hot-toast';

const RolePill = ({ role }) => {
  if (!role) return null;
  const map = {
    admin: 'text-rose-300 bg-rose-400/10 ring-1 ring-rose-300/20',
    organization: 'text-sky-300 bg-sky-400/10 ring-1 ring-sky-300/20',
    player: 'text-emerald-300 bg-emerald-400/10 ring-1 ring-emerald-300/20',
  };
  const cls = map[role] || 'text-slate-300 bg-white/5 ring-1 ring-white/10';
  return <span className={`px-2 py-0.5 text-[10px] rounded-full ${cls}`}>{role}</span>;
};

const formatTime = (ts) => {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
  } catch {
    return '';
  }
};

const RoomView = ({ scrimId, isOwner }) => {
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fileInputRef = useRef(null);
  const listRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Kick request state
  const [kickOpen, setKickOpen] = useState(false);
  const [slotNumber, setSlotNumber] = useState('');
  const [targetName, setTargetName] = useState('');
  const [reason, setReason] = useState('');
  const [sendingKick, setSendingKick] = useState(false);

  // also try to read from route if parent didn't pass
  const { scrimId: pScrimId, id: pId } = useParams();
  const resolvedScrimId = scrimId ?? pScrimId ?? pId ?? null;

  useEffect(() => {
    if (!resolvedScrimId) {
      setLoading(false);
      return;
    }
    fetchMessages(resolvedScrimId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedScrimId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 🔔 Socket: join scrim room & listen for new messages
 // 🔔 Socket: join scrim room & listen for new messages
useEffect(() => {
  if (!socket || !resolvedScrimId) return;

  const join = () => socket.emit('join-scrim', resolvedScrimId);

  // join now, and re-join if the socket reconnects
  join();
  socket.on('connect', join);

  const onRoomMessage = (evt) => {
    if (evt?.scrimId !== resolvedScrimId) return;
    setMessages((prev) => [...prev, evt.message]);
  };
  socket.on('room:message', onRoomMessage);

  return () => {
    socket.off('connect', join);
    socket.off('room:message', onRoomMessage);
  };
}, [socket, resolvedScrimId]);
 

  const fetchMessages = async (sid) => {
    if (!sid) return;
    const setBusy = loading ? setLoading : setRefreshing;
    setBusy(true);
    try {
      const response = await scrimsAPI.getRoomMessages(sid);
      setMessages(response?.data?.room?.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to load messages';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = async () => {
    if (!resolvedScrimId || refreshing) return;
    await fetchMessages(resolvedScrimId);
    toast.success('Room updated');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !resolvedScrimId) return;
    try {
      const res = await scrimsAPI.sendRoomMessage(resolvedScrimId, { content: newMessage, type: 'text' });
     setNewMessage('');
     // optional optimistic update: socket will also deliver it, but this makes UI snappy
     if (res?.data?.message) {
       setMessages((prev) => [...prev, res.data.message]);
     }
     toast.success('Message sent');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error(error?.response?.data?.message || 'Failed to send message');
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const response = await uploadAPI.uploadImage(file);
      if (!resolvedScrimId) return;
      await scrimsAPI.sendRoomMessage(resolvedScrimId, {
        content: `Image: ${file.name}`,
        type: 'image',
        imageUrl: response?.data?.imageUrl,
      });
      await fetchMessages(resolvedScrimId);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error?.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Kick request submit
  const submitKickRequest = async () => {
    if (!resolvedScrimId) return;
    const s = Number(slotNumber);
    if (!Number.isInteger(s) || s <= 0) {
      return toast.error('Valid slot number required');
    }
    if (!targetName.trim()) {
      return toast.error('Player name (IGN) is required');
    }
    setSendingKick(true);
    try {
      await scrimsAPI.addKickRequest(resolvedScrimId, {
        slotNumber: s,
        targetName: targetName.trim(),
        reason: reason.trim(),
      });
      toast.success('Kick request sent');
      setKickOpen(false);
      setSlotNumber('');
      setTargetName('');
      setReason('');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to send kick request';
      toast.error(msg);
    } finally {
      setSendingKick(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 ring-1 ring-white/10 overflow-hidden backdrop-blur-sm">
      {/* Header (sticky) */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-5 py-3 bg-white/5 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-500/15 ring-1 ring-indigo-400/20">
            <MessageSquare className="h-4 w-4 text-indigo-300" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white leading-none">Scrim Room</h3>
            <p className="mt-0.5 text-[11px] text-slate-300/80 flex items-center gap-1">
              <Lock className="h-3.5 w-3.5 opacity-70" />
              Private chat for organizers & participants
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Show to players (non-owner) */}
          {!isOwner && (
            <button
              type="button"
              onClick={() => setKickOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10"
              title="Request to kick a player"
            >
              Request Kick
            </button>
          )}

          {/* Refresh button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading || !resolvedScrimId}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10 disabled:opacity-60"
            title="Refresh messages"
          >
            <RotateCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Messages list */}
      <div
        ref={listRef}
        className="h-80 sm:h-96 overflow-y-auto px-3 sm:px-4 py-4 bg-[radial-gradient(1200px_400px_at_10%_-10%,rgba(99,102,241,.08),transparent)]"
      >
        {loading ? (
          <div className="grid gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-9 w-9 rounded-full bg-white/5 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-white/10 animate-pulse" />
                  <div className="h-12 w-11/12 rounded-xl bg-white/10 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length > 0 ? (
          <div className="space-y-3">
            {messages.map((message, idx) => {
              const role = message?.senderId?.role;
              const bubbleBase = 'px-3 py-2 rounded-2xl ring-1 text-sm';
              const bubbleColor =
                message.type === 'credentials'
                  ? 'bg-indigo-500/10 ring-indigo-400/20 text-indigo-100'
                  : message.type === 'system'
                  ? 'bg-sky-500/10 ring-sky-400/20 text-sky-100'
                  : 'bg-white/5 ring-white/10 text-slate-100';

              return (
                <div key={idx} className="flex items-start gap-3">
                  <div className="grid h-9 w-9 flex-none place-items-center rounded-full bg-white/5 ring-1 ring-white/10 text-xs font-semibold text-slate-200">
                    {(message?.senderId?.name || 'U')?.charAt(0)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate text-sm font-medium text-white">
                          {message?.senderId?.name || 'Unknown'}
                        </span>
                        <RolePill role={role} />
                      </div>
                      <span className="shrink-0 text-[11px] text-slate-400">
                        {formatTime(message?.timestamp)}
                      </span>
                    </div>

                    <div className={`${bubbleBase} ${bubbleColor}`}>
                      {message.type === 'image' && message.imageUrl ? (
                        <div>
                          {message?.content && <p className="mb-2 text-slate-200/90">{message.content}</p>}
                          <img
                            src={NormalizeImageUrl(message.imageUrl)}
                            alt="Shared"
                            className="max-h-56 max-w-full rounded-xl border border-white/10 cursor-zoom-in hover:opacity-95 transition"
                            onClick={() => window.open(message.imageUrl, '_blank')}
                          />
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">{message?.content}</p>
                      )}
                      {message.type === 'credentials' && (
                        <div className="mt-2 text-[11px] text-indigo-300">🔐 Room Credentials</div>
                      )}
                      {message.type === 'system' && (
                        <div className="mt-2 text-[11px] text-sky-300">📢 System Message</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10">
                <MessageSquare className="h-5 w-5 text-slate-300/80" />
              </div>
              <p className="text-sm text-slate-200">No messages yet</p>
              {!isOwner && <p className="mt-1 text-xs text-slate-400">Only organizers can send messages</p>}
            </div>
          </div>
        )}
      </div>

      {/* Composer (org only) */}
      {isOwner && (
        <div className="border-t border-white/10 bg-white/5 px-3 sm:px-4 py-3">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Send a message to participants…"
                className="w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2.5 text-slate-100 placeholder:text-slate-400
                           focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
              />
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5
                         text-slate-200 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                         disabled:opacity-50"
              title="Upload Image"
            >
              {uploadingImage ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </button>

            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white
                         hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                         disabled:opacity-60"
              title="Send"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>

          {uploadingImage && <p className="mt-2 text-xs text-indigo-300">Uploading image…</p>}
        </div>
      )}

      {/* Kick Request Modal */}
      {kickOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0b0b12] border border-white/10 p-4">
            <h3 className="text-white text-lg font-semibold mb-3">Request Kick</h3>
            <div className="space-y-3">
              <input
                type="number"
                min={1}
                value={slotNumber}
                onChange={(e) => setSlotNumber(e.target.value)}
                placeholder="Slot Number"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
              <input
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                placeholder="Player Name (IGN)"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (optional)"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
              <div className="flex gap-2 justify-end">
                <button
                  className="px-3 py-2 rounded-lg bg-white/5 text-white"
                  onClick={() => setKickOpen(false)}
                  disabled={sendingKick}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-60"
                  onClick={submitKickRequest}
                  disabled={sendingKick}
                >
                  {sendingKick ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomView;
