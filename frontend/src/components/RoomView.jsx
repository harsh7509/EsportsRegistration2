// src/components/RoomView.jsx
import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Lock, Upload } from 'lucide-react';
import { scrimsAPI, uploadAPI } from '../services/api';
import toast from 'react-hot-toast';

const RolePill = ({ role }) => {
  if (!role) return null;
  const map = {
    admin: 'text-rose-300 bg-rose-400/10 ring-1 ring-rose-300/20',
    organization: 'text-sky-300 bg-sky-400/10 ring-1 ring-sky-300/20',
    player: 'text-emerald-300 bg-emerald-400/10 ring-1 ring-emerald-300/20',
  };
  const cls = map[role] || 'text-slate-300 bg-white/5 ring-1 ring-white/10';
  return (
    <span className={`px-2 py-0.5 text-[10px] rounded-full ${cls}`}>
      {role}
    </span>
  );
};

const formatTime = (ts) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return '';
  }
};

const RoomView = ({ scrimId, isOwner }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const listRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => { fetchMessages(); }, [scrimId]);
  useEffect(() => { scrollToBottom(); }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const response = await scrimsAPI.getRoomMessages(scrimId);
      setMessages(response?.data?.room?.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      await scrimsAPI.sendRoomMessage(scrimId, { content: newMessage, type: 'text' });
      setNewMessage('');
      fetchMessages();
      toast.success('Message sent');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
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
      await scrimsAPI.sendRoomMessage(scrimId, {
        content: `Image: ${file.name}`,
        type: 'image',
        imageUrl: response?.data?.imageUrl,
      });
      fetchMessages();
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
              const bubbleBase =
                'px-3 py-2 rounded-2xl ring-1 text-sm';

              const bubbleColor =
                message.type === 'credentials'
                  ? 'bg-indigo-500/10 ring-indigo-400/20 text-indigo-100'
                  : message.type === 'system'
                  ? 'bg-sky-500/10 ring-sky-400/20 text-sky-100'
                  : 'bg-white/5 ring-white/10 text-slate-100';

              return (
                <div key={idx} className="flex items-start gap-3">
                  {/* Avatar fallback */}
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
                          {message?.content && (
                            <p className="mb-2 text-slate-200/90">{message.content}</p>
                          )}
                          <img
                            src={message.imageUrl}
                            alt="Shared"
                            className="max-h-56 max-w-full rounded-xl border border-white/10 cursor-zoom-in hover:opacity-95 transition"
                            onClick={() => window.open(message.imageUrl, '_blank')}
                          />
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {message?.content}
                        </p>
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
              {!isOwner && (
                <p className="mt-1 text-xs text-slate-400">
                  Only organizers can send messages
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
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

          {uploadingImage && (
            <p className="mt-2 text-xs text-indigo-300">Uploading image…</p>
          )}
        </div>
      )}
    </div>
  );
};

export default RoomView;
