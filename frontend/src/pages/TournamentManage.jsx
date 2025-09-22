// frontend/src/pages/TournamentManage.jsx
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tournamentsAPI, uploadAPI } from '../services/api';
import {
  Users, MessageSquare, Send, Upload, Plus, Edit3, Trash2, Scissors, X,
  Search, ChevronDown, Hash, ShieldCheck, Layers, Grid, Wand2, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { NormalizeImageUrl } from '../utils/img';
import { useAuth } from '../context/AuthContext';


export default function TournamentManage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loading: authLoading, isAuthenticated } = useAuth();

  // data
  const [participants, setParticipants] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // chat
  const [messages, setMessages] = useState([]);
  const visibleMsgs = messages.filter(m => m && m.type !== 'deleted');
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
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  // team detail modal
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamModalData, setTeamModalData] = useState(null);

  // manual group
  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState({}); // userId => true

  // filters / ui
  const [listFilter, setListFilter] = useState('all'); // 'all' | 'group' | 'ungrouped'
  const [search, setSearch] = useState('');
  const [view, setView] = useState('list'); // 'list' | 'grid'

  const arr = v => (Array.isArray(v) ? v : []);
  const toId = x => (typeof x === 'object' && x?._id ? x._id : x);

  // --- loaders ---
  const refreshMessages = async () => {
    if (!selectedGroup || deleted) return;
    try {
      const res = await tournamentsAPI.getGroupRoomMessages(id, selectedGroup._id);
      setMessages(arr(res?.data?.room?.messages));
    } catch (e) {
      console.error('refreshMessages error:', e);
    }
  };

  const load = async () => {
    if (!isAuthenticated || authLoading || deleted) return;
    try {
      const [p, g, t] = await Promise.all([
        tournamentsAPI.getParticipants(id),
        tournamentsAPI.listGroups(id),
        tournamentsAPI.get(id),
      ]);

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

      if (selectedGroup) {
        const again = glist.find(gg => String(gg._id) === String(selectedGroup._id));
        setSelectedGroup(again || null);
        if (!again) setListFilter('all');
      }
    } catch (e) {
      console.error('load error:', e);
      if (e?.response?.status === 404) {
        // tournament is gone — hard stop and redirect
        toast('Tournament no longer exists', { icon: '⚠️' });
        setDeleted(true);
        navigate('/tournaments', { replace: true });
        return;
      }
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        toast.error('You are not authorized to manage this tournament');
      } else {
        toast.error('Failed to load tournament data');
      }
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setParticipants([]); setGroups([]); setSelectedGroup(null);
      setMessages([]); setSelectedPlayers({});
      setText(''); setEditingMsgId(null); setEditText('');
      setManualOpen(false); setManualName('');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, authLoading, isAuthenticated]);

  // --- actions ---
  const makeAutoGroups = async () => {
    try {
      await tournamentsAPI.autoGroup(id, 16);
      await load();
      toast.success(`Created groups of 16 Teams`);
    } catch (e) {
      console.error('auto group error:', e);
      toast.error(e?.response?.data?.message || 'Failed to create groups / rooms');
    }
  };

  const removeFromTournament = async (uid) => {
    if (!uid) return;
    if (!window.confirm('Remove this participant from the tournament?')) return;
    try {
      await tournamentsAPI.removeParticipant(id, uid);
      await load();
      toast.success('Participant removed');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to remove participant');
    }
  };

  const openGroup = async (g) => {
    if (deleted) return;
    try {
      if (selectedGroup && String(selectedGroup._id) === String(g._id)) {
        setSelectedGroup(null);
        setMessages([]);
        setListFilter('all');
        return;
      }
      const picked = groups.find(x => String(x._id) === String(g._id)) || g;
      setSelectedGroup(picked);
      setListFilter('group');
      const res = await tournamentsAPI.getGroupRoomMessages(id, picked._id);
      setMessages(arr(res?.data?.room?.messages));
    } catch (e) {
      console.error('openGroup error:', e);
      toast.error('Failed to open group room');
    }
  };

  const createRoomNow = async () => {
    if (!selectedGroup || deleted) return;
    try {
      await tournamentsAPI.getGroupRoomMessages(id, selectedGroup._id);
      await load();
      toast.success('Room ready for this group');
    } catch (e) {
      console.error('createRoomNow error:', e);
      toast.error('Failed to create room');
    }
  };

  const sendText = async (e) => {
    e.preventDefault();
    if (!selectedGroup || !text.trim() || deleted) return;
    try {
      await tournamentsAPI.sendGroupRoomMessage(id, selectedGroup._id, { content: text, type: 'text' });
      setText('');
      await refreshMessages();
    } catch (e) {
      console.error('sendText error:', e);
      toast.error('Failed to send');
    }
  };

  const sendImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGroup || deleted) return;
    try {
      const up = await uploadAPI.uploadImage(file);
      const url = up?.data?.imageUrl;
      if (!url) return toast.error('Upload failed');
      await tournamentsAPI.sendGroupRoomMessage(id, selectedGroup._id, {
        type: 'image',
        content: `Image: ${file.name}`,
        imageUrl: url,
      });
      await refreshMessages();
    } catch (err) {
      console.error('sendImage error:', err);
      toast.error('Image send failed');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const startEditMsg = (m) => { setEditingMsgId(m._id); setEditText(m.content || ''); };
  const cancelEditMsg = () => { setEditingMsgId(null); setEditText(''); };
  const saveEditMsg = async () => {
    if (!selectedGroup || !editingMsgId || deleted) return;
    try {
      await tournamentsAPI.editGroupRoomMessage(id, selectedGroup._id, editingMsgId, { content: editText });
      cancelEditMsg();
      await refreshMessages();
      toast.success('Message edited');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Edit failed');
    }
  };
  const deleteMsg = async (mid) => {
    if (!selectedGroup || !mid || deleted) return;
    try {
      await tournamentsAPI.deleteGroupRoomMessage(id, selectedGroup._id, mid);
      await refreshMessages();
      toast.success('Message deleted');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Delete failed');
    }
  };

  const openRename = (g) => { setSelectedGroup(g); setRenameValue(g?.name || ''); setRenameOpen(true); };
  const doRename = async () => {
    if (!selectedGroup || !renameValue.trim() || deleted) return;
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
    if (deleted) return;
    const memberIds = Object.entries(selectedPlayers).filter(([, v]) => v).map(([k]) => k);
    if (!memberIds.length) return toast.error('Pick at least 1 player');
    if (!moveToGroupId) return toast.error('Select a target group');
    try {
      for (const uid of memberIds) {
        await tournamentsAPI.moveGroupMember(id, {
          userId: uid,
          fromGroupId: selectedGroup?._id || '',
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
    if (!selectedGroup || deleted) return toast.error('Open a group first');
    try {
      await tournamentsAPI.removeGroupMember(id, selectedGroup._id, uid);
      await load();
      toast.success('Removed from group');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Remove failed');
    }
  };

  const saveTournament = async () => {
    if (deleted) return;
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

  /**
   * SAFE DELETE:
   * 1) delete each group's room (best-effort)
   * 2) delete each group (best-effort)
   * 3) delete the tournament
   * 4) clear UI and redirect
   */
  const deleteTournamentSafely = async () => {
    if (deleted || deleting) return;

    const confirm = window.confirm(
      'Delete this tournament?\n\nThis will:\n• Delete all group chat rooms\n• Delete all groups\n• Delete the tournament itself\n\nThis cannot be undone.'
    );
    if (!confirm) return;

    setDeleting(true);
    try {
      // ensure we have group list
      let currentGroups = groups;
      if (!currentGroups?.length) {
        const g = await tournamentsAPI.listGroups(id);
        currentGroups =
          Array.isArray(g?.data?.groups) ? g.data.groups :
          Array.isArray(g?.groups) ? g.groups : [];
      }

      // 1) delete rooms (best-effort)
      for (const g of currentGroups) {
        try {
          await tournamentsAPI.deleteGroupRoom(id, g._id);
        } catch {
          /* ignore */
        }
      }

      // 2) delete groups (best-effort)
      for (const g of currentGroups) {
        try {
          await tournamentsAPI.deleteGroup(id, g._id);
        } catch {
          /* ignore */
        }
      }

      // 3) delete tournament
      await tournamentsAPI.deleteTournament(id);

      // 4) local cleanup + redirect
      setDeleted(true);
      setParticipants([]); setGroups([]); setSelectedGroup(null);
      setMessages([]); setSelectedPlayers({});
      toast.success('Tournament deleted');
      navigate('/tournaments', { replace: true });
    } catch (e) {
      console.error('deleteTournamentSafely error:', e);
      toast.error(e?.response?.data?.message || 'Failed to delete tournament');
    } finally {
      setDeleting(false);
    }
  };

  const deleteRoomNow = async () => {
    if (!selectedGroup || deleted) return;
    if (!window.confirm(`Delete room for "${selectedGroup.name}"? Messages will be removed.`)) return;
    try {
      await tournamentsAPI.deleteGroupRoom(id, selectedGroup._id);
      setMessages([]);
      toast.success('Room deleted');
    } catch (e) {
      console.error('deleteRoomNow error:', e);
      toast.error(e?.response?.data?.message || 'Failed to delete room');
    }
  };

  const toggleSel = (u) =>
    setSelectedPlayers((m) => ({ ...m, [u]: !m[u] }));

  const createManualGroup = async () => {
    if (deleted) return;
    try {
      const memberIds = Object.entries(selectedPlayers).filter(([, v]) => v).map(([k]) => k);
      if (!memberIds.length) return toast.error('Pick at least 1 player');
      await tournamentsAPI.createGroup(id, { name: manualName?.trim() || undefined, memberIds });
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

  // --- derived ---
  const groupedSet = useMemo(
    () => new Set(groups.flatMap(g => (g.memberIds || []).map(m => String(toId(m))))),
    [groups]
  );

  const visibleParticipants = useMemo(() => {
    let list = participants;
    if (listFilter === 'ungrouped') {
      list = list.filter(p => !groupedSet.has(String(toId(p.userId))));
    } else if (listFilter === 'group' && selectedGroup) {
      const selSet = new Set((selectedGroup.memberIds || []).map(u => String(toId(u))));
      list = list.filter(p => selSet.has(String(toId(p.userId))));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => {
        const uObj = typeof p.userId === 'object' ? p.userId : null;
        const displayName =
          (p.teamName && p.teamName.trim()) ||
          (p.team && p.team.name) ||
          p.ign ||
          (uObj?.name) ||
          'player';
        const blob = [
          displayName,
          p.realName || '',
          p.phone || '',
          ...(Array.isArray(p.players) ? p.players.map(pp => `${pp.ignName} ${pp.ignId}`) : [])
        ].join(' ').toLowerCase();
        return blob.includes(q);
      });
    }
    return list;
  }, [participants, listFilter, selectedGroup, groupedSet, search]);

  const selectedCount = useMemo(
    () => Object.values(selectedPlayers).filter(Boolean).length,
    [selectedPlayers]
  );

  // --- UI ---
  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {deleted ? 'Tournament (deleted)' : 'Tournament Manager'}
          </h1>
          <p className="text-sm text-white/60">
            {deleted ? 'This tournament was removed.' : 'Group players, run rooms, and message teams.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => setTEditOpen(true)} disabled={deleted}>
            <Edit3 className="h-4 w-4 mr-2" /> Edit
          </button>
          <button className="btn-danger" onClick={deleteTournamentSafely} disabled={deleted || deleting}>
            <Trash2 className="h-4 w-4 mr-2" /> {deleting ? 'Deleting…' : 'Delete Tournament'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr_1fr] opacity-100">
        {/* Participants */}
        <section className={`card relative ${deleted ? 'pointer-events-none opacity-50' : ''}`}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" /> Participants
              <span className="text-xs text-white/50">({visibleParticipants.length})</span>
            </h3>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                <input
                  className="input pl-9 w-32"
                  placeholder="Search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  disabled={deleted}
                />
              </div>

              <select
                className="input w-25"
                value={listFilter}
                onChange={(e) => setListFilter(e.target.value)}
                title="Filter participants"
                disabled={deleted}
              >
                <option value="all">All teams</option>
                <option value="group" disabled={!selectedGroup}>Selected group</option>
                <option value="ungrouped">Ungrouped only</option>
              </select>

              <button className="btn-secondary w-40" onClick={makeAutoGroups} title="Auto-create groups of 16" disabled={deleted}>
                <Wand2 className="h-4 w-4" /> Auto (16 teams)
              </button>
            </div>
          </div>

          {/* Bulk move toolbar */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-sm text-white/70">
              Selected: <span className="font-medium">{selectedCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <select className="input" value={moveToGroupId} onChange={(e) => setMoveToGroupId(e.target.value)} disabled={deleted}>
                <option value="">Move selected →</option>
                {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
              </select>
              <button className="btn-secondary" onClick={moveSelectedPlayers} disabled={!moveToGroupId || !selectedCount || deleted}>
                Move
              </button>
            </div>
          </div>

          {/* List/Grid toggle */}
          <div className="mb-3 flex items-center gap-2">
            <button
              className={`px-3 py-1 rounded ${view === 'list' ? 'bg-gaming-purple/20 text-gaming-purple' : 'bg-white/5 text-white/70'}`}
              onClick={() => setView('list')}
              title="List view"
              disabled={deleted}
            >
              <Layers className="h-4 w-4" />
            </button>
            <button
              className={`px-3 py-1 rounded ${view === 'grid' ? 'bg-gaming-purple/20 text-gaming-purple' : 'bg-white/5 text-white/70'}`}
              onClick={() => setView('grid')}
              title="Grid view"
              disabled={deleted}
            >
              <Grid className="h-4 w-4" />
            </button>

            <div className="ml-auto">
              <button className="btn-secondary" onClick={() => setManualOpen(v => !v)} disabled={deleted}>
                <Plus className="h-4 w-4 mr-2" /> Create group manually
              </button>
            </div>
          </div>

          {/* Manual group drawer */}
          {manualOpen && !deleted && (
            <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-2">
                <input
                  className="input flex-1"
                  placeholder="Group name (optional)"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                />
                <button className="btn-primary" onClick={createManualGroup}>Create</button>
              </div>
              {selectedCount === 0 && (
                <div className="mt-2 flex items-center gap-2 text-xs text-white/60">
                  <AlertTriangle className="h-3.5 w-3.5" /> Select at least one player from the list below.
                </div>
              )}
            </div>
          )}

          {/* Participants */}
          {view === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[32rem] overflow-auto pr-1">
              {visibleParticipants.length ? visibleParticipants.map((p) => {
                const uId = toId(p.userId);
                const uObj = typeof p.userId === 'object' ? p.userId : null;
                const isInSelectedGroup = !!(selectedGroup?.memberIds || []).find(m => String(toId(m)) === String(uId));
                const displayName =
                  (p.teamName && p.teamName.trim()) ||
                  (p.team && p.team.name) ||
                  p.ign ||
                  (uObj?.name) ||
                  'Player';

                return (
                  <div key={uId} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="accent-gaming-purple"
                        checked={!!selectedPlayers[uId]}
                        onChange={() => toggleSel(uId)}
                        disabled={deleted}
                      />
                      {uObj?.avatarUrl ? (
                        <img src={NormalizeImageUrl(uObj.avatarUrl)} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-600 grid place-items-center">
                          <span className="text-xs">{(uObj?.name?.[0] || 'P').toUpperCase()}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{displayName}</div>
                        {Array.isArray(p.players) && p.players.length > 0 && (
                          <div className="truncate text-[11px] text-white/60">
                            {p.players.filter(pp => pp.ignName && pp.ignId).map(pp => `${pp.ignName} (${pp.ignId})`).join(', ')}
                          </div>
                        )}
                      </div>
                    </label>

                    <div className="mt-2 flex items-center justify-between">
                      <button
                        type="button"
                        className="text-xs underline text-gaming-cyan hover:opacity-80"
                        onClick={() => { setTeamModalData(p); setShowTeamModal(true); }}
                        disabled={deleted}
                      >
                        Details
                      </button>
                      <div className="flex items-center gap-2">
                        {selectedGroup && isInSelectedGroup && (
                          <button
                            type="button"
                            className="text-red-400 hover:text-red-300"
                            title="Remove from this group"
                            onClick={() => removePlayerFromSelectedGroup(uId)}
                            disabled={deleted}
                          >
                            <Scissors className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          className="text-red-400 hover:text-red-300"
                          title="Remove from tournament"
                          onClick={() => removeFromTournament(uId)}
                          disabled={deleted}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-gray-400 text-sm">No registrations yet</div>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-[32rem] overflow-auto pr-1">
              {visibleParticipants.length ? visibleParticipants.map((p) => {
                const uId = toId(p.userId);
                const uObj = typeof p.userId === 'object' ? p.userId : null;
                const isInSelectedGroup = !!(selectedGroup?.memberIds || []).find(m => String(toId(m)) === String(uId));
                const displayName =
                  (p.teamName && p.teamName.trim()) ||
                  (p.team && p.team.name) ||
                  p.ign ||
                  (uObj?.name) ||
                  'Player';
                return (
                  <label key={uId} className="flex items-center gap-2 p-2 rounded hover:bg-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mr-1 accent-gaming-purple"
                      checked={!!selectedPlayers[uId]}
                      onChange={() => toggleSel(uId)}
                      disabled={deleted}
                    />
                    {uObj?.avatarUrl ? (
                      <img src={NormalizeImageUrl(uObj.avatarUrl)} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-600 grid place-items-center">
                        <span className="text-xs">{(uObj?.name?.[0] || 'P').toUpperCase()}</span>
                      </div>
                    )}
                    <div className="text-sm flex-1 min-w-0">
                      <div className="truncate">{displayName}</div>
                      {Array.isArray(p.players) && p.players.length > 0 && (
                        <div className="text-xs text-white/60 truncate">
                          {p.players.filter(pp => pp.ignName && pp.ignId).map(pp => `${pp.ignName} (${pp.ignId})`).join(', ')}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="text-xs underline text-gaming-cyan hover:opacity-80 mr-2"
                      onClick={(e) => { e.preventDefault(); setTeamModalData(p); setShowTeamModal(true); }}
                      disabled={deleted}
                    >
                      Details
                    </button>

                    {selectedGroup && isInSelectedGroup && (
                      <button
                        type="button"
                        className="text-red-400 hover:text-red-300"
                        title="Remove from this group"
                        onClick={(e) => { e.preventDefault(); removePlayerFromSelectedGroup(uId); }}
                        disabled={deleted}
                      >
                        <Scissors className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-red-400 hover:text-red-300"
                      title="Remove from tournament"
                      onClick={(e) => { e.preventDefault(); removeFromTournament(uId); }}
                      disabled={deleted}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </label>
                );
              }) : (
                <div className="text-gray-400 text-sm">No registrations yet</div>
              )}
            </div>
          )}
        </section>

        {/* Groups */}
        <section className={`card ${deleted ? 'pointer-events-none opacity-50' : ''}`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Hash className="h-4 w-4" /> Groups
            </h2>
          </div>

          <div className="space-y-2 max-h-[36rem] overflow-auto pr-1">
            {groups.length ? groups.map((g) => {
              const active = selectedGroup && String(selectedGroup._id) === String(g._id);
              const mem = (g.memberIds || []).length;
              const hasRoom = Boolean(g.roomId);
              return (
                <div
                  key={g._id}
                  className={`rounded border p-3 transition-colors cursor-pointer ${active ? 'border-gaming-purple bg-gaming-purple/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  onClick={() => openGroup(g)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium truncate">{g.name}</div>
                        {hasRoom && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-[2px] text-[11px] text-emerald-300">
                            <ShieldCheck className="h-3.5 w-3.5" /> Room
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white/60">{mem} players</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="text-white/80 hover:text-white"
                        title="Rename group"
                        onClick={(e) => { e.stopPropagation(); openRename(g); }}
                        disabled={deleted}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        className="text-red-400 hover:text-red-300"
                        title="Delete group"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!window.confirm('Delete this group? Players will be ungrouped.')) return;
                          try {
                            await tournamentsAPI.deleteGroup(id, g._id);
                            if (selectedGroup && String(selectedGroup._id) === String(g._id)) {
                              setSelectedGroup(null); setMessages([]); setListFilter('all');
                            }
                            await load();
                            toast.success('Group deleted');
                          } catch (err) {
                            toast.error(err?.response?.data?.message || 'Delete failed');
                          }
                        }}
                        disabled={deleted}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="text-gray-400 text-sm">No groups yet</div>
            )}
          </div>
        </section>

        {/* Room / Chat (sticky) */}
        <aside className={`card lg:sticky lg:top-6 h-fit ${deleted ? 'pointer-events-none opacity-50' : ''}`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Group Room
            </h2>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={createRoomNow} disabled={!selectedGroup || deleted}>
                Ensure Room
              </button>
              <button className="btn-danger" onClick={deleteRoomNow} disabled={!selectedGroup || deleted} title="Delete this group's room">
                Delete Room
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={sendImage} className="hidden" />
              <button className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={!selectedGroup || deleted} title="Upload Image">
                <Upload className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="rounded bg-white/5 h-80 overflow-auto p-3 space-y-2">
            {visibleMsgs.length ? visibleMsgs.map((m, i) => {
              const mine = false; // organizer perspective; adjust if you add sender info
              return (
                <div
                  key={m._id || i}
                  className={`max-w-[85%] rounded-lg px-3 py-2 ${mine ? 'ml-auto bg-gaming-purple/20' : 'bg-white/10'}`}
                >
                  <div className="text-[11px] text-white/60">
                    {m.timestamp ? new Date(m.timestamp).toLocaleString() : ''}
                  </div>

                  {editingMsgId === m._id ? (
                    <div className="mt-2 flex gap-2">
                      <input className="input flex-1" value={editText} onChange={(e) => setEditText(e.target.value)} />
                      <button className="btn-primary" onClick={saveEditMsg}>Save</button>
                      <button className="btn-secondary" onClick={cancelEditMsg}>Cancel</button>
                    </div>
                  ) : m.type === 'image' && m.imageUrl ? (
                    <div className="mt-1">
                      {m.content && <div className="text-sm mb-1">{m.content}</div>}
                      <img src={NormalizeImageUrl(m.imageUrl)} alt="" className="max-w-full rounded" />
                    </div>
                  ) : (
                    <div className="text-sm whitespace-pre-wrap mt-1">{m.content}</div>
                  )}

                  {m.type !== 'deleted' && (
                    <div className="mt-2 flex gap-3 justify-end text-xs">
                      <button className="text-white/80 hover:text-white underline" onClick={() => startEditMsg(m)} disabled={deleted}>Edit</button>
                      <button className="text-red-300 hover:text-red-200 underline" onClick={() => deleteMsg(m._id)} disabled={deleted}>Delete</button>
                    </div>
                  )}
                </div>
              );
            }) : (
              <div className="h-full grid place-items-center text-white/50 text-sm">No messages</div>
            )}
          </div>

          <form onSubmit={sendText} className="mt-3 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="input flex-1"
              placeholder={selectedGroup ? `Message ${selectedGroup.name}…` : 'Open a group to chat…'}
              disabled={deleted}
            />
            <button className="btn-primary" disabled={!selectedGroup || !text.trim() || deleted}>
              <Send className="h-4 w-4" />
            </button>
          </form>
        </aside>
      </div>

      {/* Team Details Modal */}
      {showTeamModal && teamModalData && (
        <div className="fixed inset-0 bg-black/60 z-50 grid place-items-center p-4">
          <div className="bg-gray-800 rounded-2xl p-5 w-full max-w-md border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Team Details</div>
              <button className="text-gray-400 hover:text-white" onClick={() => setShowTeamModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div><span className="text-white/60">Team:</span> {teamModalData.teamName || '—'}</div>
              <div>
                <span className="text-white/60">Contact:</span> {teamModalData.realName || '—'}
                {teamModalData.phone ? ` • ${teamModalData.phone}` : ''}
              </div>

              <div className="mt-2">
                <div className="text-white/60 mb-1">Players:</div>
                <div className="space-y-1">
                  {(teamModalData.players || []).map((pp, idx) => (
                    <div key={pp._id || pp.slot || idx} className="flex justify-between">
                      <div>#{pp.slot ?? (idx + 1)}</div>
                      <div className="flex-1 text-right">
                        {pp.ignName || '—'}{pp.ignId ? ` (${pp.ignId})` : ''}
                      </div>
                    </div>
                  ))}
                  {(!teamModalData.players || teamModalData.players.length === 0) && (
                    <div className="text-white/60">No player list</div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <button className="btn-primary" onClick={() => setShowTeamModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Group Modal */}
      {renameOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 grid place-items-center p-4">
          <div className="bg-gray-800 rounded-2xl p-5 w-full max-w-md border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Rename Group</div>
              <button className="text-gray-400 hover:text-white" onClick={() => setRenameOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <input className="input w-full mb-3" value={renameValue} onChange={e => setRenameValue(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setRenameOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={doRename}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Tournament Edit Modal */}
      {tEditOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 grid place-items-center p-4">
          <div className="bg-gray-800 rounded-2xl p-5 w-full max-w-lg border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Edit Tournament</div>
              <button className="text-gray-400 hover:text-white" onClick={() => setTEditOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              <input className="input w-full" placeholder="Title" value={tForm.title} onChange={e => setTForm({ ...tForm, title: e.target.value })} />
              <textarea className="input w-full h-24" placeholder="Description" value={tForm.description} onChange={e => setTForm({ ...tForm, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <input className="input" type="number" placeholder="Price" value={tForm.price} onChange={e => setTForm({ ...tForm, price: e.target.value })} />
                <input className="input" type="number" placeholder="Capacity" value={tForm.capacity} onChange={e => setTForm({ ...tForm, capacity: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button className="btn-secondary" onClick={() => setTEditOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveTournament}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
