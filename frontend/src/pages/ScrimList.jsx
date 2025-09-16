import React, { useState, useEffect } from 'react';
import { Calendar, Gamepad2, Users, Trophy, Eye, Clock, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { scrimsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ScrimList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [scrims, setScrims] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters sent to backend
  const [filters, setFilters] = useState({
    q: '',          // NEW: universal search (org/scrim/game)
    game: '',
    platform: '',
    date: '',
    sort: 'rank',
    page: 1,
    entryFee: '',
  });

  // Client-only quick filters
  const [feeFilter, setFeeFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');

  const [totalPages, setTotalPages] = useState(1);

  // Past-scrims modal
  const [pastOpen, setPastOpen] = useState(false);
  const [pastOrg, setPastOrg] = useState(null);
  const [pastList, setPastList] = useState([]);

  useEffect(() => {
    fetchScrims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.game, filters.platform, filters.date, filters.sort, filters.entryFee, filters.q]);

  const fetchScrims = async () => {
    setLoading(true);
    try {
      const response = await scrimsAPI.getList(filters);
      const data = response?.data || {};
      setScrims(data.items || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch scrims:', error);
      setScrims([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  // ----- Date helpers (local) -----
  const toLocalKey = (d) => {
    const dt = new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const todayKey = toLocalKey(new Date());
  const getDateSrc = (s) => s?.timeSlot?.start ?? s?.date;

  const isToday = (s) => {
    const src = getDateSrc(s);
    if (!src) return false;
    return toLocalKey(src) === todayKey;
  };
  const isPast = (s) => {
    const src = getDateSrc(s);
    if (!src) return false;
    return toLocalKey(src) < todayKey;
  };

  // Other helpers
  const isPastScrimStrict = (scrim) => {
    const dt = scrim?.timeSlot?.start ? new Date(scrim.timeSlot.start) : new Date(scrim.date);
    return dt < new Date();
  };

  const formatDateTime = (scrim) => {
    const dt = scrim?.timeSlot?.start ? new Date(scrim.timeSlot.start) : new Date(scrim.date);
    try {
      return dt.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return new Date(dt).toLocaleString();
    }
  };

  const currentPlayers = (scrim) =>
    Array.isArray(scrim?.participants) ? scrim.participants.length : scrim.currentPlayers ?? 0;
  const maxPlayers = (scrim) => scrim?.capacity ?? scrim?.maxPlayers ?? 100;

  const handleBookSlot = (scrimId) => {
    navigate(`/scrims/${scrimId}`);
  };

  // ----- Apply client filters -----
  const q = (filters.q || '').trim().toLowerCase();

  const clientFiltered = scrims
    // UNIVERSAL SEARCH: org name, scrim title, game
    .filter((s) => {
      if (!q) return true;
      const title = (s.title || '').toLowerCase();
      const game = (s.game || '').toLowerCase();

      const orgObj = typeof s.createdBy === 'object' && s.createdBy ? s.createdBy : null;
      const orgName = (orgObj?.name || s.organizationName || '').toLowerCase();

      return (
        title.includes(q) ||
        game.includes(q) ||
        orgName.includes(q)
      );
    })
    // Fee quick filter
    .filter((s) => {
      if (feeFilter === 'all') return true;
      const fee = s.entryFee || 0;
      if (feeFilter === 'free') return fee === 0;
      if (feeFilter === '25') return fee === 25;
      if (feeFilter === '50') return fee === 50;
      if (feeFilter === '60+') return fee >= 60;
      return true;
    })
    // Date quick filter
    .filter((s) => {
      if (!selectedDate) return true;
      const src = getDateSrc(s);
      if (!src) return false;
      return toLocalKey(src) === selectedDate;
    });

  // Split for today's vs past (respecting current filters for game/platform/etc.)
  const todaysOnly = clientFiltered.filter(isToday);
  const groups = groupByOrg(todaysOnly);

  // For the past modal, derive per org from clientFiltered (not only from today's)
  const openPastForOrg = (group) => {
    const orgId = group.orgId;
    const items = clientFiltered.filter((s) => {
      const creatorId =
        (typeof s.createdBy === 'object' && s.createdBy?._id) ||
        s.createdBy ||
        s.organizationId ||
        s.orgId ||
        null;
      return String(creatorId || '') === String(orgId || '') && isPast(s);
    });

    setPastOrg({ id: group.orgId, name: group.orgName, avatar: group.orgAvatar });
    setPastList(items.sort((a, b) => (getDateSrc(b) > getDateSrc(a) ? 1 : -1)));
    setPastOpen(true);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Today’s Scrims</h1>
          <p className="text-gray-400">All organizations with scrims scheduled for today.</p>
        </div>

        {/* Filters sent to backend */}
        <div className="card mb-6">
          {/* NEW: Universal Search */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Search className="inline h-4 w-4 mr-1" />
              Search (Org / Scrim / Game)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="input w-full pl-9"
                placeholder="Type to search by org name, scrim title, or game…"
                value={filters.q}
                onChange={(e) => handleFilterChange('q', e.target.value)}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Gamepad2 className="inline h-4 w-4 mr-1" />
                Game (backend)
              </label>
              <input
                type="text"
                className="input w-full"
                placeholder="Filter by game on server…"
                value={filters.game}
                onChange={(e) => handleFilterChange('game', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Platform</label>
              <select
                className="input w-full"
                value={filters.platform}
                onChange={(e) => handleFilterChange('platform', e.target.value)}
              >
                <option value="">All Platforms</option>
                <option value="PC">PC</option>
                <option value="PlayStation">PlayStation</option>
                <option value="Xbox">Xbox</option>
                <option value="Mobile">Mobile</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Date (backend)
              </label>
              <input
                type="date"
                className="input w-full"
                value={filters.date}
                onChange={(e) => handleFilterChange('date', e.target.value)}
                min={today}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
              <select
                className="input w-full"
                value={filters.sort}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
              >
                <option value="rank">Rank Score</option>
                <option value="date">Date</option>
                <option value="popularity">Popularity</option>
                <option value="price">Entry Fee</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Entry Fee (backend)</label>
              <select
                className="input w-full"
                value={filters.entryFee}
                onChange={(e) => handleFilterChange('entryFee', e.target.value)}
              >
                <option value="">All Scrims</option>
                <option value="0">Free (₹0)</option>
                <option value="25">₹25 Entry</option>
                <option value="50">₹50 Entry</option>
                <option value="60+">₹60+ Premium</option>
              </select>
            </div>
          </div>

          {/* Client-only quick filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => setFeeFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                feeFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All Fees
            </button>
            <button
              onClick={() => setFeeFilter('free')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                feeFilter === 'free' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Free (₹0)
            </button>
            <button
              onClick={() => setFeeFilter('25')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                feeFilter === '25' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ₹25
            </button>
            <button
              onClick={() => setFeeFilter('50')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                feeFilter === '50' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ₹50
            </button>
            <button
              onClick={() => setFeeFilter('60+')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                feeFilter === '60+' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ₹60+
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Quick filter by date"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear Date
              </button>
            )}
          </div>
        </div>

        {/* Results grouped by organization — ONLY today's scrims; horizontal rows that scroll if > 5 */}
        {loading ? (
          <div className="grid md:grid-cols-1 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-6 bg-gray-700 rounded w-2/3 mb-4"></div>
                <div className="flex gap-4 overflow-hidden">
                  {[...Array(5)].map((__, j) => (
                    <div key={j} className="min-w-[260px] h-28 bg-gray-700 rounded"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : groups.length > 0 ? (
          <>
            <div className="space-y-6 mb-8">
              {groups.map((g) => {
                const shouldScroll = g.scrims.length > 5;
                // Count past scrims for this org (from clientFiltered pool)
                const pastCount = clientFiltered.reduce((acc, s) => {
                  const creatorId =
                    (typeof s.createdBy === 'object' && s.createdBy?._id) ||
                    s.createdBy ||
                    s.organizationId ||
                    s.orgId ||
                    null;
                  if (String(creatorId || '') === String(g.orgId || '') && isPast(s)) acc += 1;
                  return acc;
                }, 0);

                return (
                  <div key={g.orgId || g.orgName} className="card">
                    {/* Org header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gaming-purple rounded-full overflow-hidden flex items-center justify-center">
                          {g.orgAvatar ? (
                            <img src={g.orgAvatar} alt={g.orgName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg font-bold text-white">
                              {g.orgName?.charAt(0)?.toUpperCase() || 'O'}
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{g.orgName || 'Unknown Organization'}</h3>
                          <div className="flex items-center gap-3 text-sm">
                            {g.orgId && (
                              <Link
                                to={`/organizations/${g.orgId}`}
                                className="text-gaming-cyan hover:text-gaming-cyan/80 inline-flex items-center"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Org Profile
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gaming-purple leading-none">
                            {g.scrims.length}
                          </div>
                          <div className="text-sm text-gray-400">Today</div>
                        </div>

                        <button
                          onClick={() => openPastForOrg(g)}
                          className="btn-secondary text-sm inline-flex items-center"
                          title="View old scrims from this organization"
                          disabled={pastCount === 0}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Past Scrims {pastCount > 0 ? `(${pastCount})` : ''}
                        </button>
                      </div>
                    </div>

                    {/* Horizontal row (scrolls if > 5) */}
                    <div className={`${shouldScroll ? 'overflow-x-auto' : 'overflow-x-hidden'} -mx-2 px-2`}>
                      <div
                        className={`flex gap-4 ${shouldScroll ? 'snap-x snap-mandatory' : ''}`}
                        style={{ paddingBottom: '2px' }}
                      >
                        {g.scrims.map((scrim) => {
                          const pastStrict = isPastScrimStrict(scrim);
                          const playersNow = currentPlayers(scrim);
                          const playersMax = maxPlayers(scrim);

                          return (
                            <div
                              key={scrim._id}
                              className={`min-w-[260px] max-w-[300px] bg-gray-800/60 border border-gray-700 rounded-lg p-4 ${
                                shouldScroll ? 'snap-start' : ''
                              } ${pastStrict ? 'opacity-60' : ''}`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h4 className="text-base font-semibold line-clamp-2">{scrim.title}</h4>
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                                    (scrim.entryFee || 0) === 0
                                      ? 'bg-green-900/20 text-green-400'
                                      : 'bg-blue-900/20 text-blue-300'
                                  }`}
                                >
                                  {(scrim.entryFee || 0) === 0 ? 'Free' : `₹${scrim.entryFee}`}
                                </span>
                              </div>

                              <div className="space-y-1 text-sm text-gray-300 mb-3">
                                <div>
                                  <Calendar className="inline w-4 h-4 mr-1" />
                                  {formatDateTime(scrim)}
                                </div>
                                <div>
                                  <Users className="inline w-4 h-4 mr-1" />
                                  {playersNow}/{playersMax} players
                                </div>
                                <div>
                                  <Trophy className="inline w-4 h-4 mr-1" />
                                  {scrim.game}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Link
                                  to={`/scrims/${scrim._id}`}
                                  className="flex-1 bg-blue-600 text-white text-center py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                >
                                  Details
                                </Link>

                                {user && user.role === 'player' && !pastStrict && (
                                  <button
                                    onClick={() => handleBookSlot(scrim._id)}
                                    disabled={playersNow >= playersMax}
                                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed text-sm"
                                  >
                                    {playersNow >= playersMax ? 'Full' : 'Book'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center space-x-2">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handlePageChange(i + 1)}
                    className={`px-3 py-2 rounded ${
                      filters.page === i + 1
                        ? 'bg-gaming-purple text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Gamepad2 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-400 mb-2">No scrims match your search</h3>
            <p className="text-gray-500">Try a different term or clear some filters.</p>
          </div>
        )}
      </div>

      {/* Past scrims modal */}
      {pastOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-4xl border border-gray-700">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gaming-purple rounded-full overflow-hidden flex items-center justify-center">
                  {pastOrg?.avatar ? (
                    <img src={pastOrg.avatar} alt={pastOrg.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-white">
                      {pastOrg?.name?.charAt(0)?.toUpperCase() || 'O'}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{pastOrg?.name || 'Organization'}</h3>
                  <div className="text-xs text-gray-400">Old scrims</div>
                </div>
              </div>
              <button onClick={() => setPastOpen(false)} className="text-gray-400 hover:text-white text-xl">×</button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto">
              {pastList.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pastList.map((scrim) => (
                    <div key={scrim._id} className="bg-gray-800/60 border border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="text-base font-semibold line-clamp-2">{scrim.title}</h4>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                            (scrim.entryFee || 0) === 0
                              ? 'bg-green-900/20 text-green-400'
                              : 'bg-blue-900/20 text-blue-300'
                          }`}
                        >
                          {(scrim.entryFee || 0) === 0 ? 'Free' : `₹${scrim.entryFee}`}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm text-gray-300 mb-3">
                        <div>
                          <Calendar className="inline w-4 h-4 mr-1" />
                          {formatDateTime(scrim)}
                        </div>
                        <div>
                          <Users className="inline w-4 h-4 mr-1" />
                          {currentPlayers(scrim)}/{maxPlayers(scrim)} players
                        </div>
                        <div>
                          <Trophy className="inline w-4 h-4 mr-1" />
                          {scrim.game}
                        </div>
                      </div>

                      <Link
                        to={`/scrims/${scrim._id}`}
                        onClick={() => setPastOpen(false)}
                        className="block text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        View Details
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-10">No old scrims found for this organization.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** Group scrims by organization (createdBy) — for today's set only. */
function groupByOrg(list) {
  const map = new Map();
  for (const s of list) {
    const orgObj = typeof s.createdBy === 'object' && s.createdBy ? s.createdBy : null;

    const orgId = orgObj?._id || s.createdBy || s.organizationId || s.orgId || null;
    const orgName = orgObj?.name || s.organizationName || 'Unknown Organization';
    const orgAvatar = orgObj?.avatarUrl || orgObj?.profileImage || s.organizationAvatar || null;

    const key = String(orgId || orgName);
    if (!map.has(key)) {
      map.set(key, {
        orgId: orgId ? String(orgId) : null,
        orgName,
        orgAvatar,
        scrims: [],
      });
    }
    map.get(key).scrims.push(s);
  }
  return Array.from(map.values()).sort((a, b) => (a.orgName || '').localeCompare(b.orgName || ''));
}

export default ScrimList;
