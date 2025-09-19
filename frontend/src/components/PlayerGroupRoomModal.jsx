import React, { useEffect, useRef, useState, useMemo } from 'react';
import { X, Send, Upload, Users as UsersIcon, RefreshCcw } from 'lucide-react';
import { tournamentsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function PlayerGroupRoomModal({ open, onClose, tournamentId }) {
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [teams, setTeams] = useState([]);
  const [autoBusy, setAutoBusy] = useState(false);
  const fileRef = useRef(null);
  const scrollRef = useRef(null);

  const hasRoom = Boolean(group);
  const filteredMessages = useMemo(
    () => (messages || []).filter((m) => m.type !== 'system'),
    [messages]
  );

  // auto-scroll to latest
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, filteredMessages.length]);

  // load room + teams
  useEffect(() => {
    if (!open || !tournamentId) return;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [roomRes, teamsRes] = await Promise.all([
          tournamentsAPI.getMyGroupRoomMessages(tournamentId),
          tournamentsAPI.getMyGroupTeams(tournamentId),
        ]);

        if (cancelled) return;
        setGroup(roomRes?.data?.group || null);
        setMessages(roomRes?.data?.room?.messages || []);
        setTeams(Array.isArray(teamsRes?.data?.teams) ? teamsRes.data.teams : []);
      } catch (e) {
        if (!cancelled) {
          toast.error(e?.response?.data?.message || 'Failed to open group room');
          setGroup(null);
          setMessages([]);
          setTeams([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, tournamentId]);

  const refreshMessages = async () => {
    if (!open || !tournamentId) return;
    try {
      setRefreshing(true);
      const res = await tournamentsAPI.getMyGroupRoomMessages(tournamentId);
      setGroup(res?.data?.group || null);
      setMessages(res?.data?.room?.messages || []);

      // also refresh teams
      const t = await tournamentsAPI.getMyGroupTeams(tournamentId);
      setTeams(Array.isArray(t?.data?.teams) ? t.data.teams : []);
    } catch {
      toast.error('Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  };

  const sendText = async (e) => {
    e?.preventDefault?.();
    if (!text.trim() || !hasRoom || sending) return;
    try {
      setSending(true);
      await tournamentsAPI.sendMyGroupRoomMessage(tournamentId, { content: text.trim(), type: 'text' });
      setText('');
      await refreshMessages();
    } catch {
      toast.error('Failed to send');
    } finally {
      setSending(false);
    }
  };

  const sendImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !hasRoom) return;
    try {
      toast('Image upload not wired yet. Upload and then call sendMyGroupRoomMessage({ type:"image", imageUrl })');
      // Example:
      // const up = await uploadAPI.uploadImage(file);
      // await tournamentsAPI.sendMyGroupRoomMessage(tournamentId, { type:'image', imageUrl: up.data.imageUrl, content: file.name });
      // await refreshMessages();
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setText((t) => t + '\n'); // soft line break
    }
  };

  // NEW: Auto (16) — removes old auto-4/auto-5 variants
  const autoGroup16 = async () => {
    if (!tournamentId) return;
    try {
      setAutoBusy(true);
      // Try primary endpoint
      if (typeof tournamentsAPI.autoGroupTeams === 'function') {
        await tournamentsAPI.autoGroupTeams(tournamentId, { size: 16 });
      } else if (typeof tournamentsAPI.createOrFillMyGroup === 'function') {
        // Fallback name (if your API uses a different method)
        await tournamentsAPI.createOrFillMyGroup(tournamentId, { limit: 16 });
      } else {
        // As a last resort, try a very generic name to avoid hard failure.
        if (typeof tournamentsAPI.autoGroup === 'function') {
          await tournamentsAPI.autoGroup(tournamentId, { size: 16 });
        } else {
          throw new Error('Auto-group API not found on tournamentsAPI');
        }
      }
      toast.success('Auto grouped 16 teams successfully');
      await refreshMessages();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Auto grouping failed');
    } finally {
      setAutoBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 grid place-items-center p-4">
      <div className="bg-gray-850 bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 text-xs rounded-full bg-gaming-purple/15 text-gaming-purple border border-gaming-purple/30">
                Group Room
              </div>
              {hasRoom && (
                <div className="flex items-center gap-1 text-xs text-gray-300">
                  <UsersIcon className="h-3.5 w-3.5" />
                  {teams.length} team{teams.length === 1 ? '' : 's'}
                </div>
              )}
            </div>
            <h3 className="mt-1 text-lg font-semibold truncate">
              {hasRoom ? group?.name : 'My Group'}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* NEW: Auto(16) button */}
            <button
              onClick={autoGroup16}
              disabled={autoBusy || loading}
              className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Auto create/fill group with 16 teams"
            >
              {autoBusy ? 'Auto…' : 'Auto (16)'}
            </button>

            <button
              onClick={refreshMessages}
              disabled={refreshing || loading}
              className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Refresh"
            >
              <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-700 text-gray-300 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Teams */}
          {loading ? (
            <SkeletonTeams />
          ) : hasRoom ? (
            <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-3">
              <div className="text-sm font-semibold mb-2">Teams in your group</div>
              {teams.length ? (
                <ul className="text-sm grid grid-cols-1 md:grid-cols-2 gap-1">
                  {teams.map((ti) => (
                    <li key={ti.userId || ti._id} className="truncate">• {ti.teamName || ti.name || 'Team'}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-gray-400 text-sm">No teams found</div>
              )}
            </div>
          ) : null}

          {/* Messages */}
          <div
            ref={scrollRef}
            className="rounded-xl border border-gray-700 bg-gray-800/60 p-3 h-80 overflow-y-auto space-y-2"
          >
            {loading ? (
              <SkeletonMessages />
            ) : !hasRoom ? (
              <div className="text-gray-400 text-sm">You are not in any group yet (or groups aren’t formed).</div>
            ) : filteredMessages.length ? (
              filteredMessages.map((m, i) => (
                <MessageBubble key={m._id || i} m={m} />
              ))
            ) : (
              <EmptyChat />
            )}
          </div>

          {/* Composer */}
          <form onSubmit={sendText} className="flex items-end gap-2">
            <div className="flex-1">
              <label className="sr-only" htmlFor="group-message">Message</label>
              <textarea
                id="group-message"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder={hasRoom ? 'Message your group… (Enter to send, Shift+Enter for new line)' : 'No group available'}
                disabled={!hasRoom || loading}
                className="input w-full resize-none"
              />
            </div>

            <input ref={fileRef} type="file" accept="image/*" onChange={sendImage} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={!hasRoom || loading}
              className="btn-secondary"
              title="Upload image"
            >
              <Upload className="h-4 w-4" />
            </button>

            <button
              type="submit"
              disabled={!hasRoom || !text.trim() || sending || loading}
              className="btn-primary"
              title="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ---------------------- Small UI pieces ---------------------- */

function MessageBubble({ m }) {
  const initials =
    (m?.senderId?.name?.[0] || m?.senderId?.username?.[0] || 'U').toUpperCase();
  const when = m?.timestamp ? new Date(m.timestamp).toLocaleString() : '';

  return (
    <div className="flex items-start gap-2">
      <div className="h-8 w-8 rounded-full bg-gray-600 grid place-items-center text-xs shrink-0">
        {initials}
      </div>
      <div className="flex-1">
        <div className="text-xs text-gray-300">
          <span className="font-medium">{m?.senderId?.name || m?.senderId?.username || 'User'}</span>{' '}
          <span className="text-gray-400">• {when}</span>
        </div>

        <div className="mt-1 rounded-lg bg-gray-700/80 border border-gray-700 p-2">
          {m.type === 'image' && m.imageUrl ? (
            <>
              {m.content ? <div className="text-sm mb-1">{m.content}</div> : null}
              <img src={m.imageUrl} alt="" className="rounded max-w-full" />
            </>
          ) : (
            <div className="text-sm whitespace-pre-wrap">{m.content}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="text-center py-10 text-gray-400">
      <div className="text-lg font-medium mb-1">No messages yet</div>
      <div className="text-sm">Be the first to say hello 👋</div>
    </div>
  );
}

function SkeletonTeams() {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-3 animate-pulse">
      <div className="h-4 w-40 bg-gray-700 rounded mb-3" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-700 rounded w-1/2" />
        <div className="h-3 bg-gray-700 rounded w-2/3" />
        <div className="h-3 bg-gray-700 rounded w-1/3" />
      </div>
    </div>
  );
}

function SkeletonMessages() {
  return (
    <div className="space-y-2 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="h-8 w-8 rounded-full bg-gray-700" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-40 bg-gray-700 rounded" />
            <div className="h-4 w-3/4 bg-gray-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
