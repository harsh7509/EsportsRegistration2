import React, { useEffect, useState, useRef } from 'react';
import { X, Send, Upload } from 'lucide-react';
import { tournamentsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function PlayerGroupRoomModal({ open, onClose, tournamentId }) {
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open || !tournamentId) return;
    (async () => {
      try {
        setLoading(true);
        const res = await tournamentsAPI.getMyGroupRoomMessages(tournamentId);
        setGroup(res?.data?.group || null);
        setMessages(res?.data?.room?.messages || []);
      } catch (e) {
        const msg = e?.response?.data?.message || 'Failed to open group room';
        toast.error(msg);
        setGroup(null);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, tournamentId]);

  const sendText = async (e) => {
    e?.preventDefault?.();
    if (!text.trim()) return;
    try {
      await tournamentsAPI.sendMyGroupRoomMessage(tournamentId, { content: text });
      setText('');
      const res = await tournamentsAPI.getMyGroupRoomMessages(tournamentId);
      setMessages(res?.data?.room?.messages || []);
    } catch (e) {
      toast.error('Failed to send');
    }
  };

  const sendImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // if you already have uploadAPI, use it; else skip image sending or adapt
      toast('Image upload not wired here. Add your upload flow and call sendMyGroupRoomMessage with { type:"image", imageUrl }');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="font-semibold">{group ? group.name : 'My Group'}</div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-gray-400">Loading room…</div>
          ) : !group ? (
            <div className="text-gray-400">You are not in any group yet (or groups aren’t formed).</div>
          ) : (
            <>
              <div className="bg-gray-700 rounded p-3 h-80 overflow-auto space-y-2">
                {messages.map((m, i) => (
                  <div key={i} className="p-2 rounded bg-gray-600">
                    <div className="text-xs text-gray-300">
                      {new Date(m.timestamp).toLocaleString()} • {m.senderId?.name || 'User'}
                    </div>
                    {m.type === 'image' && m.imageUrl ? (
                      <div className="mt-1">
                        {m.content && <div className="text-sm mb-1">{m.content}</div>}
                        <img src={m.imageUrl} alt="" className="rounded max-w-full" />
                      </div>
                    ) : (
                      <div className="text-sm mt-1">{m.content}</div>
                    )}
                  </div>
                ))}
                {messages.length === 0 && <div className="text-gray-400 text-sm">No messages</div>}
              </div>

              <form onSubmit={sendText} className="mt-3 flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="input flex-1"
                  placeholder="Message your group…"
                />
                <button className="btn-primary"><Send className="h-4 w-4" /></button>
                <input ref={fileRef} type="file" accept="image/*" onChange={sendImage} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="btn-secondary"
                  title="Upload image"
                >
                  <Upload className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
