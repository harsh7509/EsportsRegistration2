// src/components/PlayerGroupRoomModal.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Send, Upload, Users as UsersIcon, RefreshCcw } from 'lucide-react';
import { tournamentsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { NormalizeImageUrl } from '../utils/img';

/**
 * PlayerGroupRoomModal
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - tournamentId: string  (must be a real tournament _id)
 */
export default function PlayerGroupRoomModal({ open, onClose, tournamentId }) {
  const [loading, setLoading] = useState(true);

  const [group, setGroup] = useState(null);
  const [roomId, setRoomId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [teams, setTeams] = useState([]);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [autoBusy, setAutoBusy] = useState(false);

  const fileRef = useRef(null);
  const scrollRef = useRef(null);

  const hasRoom = Boolean(group);
  const filteredMessages = useMemo(
    () => (messages || []).filter((m) => m?.type !== 'system'),
    [messages]
  );

  // Tailwind helpers (if you don't have project-wide classes)
  const btnPrimary =
    'px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
  const btnSecondary =
    'px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
  const inputArea =
    'w-full rounded-lg bg-gray-800/60 border border-gray-700 text-gray-100 placeholder:text-gray-400 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/40';

  // ---------- helpers ----------
  function parseRoomPayload(res) {
    const d = res?.data ?? res ?? {};
    const group =
      d.group ||
      d.myGroup ||
      d.data?.group ||
      d.room?.group ||
      null;

    const room =
      d.room ||
      d.groupRoom ||
      d.data?.room ||
      null;

    const messages =
      room?.messages ||
      d.messages ||
      d.roomMessages ||
      [];

    const roomId =
      room?._id || room?.id || d.roomId || null;

    return { group, roomId, messages };
  }

  // auto-scroll to latest when messages list updates
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

        const pr = parseRoomPayload(roomRes);
        setGroup(pr.group);
        setRoomId(pr.roomId);
        setMessages(Array.isArray(pr.messages) ? pr.messages : []);

        const teamsPayload = teamsRes?.data ?? teamsRes ?? {};
        const teamsList =
          teamsPayload.teams ||
          teamsPayload.data?.teams ||
          teamsPayload.group?.teams ||
          [];
        setTeams(Array.isArray(teamsList) ? teamsList : []);
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          // toast.error(e?.response?.data?.message || 'Failed to open group room');
          setGroup(null);
          setRoomId(null);
          setMessages([]);
          setTeams([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, tournamentId]);

  const refreshMessages = async () => {
    if (!open || !tournamentId) return;
    try {
      setRefreshing(true);
      const res = await tournamentsAPI.getMyGroupRoomMessages(tournamentId);
      const pr = parseRoomPayload(res);
      setGroup(pr.group);
      setRoomId(pr.roomId);
      setMessages(Array.isArray(pr.messages) ? pr.messages : []);

      const t = await tournamentsAPI.getMyGroupTeams(tournamentId);
      const teamsPayload = t?.data ?? t ?? {};
      const teamsList =
        teamsPayload.teams ||
        teamsPayload.data?.teams ||
        teamsPayload.group?.teams ||
        [];
      setTeams(Array.isArray(teamsList) ? teamsList : []);
    } catch (e) {
      console.error(e);
      toast.error(e.response.data.message);
    } finally {
      setRefreshing(false);
    }
  };

  const sendText = async (e) => {
    e?.preventDefault?.();
    if (!text.trim() || !hasRoom || sending) return;
    try {
      setSending(true);
      await tournamentsAPI.sendMyGroupRoomMessage(tournamentId, {
        content: text.trim(),
        type: 'text',
      });
      setText('');
      await refreshMessages();
    } catch (e) {
      console.error(e);
      toast.error('Failed to send');
    } finally {
      setSending(false);
    }
  };

  const sendImage = async (e) => {
  const file = e.target.files?.[0];
  if (!file || !hasRoom) return;

  try {
    const up = await uploadAPI.uploadImage(file);
    const imageUrl = up?.data?.secure_url || up?.data?.imageUrl; // server response
    if (!imageUrl) throw new Error("No image URL from server");

    await tournamentsAPI.sendMyGroupRoomMessage(tournamentId, {
      type: "image",
      imageUrl,
      content: file.name,
    });
    await refreshMessages();
    toast.success("Image uploaded");
  } catch (err) {
    console.error(err);
    toast.error("Failed to upload image");
  } finally {
    if (fileRef.current) fileRef.current.value = "";
  }
};


  // Auto-group 16 (for org/admin paths)
  const autoGroup16 = async () => {
    if (!tournamentId) return;
    try {
      setAutoBusy(true);
      if (typeof tournamentsAPI.autoGroupTeams === 'function') {
        await tournamentsAPI.autoGroupTeams(tournamentId, { size: 16 });
      } else if (typeof tournamentsAPI.createOrFillMyGroup === 'function') {
        await tournamentsAPI.createOrFillMyGroup(tournamentId, { limit: 16 });
      } else if (typeof tournamentsAPI.autoGroup === 'function') {
        await tournamentsAPI.autoGroup(tournamentId, { size: 16 });
      } else {
        throw new Error('Auto-group API not found on tournamentsAPI');
      }
      toast.success('Auto grouped 16 teams successfully');
      await refreshMessages();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Auto grouping failed');
    } finally {
      setAutoBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 grid place-items-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 text-xs rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-400/30">
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
              {hasRoom ? (group?.name || `Group`) : 'My Group'}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto(16) (optional) */}
            {/* <button
              onClick={autoGroup16}
              disabled={autoBusy || loading}
              className={btnPrimary}
              title="Auto create/fill group with 16 teams"
            >
              {autoBusy ? 'Auto…' : 'Auto (16)'}
            </button> */}

            <button
              onClick={refreshMessages}
              disabled={refreshing || loading}
              className={btnSecondary}
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
                  {teams.map((ti, idx) => (
                    <li
                      key={ti.userId || ti._id || idx}
                      className="truncate"
                      title={ti.teamName || ti.name || 'Team'}
                    >
                      • {ti.teamName || ti.name || 'Team'}
                    </li>
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
              <div className="text-gray-400 text-sm">
                You are not in any group yet (or groups aren’t formed).
              </div>
            ) : filteredMessages.length ? (
              filteredMessages.map((m, i) => <MessageBubble key={m._id || i} m={m} />)
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendText();
                  }
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    setText((t) => t + '\n'); // soft line break
                  }
                }}
                rows={1}
                placeholder={
                  hasRoom
                    ? 'Message your group… (Enter to send, Shift+Enter for new line)'
                    : 'No group available'
                }
                disabled={!hasRoom || loading}
                className={inputArea}
              />
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={sendImage}
              className="hidden"
            />
            {/* <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={!hasRoom || loading}
              className={btnSecondary}
              title="Upload image"
            >
              <Upload className="h-4 w-4" />
            </button> */}

            <button
              type="submit"
              disabled={!hasRoom || !text.trim() || sending || loading}
              className={btnPrimary}
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
          <span className="font-medium">
            {m?.senderId?.name || m?.senderId?.username || 'User'}
          </span>{' '}
          <span className="text-gray-400">• {when}</span>
        </div>

        <div className="mt-1 rounded-lg bg-gray-700/80 border border-gray-700 p-2">
          {m?.type === 'image' && m?.imageUrl ? (
            <>
              {m?.content ? (
                <div className="text-sm mb-1">{m.content}</div>
              ) : null}
              <img
                src={NormalizeImageUrl(m.imageUrl)}
                alt=""
                className="rounded max-w-full"
              />
            </>
          ) : (
            <div className="text-sm whitespace-pre-wrap">{m?.content}</div>
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
