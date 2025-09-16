import React, { useState, useEffect, useRef } from 'react';
import { Plus, Calendar, Users, Trophy, Settings, User, X, Save, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { scrimsAPI, uploadAPI, tournamentsAPI } from '../services/api';
import ScrimCard from '../components/ScrimCard';
import CreateScrimModal from '../components/CreateScrimModal';
import { Link } from 'react-router-dom';

const OrgDashboard = () => {
  const { user, updateProfile } = useAuth();

  // ---- data ----
  const [scrims, setScrims] = useState([]);
  const [myTournaments, setMyTournaments] = useState([]);

  // ---- loading flags ----
  const [loadingScrims, setLoadingScrims] = useState(true);
  const [loadingTournaments, setLoadingTournaments] = useState(true);

  // ---- ui state ----
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'ongoing' | 'completed' | 'tournaments'

  // ---- profile form ----
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    avatarUrl: user?.avatarUrl || '',
    organizationInfo: {
      orgName: user?.organizationInfo?.orgName || '',
      location: user?.organizationInfo?.location || '',
    },
  });

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // ---- effects ----
 useEffect(() => {
  fetchMyTournaments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  useEffect(() => {
  if (!user?._id && !user?.id) return;
  fetchOrgScrims();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?._id, user?.id]);


  const fetchOrgScrims = async () => {
    try {
      setLoadingScrims(true);
      const response = await scrimsAPI.getList({ limit: 50 });
      const me = user?._id || user?.id;
      const items = response?.data?.items || [];

      // keep only scrims created by me (works for both populated and id form)
      const orgScrims = items.filter((s) => {
        const creator = s?.createdBy;
        const creatorId = typeof creator === 'string' ? creator : (creator?._id || creator?.id);
        return me ? creatorId === me : true; // if user not loaded yet, show all
      });

      setScrims(orgScrims);
    } catch (error) {
      console.error('Failed to fetch organization scrims:', error);
      setScrims([]);
    } finally {
      setLoadingScrims(false);
    }
  };

const fetchMyTournaments = async () => {
  try {
    setLoadingTournaments(true);

    // Get everything (active), then optionally filter on client
    const res = await tournamentsAPI.list({ limit: 200, active: 'true' });

    // Safety: your API returns { items, total, ... }
    const items = Array.isArray(res?.data) ? res.data : (res?.data?.items || []);

    // TEMP: show all
    setMyTournaments(items);

    // If you only want this org's tournaments, use this instead:
    const me = user?._id || user?.id;
    const mine = items.filter(t => {
      const owner =
        t.createdBy ||
        (typeof t.organizationId === 'string' ? t.organizationId : t.organizationId?._id);
      return me && String(owner) === String(me);
    });
    setMyTournaments(mine);
  } catch (e) {
    console.error('Failed to fetch tournaments:', e);
    setMyTournaments([]);
  } finally {
    setLoadingTournaments(false);
  }
};



  // ---- classification (status-first, date fallback) ----
  const byStatus = {
    upcoming: scrims.filter((s) => s.status === 'upcoming'),
    ongoing: scrims.filter((s) => s.status === 'ongoing'),
    completed: scrims.filter((s) => s.status === 'completed'),
  };

  const getStart = (s) =>
    s?.timeSlot?.start ? new Date(s.timeSlot.start) : (s?.date ? new Date(s.date) : null);
  const getEnd = (s) =>
    s?.timeSlot?.end ? new Date(s.timeSlot.end) : getStart(s);

  const now = new Date();
  const byDate = {
    upcoming: scrims.filter((s) => {
      const start = getStart(s);
      return start && start > now;
    }),
    ongoing: scrims.filter((s) => {
      const start = getStart(s), end = getEnd(s);
      return start && end && start <= now && now <= end;
    }),
    completed: scrims.filter((s) => {
      const end = getEnd(s);
      return end && end < now;
    }),
  };

  // prefer status buckets; if empty (no status set), fallback to date buckets
  const upcomingScrims = byStatus.upcoming.length ? byStatus.upcoming : byDate.upcoming;
  const ongoingScrims = byStatus.ongoing.length ? byStatus.ongoing : byDate.ongoing;
  const completedScrims = byStatus.completed.length ? byStatus.completed : byDate.completed;

  const stats = {
    totalScrims: scrims.length,
    upcomingScrims: upcomingScrims.length,
    ongoingScrims: ongoingScrims.length,
    totalParticipants: scrims.reduce(
      (acc, s) => acc + (Array.isArray(s.participants) ? s.participants.length : 0), 0
    ),
  };

  // ---- handlers ----
  const handleScrimCreated = () => {
    setShowCreateModal(false);
    fetchOrgScrims();
  };

  const onPickFile = () => fileInputRef.current?.click();

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadAPI.uploadImage(file);
      const imageUrl = res?.data?.imageUrl;
      if (imageUrl) {
        setProfileForm((prev) => ({ ...prev, avatarUrl: imageUrl }));
      } else {
        alert('Upload succeeded but server did not return imageUrl');
      }
    } catch (err) {
      console.error('Avatar upload failed:', err);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const payload = {
      name: profileForm.name,
      organizationInfo: {
        orgName: profileForm.organizationInfo.orgName,
        location: profileForm.organizationInfo.location,
      },
    };
    if (profileForm.avatarUrl) payload.avatarUrl = profileForm.avatarUrl;

    try {
      const result = await updateProfile(payload);
      if (result?.success) setShowProfile(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  // ---- helpers ----
  const tabClasses = (on) =>
    `py-2 px-1 border-b-2 font-medium text-sm ${on ? 'border-gaming-purple text-gaming-purple' : 'border-transparent text-gray-400 hover:text-gray-300'
    }`;

  // ---- skeleton ----
  const SkeletonGrid = () => (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="card animate-pulse">
          <div className="h-32 bg-gray-700 rounded mb-4" />
          <div className="h-4 bg-gray-700 rounded mb-2" />
          <div className="h-3 bg-gray-700 rounded w-2/3" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Organization Dashboard</h1>
            <p className="text-gray-400">Manage your scrims and tournaments</p>
          </div>
          <div className="flex space-x-3">
            <button onClick={() => setShowProfile(true)} className="btn-secondary">
              <User className="h-4 w-4 mr-2" />
              Edit Profile
            </button>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Create Scrim
            </button>
            <Link to="/tournaments/new" className="btn-secondary">
              <Trophy className="h-4 w-4 mr-2" />
              Create Tournament
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card text-center">
            <Calendar className="h-8 w-8 text-gaming-purple mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.totalScrims}</div>
            <div className="text-sm text-gray-400">Total Scrims</div>
          </div>
          <div className="card text-center">
            <Trophy className="h-8 w-8 text-gaming-cyan mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.upcomingScrims}</div>
            <div className="text-sm text-gray-400">Upcoming</div>
          </div>
          <div className="card text-center">
            <div className="h-8 w-8 bg-green-500 rounded-full mx-auto mb-2 flex items-center justify-center">
              <div className="h-3 w-3 bg-white rounded-full animate-pulse"></div>
            </div>
            <div className="text-2xl font-bold">{ongoingScrims.length}</div>
            <div className="text-sm text-gray-400">Ongoing</div>
          </div>
          <div className="card text-center">
            <Users className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.totalParticipants}</div>
            <div className="text-sm text-gray-400">Total Players</div>
          </div>
        </div>

        {/* Tabs row */}
        <div className="mb-6">
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex items-center gap-6">
              <button onClick={() => setActiveTab('upcoming')} className={tabClasses(activeTab === 'upcoming')}>
                Upcoming ({upcomingScrims.length})
              </button>
              <button onClick={() => setActiveTab('ongoing')} className={tabClasses(activeTab === 'ongoing')}>
                Ongoing ({ongoingScrims.length})
              </button>
              <button onClick={() => setActiveTab('completed')} className={tabClasses(activeTab === 'completed')}>
                Completed ({completedScrims.length})
              </button>

              <div className="flex-1" />

              <button onClick={() => setActiveTab('tournaments')} className={tabClasses(activeTab === 'tournaments')}>
                Tournaments ({myTournaments.length})
              </button>
              <Link to="/tournaments/new" className="btn-secondary ml-2">Create</Link>
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'tournaments' ? (
          loadingTournaments ? (
            <SkeletonGrid />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myTournaments.map((t) => (
                <div key={t._id} className="card">
                  {t.bannerUrl && (
                    <img
                      src={t.bannerUrl}
                      alt={t.title}
                      className="h-32 w-full object-cover rounded mb-3"
                    />
                  )}
                  <div className="font-semibold">{t.title}</div>
                  <div className="text-xs text-gray-400">
                    {t.startAt ? new Date(t.startAt).toLocaleString() : 'TBA'}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Link to={`/tournaments/${t._id}`} className="btn-secondary">View</Link>
                    <Link to={`/tournaments/${t._id}/manage`} className="btn-primary">Players / Groups</Link>
                  </div>
                </div>
              ))}
              {myTournaments.length === 0 && <div className="text-gray-400">No tournaments yet</div>}
            </div>
          )
        ) : (
          loadingScrims ? (
            <SkeletonGrid />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(activeTab === 'upcoming' ? upcomingScrims
                : activeTab === 'ongoing' ? ongoingScrims
                  : completedScrims
              ).map((scrim) => (
                <div key={scrim._id} className="relative">
                  <ScrimCard scrim={scrim} />
                  <div className="absolute top-2 right-2">
                    <Link
                      to={`/scrims/${scrim._id}`}
                      className="bg-gaming-purple/80 hover:bg-gaming-purple text-white p-2 rounded-full transition-colors"
                      title="Manage Scrim"
                    >
                      <Settings className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
              {((activeTab === 'upcoming' && upcomingScrims.length === 0) ||
                (activeTab === 'ongoing' && ongoingScrims.length === 0) ||
                (activeTab === 'completed' && completedScrims.length === 0)) && (
                  <div className="text-gray-400">No scrims in this view</div>
                )}
            </div>
          )
        )}

        {/* Create Scrim Modal */}
        <CreateScrimModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onScrimCreated={handleScrimCreated}
        />

        {/* Profile Modal */}
        {showProfile && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Edit Organization Profile</h3>
                <button onClick={() => setShowProfile(false)} className="text-gray-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="text-center">
                  <div className="relative inline-block">
                    {profileForm.avatarUrl ? (
                      <img src={profileForm.avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover" />
                    ) : (
                      <div className="w-20 h-20 bg-gaming-purple rounded-full flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">
                          {profileForm.name?.charAt(0)?.toUpperCase() || 'O'}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={onPickFile}
                      disabled={uploading}
                      className="absolute bottom-0 right-0 bg-gaming-purple hover:bg-gaming-purple/80 text-white p-1 rounded-full transition-colors"
                      title="Upload from device"
                    >
                      {uploading ? '…' : <ImageIcon className="h-4 w-4" />}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Organization Name</label>
                  <input
                    type="text"
                    value={profileForm.organizationInfo.orgName}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        organizationInfo: { ...profileForm.organizationInfo, orgName: e.target.value },
                      })
                    }
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
                  <input
                    type="text"
                    value={profileForm.organizationInfo.location}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        organizationInfo: { ...profileForm.organizationInfo, location: e.target.value },
                      })
                    }
                    className="input w-full"
                    placeholder="City, Country"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button type="button" onClick={() => setShowProfile(false)} className="flex-1 btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 btn-primary" disabled={uploading}>
                    <Save className="h-4 w-4 mr-2" />
                    Update Profile
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

export default OrgDashboard;
