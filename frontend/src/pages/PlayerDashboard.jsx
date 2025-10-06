import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Users,
  Trophy,
  Save,
  Clock,
  X,
  Star,
  User as UserIcon,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { tournamentsAPI, authAPI, profileAPI } from "../services/api";
import ScrimCard from "../components/ScrimCard";
import RateOrgModal from "../components/RateOrgModal";
import toast from "react-hot-toast";
import PlayerGroupRoomModal from "../components/PlayerGroupRoomModal";
import SEO from "../components/SEO"

const PlayerDashboard = () => {
  const { user } = useAuth();
  const meId = user?._id || user?.id || null;

  // SCRIMS
  const [upcomingScrims, setUpcomingScrims] = useState([]);
  const [ongoingScrims, setOngoingScrims] = useState([]);
  const [completedScrims, setCompletedScrims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming"); // 'upcoming' | 'ongoing' | 'completed'

  // TOURNAMENTS
  const [activeSection, setActiveSection] = useState("scrims"); // 'scrims' | 'tournaments'
  const [tTab, setTTab] = useState("upcoming"); // 'upcoming' | 'past'
  const [upcomingTournaments, setUpcomingTournaments] = useState([]);
  const [pastTournaments, setPastTournaments] = useState([]);
  const [groupFlags, setGroupFlags] = useState({}); // { [tournamentId]: boolean }

  // Profile
  const [showProfile, setShowProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    avatarUrl: user?.avatarUrl || "",
  });

  // Rating modal
  const [rateOpen, setRateOpen] = useState(false);
  const [rateOrg, setRateOrg] = useState(null);
  const [rateScrimId, setRateScrimId] = useState(null);

  // Group room modal
  const [roomOpen, setRoomOpen] = useState(false);
  const [roomTournamentId, setRoomTournamentId] = useState(null);

  useEffect(() => {
    if (!meId) return; // wait until user is known
    fetchPlayerScrims();
    fetchRegisteredTournaments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId]);

  const fmtDateTime = (d) => {
    if (!d) return "TBA";
    try {
      return new Date(d).toLocaleString();
    } catch {
      return "TBA";
    }
  };

  const initials = useMemo(() => {
    const n = (profileForm.name || user?.name || "").trim();
    if (!n) return "P";
    const parts = n.split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }, [profileForm.name, user?.name]);

  // --- helper to check if I'm actually registered in a tournament (fallback client-side) ---
  const isMe = (id) => id && meId && String(id) === String(meId);
  const iAmInParticipants = (t) => {
    const arrs = [
      t?.participants,
      t?.registrations,
      t?.teams,
      t?.players,
    ].filter(Boolean);

    for (const arr of arrs) {
      for (const p of arr) {
        const pid = p?.userId || p?._id || p?.id || p; // handle object or plain id
        if (isMe(pid)) return true;
        const members = p?.members || p?.teamMembers || [];
        for (const m of members) {
          const mid = m?.userId || m?._id || m?.id;
          if (isMe(mid)) return true;
        }
      }
    }
    return false;
  };

  const fetchRegisteredTournaments = async () => {
    try {
      // 1) Ask backend to filter by participant
      const res = await tournamentsAPI.list({
        participantId: meId,
        limit: 100,
      });

      const data = res?.data;
      let items = Array.isArray(data) ? data : data?.items || [];

      // 2) Fallback client-side filter if backend ignored the param
      items = items.filter(iAmInParticipants);

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
          // ongoing -> show in "upcoming" section on dashboard
          upcoming.push(t);
        }
      }

      const toNum = (d) => (d ? +new Date(d) : Number.MAX_SAFE_INTEGER);
      upcoming.sort((a, b) => toNum(a?.startAt) - toNum(b?.startAt));
      past.sort((a, b) => +new Date(b?.endAt || 0) - +new Date(a?.endAt || 0));

      setUpcomingTournaments(upcoming);
      setPastTournaments(past);

      // compute "am I in a group?" flags
      const checks = await Promise.allSettled(
        (items || []).map((t) =>
          tournamentsAPI
            .myGroup(t._id)
            .then((r) => ({ id: t._id, inGroup: !!r?.data?.group }))
        )
      );
      const flags = {};
      for (const c of checks) {
        if (c.status === "fulfilled") flags[c.value.id] = c.value.inGroup;
      }
      setGroupFlags(flags);
    } catch (e) {
      console.error("Failed to fetch tournaments:", e);
      setUpcomingTournaments([]);
      setPastTournaments([]);
      setGroupFlags({});
    }
  };

  // ---- scrims with ongoing bucket ----
  const classifyScrim = (scrim) => {
    const start = scrim?.timeSlot?.start
      ? new Date(scrim.timeSlot.start)
      : scrim?.date
      ? new Date(scrim.date)
      : null;

    let end = scrim?.timeSlot?.end
      ? new Date(scrim.timeSlot.end)
      : scrim?.timeSlot?.finish
      ? new Date(scrim.timeSlot.finish)
      : null;

    if (!end && start && !isNaN(start)) {
      end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // +2h fallback
    }

    const now = new Date();

    if (start && !isNaN(start)) {
      if (end && !isNaN(end)) {
        if (start <= now && now < end) return "ongoing";
        if (start > now) return "upcoming";
        return "completed";
      } else {
        if (start > now) return "upcoming";
        return "ongoing";
      }
    }
    return "completed";
  };

  const fetchPlayerScrims = async () => {
    try {
      setLoading(true);
      const res = await profileAPI.myBookings();
      const bookings = res?.data?.items || res?.data || [];

      const upcoming = [];
      const ongoing = [];
      const completed = [];

      bookings.forEach((b) => {
        const scrim = b.scrim || b.scrimId || {};
        const normalized = { ...scrim, _booking: { id: b._id, paid: b.paid } };

        const bucket = classifyScrim(scrim);
        if (bucket === "ongoing") ongoing.push(normalized);
        else if (bucket === "upcoming") upcoming.push(normalized);
        else completed.push(normalized);
      });

      setUpcomingScrims(upcoming);
      setOngoingScrims(ongoing);
      setCompletedScrims(completed);
    } catch (error) {
      console.error("Failed to fetch player scrims:", error);
      toast.error("Failed to load your bookings");
      setUpcomingScrims([]);
      setOngoingScrims([]);
      setCompletedScrims([]);
    } finally {
      setLoading(false);
    }
  };

  const openNextUpcomingTournament = () => {
    const t = upcomingTournaments?.[0];
    if (!t) return toast("No upcoming tournaments");
    window.location.href = `/tournaments/${t._id}`;
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await authAPI.updateProfile(profileForm);
      toast.success("Profile updated successfully");
      setShowProfile(false);

      const response = await authAPI.getMe();
      localStorage.setItem("user", JSON.stringify(response.data.user));
      window.location.reload();
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error("Failed to update profile");
    }
  };

  const openRate = (scrim) => {
    const org = scrim?.createdBy;
    if (!org) return toast.error("Organization not available for this scrim");
    setRateOrg(org);
    setRateScrimId(scrim?._id);
    setRateOpen(true);
  };

  const stats = {
    totalScrims:
      upcomingScrims.length + ongoingScrims.length + completedScrims.length,
    upcomingScrims: upcomingScrims.length,
    ongoingScrims: ongoingScrims.length,
    completedScrims: completedScrims.length,
    reputation: user?.reputation || 0,
  };

  const PaidBadge = ({ paid }) => (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border
        ${
          paid
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            : "bg-amber-500/10 border-amber-500/30 text-amber-300"
        }
      `}
      title={paid ? "Booking paid" : "Payment pending"}
    >
      {paid ? "Paid" : "Unpaid"}
    </span>
  );

  const EmptyState = ({ icon: Icon, title, desc, ctaLabel, to }) => (
    <div className="text-center py-14 rounded-2xl border border-gray-700/50 bg-gradient-to-b from-gray-800/40 to-gray-900/40">
      <Icon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-200 mb-1">{title}</h3>
      <p className="text-gray-400 mb-6 max-w-md mx-auto">{desc}</p>
      {to && (
        <Link to={to} className="btn-primary inline-flex items-center">
          {ctaLabel} <ChevronRight className="h-4 w-4 ml-1" />
        </Link>
      )}
    </div>
  );

  const renderScrimList = (list) => (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {list.map((scrim) => (
        <div
          key={scrim._id}
          className="card group overflow-hidden relative hover:shadow-2xl hover:shadow-gaming-purple/10 transition-shadow"
        >
          {/* Top meta strip */}
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {fmtDateTime(scrim?.timeSlot?.start || scrim?.date)}
            </span>
            <PaidBadge paid={!!scrim?._booking?.paid} />
          </div>

          {/* Use existing ScrimCard for main content */}
          <div className="rounded-lg overflow-hidden ring-1 ring-gray-700/40 group-hover:ring-gaming-purple/40 transition">
            <ScrimCard scrim={scrim} />
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <button
              className="btn-primary w-full"
              onClick={() => openRate(scrim)}
            >
              <Star className="h-4 w-4 inline mr-1" /> Rate Organization
            </button>
          </div>

          {/* subtle gradient edge */}
          <div className="pointer-events-none absolute inset-x-0 -bottom-10 h-24 bg-gradient-to-t from-gaming-purple/10 to-transparent opacity-0 group-hover:opacity-100 transition"></div>
        </div>
      ))}
    </div>
  );

  return (
    <>
    
      <SEO
        title="Player Dashboard – Manage Your Esports Journey | ArenaPulse"
        description="Track your scrims, tournaments, stats, and progress all from your personalized ArenaPulse player dashboard."
        keywords="player dashboard, esports stats, gaming profile"
        canonical="https://thearenapulse.xyz/dashboard/player"
      />

      <div className="min-h-screen">
        {/* Decorative header */}
        <div className="relative isolate">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(1200px_500px_at_10%_-10%,rgba(140,97,255,0.15),transparent_60%)]" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {profileForm.avatarUrl || user?.avatarUrl ? (
                    <img
                      src={profileForm.avatarUrl || user?.avatarUrl}
                      alt={user?.name || "Player"}
                      className="h-14 w-14 rounded-full object-cover ring-2 ring-gaming-purple/40"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-gray-700 grid place-content-center ring-2 ring-gaming-purple/40">
                      <span className="font-semibold text-lg">{initials}</span>
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 grid place-content-center ring-2 ring-gray-900 text-[10px] font-bold">
                    ✓
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">
                    Welcome back,{" "}
                    <span className="text-gaming-purple">
                      {user?.name || "Player"}
                    </span>
                  </h1>
                  <p className="text-gray-400 text-sm">
                    Manage your scrims & tournaments at a glance
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowProfile(true)}
                  className="btn-secondary"
                >
                  Edit Profile
                </button>
                <button
                  className={`btn-primary inline-flex items-center ${
                    !upcomingTournaments.length &&
                    "opacity-60 cursor-not-allowed"
                  }`}
                  onClick={openNextUpcomingTournament}
                  disabled={!upcomingTournaments.length}
                  title={
                    upcomingTournaments.length
                      ? "Go to next tournament"
                      : "No upcoming tournaments"
                  }
                >
                  View Next Tournament <ArrowRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="grid md:grid-cols-4 gap-6">
            <div className="card text-center hover:ring-1 hover:ring-gaming-purple/30 transition">
              <Calendar className="h-8 w-8 text-gaming-purple mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats.totalScrims}</div>
              <div className="text-sm text-gray-400">Total Scrims</div>
            </div>
            <div className="card text-center hover:ring-1 hover:ring-gaming-cyan/30 transition">
              <Clock className="h-8 w-8 text-gaming-cyan mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats.upcomingScrims}</div>
              <div className="text-sm text-gray-400">Upcoming</div>
            </div>
            <div className="card text-center hover:ring-1 hover:ring-yellow-500/30 transition">
              <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats.completedScrims}</div>
              <div className="text-sm text-gray-400">Completed</div>
            </div>
            <div className="card text-center hover:ring-1 hover:ring-emerald-500/30 transition">
              <Users className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats.reputation}</div>
              <div className="text-sm text-gray-400">Reputation</div>
            </div>
          </div>
        </div>

        {/* Sticky section switcher */}
        <div className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-gray-900/70 bg-gray-900/90 border-y border-gray-800/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <nav className="flex gap-2 py-3">
                {["scrims", "tournaments"].map((k) => {
                  const active = activeSection === k;
                  return (
                    <button
                      key={k}
                      onClick={() => setActiveSection(k)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition
                    ${
                      active
                        ? "bg-gaming-purple/20 text-gaming-purple ring-1 ring-gaming-purple/40"
                        : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/40"
                    }`}
                    >
                      {k === "scrims" ? "My Scrims" : "My Tournaments"}
                    </button>
                  );
                })}
              </nav>
              {activeSection === "scrims" && (
                <nav className="flex gap-2">
                  {["upcoming", "ongoing", "completed"].map((k) => {
                    const active = activeTab === k;
                    const label =
                      k === "upcoming"
                        ? `Upcoming (${stats.upcomingScrims})`
                        : k === "ongoing"
                        ? `Ongoing (${stats.ongoingScrims})`
                        : `Completed (${stats.completedScrims})`;
                    return (
                      <button
                        key={k}
                        onClick={() => setActiveTab(k)}
                        className={`px-3 py-1.5 rounded-full text-sm transition
                      ${
                        active
                          ? "bg-gaming-cyan/20 text-gaming-cyan ring-1 ring-gaming-cyan/40"
                          : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/40"
                      }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </nav>
              )}
              {activeSection === "tournaments" && (
                <nav className="flex gap-2">
                  {["upcoming", "past"].map((k) => {
                    const active = tTab === k;
                    return (
                      <button
                        key={k}
                        onClick={() => setTTab(k)}
                        className={`px-3 py-1.5 rounded-full text-sm transition
                      ${
                        active
                          ? "bg-gaming-cyan/20 text-gaming-cyan ring-1 ring-gaming-cyan/40"
                          : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/40"
                      }`}
                      >
                        {k === "upcoming"
                          ? `Upcoming (${upcomingTournaments.length})`
                          : `Past (${pastTournaments.length})`}
                      </button>
                    );
                  })}
                </nav>
              )}
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card overflow-hidden">
                  <div className="animate-pulse space-y-4">
                    <div className="h-32 bg-gray-700/60 rounded" />
                    <div className="h-4 bg-gray-700/60 rounded" />
                    <div className="h-3 bg-gray-700/60 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : activeSection === "scrims" ? (
            activeTab === "upcoming" ? (
              upcomingScrims.length ? (
                renderScrimList(upcomingScrims)
              ) : (
                <EmptyState
                  icon={Calendar}
                  title="No upcoming scrims"
                  desc="You haven’t booked any upcoming scrims yet. Find and book your next practice match."
                  ctaLabel="Browse Scrims"
                  to="/scrims"
                />
              )
            ) : activeTab === "ongoing" ? (
              ongoingScrims.length ? (
                renderScrimList(ongoingScrims)
              ) : (
                <EmptyState
                  icon={Clock}
                  title="No ongoing scrims"
                  desc="Currently you have no matches in progress."
                  ctaLabel="Browse Scrims"
                  to="/scrims"
                />
              )
            ) : completedScrims.length ? (
              renderScrimList(completedScrims)
            ) : (
              <EmptyState
                icon={Trophy}
                title="No completed scrims"
                desc="Finish scrims to see them here and rate organizations for better recommendations."
                ctaLabel="Find Scrims"
                to="/scrims"
              />
            )
          ) : (
            <>
              {/* Tournaments list */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(tTab === "upcoming"
                  ? upcomingTournaments
                  : pastTournaments
                ).map((t) => {
                  const inGroup = !!groupFlags[t._id];
                  const isPast = tTab === "past";
                  return (
                    <div
                      key={t._id}
                      className={`card overflow-hidden relative transition hover:shadow-2xl hover:shadow-gaming-purple/10 ${
                        isPast ? "opacity-90" : ""
                      }`}
                    >
                      {t.bannerUrl && (
                        <img
                          src={t.bannerUrl}
                          alt={t.title}
                          className="h-32 w-full object-cover rounded mb-3 ring-1 ring-gray-700/40"
                        />
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-lg leading-snug">
                            {t.title}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {fmtDateTime(t.startAt)}
                            {t.endAt && (
                              <>
                                {" "}
                                <span className="text-gray-600">→</span>{" "}
                                {fmtDateTime(t.endAt)}
                              </>
                            )}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full border
                        ${
                          isPast
                            ? "border-gray-600 text-gray-400"
                            : "border-gaming-purple/40 text-gaming-purple bg-gaming-purple/10"
                        }
                      `}
                        >
                          {isPast ? "Completed" : "Registered"}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <Link
                          to={`/tournaments/${t._id}`}
                          className="btn-secondary"
                        >
                          View
                        </Link>

                        {inGroup ? (
                          <button
                            className="btn-primary"
                            onClick={() => {
                              setRoomTournamentId(t._id);
                              setRoomOpen(true);
                            }}
                          >
                            Open Group Room
                          </button>
                        ) : (
                          <button
                            className="btn-secondary"
                            disabled
                            title="You’re not in a group yet"
                          >
                            Group not formed yet
                          </button>
                        )}
                      </div>

                      {isPast && (
                        <div className="absolute top-3 -right-9 rotate-45 bg-gray-700 text-gray-300 text-[10px] px-10 py-1 tracking-wider">
                          PAST
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {(tTab === "upcoming" ? upcomingTournaments : pastTournaments)
                .length === 0 && (
                <div className="mt-6">
                  <EmptyState
                    icon={Users}
                    title={
                      tTab === "upcoming"
                        ? "No upcoming tournaments"
                        : "No past tournaments"
                    }
                    desc={
                      tTab === "upcoming"
                        ? "Register for tournaments and they will appear here."
                        : "Once you complete tournaments, they’ll be shown here."
                    }
                    ctaLabel={
                      tTab === "upcoming" ? "Explore Tournaments" : undefined
                    }
                    to={tTab === "upcoming" ? "/tournaments" : undefined}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Profile Modal */}
        {showProfile && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl max-w-md w-full p-6 ring-1 ring-gray-700/60">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Edit Profile</h3>
                <button
                  onClick={() => setShowProfile(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await authAPI.updateProfile(profileForm);
                    toast.success("Profile updated successfully");
                    setShowProfile(false);
                    const response = await authAPI.getMe();
                    localStorage.setItem(
                      "user",
                      JSON.stringify(response.data.user)
                    );
                    window.location.reload();
                  } catch (error) {
                    console.error("Profile update error:", error);
                    toast.error("Failed to update profile");
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, name: e.target.value })
                    }
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Avatar URL
                  </label>
                  <input
                    type="url"
                    value={profileForm.avatarUrl}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        avatarUrl: e.target.value,
                      })
                    }
                    className="input w-full"
                    placeholder="https://example.com/avatar.jpg"
                  />
                  <div className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                    <UserIcon className="h-3.5 w-3.5" /> Use a square image (min
                    128×128) for best results.
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowProfile(false)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary inline-flex items-center justify-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Update Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SINGLE Group Room Modal */}
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
          onSubmitted={() => toast.success("Rating saved")}
        />
      </div>
    </>
  );
};

export default PlayerDashboard;