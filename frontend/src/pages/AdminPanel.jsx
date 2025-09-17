import React, { useEffect, useRef, useState } from 'react';
import {
  Shield, Users as UsersIcon, Calendar, TrendingUp, Plus, Edit, Trash2, Star, User, Save, X
} from 'lucide-react';
import { adminAPI, authAPI, uploadAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const AdminPanel = () => {
  const { user: me } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrgs: 0,
    totalScrims: 0,
    totalBookings: 0,
    revenue: 0,
    activePromotions: 0,
    totalRatings: 0
  });

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
  const [showCreatePromo, setShowCreatePromo] = useState(false);
  const [useUrlInput, setUseUrlInput] = useState(false); // NEW: toggle between URL vs device upload
  const [promoForm, setPromoForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    organizationId: '',
    scrimId: '',
    type: 'scrim',
    priority: 1,
    endDate: ''
  });

  // My profile (admin)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: me?.name || '',
    avatar: me?.avatarUrl || '',
    organizationName: me?.organizationInfo?.name || me?.organizationInfo?.orgName || '',
    location: me?.organizationInfo?.location || ''
  });
  const fileInputRef = useRef(null);
  const handlePickPromoImage = () => promoFileRef.current?.click();

  // ===== Guards =====
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

  // ===== Fetchers =====
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

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'promotions') fetchPromotions();
  }, [activeTab, userFilters]);

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



  // load
  const [kycItems, setKycItems] = useState([]);
  useEffect(() => {
    adminAPI.listOrgKyc().then(res => setKycItems(res?.data?.items || []));
  }, []);

  // approve/reject
  const act = async (id, action, notes) => {
    await adminAPI.reviewOrgKyc(id, action, notes);
    toast.success(`KYC ${action}d`);
    const res = await adminAPI.listOrgKyc();
    setKycItems(res?.data?.items || []);
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
        // map to both UI & schema
        orgName: u.organizationInfo?.orgName || u.organizationInfo?.name || '',
        name: u.organizationInfo?.name || '',
        location: u.organizationInfo?.location || '',
        verified: u.organizationInfo?.verified || false,
        ranking: u.organizationInfo?.ranking ?? 1000,
        description: u.organizationInfo?.description || '',
        logo: u.organizationInfo?.logo || ''
      },
      playerInfo: u.playerInfo || {}
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

  // ===== Promotions actions =====
  const handleCreatePromotion = async (e) => {
    e.preventDefault();
    try {
      const { scrimId, ...rest } = promoForm;
      const payload = scrimId?.trim() ? { ...rest, scrimId: scrimId.trim() } : rest;

      await adminAPI.createPromotion(payload);
      toast.success('Promotion created');
      setShowCreatePromo(false);
      setPromoForm({
        title: '',
        description: '',
        imageUrl: '',
        organizationId: '',
        scrimId: '',
        type: 'scrim',
        priority: 1,
        endDate: ''
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

  // ===== My profile (admin) =====
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

  // upload file -> sets promoForm.imageUrl
  const handlePromoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadAPI.uploadImage(file); // field name 'image' (matches backend)
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

  const handleProfileUpdate = async () => {
    try {
      const payload = {
        name: profileData.name,
        avatarUrl: profileData.avatar,
        // store under organizationInfo.name/location if provided
        organizationInfo: {
          name: profileData.organizationName,
          orgName: profileData.organizationName, // in case backend maps this
          location: profileData.location
        }
      };
      await authAPI.updateProfile(payload);
      // refresh local cache
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

  // ===== UI =====
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Shield className="h-8 w-8 text-red-500 mr-3" />
            <h1 className="text-3xl font-bold">Admin Panel</h1>
          </div>
          <p className="text-gray-400">Platform administration and management</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
                { id: 'profile', label: 'My Profile', icon: User },
                { id: 'users', label: 'Users', icon: UsersIcon },
                { id: 'promotions', label: 'Promotions', icon: Star }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === id
                    ? 'border-gaming-purple text-gaming-purple'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
              <div className="card text-center">
                <UsersIcon className="h-8 w-8 text-gaming-purple mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <div className="text-sm text-gray-400">Players</div>
              </div>

              <div className="card text-center">
                <Shield className="h-8 w-8 text-gaming-cyan mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.totalOrgs}</div>
                <div className="text-sm text-gray-400">Organizations</div>
              </div>

              <div className="card text-center">
                <Calendar className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.totalScrims}</div>
                <div className="text-sm text-gray-400">Total Scrims</div>
              </div>

              <div className="card text-center">
                <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.totalBookings}</div>
                <div className="text-sm text-gray-400">Bookings</div>
              </div>

              <div className="card text-center">
                <div className="h-8 w-8 bg-green-600 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm">₹</div>
                <div className="text-2xl font-bold">₹{stats.revenue}</div>
                <div className="text-sm text-gray-400">Revenue</div>
              </div>

              <div className="card text-center">
                <Star className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.activePromotions}</div>
                <div className="text-sm text-gray-400">Active Promos</div>
              </div>
            </div>

            {/* (This modal will only render when you're on Dashboard and you set showCreatePromo=true from somewhere) */}
            {showCreatePromo && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Create Promotion</h3>
                    <button onClick={() => setShowCreatePromo(false)} className="text-gray-400 hover:text-white">×</button>
                  </div>

                  <form onSubmit={handleCreatePromotion} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                      <input
                        type="text"
                        value={promoForm.title}
                        onChange={(e) => setPromoForm({ ...promoForm, title: e.target.value })}
                        className="input w-full"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                      <textarea
                        value={promoForm.description}
                        onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
                        className="input w-full h-20 resize-none"
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
                              type="url"
                              value={promoForm.imageUrl}
                              onChange={(e) => setPromoForm({ ...promoForm, imageUrl: e.target.value })}
                              className="input w-full"
                              placeholder="https://example.com/banner.jpg"
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
                          src={promoForm.imageUrl}
                          className="w-full h-32 object-cover rounded border border-gray-700"
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                        <select
                          value={promoForm.type}
                          onChange={(e) => setPromoForm({ ...promoForm, type: e.target.value })}
                          className="input w-full"
                        >
                          <option value="scrim">Scrim</option>
                          <option value="tournament">Tournament</option>
                          <option value="announcement">Announcement</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={promoForm.priority}
                          onChange={(e) => setPromoForm({ ...promoForm, priority: parseInt(e.target.value) || 1 })}
                          className="input w-full"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Organization ID</label>
                      <input
                        type="text"
                        value={promoForm.organizationId}
                        onChange={(e) => setPromoForm({ ...promoForm, organizationId: e.target.value })}
                        className="input w-full"
                        placeholder="Organization MongoDB ID"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Scrim ID (optional)</label>
                      <input
                        type="text"
                        value={promoForm.scrimId}
                        onChange={(e) => setPromoForm({ ...promoForm, scrimId: e.target.value })}
                        className="input w-full"
                        placeholder="Scrim MongoDB ID"
                      />
                    </div>
                    {promoForm.type === 'tournament' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Tournament ID (optional)</label>
                        <input
                          type="text"
                          value={promoForm.tournamentId || ''}
                          onChange={(e) => setPromoForm({ ...promoForm, tournamentId: e.target.value })}
                          className="input w-full"
                          placeholder="Tournament MongoDB ID"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">End Date (Optional)</label>
                      <input
                        type="datetime-local"
                        value={promoForm.endDate}
                        onChange={(e) => setPromoForm({ ...promoForm, endDate: e.target.value })}
                        className="input w-full"
                      />
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button type="button" onClick={() => setShowCreatePromo(false)} className="flex-1 btn-secondary">
                        Cancel
                      </button>
                      <button type="submit" className="flex-1 btn-primary">
                        Create Promotion
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <button onClick={() => setActiveTab('users')} className="btn-secondary text-left p-4">
                  <UsersIcon className="h-5 w-5 mb-2" />
                  <div className="font-medium">Manage Users</div>
                  <div className="text-sm text-gray-400">View and moderate users</div>
                </button>
                <button onClick={() => setActiveTab('promotions')} className="btn-secondary text-left p-4">
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

            // render
            {kycItems.map(item => (
              <div key={item._id} className="card p-3 space-y-2">
                <div className="font-medium">{item.name} • {item.email}</div>
                <div>Legal: {item.orgKyc?.legalName}</div>
                <div>DOB: {item.orgKyc?.dob?.slice?.(0, 10)}</div>
                <div>Aadhaar: {String(item.orgKyc?.aadhaarNumber || '').replace(/.(?=.{4})/g, '•')}</div>
                <div className="flex gap-3">
                  <a href={item.orgKyc?.aadhaarImageUrl} target="_blank" rel="noreferrer">Aadhaar Image</a>
                  <a href={item.orgKyc?.selfieWithAadhaarUrl} target="_blank" rel="noreferrer">Selfie</a>
                </div>
                <div>Status: {item.orgKyc?.status}</div>
                <div className="flex gap-2">
                  <button className="btn-success" onClick={() => act(item._id, 'approve')}>Approve</button>
                  <button className="btn-danger" onClick={() => act(item._id, 'reject')}>Reject</button>
                </div>
              </div>
            ))}

            <div className="flex items-center gap-6 mb-6">
              <div className="relative">
                {profileData.avatar ? (
                  <img src={profileData.avatar} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
                ) : (
                  <div className="w-24 h-24 bg-gray-600 rounded-full grid place-items-center">
                    <User className="text-white/70" />
                  </div>
                )}
                {isEditingProfile && (
                  <button onClick={handleProfileImagePick} className="absolute bottom-0 right-0 bg-gaming-purple text-white p-2 rounded-full">
                    <Edit className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div>
                <div className="text-xl font-semibold">{me.name}</div>
                <div className="text-gray-400">{me.email}</div>
                <span className="inline-block mt-1 px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400">admin</span>
              </div>
            </div>

            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />

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
                  <div className="text-white">{me?.organizationInfo?.name || me?.organizationInfo?.orgName || '—'}</div>
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
                            <div className="w-8 h-8 bg-gaming-purple rounded-full grid place-items-center">
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
                              ? 'bg-red-500/20 text-red-400'
                              : u.role === 'organization'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-green-500/20 text-green-400'
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
                            <button onClick={() => openEditUser(u)} className="text-blue-400 hover:text-blue-300 p-1" title="Edit user">
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
                              <button onClick={() => handleDeleteUser(u._id)} className="text-red-400 hover:text-red-300 p-1">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-gray-400">
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
                  setUseUrlInput(false); // default to device upload
                  setShowCreatePromo(true);
                }}
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" /> Create Promotion
              </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {promotions.map((promo) => (
                <div key={promo._id} className="card">
                  {promo.imageUrl && (
                    <img src={promo.imageUrl} alt={promo.title} className="w-full h-32 object-cover rounded-lg mb-4" />
                  )}
                  <h3 className="font-semibold mb-1">{promo.title}</h3>
                  <p className="text-sm text-gray-400 mb-3">{promo.description}</p>

                  <div className="text-xs text-gray-500 flex justify-between mb-3">
                    <span>Priority: {promo.priority}</span>
                    <span>Clicks: {promo.clickCount || 0}</span>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => handleDeletePromotion(promo._id)} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded text-sm">
                      <Trash2 className="h-3 w-3 mr-1 inline" /> Delete
                    </button>
                  </div>
                </div>
              ))}
              {promotions.length === 0 && <div className="text-gray-400">No promotions yet</div>}
            </div>
          </div>
        )}

        {/* Create Promotion Modal (GLOBAL for Promotions tab) */}
        {showCreatePromo && (
          <div className="fixed inset-0 bg-black/50 grid place-items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Create Promotion</h3>
                <button onClick={() => setShowCreatePromo(false)} className="text-gray-400 hover:text-white">×</button>
              </div>
              <form onSubmit={handleCreatePromotion} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Title</label>
                  <input className="input w-full" value={promoForm.title} onChange={(e) => setPromoForm({ ...promoForm, title: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Description</label>
                  <textarea className="input w-full h-20" value={promoForm.description} onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })} />
                </div>

                {/* Upload or URL (same UX as dashboard modal) */}
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
                      src={promoForm.imageUrl}
                      className="w-full h-32 object-cover rounded border border-gray-700"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Type</label>
                    <select className="input w-full" value={promoForm.type} onChange={(e) => setPromoForm({ ...promoForm, type: e.target.value })}>
                      <option value="scrim">Scrim</option>
                      <option value="tournament">Tournament</option>
                      <option value="announcement">Announcement</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Priority</label>
                    <input type="number" min="1" max="10" className="input w-full" value={promoForm.priority} onChange={(e) => setPromoForm({ ...promoForm, priority: parseInt(e.target.value) || 1 })} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Organization ID</label>
                  <input className="input w-full" value={promoForm.organizationId} onChange={(e) => setPromoForm({ ...promoForm, organizationId: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">End Date (Optional)</label>
                  <input type="datetime-local" className="input w-full" value={promoForm.endDate} onChange={(e) => setPromoForm({ ...promoForm, endDate: e.target.value })} />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowCreatePromo(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" className="btn-primary flex-1">Create Promotion</button>
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
                <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-white">×</button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Name</label>
                  <input className="input w-full" value={editUserForm.name} onChange={(e) => setEditUserForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Avatar URL</label>
                  <input className="input w-full" value={editUserForm.avatarUrl} onChange={(e) => setEditUserForm((f) => ({ ...f, avatarUrl: e.target.value }))} />
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
                          organizationInfo: { ...f.organizationInfo, orgName: e.target.value, name: e.target.value }
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
                          organizationInfo: { ...f.organizationInfo, location: e.target.value }
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
                          organizationInfo: { ...f.organizationInfo, verified: e.target.value === 'true' }
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
                          organizationInfo: { ...f.organizationInfo, ranking: parseInt(e.target.value) || 0 }
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setEditingUser(null)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" className="btn-primary flex-1">Save</button>
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
