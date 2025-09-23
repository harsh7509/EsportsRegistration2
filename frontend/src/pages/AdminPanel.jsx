import React, { useEffect, useRef, useState } from 'react';
import {
  Shield,
  Users as UsersIcon,
  Calendar,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Star,
  User,
  Save,
  X,
  Trophy,
  CircleDollarSign,
  Eye,
} from 'lucide-react';
import { adminAPI, authAPI, uploadAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { NormalizeImageUrl } from '../utils/img';
import { Link } from 'react-router-dom';
import { KycReviewPanel } from './AdminKycReview';

/* Small utility classes (Tailwind) you can keep in a global CSS file too:
.btn-mini { @apply inline-flex items-center justify-center rounded bg-white/10 hover:bg-white/20 p-1.5; }
.btn-mini.danger { @apply text-red-300 hover:bg-red-500/20; }
.btn-primary { @apply inline-flex items-center justify-center rounded-lg bg-white text-gray-900 px-3 py-2 font-medium hover:bg-white/90; }
.btn-secondary { @apply inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10; }
.input { @apply rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-white/30; }
.card { @apply rounded-xl border border-white/10 bg-white/5 p-5; }
*/

const AdminPanel = () => {
  const { user: me } = useAuth();

  // Dashboard stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrgs: 0,
    totalScrims: 0,
    totalBookings: 0,
    revenue: 0,
    activePromotions: 0,
    totalRatings: 0,
  });

  // Tabs & loading
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // Users
  const [users, setUsers] = useState([]);
  const [userFilters, setUserFilters] = useState({ role: 'all', search: '' });
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({});

  // Promotions
  const [promotions, setPromotions] = useState([]);
  const promoFileRef = useRef(null);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoMode, setPromoMode] = useState('create'); // 'create' | 'edit'
  const [editingPromo, setEditingPromo] = useState(null);
  const [useUrlInput, setUseUrlInput] = useState(false);
  const [promoForm, setPromoForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    organizationId: '',
    scrimId: '',
    tournamentId: '',
    type: 'scrim',
    priority: 1,
    endDate: '',
    ctaText: '',
    ctaUrl: '',
    utmSource: '',
    utmCampaign: '',
  });
  const [addPlayerMeta, setAddPlayerMeta] = useState({ ign: '', phone: '', teamName: '' });



  // Convert Date/ISO → 'YYYY-MM-DDTHH:mm' in LOCAL time// 🔧 Replace your helpers with these two:

  const pad2 = (n) => String(n).padStart(2, '0');
 const isObjectId = (s) => /^[a-f0-9]{24}$/i.test(s);

  /** ISO/Date -> 'YYYY-MM-DDTHH:mm' in *local* time (for <input datetime-local>) */
  const toLocalDT = (val) => {
    if (!val) return '';
    const d = typeof val === 'string' ? new Date(val) : val;
    if (isNaN(d)) return '';
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };

  /** 'YYYY-MM-DDTHH:mm' (local) -> ISO string (UTC instant) */
  const localToISO = (localStr) => {
    if (!localStr) return '';
    const d = new Date(localStr);     // parsed as *local* time by the browser
    if (isNaN(d)) return '';
    return d.toISOString();           // convert to UTC ISO for backend
  };



  // Profile (admin)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: me?.name || '',
    avatar: me?.avatarUrl || '',
    organizationName: me?.organizationInfo?.name || me?.organizationInfo?.orgName || '',
    location: me?.organizationInfo?.location || '',
  });
  const fileInputRef = useRef(null);

  // Data tabs
  const [scrims, setScrims] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [kycItems, setKycItems] = useState([]);

  // Scrim editing / participants
  const [editingScrim, setEditingScrim] = useState(null);
  const [scrimForm, setScrimForm] = useState({});
  const [managePlayersFor, setManagePlayersFor] = useState(null);
  const [addPlayerInput, setAddPlayerInput] = useState(''); // email or userId

  // Ratings edit
  const [editingRatingId, setEditingRatingId] = useState(null);
  const [ratingDraft, setRatingDraft] = useState({ rating: 5, comment: '' });

  // Promotions helper: org -> tournaments
  const [orgTournamentMap, setOrgTournamentMap] = useState([]);
  // Turn <input type="datetime-local"> value into an ISO string (or undefined)
  const toISOFromLocal = (val) => {
    if (!val) return undefined;                    // keep it optional
    const d = new Date(val);                       // "YYYY-MM-DDTHH:mm" (local) -> Date
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  };


  // ===== Guard =====
  if (!me || me.role !== 'admin') {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-2xl font-bold">Access denied</h2>
          <p className="text-gray-400 mt-2">You must be an admin to view this page.</p>
        </div>
      </div>
    );
  }

  // ===== Fetch: dashboard stats once =====
  useEffect(() => {
    (async () => {
      try {
        const res = await adminAPI.getStats();
        setStats(res?.data || {});
      } catch (e) {
        console.error('Failed to fetch stats:', e);
        toast.error('Failed to load stats');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ===== Fetch: tab data =====
  useEffect(() => {
    (async () => {
      try {
        if (activeTab === 'users') {
          await fetchUsers();
        } else if (activeTab === 'promotions') {
          await fetchPromotions();
          // Build org -> tournaments browser
          const tRes = await adminAPI.listTournaments();
          const tList = tRes?.data?.items || [];
          const map = new Map();
          for (const t of tList) {
            const org = t.organizationId || {};
            const key = org._id || 'unknown';
            if (!map.has(key)) map.set(key, { orgId: org._id || null, name: org.name || 'Unknown Org', items: [] });
            map.get(key).items.push(t);
          }
          setOrgTournamentMap(Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        } else if (activeTab === 'scrims') {
          const res = await adminAPI.listScrims();
          setScrims(res?.data?.items || []);
        } else if (activeTab === 'tournaments') {
          const res = await adminAPI.listTournaments();
          setTournaments(res?.data?.items || []);
        } else if (activeTab === 'bookings') {
          const res = await adminAPI.listBookings();
          setBookings(res?.data?.items || []);
        } else if (activeTab === 'payments') {
          const res = await adminAPI.listPayments();
          setPayments(res?.data?.items || []);
        } else if (activeTab === 'ratings') {
          const res = await adminAPI.listRatings();
          setRatings(res?.data?.items || []);
        } else if (activeTab === 'kyc') {
          const res = await adminAPI.listOrgKyc();
          setKycItems(res?.data?.items || []);
        }
      } catch (e) {
        console.error('admin tab fetch error:', e);
        toast.error('Failed to load data');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Re-fetch users when filters change (only on Users tab)
  useEffect(() => {
    if (activeTab !== 'users') return;
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userFilters]);

  const fetchUsers = async () => {
    try {
      const res = await adminAPI.getUsers(userFilters);
      setUsers(res?.data?.users || []);
    } catch (e) {
      console.error('Failed to fetch users:', e);
      toast.error('Failed to load users');
    }
  };

  const fetchPromotions = async () => {
    try {
      const res = await adminAPI.getPromotions();
      setPromotions(res?.data?.promotions || []);
    } catch (e) {
      console.error('Failed to fetch promotions:', e);
      toast.error('Failed to load promotions');
    }
  };



  // ===== Users actions =====
  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      await adminAPI.updateUserRole(userId, newRole);
      toast.success('User role updated');
      fetchUsers();
    } catch (e) {
      console.error('update role error:', e);
      toast.error(e?.response?.data?.message || 'Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await adminAPI.deleteUser(userId);
      toast.success('User deleted');
      fetchUsers();
    } catch (e) {
      console.error('delete user error:', e);
      toast.error(e?.response?.data?.message || 'Failed to delete user');
    }
  };

  const openEditUser = (u) => {
    setEditingUser(u);
    setEditUserForm({
      name: u.name || '',
      avatarUrl: u.avatarUrl || '',
      organizationInfo: {
        orgName: u.organizationInfo?.orgName || u.organizationInfo?.name || '',
        name: u.organizationInfo?.name || '',
        location: u.organizationInfo?.location || '',
        verified: u.organizationInfo?.verified || false,
        ranking: u.organizationInfo?.ranking ?? 1000,
        description: u.organizationInfo?.description || '',
        logo: u.organizationInfo?.logo || '',
      },
      playerInfo: u.playerInfo || {},
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.updateUser(editingUser._id, editUserForm);
      toast.success('User updated');
      setEditingUser(null);
      fetchUsers();
    } catch (e) {
      console.error('update user error:', e);
      toast.error(e?.response?.data?.message || 'Failed to update user');
    }
  };

  // Quick org controls
  const toggleVerifyOrg = async (orgUser) => {
    try {
      const next = !(orgUser?.organizationInfo?.verified);
      await adminAPI.setOrgVerified(orgUser._id, next);
      toast.success(next ? 'Organization verified' : 'Organization unverified');
      fetchUsers();
    } catch (e) {
      console.error('verify org error:', e);
      toast.error('Failed to update verification');
    }
  };

  const updateOrgRanking = async (orgUser, value) => {
    try {
      await adminAPI.setOrgRanking(orgUser._id, Number(value) || 1000);
      toast.success('Ranking updated');
      fetchUsers();
    } catch (e) {
      console.error('set ranking error:', e);
      toast.error('Failed to update ranking');
    }
  };

  // ===== Profile actions =====
  const handleProfileImagePick = () => fileInputRef.current?.click();

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadAPI.uploadImage(file);
      const url = res?.data?.imageUrl || res?.data?.avatarUrl;
      if (!url) throw new Error('No imageUrl returned');
      setProfileData((p) => ({ ...p, avatar: url }));
      toast.success('Image uploaded');
    } catch (e) {
      console.error('image upload error:', e);
      toast.error(e?.response?.data?.message || 'Upload failed');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleProfileUpdate = async () => {
    try {
      const payload = {
        name: profileData.name,
        avatarUrl: profileData.avatar,
        organizationInfo: {
          name: profileData.organizationName,
          orgName: profileData.organizationName,
          location: profileData.location,
        },
      };
      await authAPI.updateProfile(payload);
      const meRes = await authAPI.getMe();
      localStorage.setItem('user', JSON.stringify(meRes?.data?.user));
      toast.success('Profile updated');
      setIsEditingProfile(false);
      window.location.reload();
    } catch (e) {
      console.error('profile update error:', e);
      toast.error(e?.response?.data?.message || 'Failed to update profile');
    }
  };

  // ===== Scrims: edit / delete / manage participants =====
  const openEditScrim = (s) => {
    setEditingScrim(s);
    const startISO = s?.timeSlot?.start || s?.date || '';
    const endISO = s?.timeSlot?.end || (startISO ? new Date(new Date(startISO).getTime() + 30 * 60000).toISOString() : '');

    setScrimForm({
      _id: s._id,
      title: s.title || '',
      platform: s.platform || '',
      game: s.game || '',
      entryFee: s.entryFee ?? 0,
      capacity: s.capacity ?? 0,
      date: startISO,
      timeSlot: { start: startISO, end: endISO },
    });
  };

  // AdminPanel.jsx (replace your handleUpdateScrim with this)
  /** Convert "YYYY-MM-DDTHH:mm" (from <input type="datetime-local">) to ISO */
  const toISO = (val) => (val ? new Date(val).toISOString() : undefined);

  const handleUpdateScrim = async (e) => {
    e.preventDefault();
    try {
      const startISO = scrimForm?.timeSlot?.start || scrimForm?.date;
      const endISO = scrimForm?.timeSlot?.end;

      // Validate
      if (!startISO || !endISO) {
        toast.error('Please set both Start and End.');
        return;
      }
      if (new Date(endISO) <= new Date(startISO)) {
        toast.error('End must be after Start.');
        return;
      }

      // Build payload
      const payload = {
        title: scrimForm.title,
        platform: scrimForm.platform,
        game: scrimForm.game,
        entryFee: Number(scrimForm.entryFee) || 0,
        capacity: Math.max(0, Number(scrimForm.capacity) || 0),
        date: startISO, // keep legacy in sync
        timeSlot: { start: startISO, end: endISO },
      };

      await adminAPI.updateScrim(editingScrim._id, payload);
      toast.success('Scrim updated');
      setEditingScrim(null);

      const res = await adminAPI.listScrims();
      setScrims(res?.data?.items || []);
    } catch (err) {
      console.error('update scrim error:', err);
      toast.error(err?.response?.data?.message || 'Failed to update scrim');
    }
  };



  const handleDeleteScrim = async (scrimId) => {
    if (!window.confirm('Delete this scrim?')) return;
    try {
      await adminAPI.deleteScrim(scrimId);
      toast.success('Scrim deleted');
      const res = await adminAPI.listScrims();
      setScrims(res?.data?.items || []);
    } catch (e) {
      console.error('delete scrim error:', e);
      toast.error(e?.response?.data?.message || 'Failed to delete scrim');
    }
  };

  const openManagePlayers = (s) => setManagePlayersFor(s);

  const handleAddPlayerToScrim = async () => {
  const id = managePlayersFor?._id;
  if (!id || !addPlayerInput.trim()) return;
  try {
    const payload = /\S+@\S+\.\S+/.test(addPlayerInput)
      ? { email: addPlayerInput.trim(), ...addPlayerMeta }
      : { userId: addPlayerInput.trim(), ...addPlayerMeta };

    await adminAPI.addPlayerToScrim(id, payload);
    toast.success('Player added');
    setAddPlayerInput('');
    setAddPlayerMeta({ ign: '', phone: '', teamName: '' });

    const res = await adminAPI.listScrims();
    setScrims(res?.data?.items || []);
    const fresh = (res?.data?.items || []).find(s => s._id === id);
    setManagePlayersFor(fresh || null);
  } catch (e) {
    console.error('add player error:', e);
    toast.error(e?.response?.data?.message || 'Failed to add player');
  }
};

const handleRemoveParticipant = async (participantId) => {
  const id = managePlayersFor?._id;
  if (!id || !participantId) return;
  try {
    await adminAPI.removePlayerFromScrim(id, participantId); // <-- path param, not body
    toast.success('Removed');
    const res = await adminAPI.listScrims();
    setScrims(res?.data?.items || []);
    const fresh = (res?.data?.items || []).find(s => s._id === id);
    setManagePlayersFor(fresh || null);
  } catch (e) {
    console.error('remove player error:', e);
    toast.error(e?.response?.data?.message || 'Failed to remove');
  }
};


  // ===== Ratings: inline edit / delete =====
  const beginEditRating = (r) => {
    setEditingRatingId(r._id);
    setRatingDraft({ rating: r.rating ?? 5, comment: r.comment || '' });
  };
  const cancelEditRating = () => { setEditingRatingId(null); setRatingDraft({ rating: 5, comment: '' }); };
  const saveRating = async (rId) => {
    try {
      await adminAPI.updateRating(rId, ratingDraft);
      toast.success('Rating updated');
      setEditingRatingId(null);
      const res = await adminAPI.listRatings();
      setRatings(res?.data?.items || []);
    } catch (e) {
      console.error('update rating error:', e);
      toast.error(e?.response?.data?.message || 'Failed to update rating');
    }
  };
  const deleteRating = async (rId) => {
    if (!window.confirm('Delete this rating?')) return;
    try {
      await adminAPI.deleteRating(rId);
      toast.success('Rating deleted');
      const res = await adminAPI.listRatings();
      setRatings(res?.data?.items || []);
    } catch (e) {
      console.error('delete rating error:', e);
      toast.error(e?.response?.data?.message || 'Failed to delete rating');
    }
  };

  // ===== Promotions: prefill from tournament =====
  const promoteTournament = (t) => {
    setPromoMode('create');
    setEditingPromo(null);
    setUseUrlInput(false);
    setPromoForm({
      title: `Promo: ${t.title}`,
      description: t.description?.slice(0, 140) || '',
      imageUrl: t.bannerUrl || '',
      organizationId: t.organizationId?._id || t.organizationId || '',
      scrimId: '',
      tournamentId: t._id,
      type: 'tournament',
      priority: 1,
      endDate: '',
      ctaText: 'View Tournament',
      ctaUrl: `/tournaments/${t._id}`,
      utmSource: 'admin',
      utmCampaign: 'tournament-promo',
    });
    setShowPromoModal(true);
  };

  const handlePickPromoImage = () => promoFileRef.current?.click();

  const handlePromoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadAPI.uploadImage(file);
      const url = res?.data?.imageUrl || res?.data?.avatarUrl;
      if (!url) throw new Error('No imageUrl returned');
      setPromoForm((f) => ({ ...f, imageUrl: url }));
      toast.success('Promo image uploaded');
    } catch (err) {
      console.error('promo image upload error:', err);
      toast.error(err?.response?.data?.message || 'Failed to upload image');
    } finally {
      if (promoFileRef.current) promoFileRef.current.value = '';
    }
  };

  // CREATE
  // CREATE
  const handleCreatePromotion = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...promoForm,
        endDate: toISOFromLocal(promoForm.endDate),    // ← normalize
      };
      if (!payload.tournamentId) delete payload.tournamentId;
      if (!payload.scrimId) delete payload.scrimId;

      await adminAPI.createPromotion(payload);
      toast.success('Promotion created');
      setShowPromoModal(false);
      setPromoForm({
        title: '', description: '', imageUrl: '',
        organizationId: '', scrimId: '', tournamentId: '',
        type: 'scrim', priority: 1, endDate: '',
        ctaText: '', ctaUrl: '', utmSource: '', utmCampaign: '',
      });
      fetchPromotions();
    } catch (e) {
      console.error('create promo error:', e);
      toast.error(e?.response?.data?.message || 'Failed to create promotion');
    }
  };

  // UPDATE
  const handleUpdatePromotion = async (e) => {
    e.preventDefault();
    if (!editingPromo?._id) return;

    try {
      const payload = {
        ...promoForm,
        endDate: toISOFromLocal(promoForm.endDate),     // ← normalize
      };
      if (payload.type === 'tournament') delete payload.scrimId;
      if (payload.type === 'scrim') delete payload.tournamentId;
      if (!payload.tournamentId) delete payload.tournamentId;
      if (!payload.scrimId) delete payload.scrimId;

      await adminAPI.updatePromotion(editingPromo._id, payload);
      toast.success('Promotion updated');
      setShowPromoModal(false);
      setEditingPromo(null);
      await fetchPromotions();
    } catch (e) {
      console.error('update promo error:', e);
      toast.error(e?.response?.data?.message || 'Failed to update promotion');
    }
  };



  const handleDeletePromotion = async (promoId) => {
    if (!window.confirm('Delete this promotion?')) return;
    try {
      await adminAPI.deletePromotion(promoId);
      toast.success('Promotion deleted');
      fetchPromotions();
    } catch (e) {
      console.error('delete promo error:', e);
      toast.error(e?.response?.data?.message || 'Failed to delete promotion');
    }
  };

  // ===== UI =====
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <Shield className="h-8 w-8 text-red-500 mr-3" />
            <h1 className="text-3xl font-bold">Admin Panel</h1>
          </div>
          <p className="text-gray-400">Platform administration and management</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 sticky top-0 z-10 bg-gray-900/70 backdrop-blur border-b border-gray-800">
          <nav className="-mb-px flex flex-wrap gap-4">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
              { id: 'profile', label: 'My Profile', icon: User },
              { id: 'users', label: 'Users', icon: UsersIcon },
              { id: 'promotions', label: 'Promotions', icon: Star },
              { id: 'scrims', label: 'Scrims', icon: Calendar },
              { id: 'tournaments', label: 'Tournaments', icon: Trophy },
              { id: 'bookings', label: 'Bookings', icon: Calendar },
              { id: 'payments', label: 'Payments', icon: CircleDollarSign },
              { id: 'ratings', label: 'Ratings', icon: Star },
              { id: 'kyc', label: 'KYC', icon: Shield },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`py-2 px-3 border-b-2 font-medium text-sm rounded-t flex items-center transition ${activeTab === id
                  ? 'border-gaming-purple text-gaming-purple bg-white/5'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                aria-current={activeTab === id ? 'page' : undefined}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
              <div className="card text-center hover:shadow-lg transition">
                <UsersIcon className="h-8 w-8 text-gaming-purple mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <div className="text-sm text-gray-400">Players</div>
              </div>
              <div className="card text-center hover:shadow-lg transition">
                <Shield className="h-8 w-8 text-gaming-cyan mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.totalOrgs}</div>
                <div className="text-sm text-gray-400">Organizations</div>
              </div>
              <div className="card text-center hover:shadow-lg transition">
                <Calendar className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.totalScrims}</div>
                <div className="text-sm text-gray-400">Total Scrims</div>
              </div>
              <div className="card text-center hover:shadow-lg transition">
                <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.totalBookings}</div>
                <div className="text-sm text-gray-400">Bookings</div>
              </div>
              <div className="card text-center hover:shadow-lg transition">
                <div className="h-8 w-8 bg-green-600 rounded-full mx-auto mb-2 grid place-items-center text-white font-bold text-sm">₹</div>
                <div className="text-2xl font-bold">₹{stats.revenue}</div>
                <div className="text-sm text-gray-400">Revenue</div>
              </div>
              <div className="card text-center hover:shadow-lg transition">
                <Star className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.activePromotions}</div>
                <div className="text-sm text-gray-400">Active Promos</div>
              </div>
            </div>

            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <button onClick={() => setActiveTab('users')} className="btn-secondary text-left p-4 hover:shadow">
                  <UsersIcon className="h-5 w-5 mb-2" />
                  <div className="font-medium">Manage Users</div>
                  <div className="text-sm text-gray-400">View and moderate users</div>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('promotions');
                    setShowPromoModal(true);
                    setPromoMode('create');
                    setEditingPromo(null);
                  }}
                  className="btn-secondary text-left p-4 hover:shadow"
                >
                  <Star className="h-5 w-5 mb-2" />
                  <div className="font-medium">Create Promotion</div>
                  <div className="text-sm text-gray-400">Promote scrims and tournaments</div>
                </button>
                <div className="btn-secondary text-left p-4 opacity-60 cursor-not-allowed">
                  <TrendingUp className="h-5 w-5 mb-2" />
                  <div className="font-medium">Analytics</div>
                  <div className="text-sm text-gray-400">Coming soon</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* My Profile */}
        {activeTab === 'profile' && (
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">My Profile</h2>
              {!isEditingProfile && (
                <button onClick={() => setIsEditingProfile(true)} className="btn-primary">
                  <Edit className="h-4 w-4 mr-2" /> Edit Profile
                </button>
              )}
            </div>

            <div className="flex items-center gap-6 mb-6">
              <div className="relative">
                {profileData.avatar ? (
                  <img src={NormalizeImageUrl(profileData.avatar)} alt="Profile" className="w-24 h-24 rounded-full object-cover ring-2 ring-white/10" />
                ) : (
                  <div className="w-24 h-24 bg-gray-700 rounded-full grid place-items-center ring-2 ring-white/10">
                    <User className="text-white/70" />
                  </div>
                )}
                {isEditingProfile && (
                  <button
                    onClick={handleProfileImagePick}
                    className="absolute bottom-0 right-0 bg-gaming-purple text-white p-2 rounded-full shadow"
                    aria-label="Change avatar"
                  >
                    <Edit className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div>
                <div className="text-xl font-semibold">{me.name}</div>
                <div className="text-gray-400">{me.email}</div>
                <span className="inline-block mt-1 px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400">
                  admin
                </span>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
            />

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Name</label>
                {isEditingProfile ? (
                  <input
                    className="input w-full"
                    value={profileData.name}
                    onChange={(e) => setProfileData((p) => ({ ...p, name: e.target.value }))}
                  />
                ) : (
                  <div className="text-white">{me.name}</div>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Organization</label>
                {isEditingProfile ? (
                  <input
                    className="input w-full"
                    value={profileData.organizationName}
                    onChange={(e) => setProfileData((p) => ({ ...p, organizationName: e.target.value }))}
                  />
                ) : (
                  <div className="text-white">
                    {me?.organizationInfo?.name || me?.organizationInfo?.orgName || '—'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Location</label>
                {isEditingProfile ? (
                  <input
                    className="input w-full"
                    value={profileData.location}
                    onChange={(e) => setProfileData((p) => ({ ...p, location: e.target.value }))}
                  />
                ) : (
                  <div className="text-white">{me?.organizationInfo?.location || '—'}</div>
                )}
              </div>
            </div>

            {isEditingProfile && (
              <div className="flex justify-end gap-3 mt-6">
                <button className="btn-secondary" onClick={() => setIsEditingProfile(false)}>
                  <X className="h-4 w-4 mr-2" /> Cancel
                </button>
                <button className="btn-primary" onClick={handleProfileUpdate} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" /> {loading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Users */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="card">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                  <select
                    value={userFilters.role}
                    onChange={(e) => setUserFilters({ ...userFilters, role: e.target.value })}
                    className="input w-full"
                  >
                    <option value="all">All Roles</option>
                    <option value="player">Players</option>
                    <option value="organization">Organizations</option>
                    <option value="admin">Admins</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
                  <input
                    type="text"
                    value={userFilters.search}
                    onChange={(e) => setUserFilters({ ...userFilters, search: e.target.value })}
                    className="input w-full"
                    placeholder="Search by name or email..."
                  />
                </div>
              </div>
            </div>

            {/* Users List */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Users Management</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4">User</th>
                      <th className="text-left py-3 px-4">Role</th>
                      <th className="text-left py-3 px-4">Joined</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id} className="border-b border-gray-700/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gaming-purple/20 text-gaming-purple rounded-full grid place-items-center ring-1 ring-gaming-purple/30">
                              <span className="text-sm font-bold">{u.name?.[0]?.toUpperCase() || 'U'}</span>
                            </div>
                            <div>
                              <div className="font-medium">{u.name}</div>
                              <div className="text-sm text-gray-400">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${u.role === 'admin'
                              ? 'bg-red-500/20 text-red-300'
                              : u.role === 'organization'
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-green-500/20 text-green-300'
                              }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditUser(u)}
                              className="btn-mini"
                              title="Edit user"
                            >
                              <Edit className="h-4 w-4" />
                            </button>

                            <select
                              value={u.role}
                              onChange={(e) => handleUpdateUserRole(u._id, e.target.value)}
                              className="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1"
                              disabled={u.role === 'admin'}
                            >
                              <option value="player">Player</option>
                              <option value="organization">Organization</option>
                              <option value="admin">Admin</option>
                            </select>

                            {u.role !== 'admin' && (
                              <button
                                onClick={() => handleDeleteUser(u._id)}
                                className="btn-mini danger"
                                title="Delete user"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}

                            {/* Quick org controls */}
                            {u.role === 'organization' && (
                              <>
                                <button
                                  className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                                  onClick={() => toggleVerifyOrg(u)}
                                  title="Toggle verification"
                                >
                                  {u.organizationInfo?.verified ? 'Unverify' : 'Verify'}
                                </button>
                                <input
                                  type="number"
                                  className="w-20 text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1"
                                  placeholder="rank"
                                  defaultValue={u.organizationInfo?.ranking ?? 1000}
                                  onBlur={(e) => updateOrgRanking(u, e.target.value)}
                                  title="Update ranking"
                                />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400">
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Promotions */}
        {activeTab === 'promotions' && (
          <div className="mx-auto w-full max-w-6xl px-3 md:px-4 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Promotions</h2>
              <button
                onClick={() => {
                  setPromoMode('create');
                  setEditingPromo(null);
                  setUseUrlInput(false);
                  setShowPromoModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-gaming-purple px-3 py-2 text-sm font-semibold text-white hover:bg-gaming-purple/90"
              >
                <Plus className="h-4 w-4" /> New Promotion
              </button>
            </div>

            {/* 2-column responsive layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left: Org → Tournaments (collapsible groups) */}
              <section className="lg:col-span-5 rounded-xl border border-white/10 bg-white/5 p-3 md:p-4 overflow-hidden">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Browse Tournaments</h3>
                  <span className="text-[11px] text-white/60">
                    {orgTournamentMap?.length || 0} orgs
                  </span>
                </div>

                <div className="space-y-3 max-h-[440px] overflow-y-auto overflow-x-hidden pr-1">
                  {(orgTournamentMap || []).map((group) => (
                    <details
                      key={group.orgId || group.name}
                      className="rounded-lg border border-white/10 bg-black/20"
                    >
                      <summary className="flex items-center justify-between cursor-pointer select-none px-3 py-2">
                        <div className="min-w-0 mr-2">
                          <div className="font-medium text-sm truncate">{group.name}</div>
                          {group.orgId && (
                            <Link
                              to={`/organizations/${group.orgId}`}
                              className="text-[11px] text-cyan-300 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View org
                            </Link>
                          )}
                        </div>
                        <span className="text-[11px] text-white/60">
                          {group.items?.length || 0}
                        </span>
                      </summary>

                      <div className="px-3 pb-3 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(group.items || []).map((t) => (
                          <div
                            key={t._id}
                            className="rounded-lg border border-white/10 bg-white/5 p-3 min-w-0"
                          >
                            <div className="text-sm font-medium truncate" title={t.title}>
                              {t.title}
                            </div>
                            <div className="text-[11px] text-white/60">
                              {t.startAt ? new Date(t.startAt).toLocaleString() : '—'}
                            </div>
                            <button
                              className="mt-2 w-full rounded-md border border-white/10 bg-white/10 px-2 py-1.5 text-xs hover:bg-white/15"
                              onClick={() => promoteTournament(t)}
                              title="Create promotion for this tournament"
                            >
                              Promote
                            </button>
                          </div>
                        ))}

                        {!group.items?.length && (
                          <div className="text-xs text-white/50">No tournaments</div>
                        )}
                      </div>
                    </details>
                  ))}

                  {!orgTournamentMap?.length && (
                    <div className="text-sm text-white/60">No tournaments found.</div>
                  )}
                </div>
              </section>

              {/* Right: Promotions list */}
              <section className="lg:col-span-7 rounded-xl border border-white/10 bg-white/5 p-3 md:p-4 overflow-hidden">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Existing Promotions</h3>
                  <span className="text-[11px] text-white/60">{promotions?.length || 0}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 min-w-0">
                  {(promotions || []).map((promo) => (
                    <div key={promo._id} className="rounded-lg border border-white/10 bg-black/20 p-3 min-w-0">
                      {promo.imageUrl && (
                        <img
                          src={NormalizeImageUrl(promo.imageUrl)}
                          alt={promo.title}
                          className="mb-2 h-24 w-full rounded-md object-cover"
                        />
                      )}

                      <div className="text-sm font-semibold truncate break-all" title={promo.title}>
                        {promo.title}
                      </div>
                      <p className="text-xs text-white/70 line-clamp-2 mt-0.5 break-words">
                        {promo.description}
                      </p>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-white/60">
                        <span>Priority: {promo.priority}</span>
                        <span>Clicks: {promo.clickCount || 0}</span>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setPromoMode('edit');
                            setEditingPromo(promo);
                            setUseUrlInput(false);
                            setPromoForm({
                              title: promo?.title || '',
                              description: promo?.description || '',
                              imageUrl: promo?.imageUrl || '',
                              organizationId: promo?.organizationId?._id || promo?.organizationId || '',
                              scrimId: promo?.scrimId?._id || promo?.scrimId || '',
                              tournamentId: promo?.tournamentId?._id || promo?.tournamentId || '',
                              type: promo?.type || 'scrim',
                              priority: Number(promo?.priority ?? 1),
                              endDate: promo?.endDate ? new Date(promo.endDate).toISOString().slice(0, 16) : '',

                              ctaText: promo?.ctaText || '',
                              ctaUrl: promo?.ctaUrl || '',
                              utmSource: promo?.utmSource || '',
                              utmCampaign: promo?.utmCampaign || '',
                            });
                            setShowPromoModal(true);
                          }}
                          className="rounded-md bg-blue-600 hover:bg-blue-700 px-2 py-1.5 text-xs font-medium text-white"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDeletePromotion(promo._id)}
                          className="rounded-md bg-red-600 hover:bg-red-700 px-2 py-1.5 text-xs font-medium text-white"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}

                  {!promotions?.length && (
                    <div className="col-span-full text-center py-10 text-sm text-white/60">
                      No promotions yet
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}



        {/* Scrims */}
        {activeTab === 'scrims' && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Scrims</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4">Title</th>
                    <th className="text-left py-3 px-4">Organizer</th>
                    <th className="text-left py-3 px-4">Created</th>
                    <th className="text-left py-3 px-4">Entry</th>
                    <th className="text-left py-3 px-4">Participants</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scrims.map((s) => (
                    <tr key={s._id} className="border-b border-gray-700/50">
                      <td className="py-3 px-4">{s.title}</td>
                      <td className="py-3 px-4">{s.createdBy?.name || '—'}</td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {new Date(s.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">₹{Number(s.entryFee || 0)}</td>
                      <td className="py-3 px-4">
                        {s.participants?.length || 0}/{s.capacity || 0}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button className="btn-mini" onClick={() => openEditScrim(s)} title="Edit scrim">
                            <Edit className="h-4 w-4" />
                           
                          </button>
                          <button className="btn-mini" onClick={() => openManagePlayers(s)} title="Manage participants">
                            <UsersIcon className="h-4 w-4" />
                          </button>
                          <button className="btn-mini danger" onClick={() => handleDeleteScrim(s._id)} title="Delete scrim">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!scrims.length && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        No scrims
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tournaments */}
        {activeTab === 'tournaments' && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Tournaments</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4">Title</th>
                    <th className="text-left py-3 px-4">Org</th>
                    <th className="text-left py-3 px-4">Start</th>
                    <th className="text-left py-3 px-4">Entry</th>
                    <th className="text-left py-3 px-4">Capacity</th>
                    <th className="text-left py-3 px-4">Quick</th>
                  </tr>
                </thead>
                <tbody>
                  {tournaments.map((t) => (
                    <tr key={t._id} className="border-b border-gray-700/50">
                      <td className="py-3 px-4">{t.title}</td>
                      <td className="py-3 px-4">{t.organizationId?.name || '—'}</td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {t.startAt ? new Date(t.startAt).toLocaleString() : '—'}
                      </td>
                      <td className="py-3 px-4">₹{Number(t.entryFee || t.price || 0)}</td>
                      <td className="py-3 px-4">{t.capacity || 0}</td>
                      <td className="py-3 px-4">
                        <button className="btn-mini" onClick={() => promoteTournament(t)} title="Promote this tournament">
                          <Star className="h-4 w-4" />
                        </button>
                        {t.organizationId?._id && (
                          <Link to={`/organizations/${t.organizationId._id}`} className="btn-mini ml-2" title="View org">
                            <Eye className="h-4 w-4" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!tournaments.length && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        No tournaments
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bookings */}
        {activeTab === 'bookings' && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Bookings</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4">User</th>
                    <th className="text-left py-3 px-4">Scrim</th>
                    <th className="text-left py-3 px-4">When</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b._id} className="border-b border-gray-700/50">
                      <td className="py-3 px-4">{b.userId?.name || '—'}</td>
                      <td className="py-3 px-4">{b.scrimId?.title || '—'}</td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {new Date(b.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {!bookings.length && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-400">
                        No bookings
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments */}
        {activeTab === 'payments' && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Payments</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4">User</th>
                    <th className="text-left py-3 px-4">Scrim</th>
                    <th className="text-left py-3 px-4">Amount</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">When</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p._id} className="border-b border-gray-700/50">
                      <td className="py-3 px-4">{p.userId?.name || '—'}</td>
                      <td className="py-3 px-4">{p.scrimId?.title || '—'}</td>
                      <td className="py-3 px-4">₹{Number(p.amount || 0)}</td>
                      <td className="py-3 px-4">{p.status}</td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {new Date(p.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {!payments.length && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        No payments
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Ratings */}
        {activeTab === 'ratings' && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Org Ratings</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4">Player</th>
                    <th className="text-left py-3 px-4">Organization</th>
                    <th className="text-left py-3 px-4">Scrim</th>
                    <th className="text-left py-3 px-4">Rating</th>
                    <th className="text-left py-3 px-4">Comment</th>
                    <th className="text-left py-3 px-4">When</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ratings.map((r) => (
                    <tr key={r._id} className="border-b border-gray-700/50">
                      <td className="py-3 px-4">{r.playerId?.name || '—'}</td>
                      <td className="py-3 px-4">{r.organizationId?.name || '—'}</td>
                      <td className="py-3 px-4">{r.scrimId?.title || '—'}</td>
                      <td className="py-3 px-4">
                        {editingRatingId === r._id ? (
                          <select
                            className="input w-24"
                            value={ratingDraft.rating}
                            onChange={(e) => setRatingDraft(d => ({ ...d, rating: Number(e.target.value) || 1 }))}
                          >
                            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        ) : (`${r.rating}/5`)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-300">
                        {editingRatingId === r._id ? (
                          <input
                            className="input w-full"
                            value={ratingDraft.comment}
                            onChange={(e) => setRatingDraft(d => ({ ...d, comment: e.target.value }))}
                          />
                        ) : (r.comment || '—')}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        {editingRatingId === r._id ? (
                          <div className="flex gap-2">
                            <button className="btn-mini" onClick={() => saveRating(r._id)} title="Save"><Save className="h-4 w-4" /></button>
                            <button className="btn-mini danger" onClick={cancelEditRating} title="Cancel"><X className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button className="btn-mini" onClick={() => beginEditRating(r)} title="Edit"><Edit className="h-4 w-4" /></button>
                            <button className="btn-mini danger" onClick={() => deleteRating(r._id)} title="Delete"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!ratings.length && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        No ratings
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* KYC */}
        {activeTab === 'kyc' && (
          <div className="space-y-4">
            <h2 className="text-xl py-5 font-semibold">Organization KYC</h2>
            <KycReviewPanel />
          </div>
        )}

        {/* Create/Edit Promotion Modal */}
        {showPromoModal && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-3 md:p-4">
            {/* Panel: flex column so we can pin header+footer and scroll the middle */}
            <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0f131a] shadow-xl flex max-h-[90vh] flex-col">
              {/* Header (fixed) */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <h3 className="text-lg font-semibold">
                  {promoMode === 'edit' ? 'Edit Promotion' : 'Create Promotion'}
                </h3>
                <button
                  onClick={() => setShowPromoModal(false)}
                  className="rounded-lg p-1.5 hover:bg-white/10"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {/* Body (scrolls) */}
              <form
                id="promoForm"
                onSubmit={promoMode === 'edit' ? handleUpdatePromotion : handleCreatePromotion}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
              >
                {/* Show ID only in edit mode */}
                {promoMode === 'edit' && editingPromo?._id && (
                  <div className="text-[11px] text-white/50 font-mono">ID: {editingPromo._id}</div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Title</label>
                  <input
                    className="input w-full"
                    value={promoForm.title}
                    onChange={(e) => setPromoForm({ ...promoForm, title: e.target.value })}
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Description</label>
                  <textarea
                    className="input w-full h-24"
                    value={promoForm.description}
                    onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
                  />
                </div>

                {/* Upload or URL */}
                <div className="space-y-2">
                  {!useUrlInput ? (
                    <>
                      <div className="flex items-center gap-3">
                        <input
                          ref={promoFileRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePromoFileChange}
                          className="hidden"
                        />
                        <button type="button" onClick={handlePickPromoImage} className="btn-secondary">
                          Upload from device
                        </button>
                        {promoForm.imageUrl && (
                          <span className="text-xs text-green-400 truncate">Image ready ✓</span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="text-xs text-gray-400 underline w-fit"
                        onClick={() => setUseUrlInput(true)}
                      >
                        or paste an Image URL instead
                      </button>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Image URL</label>
                        <input
                          className="input w-full"
                          type="url"
                          value={promoForm.imageUrl}
                          onChange={(e) => setPromoForm({ ...promoForm, imageUrl: e.target.value })}
                        />
                      </div>
                      <button
                        type="button"
                        className="text-xs text-gray-400 underline w-fit"
                        onClick={() => setUseUrlInput(false)}
                      >
                        use device upload instead
                      </button>
                    </>
                  )}

                  {promoForm.imageUrl && (
                    <img
                      alt="promo preview"
                      src={NormalizeImageUrl(promoForm.imageUrl)}
                      className="w-full h-28 object-cover rounded border border-gray-700"
                    />
                  )}
                </div>

                {/* Type / Priority */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Type</label>
                    <select
                      className="input w-full"
                      value={promoForm.type}
                      onChange={(e) => {
                        const type = e.target.value;
                        setPromoForm((f) => ({
                          ...f,
                          type,
                          scrimId: type === 'tournament' ? '' : f.scrimId,
                          tournamentId: type === 'scrim' ? '' : f.tournamentId,
                        }));
                      }}
                    >
                      <option value="scrim">Scrim</option>
                      <option value="tournament">Tournament</option>
                      <option value="announcement">Announcement</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Priority</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="input w-full"
                      value={promoForm.priority}
                      onChange={(e) => setPromoForm({ ...promoForm, priority: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                {/* Org / End Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Organization ID</label>
                    <input
                      className="input w-full"
                      value={promoForm.organizationId}
                      onChange={(e) => setPromoForm({ ...promoForm, organizationId: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">End Date (Optional)</label>
                    <input
                      type="datetime-local"
                      className="input w-full"
                      value={promoForm.endDate}
                      onChange={(e) => setPromoForm({ ...promoForm, endDate: e.target.value })}
                      min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
                        .toISOString()
                        .slice(0, 16)}
                      placeholder="YYYY-MM-DDTHH:mm"
                      title="Use the date/time picker; value is saved in UTC"
                    />
                    <p className="mt-1 text-[11px] text-white/50">
                      Tip: Browser shows local time. We store it in UTC automatically.
                    </p>
                  </div>
                </div>

                {/* IDs depending on type */}
                {promoForm.type === 'scrim' && (
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Scrim ID (optional)</label>
                    <input
                      className="input w-full"
                      value={promoForm.scrimId}
                      onChange={(e) => setPromoForm({ ...promoForm, scrimId: e.target.value })}
                      placeholder="Scrim MongoDB ID"
                    />
                  </div>
                )}
                {promoForm.type === 'tournament' && (
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Tournament ID (optional)</label>
                    <input
                      className="input w-full"
                      value={promoForm.tournamentId}
                      onChange={(e) => setPromoForm({ ...promoForm, tournamentId: e.target.value })}
                      placeholder="Tournament MongoDB ID"
                    />
                  </div>
                )}

                {/* Extra fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">CTA Text</label>
                    <input
                      className="input w-full"
                      value={promoForm.ctaText || ''}
                      onChange={(e) => setPromoForm({ ...promoForm, ctaText: e.target.value })}
                      placeholder="e.g., View Tournament"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">CTA URL</label>
                    <input
                      className="input w-full"
                      type="url"
                      value={promoForm.ctaUrl || ''}
                      onChange={(e) => setPromoForm({ ...promoForm, ctaUrl: e.target.value })}
                      placeholder="https://... or /tournaments/123"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">UTM Source</label>
                    <input
                      className="input w-full"
                      value={promoForm.utmSource || ''}
                      onChange={(e) => setPromoForm({ ...promoForm, utmSource: e.target.value })}
                      placeholder="admin"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">UTM Campaign</label>
                    <input
                      className="input w-full"
                      value={promoForm.utmCampaign || ''}
                      onChange={(e) => setPromoForm({ ...promoForm, utmCampaign: e.target.value })}
                      placeholder="tournament-promo"
                    />
                  </div>
                </div>
              </form>

              {/* Footer (fixed) */}
              <div className="flex gap-3 px-4 py-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowPromoModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                {/* Submit the form above without nesting the button inside it */}
                <button type="submit" form="promoForm" className="btn-primary flex-1">
                  {promoMode === 'edit' ? 'Update Promotion' : 'Create Promotion'}
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/50 grid place-items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-lg w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Edit User</h3>
                <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-white">
                  ×
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Name</label>
                  <input
                    className="input w-full"
                    value={editUserForm.name}
                    onChange={(e) => setEditUserForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">Avatar URL</label>
                  <input
                    className="input w-full"
                    value={editUserForm.avatarUrl}
                    onChange={(e) => setEditUserForm((f) => ({ ...f, avatarUrl: e.target.value }))}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Org Name</label>
                    <input
                      className="input w-full"
                      value={editUserForm.organizationInfo?.orgName || editUserForm.organizationInfo?.name || ''}
                      onChange={(e) =>
                        setEditUserForm((f) => ({
                          ...f,
                          organizationInfo: {
                            ...f.organizationInfo,
                            orgName: e.target.value,
                            name: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Location</label>
                    <input
                      className="input w-full"
                      value={editUserForm.organizationInfo?.location || ''}
                      onChange={(e) =>
                        setEditUserForm((f) => ({
                          ...f,
                          organizationInfo: { ...f.organizationInfo, location: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Verified</label>
                    <select
                      className="input w-full"
                      value={editUserForm.organizationInfo?.verified ? 'true' : 'false'}
                      onChange={(e) =>
                        setEditUserForm((f) => ({
                          ...f,
                          organizationInfo: {
                            ...f.organizationInfo,
                            verified: e.target.value === 'true',
                          },
                        }))
                      }
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Ranking</label>
                    <input
                      type="number"
                      className="input w-full"
                      value={editUserForm.organizationInfo?.ranking ?? 1000}
                      onChange={(e) =>
                        setEditUserForm((f) => ({
                          ...f,
                          organizationInfo: {
                            ...f.organizationInfo,
                            ranking: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary flex-1">
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Scrim Modal */}
        {editingScrim && (
          <div className="fixed inset-0 bg-black/60 grid place-items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg w-full max-w-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Edit Scrim</h3>
                <button onClick={() => setEditingScrim(null)} className="text-gray-400 hover:text-white">×</button>
              </div>

              <form onSubmit={handleUpdateScrim} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Title</label>
                  <input
                    className="input w-full"
                    value={scrimForm.title || ''}
                    onChange={(e) => setScrimForm(f => ({ ...f, title: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Entry Fee</label>
                    <input
                      type="number"
                      className="input w-full"
                      value={scrimForm.entryFee ?? 0}
                      onChange={(e) => setScrimForm(f => ({ ...f, entryFee: Number(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Capacity</label>
                    <input
                      type="number"
                      className="input w-full"
                      value={scrimForm.capacity ?? 0}
                      onChange={(e) => setScrimForm(f => ({ ...f, capacity: Math.max(0, Number(e.target.value) || 0) }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Game</label>
                    <input
                      className="input w-full"
                      value={scrimForm.game || ''}
                      onChange={(e) => setScrimForm(f => ({ ...f, game: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Platform</label>
                    <input
                      className="input w-full"
                      value={scrimForm.platform || ''}
                      onChange={(e) => setScrimForm(f => ({ ...f, platform: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Start / End pickers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Start</label>
                    <input
                      type="datetime-local"
                      className="input w-full"
                      value={toLocalDT(scrimForm.timeSlot?.start || scrimForm.date) || ''}
                      min={toLocalDT(new Date())}
                      /* Start change */
                      onChange={(e) => {
                        const startLocal = e.target.value;
                        const startISO = localToISO(startLocal);

                        setScrimForm((f) => {
                          const prevEndISO = f.timeSlot?.end;
                          let endISO = prevEndISO;

                          // if missing OR end <= start, set +30m
                          if (!endISO || new Date(endISO) <= new Date(startISO)) {
                            endISO = new Date(new Date(startISO).getTime() + 30 * 60000).toISOString();
                          }

                          return {
                            ...f,
                            date: startISO,                // keep legacy date in sync
                            timeSlot: {
                              ...(f.timeSlot || {}),
                              start: startISO,
                              end: endISO,
                            },
                          };
                        });
                      }}

                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-2">End</label>
                    <input
                      type="datetime-local"
                      className="input w-full"
                      value={toLocalDT(scrimForm.timeSlot?.end) || ''}
                      min={toLocalDT(scrimForm.timeSlot?.start || scrimForm.date)}
                      /* End change */
                      onChange={(e) => {
                        const endLocal = e.target.value;
                        const endISO = localToISO(endLocal);

                        setScrimForm((f) => {
                          const startISO = f.timeSlot?.start || f.date;
                          if (startISO && new Date(endISO) <= new Date(startISO)) {
                            // bump to start + 5m if user picked an invalid end
                            const fixed = new Date(new Date(startISO).getTime() + 5 * 60000).toISOString();
                            return { ...f, timeSlot: { ...(f.timeSlot || {}), end: fixed } };
                          }
                          return { ...f, timeSlot: { ...(f.timeSlot || {}), end: endISO } };
                        });
                      }}

                    />
                  </div>
                </div>

                {/* Quick duration chips */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Duration:</span>
                  {[30, 60, 90].map((mins) => (
                    <button
                      type="button"
                      key={mins}
                      className="text-xs rounded px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10"
                      onClick={() =>
                        setScrimForm((f) => {
                          const startISO = f.timeSlot?.start || f.date;
                          if (!startISO) return f;
                          const start = new Date(startISO);
                          const end = new Date(start.getTime() + mins * 60000);
                          return {
                            ...f,
                            timeSlot: { ...(f.timeSlot || {}), start: start.toISOString(), end: end.toISOString() },
                          };
                        })
                      }
                    >
                      {mins}m
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditingScrim(null)} className="btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary flex-1">
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


        {/* Manage Participants Modal */}
        {managePlayersFor && (
          <div className="fixed inset-0 bg-black/60 grid place-items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-2xl w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Manage Players — {managePlayersFor.title}</h3>
                <button onClick={() => setManagePlayersFor(null)} className="text-gray-400 hover:text-white">×</button>
              </div>

              <div className="flex flex-col md:flex-row gap-2 mb-4">
  <input
    className="input flex-1"
    placeholder="player email or userId"
    value={addPlayerInput}
    onChange={(e) => setAddPlayerInput(e.target.value)}
  />
  <input
    className="input"
    placeholder="IGN"
    value={addPlayerMeta.ign}
    onChange={(e) => setAddPlayerMeta(m => ({ ...m, ign: e.target.value }))}
  />
  <input
    className="input"
    placeholder="Phone"
    value={addPlayerMeta.phone}
    onChange={(e) => setAddPlayerMeta(m => ({ ...m, phone: e.target.value }))}
  />
  <input
    className="input"
    placeholder="Team Name"
    value={addPlayerMeta.teamName}
    onChange={(e) => setAddPlayerMeta(m => ({ ...m, teamName: e.target.value }))}
  />
  <button onClick={handleAddPlayerToScrim} className="btn-primary">
    <Plus className="h-4 w-4 mr-1" /> Add
  </button>
</div>


              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 px-3">Player</th>
                      <th className="text-left py-2 px-3">Email</th>
                      <th className="text-left py-2 px-3">Joined</th>
                      <th className="text-left py-2 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(managePlayersFor.participants || []).map((p) => (
                      <tr key={p._id || p.userId} className="border-b border-gray-700/50">
                        <td className="py-2 px-3">{p.name || p.user?.name || '—'}</td>
                        <td className="py-2 px-3 text-gray-300">{p.email || p.user?.email || '—'}</td>
                        <td className="py-2 px-3 text-gray-400">
                          {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}
                        </td>
                        <td className="py-2 px-3">
                          <button className="btn-mini danger" onClick={() => handleRemoveParticipant(p._id || p.userId)} title="Remove">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!(managePlayersFor.participants || []).length && (
                      <tr><td colSpan={4} className="py-6 text-center text-gray-400">No participants yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminPanel;
