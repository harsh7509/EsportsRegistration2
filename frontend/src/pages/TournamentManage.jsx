// frontend/src/pages/TournamentManage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { tournamentsAPI, uploadAPI } from '../services/api';
import { Users, MessageSquare, Send, Upload, Plus, MoreVertical, Edit3, Trash2, Scissors } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext'; 

export default function TournamentManage() {
  const { id } = useParams();
  const { user: me } = useAuth?.() || { user: null }; 

  const [participants, setParticipants] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const fileRef = useRef(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState('');

  // group ops
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [moveToGroupId, setMoveToGroupId] = useState('');

  // tournament edit/delete
  const [tEditOpen, setTEditOpen] = useState(false);
  const [tForm, setTForm] = useState({ title: '', description: '', price: 0, capacity: 0 });

  // Manual group ui
  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState({}); // userId => true

  // --- helpers ---
  const arr = (v) => (Array.isArray(v) ? v : []);
  const toId = (x) => (typeof x === 'object' && x?._id ? x._id : x);

  const load = async () => {
    try {
      const [p, g, t] = await Promise.all([
        tournamentsAPI.getParticipants(id),
        tournamentsAPI.listGroups(id),
        tournamentsAPI.get(id), // GET /api/tournaments/:id → { tournament }
      ]);

    //    p = axios response OR plain data – दोनों केस हैंडल
      const plist = Array.isArray(p?.data?.participants)
        ? p.data.participants
        : Array.isArray(p?.participants)
        ? p.participants
        : Array.isArray(p?.data)
        ? p.data
        : [];
      const glist = Array.isArray(g?.data?.groups)
        ? g.data.groups
        : Array.isArray(g?.groups)
        ? g.groups
        : [];

      setParticipants(plist);
      setGroups(glist);

       const tour = t?.data?.tournament || t?.tournament || null;
      if (tour) {
        setTForm({
          title: tour.title || '',
          description: tour.description || '',
          price: tour.price ?? 0,
          capacity: tour.capacity ?? 0,
        });
      }

      // keep current selection valid
      if (selectedGroup) {
        const again = glist.find((gg) => gg._id === selectedGroup._id);
        setSelectedGroup(again || null);
      }
    } catch (e) {
      console.error('load error:', e);
      toast.error('Failed to load tournament data');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ----- auto groups -----
  const makeAutoGroups = async (size = 4) => {
    try {
      await tournamentsAPI.autoGroup(id, size);
      await load();
      toast.success(`Created groups of ${size}`);
    } catch (e) {
      console.error('auto group error:', e);
      toast.error(e?.response?.data?.message || 'Failed to create groups / rooms');
    }
  };

  // ----- open a group (also ensures room exists) -----
  const openGroup = async (g) => {
    try {
      // keep the selected group by id (not by stale object ref)
      const picked = groups.find((x) => String(x._id) === String(g._id)) || g;
      setSelectedGroup(picked);

      const res = await tournamentsAPI.getGroupRoomMessages(id, picked._id); // ensures room
      setMessages(arr(res?.data?.room?.messages));
    } catch (e) {
      console.error('openGroup error:', e);
      toast.error('Failed to open group room');
    }
  };

  // ----- force create room (uses same ensure path as open) -----
  const createRoomNow = async () => {
    if (!selectedGroup) return;
    try {
      await tournamentsAPI.getGroupRoomMessages(id, selectedGroup._id);
      await load(); // refresh groups so roomId is reflected if you need it elsewhere
      toast.success('Room ready for this group');
    } catch (e) {
      console.error('createRoomNow error:', e);
      toast.error('Failed to create room');
    }
  };

  // ----- send text -----
  const sendText = async (e) => {
    e.preventDefault();
    if (!selectedGroup || !text.trim()) return;
    try {
      await tournamentsAPI.sendGroupRoomMessage(id, selectedGroup._id, {
        content: text,
        type: 'text',
      });
      setText('');
      await openGroup(selectedGroup);
    } catch (e) {
      console.error('sendText error:', e);
      toast.error('Failed to send');
    }
  };

  // ----- send image -----
  const sendImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const up = await uploadAPI.uploadImage(file);
      const url = up?.data?.imageUrl;
      if (!url) return toast.error('Upload failed');
      await tournamentsAPI.sendGroupRoomMessage(id, selectedGroup._id, {
        type: 'image',
        content: `Image: ${file.name}`,
        imageUrl: url,
      });
      await openGroup(selectedGroup);
    } catch (err) {
      console.error('sendImage error:', err);
      toast.error('Image send failed');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // ----- messages: start edit -----
const startEditMsg = (m) => {
  setEditingMsgId(m._id);
  setEditText(m.content || '');
};
const cancelEditMsg = () => {
  setEditingMsgId(null);
  setEditText('');
};
const saveEditMsg = async () => {
  if (!selectedGroup || !editingMsgId) return;
  try {
    await tournamentsAPI.editGroupRoomMessage(id, selectedGroup._id, editingMsgId, { content: editText });
    cancelEditMsg();
    await openGroup(selectedGroup);
    toast.success('Message edited');
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Edit failed');
  }
};
const deleteMsg = async (mid) => {
  if (!selectedGroup || !mid) return;
  try {
    await tournamentsAPI.deleteGroupRoomMessage(id, selectedGroup._id, mid);
    await openGroup(selectedGroup);
    toast.success('Message deleted');
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Delete failed');
  }
};

// ----- groups: rename / move / remove -----
const openRename = (g) => {
  setSelectedGroup(g);
  setRenameValue(g?.name || '');
  setRenameOpen(true);
};
const doRename = async () => {
  if (!selectedGroup || !renameValue.trim()) return;
  try {
    await tournamentsAPI.renameGroup(id, selectedGroup._id, renameValue.trim());
    setRenameOpen(false);
    await load();
    toast.success('Group renamed');
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Rename failed');
  }
};

const moveSelectedPlayers = async () => {
  const memberIds = Object.entries(selectedPlayers).filter(([,v]) => v).map(([k]) => k);
  if (!memberIds.length) return toast.error('Pick at least 1 player');
  if (!moveToGroupId) return toast.error('Select a target group');

  try {
    for (const uid of memberIds) {
      await tournamentsAPI.moveGroupMember(id, {
        userId: uid,
        fromGroupId: selectedGroup?._id || '', // अगर कोई group खुला है तो वही from; नहीं तो client-side remove न करो
        toGroupId: moveToGroupId,
      });
    }
    setSelectedPlayers({});
    await load();
    toast.success('Players moved');
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Move failed');
  }
};

const removePlayerFromSelectedGroup = async (uid) => {
  if (!selectedGroup) return toast.error('Open a group first');
  try {
    await tournamentsAPI.removeGroupMember(id, selectedGroup._id, uid);
    await load();
    toast.success('Removed from group');
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Remove failed');
  }
};

// ----- tournament: update / delete -----
const saveTournament = async () => {
  try {
    await tournamentsAPI.update(id, {
      title: tForm.title,
      description: tForm.description,
      price: Number(tForm.price) || 0,
      capacity: Number(tForm.capacity) || 0,
    });
    setTEditOpen(false);
    await load();
    toast.success('Tournament updated');
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Update failed');
  }
};
const deleteTournament = async () => {
  if (!window.confirm('Delete this tournament? This cannot be undone.')) return;
  try {
    await tournamentsAPI.deleteTournament(id);
    toast.success('Tournament deleted');
    // optionally navigate away:
    // navigate('/tournaments');
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Delete failed');
  }
};


  // ----- manual group creation -----
  const toggleSel = (u) =>
    setSelectedPlayers((m) => ({ ...m, [u]: !m[u] }));

  const createManualGroup = async () => {
    try {
      const memberIds = Object.entries(selectedPlayers)
        .filter(([, v]) => v)
        .map(([k]) => k);

      if (!memberIds.length) return toast.error('Pick at least 1 player');

      await tournamentsAPI.createGroup(id, {
        name: manualName?.trim() || undefined,
        memberIds,
      });

      setManualOpen(false);
      setManualName('');
      setSelectedPlayers({});
      await load();
      toast.success('Group created');
    } catch (e) {
      console.error('createGroup error:', e);
      toast.error(e?.response?.data?.message || 'Failed to create group');
    }
  };

 return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Manage Tournament</h1>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setTEditOpen(true)}>Edit</button>
          <button className="btn-danger" onClick={deleteTournament}>Delete</button>
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
      {/* left: participants */}
      <div className="card lg:col-span-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Participants
          </h2>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => makeAutoGroups(4)}>
              Auto 4
            </button>
            <button className="btn-secondary" onClick={() => makeAutoGroups(5)}>
              Auto 5
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-80 overflow-auto">
          {participants.length ? (
            participants.map((p) => {
              const uId = toId(p.userId);
              const uObj = typeof p.userId === 'object' ? p.userId : null;
              const isInSelectedGroup = !!(selectedGroup?.memberIds || []).find(m => String(toId(m)) === String(uId));
              return (
                <label
                  key={uId}
                  className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={!!selectedPlayers[uId]}
                    onChange={() => toggleSel(uId)}
                  />
                  {uObj?.avatarUrl ? (
                    <img
                      src={uObj.avatarUrl}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-600 grid place-items-center">
                      <span className="text-xs">
                        {(uObj?.name?.[0] || 'P').toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="text-sm flex-1">
                    {uObj?.name || p.ign || 'Player'}
                  </div>
                  {selectedGroup && isInSelectedGroup && (
           <button
             type="button"
             className="text-red-400 hover:text-red-300"
             title="Remove from this group"
             onClick={(e) => { e.preventDefault(); removePlayerFromSelectedGroup(uId); }}
           >
             <Scissors className="h-4 w-4" />
           </button>
         )}
                </label>
              );
            })
          ) : (
            <div className="text-gray-400 text-sm">No registrations yet</div>
          )}
        </div>

        {/* Manual create */}
        <div className="mt-4 border-t border-gray-700 pt-3">
          <button
            className="btn-secondary w-full flex items-center justify-center"
            onClick={() => setManualOpen((v) => !v)}
          >
            <Plus className="h-4 w-4 mr-2" /> Create group manually
          </button>

          {manualOpen && (
            <div className="mt-3 space-y-2">
              <input
                className="input w-full"
                placeholder="Group name (optional)"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
              />
              <button className="btn-primary w-full" onClick={createManualGroup}>
                Create Group
              </button>
            </div>
          )}
        </div>
      </div>

      {/* middle: groups list */}
      <div className="card lg:col-span-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Groups</h2>
          <div className="flex items-center gap-2">
    <select
      className="input"
      value={moveToGroupId}
      onChange={(e) => setMoveToGroupId(e.target.value)}
    >
      <option value="">Move selected →</option>
      {groups.map(g => (
        <option key={g._id} value={g._id}>{g.name}</option>
      ))}
    </select>
    <button className="btn-secondary" onClick={moveSelectedPlayers} disabled={!moveToGroupId}>
      Move
    </button>
  </div>
        </div>
        <div className="space-y-2 max-h-96 overflow-auto">
          {groups.length ? (
            groups.map((g) => (
              <button
                key={g._id}
                onClick={() => openGroup(g)}
                className={`w-full text-left p-3 rounded border ${
                  selectedGroup && String(selectedGroup._id) === String(g._id)
                    ? 'border-gaming-purple'
                    : 'border-transparent bg-gray-700 hover:bg-gray-600'
                }`}
              >
                 <div className="flex items-center justify-between">
        <div className="font-medium">{g.name}</div>
        <button
          type="button"
          className="text-gray-300 hover:text-white"
          onClick={(e) => { e.stopPropagation(); openRename(g); }}
          title="Rename group"
        >
          <Edit3 className="h-4 w-4" />
        </button>
      </div>
                <div className="text-xs text-gray-400">
                  {(g.memberIds || []).length} players
                </div>
              </button>
            ))
          ) : (
            <div className="text-gray-400 text-sm">No groups yet</div>
          )}
        </div>
      </div>

      {/* right: group room */}
      <div className="card lg:col-span-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center">
            <MessageSquare className="h-4 w-4 mr-2" />
            Group Room
          </h2>

          <div className="flex gap-2">
            <button className="btn-secondary" onClick={createRoomNow} disabled={!selectedGroup}>
              Ensure Room
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={sendImage} className="hidden" />
            <button
              className="btn-secondary"
              onClick={() => fileRef.current?.click()}
              disabled={!selectedGroup}
              title="Upload Image"
            >
              <Upload className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="bg-gray-700 rounded p-3 h-72 overflow-auto space-y-2">
          {messages.length ? (
            messages.map((m, i) => (
              <div key={i} className="p-2 rounded bg-gray-600">
                <div className="text-xs text-gray-300">
                  {m.timestamp ? new Date(m.timestamp).toLocaleString() : ''}
                </div>
                {editingMsgId === m._id ? (
        <div className="mt-2 flex gap-2">
          <input className="input flex-1" value={editText} onChange={(e)=>setEditText(e.target.value)} />
          <button className="btn-primary" onClick={saveEditMsg}>Save</button>
          <button className="btn-secondary" onClick={cancelEditMsg}>Cancel</button>
        </div>
      ) : m.type === 'image' && m.imageUrl ? (
                  <div>
                    <div className="text-sm">{m.content}</div>
                    <img src={m.imageUrl} alt="" className="max-w-full rounded mt-2" />
                  </div>
                ) : (
                  <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                )}
                {m.type !== 'deleted' && (
            <div className="mt-2 flex gap-2 justify-end">
              <button
                type="button"
                className="text-xs text-gray-200 hover:text-white underline"
                onClick={() => startEditMsg(m)}
              >
                Edit
              </button>
              <button
                type="button"
                className="text-xs text-red-300 hover:text-red-200 underline"
                onClick={() => deleteMsg(m._id)}
              >
                Delete
              </button>
            </div>
          )}
              </div>
            ))
          ) : (
            <div className="text-gray-400 text-sm">No messages</div>
          )}
        </div>

        <form onSubmit={sendText} className="mt-3 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="input flex-1"
            placeholder="Message players..."
          />
          <button className="btn-primary" disabled={!selectedGroup || !text.trim()}>
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
      {/* Rename Group Modal */}
{renameOpen && (
  <div className="fixed inset-0 bg-black/60 z-50 grid place-items-center p-4">
    <div className="bg-gray-800 rounded-lg p-4 w-full max-w-md">
      <div className="font-semibold mb-2">Rename Group</div>
      <input className="input w-full mb-3" value={renameValue} onChange={e=>setRenameValue(e.target.value)} />
      <div className="flex justify-end gap-2">
        <button className="btn-secondary" onClick={()=>setRenameOpen(false)}>Cancel</button>
        <button className="btn-primary" onClick={doRename}>Save</button>
      </div>
    </div>
  </div>
)}

{/* Tournament Edit Modal */}
{tEditOpen && (
  <div className="fixed inset-0 bg-black/60 z-50 grid place-items-center p-4">
    <div className="bg-gray-800 rounded-lg p-4 w-full max-w-lg">
      <div className="font-semibold mb-3">Edit Tournament</div>
      <div className="space-y-2">
        <input className="input w-full" placeholder="Title" value={tForm.title} onChange={e=>setTForm({...tForm, title: e.target.value})} />
        <textarea className="input w-full h-24" placeholder="Description" value={tForm.description} onChange={e=>setTForm({...tForm, description: e.target.value})} />
        <div className="grid grid-cols-2 gap-2">
          <input className="input" type="number" placeholder="Price" value={tForm.price} onChange={e=>setTForm({...tForm, price: e.target.value})} />
          <input className="input" type="number" placeholder="Capacity" value={tForm.capacity} onChange={e=>setTForm({...tForm, capacity: e.target.value})} />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <button className="btn-secondary" onClick={()=>setTEditOpen(false)}>Cancel</button>
        <button className="btn-primary" onClick={saveTournament}>Save</button>
      </div>
    </div>
  </div>
)}

    </div>
    </div>


  );
}
