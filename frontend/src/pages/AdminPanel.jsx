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
} from 'lucide-react';
import { adminAPI, authAPI, uploadAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { NormalizeImageUrl } from '../utils/img';
import { Link } from 'react-router-dom';
import { KycReviewPanel } from './AdminKycReview';

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
  const [showCreatePromo, setShowCreatePromo] = useState(false);
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
  });

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

  const handleUpdatePromotion = async (e) => {
    e.preventDefault();
    if (!editingPromo?._id) return;

    try {
      const payload = { ...promoForm };
      // normalize: only send relevant id based on type
      if (payload.type === 'tournament') {
        delete payload.scrimId;
      } else if (payload.type === 'scrim') {
        delete payload.tournamentId;
      }
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

  // ===== Promotions actions =====
  const handlePickPromoImage = () => promoFileRef.current?.click(); // <-- single, canonical version

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

  const handleCreatePromotion = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...promoForm };
      if (!payload.tournamentId) delete payload.tournamentId;
      if (!payload.scrimId) delete payload.scrimId;

      await adminAPI.createPromotion(payload);
      toast.success('Promotion created');
      setShowCreatePromo(false);
      setPromoForm({
        title: '',
        description: '',
        imageUrl: '',
        organizationId: '',
        scrimId: '',
        tournamentId: '',
        type: 'scrim',
        priority: 1,
        endDate: '',
      });
      fetchPromotions();
    } catch (e) {
      console.error('create promo error:', e);
      toast.error(e?.response?.data?.message || 'Failed to create promotion');
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

  // ===== Profile actions =====
  const handleProfileImagePick = () => fileInputRef.current?.click(); // <-- add back (was missing)

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

  // open modal for create
  const openCreatePromo = () => {
    setPromoMode('create');
    setEditingPromo(null);
    setPromoForm({
      title: '',
      description: '',
      imageUrl: '',
      organizationId: '',
      scrimId: '',
      tournamentId: '',
      type: 'scrim',
      priority: 1,
      endDate: '',
    });
    setUseUrlInput(false);
    setShowPromoModal(true);
  };

  // open modal for edit
  const openEditPromo = (promo) => {
    setPromoMode('edit');
    setEditingPromo(promo);
    setPromoForm({
      title: promo?.title || '',
      description: promo?.description || '',
      imageUrl: promo?.imageUrl || '',
      organizationId: promo?.organizationId?._id || promo?.organizationId || '',
      scrimId: promo?.scrimId?._id || promo?.scrimId || '',
      tournamentId: promo?.tournamentId?._id || promo?.tournamentId || '',
      type: promo?.type || 'scrim',
      priority: Number(promo?.priority ?? 1),
      endDate: promo?.endDate ? new Date(promo.endDate).toISOString().slice(0, 16) : '', // for datetime-local
    });
    setUseUrlInput(false);
    setShowPromoModal(true);
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
                    openCreatePromo();
                    setActiveTab('promotions');
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
                              className="text-blue-400 hover:text-blue-300 p-1"
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
                                className="text-red-400 hover:text-red-300 p-1"
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
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Promotions Management</h2>
              <button
                onClick={() => {
                  setUseUrlInput(false);
                  setShowCreatePromo(true);
                }}
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" /> Create Promotion
              </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {promotions.map((promo) => (
                <div key={promo._id} className="card hover:shadow-lg transition">
                  {promo.imageUrl && (
                    <img
                      src={NormalizeImageUrl(promo.imageUrl)}
                      alt={promo.title}
                      className="w-full h-32 object-cover rounded-lg mb-4 ring-1 ring-white/10"
                    />
                  )}
                  <h3 className="font-semibold mb-1">{promo.title}</h3>
                  <p className="text-sm text-gray-400 mb-3 line-clamp-3">{promo.description}</p>

                  <div className="text-xs text-gray-500 flex justify-between mb-3">
                    <span>Priority: {promo.priority}</span>
                    <span>Clicks: {promo.clickCount || 0}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditPromo(promo)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm"
                    >
                      <Edit className="h-3 w-3 mr-1 inline" /> Edit
                    </button>

                    <button
                      onClick={() => handleDeletePromotion(promo._id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded text-sm"
                    >
                      <Trash2 className="h-3 w-3 mr-1 inline" /> Delete
                    </button>
                  </div>

                </div>
              ))}
              {promotions.length === 0 && (
                <div className="text-gray-400 col-span-full text-center py-8">No promotions yet</div>
              )}
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
                    </tr>
                  ))}
                  {!scrims.length && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
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
                    </tr>
                  ))}
                  {!tournaments.length && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
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
                  </tr>
                </thead>
                <tbody>
                  {ratings.map((r) => (
                    <tr key={r._id} className="border-b border-gray-700/50">
                      <td className="py-3 px-4">{r.playerId?.name || '—'}</td>
                      <td className="py-3 px-4">{r.organizationId?.name || '—'}</td>
                      <td className="py-3 px-4">{r.scrimId?.title || '—'}</td>
                      <td className="py-3 px-4">{r.rating}/5</td>
                      <td className="py-3 px-4 text-sm text-gray-300">{r.comment || '—'}</td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {!ratings.length && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
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

        {/* Create Promotion Modal */}
        {showPromoModal && (
          <div className="fixed inset-0 bg-black/60 grid place-items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-2xl ring-1 ring-white/10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">
                  {promoMode === 'edit' ? 'Edit Promotion' : 'Create Promotion'}
                </h3>
                <button onClick={() => setShowPromoModal(false)} className="text-gray-400 hover:text-white" aria-label="Close">
                  ×
                </button>
              </div>

              {/* If editing, show ID at top (read-only) */}
              {promoMode === 'edit' && editingPromo?._id && (
                <div className="mb-4 text-xs text-gray-400">
                  <div className="font-mono">ID: {editingPromo._id}</div>
                </div>
              )}

              <form onSubmit={promoMode === 'edit' ? handleUpdatePromotion : handleCreatePromotion} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Title</label>
                  <input
                    className="input w-full"
                    value={promoForm.title}
                    onChange={(e) => setPromoForm({ ...promoForm, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">Description</label>
                  <textarea
                    className="input w-full h-20"
                    value={promoForm.description}
                    onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
                  />
                </div>

                {/* Upload or URL */}
                <div className="grid grid-cols-1 gap-3">
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
                      className="w-full h-32 object-cover rounded border border-gray-700"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                          // clear the other id when switching
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
                      onChange={(e) =>
                        setPromoForm({ ...promoForm, priority: parseInt(e.target.value) || 1 })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">Organization ID</label>
                  <input
                    className="input w-full"
                    value={promoForm.organizationId}
                    onChange={(e) => setPromoForm({ ...promoForm, organizationId: e.target.value })}
                    required
                  />
                </div>

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

                <div>
                  <label className="block text-sm text-gray-300 mb-2">End Date (Optional)</label>
                  <input
                    type="datetime-local"
                    className="input w-full"
                    value={promoForm.endDate}
                    onChange={(e) => setPromoForm({ ...promoForm, endDate: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPromoModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary flex-1">
                    {promoMode === 'edit' ? 'Update Promotion' : 'Create Promotion'}
                  </button>
                </div>
              </form>
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
      </div>
    </div>
  );
};

export default AdminPanel;
