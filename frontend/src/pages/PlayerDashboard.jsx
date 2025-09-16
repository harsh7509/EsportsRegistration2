import React, { useState, useEffect } from 'react';
import { Calendar, Users, Trophy, Save, Clock, X, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tournamentsAPI, authAPI, profileAPI } from '../services/api';
import ScrimCard from '../components/ScrimCard';
import RateOrgModal from '../components/RateOrgModal';
import toast from 'react-hot-toast';
import PlayerGroupRoomModal from '../components/PlayerGroupRoomModal';

const PlayerDashboard = () => {
  const { user } = useAuth();

  // SCRIMS
  const [upcomingScrims, setUpcomingScrims] = useState([]);
  const [completedScrims, setCompletedScrims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming'); // scrims tabs

  // TOURNAMENTS
  const [activeSection, setActiveSection] = useState('scrims'); // 'scrims' | 'tournaments'
  const [tTab, setTTab] = useState('upcoming'); // 'upcoming' | 'past'
  const [upcomingTournaments, setUpcomingTournaments] = useState([]);
  const [pastTournaments, setPastTournaments] = useState([]);
  const [groupFlags, setGroupFlags] = useState({}); // { [tournamentId]: boolean }
  const [registeredTournaments, setRegisteredTournaments] = useState([]);

  // Profile
  const [showProfile, setShowProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    avatarUrl: user?.avatarUrl || ''
  });

  // Rating modal
  const [rateOpen, setRateOpen] = useState(false);
  const [rateOrg, setRateOrg] = useState(null);
  const [rateScrimId, setRateScrimId] = useState(null);

  // Group room modal
  const [roomOpen, setRoomOpen] = useState(false);
  const [roomTournamentId, setRoomTournamentId] = useState(null);

  useEffect(() => {
    fetchPlayerScrims();
    fetchRegisteredTournaments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRegisteredTournaments = async () => {
    try {
      const res = await tournamentsAPI.list({ participantId: user?._id, limit: 100 });
      const data = res?.data;
      const items = Array.isArray(data) ? data : (data?.items || []);

      setRegisteredTournaments(items);

      const now = Date.now();
      const upcoming = [];
      const past = [];

      for (const t of items) {
        const start = t?.startAt ? new Date(t.startAt).getTime() : null;
        const end = t?.endAt ? new Date(t.endAt).getTime() : null;

        if (end && end < now) {
          past.push(t);
        } else if (start && start >= now) {
          upcoming.push(t);
        } else if (!start && end && end >= now) {
          upcoming.push(t);
        } else if (!start && !end) {
          upcoming.push(t); // unknown schedule → upcoming bucket
        } else {
          // ongoing
          upcoming.push(t);
        }
      }

      const toNum = (d) => (d ? +new Date(d) : Number.MAX_SAFE_INTEGER);
      upcoming.sort((a, b) => toNum(a?.startAt) - toNum(b?.startAt));
      past.sort((a, b) => (+new Date(b?.endAt || 0)) - (+new Date(a?.endAt || 0)));

      setUpcomingTournaments(upcoming);
      setPastTournaments(past);

      // compute "am I in a group?" flags to enable the room button
      const checks = await Promise.allSettled(
        items.map(t =>
          tournamentsAPI.myGroup(t._id).then(r => ({ id: t._id, inGroup: !!r?.data?.group }))
        )
      );
      const flags = {};
      for (const c of checks) {
        if (c.status === 'fulfilled') flags[c.value.id] = c.value.inGroup;
      }
      setGroupFlags(flags);
    } catch (e) {
      console.error('Failed to fetch tournaments:', e);
      setRegisteredTournaments([]);
      setUpcomingTournaments([]);
      setPastTournaments([]);
      setGroupFlags({});
    }
  };

  const fetchPlayerScrims = async () => {
    try {
      setLoading(true);
      const res = await profileAPI.myBookings();
      const bookings = res?.data?.items || res?.data || [];

      const now = new Date();
      const upcoming = [];
      const completed = [];

      bookings.forEach((b) => {
        const scrim = b.scrim || b.scrimId || {};
        const dt = scrim?.timeSlot?.start
          ? new Date(scrim.timeSlot.start)
          : (scrim?.date ? new Date(scrim.date) : null);
        const normalized = { ...scrim, _booking: { id: b._id, paid: b.paid } };
        if (dt && dt >= now) upcoming.push(normalized);
        else completed.push(normalized);
      });

      setUpcomingScrims(upcoming);
      setCompletedScrims(completed);
    } catch (error) {
      console.error('Failed to fetch player scrims:', error);
      toast.error('Failed to load your bookings');
      setUpcomingScrims([]);
      setCompletedScrims([]);
    } finally {
      setLoading(false);
    }
  };

  const openNextUpcomingTournament = () => {
    const t = upcomingTournaments?.[0];
    if (!t) return toast('No upcoming tournaments');
    window.location.href = `/tournaments/${t._id}`;
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await authAPI.updateProfile(profileForm);
      toast.success('Profile updated successfully');
      setShowProfile(false);

      const response = await authAPI.getMe();
      localStorage.setItem('user', JSON.stringify(response.data.user));
      window.location.reload();
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    }
  };

  const openRate = (scrim) => {
    const org = scrim?.createdBy;
    if (!org) return toast.error('Organization not available for this scrim');
    setRateOrg(org);
    setRateScrimId(scrim?._id);
    setRateOpen(true);
  };

  const stats = {
    totalScrims: upcomingScrims.length + completedScrims.length,
    upcomingScrims: upcomingScrims.length,
    completedScrims: completedScrims.length,
    reputation: user?.reputation || 0
  };

  const renderScrimList = (list) => (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {list.map((scrim) => (
        <div key={scrim._id} className="space-y-3">
          <ScrimCard scrim={scrim} />
          <button className="btn-primary w-full" onClick={() => openRate(scrim)}>
            <Star className="h-4 w-4 inline mr-1" /> Rate Organization
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}!</h1>
          <p className="text-gray-400">Manage your scrims and track your progress</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card text-center">
            <Calendar className="h-8 w-8 text-gaming-purple mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.totalScrims}</div>
            <div className="text-sm text-gray-400">Total Scrims</div>
          </div>
          <div className="card text-center">
            <Clock className="h-8 w-8 text-gaming-cyan mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.upcomingScrims}</div>
            <div className="text-sm text-gray-400">Upcoming</div>
          </div>
          <div className="card text-center">
            <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.completedScrims}</div>
            <div className="text-sm text-gray-400">Completed</div>
          </div>
          <div className="card text-center">
            <Users className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.reputation}</div>
            <div className="text-sm text-gray-400">Reputation</div>
          </div>
        </div>

        {/* Quick scrim tabs & “View Next Tournament” */}
        <div className="mb-6">
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'upcoming'
                    ? 'border-gaming-purple text-gaming-purple'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Upcoming Scrims ({stats.upcomingScrims})
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'completed'
                    ? 'border-gaming-purple text-gaming-purple'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Completed ({stats.completedScrims})
              </button>
              <button
                className={`py-2 px-3 rounded border-b-2 font-medium text-sm ${
                  upcomingTournaments.length
                    ? 'border-gaming-purple text-gaming-purple'
                    : 'border-transparent text-gray-400'
                }`}
                onClick={openNextUpcomingTournament}
                disabled={!upcomingTournaments.length}
              >
                View Next Tournament
              </button>
            </nav>
          </div>
        </div>

        {/* SECTION SWITCHER */}
        <div className="mb-6">
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveSection('scrims')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeSection === 'scrims'
                    ? 'border-gaming-purple text-gaming-purple'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                My Scrims
              </button>
              <button
                onClick={() => setActiveSection('tournaments')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeSection === 'tournaments'
                    ? 'border-gaming-purple text-gaming-purple'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                My Tournaments
              </button>
            </nav>
          </div>
        </div>

        {/* MAIN CONTENT */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-32 bg-gray-700 rounded mb-4" />
                <div className="h-4 bg-gray-700 rounded mb-2" />
                <div className="h-3 bg-gray-700 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : activeSection === 'scrims' ? (
          activeTab === 'upcoming'
            ? (upcomingScrims.length ? renderScrimList(upcomingScrims) : (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-400 mb-2">
                    No upcoming scrims
                  </h3>
                  <p className="text-gray-500 mb-4">You haven't booked any upcoming scrims yet.</p>
                </div>
              ))
            : (completedScrims.length ? renderScrimList(completedScrims) : (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-400 mb-2">
                    No completed scrims
                  </h3>
                  <p className="text-gray-500 mb-4">You haven't completed any scrims yet.</p>
                </div>
              ))
        ) : (
          <>
            {/* Tournaments sub-tabs */}
            <div className="mb-4">
              <nav className="-mb-px flex space-x-8 border-b border-gray-700">
                <button
                  onClick={() => setTTab('upcoming')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    tTab === 'upcoming'
                      ? 'border-gaming-purple text-gaming-purple'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Upcoming ({upcomingTournaments.length})
                </button>
                <button
                  onClick={() => setTTab('past')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    tTab === 'past'
                      ? 'border-gaming-purple text-gaming-purple'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Past ({pastTournaments.length})
                </button>
              </nav>
            </div>

            {/* Tournaments list */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(tTab === 'upcoming' ? upcomingTournaments : pastTournaments).map((t) => {
                const inGroup = !!groupFlags[t._id];
                const isPast = tTab === 'past';
                return (
                  <div key={t._id} className={`card ${isPast ? 'opacity-70' : ''}`}>
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
                      {t.endAt && ` → ${new Date(t.endAt).toLocaleString()}`}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      <Link to={`/tournaments/${t._id}`} className="btn-secondary">View</Link>

                      {inGroup ? (
                        <button
                          className="btn-primary"
                          onClick={() => { setRoomTournamentId(t._id); setRoomOpen(true); }}
                        >
                          Open Group Room
                        </button>
                      ) : (
                        <button className="btn-secondary" disabled title="You’re not in a group yet">
                          Group not formed yet
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {(tTab === 'upcoming' ? upcomingTournaments : pastTournaments).length === 0 && (
                <div className="text-gray-400">
                  {tTab === 'upcoming' ? 'No upcoming tournaments' : 'No past tournaments'}
                </div>
              )}
            </div>
          </>
        )}

        {/* Profile Modal */}
        {showProfile && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Edit Profile</h3>
                <button onClick={() => setShowProfile(false)} className="text-gray-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
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
                  <label className="block text-sm font-medium text-gray-300 mb-2">Avatar URL</label>
                  <input
                    type="url"
                    value={profileForm.avatarUrl}
                    onChange={(e) => setProfileForm({ ...profileForm, avatarUrl: e.target.value })}
                    className="input w-full"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button type="button" onClick={() => setShowProfile(false)} className="flex-1 btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 btn-primary">
                    <Save className="h-4 w-4 mr-2" />
                    Update Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* SINGLE Group Room Modal (no duplicates) */}
      <PlayerGroupRoomModal
        open={roomOpen}
        onClose={() => setRoomOpen(false)}
        tournamentId={roomTournamentId}
      />

      {/* Rating modal */}
      <RateOrgModal
        open={rateOpen}
        onClose={() => setRateOpen(false)}
        org={rateOrg}
        scrimId={rateScrimId}
        onSubmitted={() => toast.success('Rating saved')}
      />
    </div>
  );
};

export default PlayerDashboard;
