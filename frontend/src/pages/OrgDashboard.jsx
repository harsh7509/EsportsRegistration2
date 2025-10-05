import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Plus,
  Calendar,
  Users,
  Trophy,
  Settings,
  User,
  X,
  Save,
  Image as ImageIcon,
  Search,
  MapPin,
  Clock,
  CheckCircle2,
  Filter,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { scrimsAPI, uploadAPI, tournamentsAPI } from "../services/api";
import ScrimCard from "../components/ScrimCard";
import CreateScrimModal from "../components/CreateScrimModal";
import { formatDateTime, formatTimeRange } from "../utils/datetime";
import { Link } from "react-router-dom";
import SEO from "../components/SEO"

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

  // top-level sections: 'scrims' | 'tournaments'
  const [section, setSection] = useState("scrims");

  // scrim sub-tabs
  const [scrimTab, setScrimTab] = useState("upcoming"); // 'upcoming' | 'ongoing' | 'completed'
  const [q, setQ] = useState(""); // client-side search
  const [sortBy, setSortBy] = useState("dateAsc"); // 'dateAsc' | 'dateDesc' | 'playersDesc'

  // ---- profile form ----
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    avatarUrl: user?.avatarUrl || "",
    organizationInfo: {
      orgName: user?.organizationInfo?.orgName || "",
      location: user?.organizationInfo?.location || "",
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
      const orgScrims = items.filter((s) => {
        const creator = s?.createdBy;
        const creatorId =
          typeof creator === "string" ? creator : creator?._id || creator?.id;
        return me ? String(creatorId) === String(me) : true;
      });
      setScrims(orgScrims);
    } catch (error) {
      console.error("Failed to fetch organization scrims:", error);
      setScrims([]);
    } finally {
      setLoadingScrims(false);
    }
  };

  const fetchMyTournaments = async () => {
    try {
      setLoadingTournaments(true);
      const res = await tournamentsAPI.list({ limit: 200, active: "true" });
      const items = Array.isArray(res?.data)
        ? res.data
        : res?.data?.items || [];
      const me = user?._id || user?.id;
      const mine = items.filter((t) => {
        const owner =
          t.createdBy ||
          (typeof t.organizationId === "string"
            ? t.organizationId
            : t.organizationId?._id);
        return me && String(owner) === String(me);
      });
      setMyTournaments(mine);
    } catch (e) {
      console.error("Failed to fetch tournaments:", e);
      setMyTournaments([]);
    } finally {
      setLoadingTournaments(false);
    }
  };

  // ---- date helpers & derived status ----
  const getStart = (s) =>
    s?.timeSlot?.start
      ? new Date(s.timeSlot.start)
      : s?.date
      ? new Date(s.date)
      : null;
  const getEnd = (s) =>
    s?.timeSlot?.end ? new Date(s.timeSlot.end) : getStart(s);

  const deriveStatus = (s, now = new Date()) => {
    const start = getStart(s);
    const end = getEnd(s);
    if (!start) return "upcoming";
    if (end && end < now) return "completed";
    if (start > now) return "upcoming";
    return "ongoing";
  };

  const now = new Date();
  const upcomingScrims = scrims.filter(
    (s) => deriveStatus(s, now) === "upcoming"
  );
  const ongoingScrims = scrims.filter(
    (s) => deriveStatus(s, now) === "ongoing"
  );
  const completedScrims = scrims.filter(
    (s) => deriveStatus(s, now) === "completed"
  );

  // ---- stats ----
  const stats = {
    totalScrims: scrims.length,
    upcomingScrims: upcomingScrims.length,
    ongoingScrims: ongoingScrims.length,
    totalParticipants: scrims.reduce(
      (acc, s) =>
        acc + (Array.isArray(s.participants) ? s.participants.length : 0),
      0
    ),
  };

  // ---- search + sort ----
  const filterByQuery = (arr) => {
    const term = q.trim().toLowerCase();
    if (!term) return arr;
    return arr.filter((x) => {
      const title = (x.title || "").toLowerCase();
      const game = (x.game || "").toLowerCase();
      return title.includes(term) || game.includes(term);
    });
  };

  const sortList = (arr) => {
    const copy = [...arr];
    if (sortBy === "dateAsc") {
      return copy.sort((a, b) => +getStart(a) - +getStart(b));
    }
    if (sortBy === "dateDesc") {
      return copy.sort((a, b) => +getStart(b) - +getStart(a));
    }
    if (sortBy === "playersDesc") {
      return copy.sort(
        (a, b) =>
          (b?.participants?.length || 0) - (a?.participants?.length || 0)
      );
    }
    return copy;
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
        alert("Upload succeeded but server did not return imageUrl");
      }
    } catch (err) {
      console.error("Avatar upload failed:", err);
      alert("Failed to upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
      console.error("Failed to update profile:", error);
    }
  };

  // ---- UI atoms ----
  const Chip = ({ active, children, onClick }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm transition border
        ${
          active
            ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
            : "text-white/70 hover:text-white border-white/10 hover:bg-white/5"
        }`}
    >
      {children}
    </button>
  );

  const StatCard = ({ icon: Icon, title, value, note, gradient }) => (
    <div
      className={`rounded-2xl border border-white/10 p-4 text-center ${
        gradient || "bg-white/5"
      } backdrop-blur`}
    >
      <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-white/10">
        <Icon className="h-5 w-5 text-white/90" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-white/70">{title}</div>
      {note && <div className="mt-1 text-xs text-white/50">{note}</div>}
    </div>
  );

  const CardSkeleton = () => (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 animate-pulse">
      <div className="h-32 w-full rounded-xl bg-white/10" />
      <div className="mt-3 h-4 w-2/3 rounded bg-white/10" />
      <div className="mt-2 h-3 w-1/2 rounded bg-white/10" />
    </div>
  );

  const SkeletonGrid = () => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );

  const StatusBadge = ({ status }) => {
    const map = {
      upcoming: {
        label: "Upcoming",
        cls: "bg-emerald-500/15 text-emerald-300",
      },
      ongoing: { label: "Live", cls: "bg-pink-500/15 text-pink-300" },
      completed: { label: "Completed", cls: "bg-white/10 text-white/70" },
    };
    const st = map[status] || map.upcoming;
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${st.cls}`}
      >
        {st.label}
      </span>
    );
  };

  const Progress = ({ value = 0, max = 100 }) => {
    const pct = Math.min(100, Math.round((value / (max || 1)) * 100));
    return (
      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
      </div>
    );
  };

  // ---- filtered lists for current scrim tab ----
  const visibleScrims = useMemo(() => {
    let base =
      scrimTab === "upcoming"
        ? upcomingScrims
        : scrimTab === "ongoing"
        ? ongoingScrims
        : completedScrims;
    base = filterByQuery(base);
    return sortList(base);
  }, [scrimTab, upcomingScrims, ongoingScrims, completedScrims, q, sortBy]);

  return (
    <>
      <SEO
        title="Organization Dashboard – Manage Tournaments & Teams | ArenaPulse"
        description="Control your hosted events, teams, and analytics from the organization dashboard on ArenaPulse."
        keywords="organization dashboard, esports organizer tools, manage tournaments"
        canonical="https://thearenapulse.xyz/dashboard/org"
      />

      <div className="min-h-screen">
        {/* Decorative header */}
        <div className="relative isolate">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(1200px_500px_at_8%_-10%,rgba(99,102,241,0.18),transparent_60%)]" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  Organization Dashboard
                </h1>
                <p className="text-sm text-white/60">
                  Manage your scrims & tournaments
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowProfile(true)}
                  className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white hover:bg-white/10"
                >
                  <User className="mr-2 h-4 w-4" /> Edit Profile
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 active:scale-[0.99]"
                >
                  <Plus className="mr-2 h-4 w-4" /> Create Scrim
                </button>
                <Link
                  to="/tournaments/new"
                  className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white hover:bg-white/10"
                >
                  <Trophy className="mr-2 h-4 w-4" /> Create Tournament
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6">
          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <StatCard
              icon={Calendar}
              title="Total Scrims"
              value={stats.totalScrims}
              gradient="bg-gradient-to-b from-white/5 to-white/0"
            />
            <StatCard
              icon={Trophy}
              title="Upcoming"
              value={stats.upcomingScrims}
            />
            <StatCard
              icon={CheckCircle2}
              title="Ongoing"
              value={ongoingScrims.length}
            />
            <StatCard
              icon={Users}
              title="Total Players"
              value={stats.totalParticipants}
              note="All scrims combined"
            />
          </div>
        </div>

        {/* Sticky Toolbar: Section switcher + scrim tabs + search/sort */}
        <div className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-gray-900/70 bg-gray-900/90 border-y border-gray-800/60">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
              {/* left: section switcher */}
              <div className="flex items-center gap-2">
                <Chip
                  active={section === "scrims"}
                  onClick={() => setSection("scrims")}
                >
                  Scrims
                </Chip>
                <Chip
                  active={section === "tournaments"}
                  onClick={() => setSection("tournaments")}
                >
                  Tournaments
                </Chip>

                {section === "scrims" && (
                  <div className="ml-2 hidden md:flex items-center gap-2">
                    <Chip
                      active={scrimTab === "upcoming"}
                      onClick={() => setScrimTab("upcoming")}
                    >
                      Upcoming ({upcomingScrims.length})
                    </Chip>
                    <Chip
                      active={scrimTab === "ongoing"}
                      onClick={() => setScrimTab("ongoing")}
                    >
                      Ongoing ({ongoingScrims.length})
                    </Chip>
                    <Chip
                      active={scrimTab === "completed"}
                      onClick={() => setScrimTab("completed")}
                    >
                      Completed ({completedScrims.length})
                    </Chip>
                  </div>
                )}
              </div>

              {/* right: search + sort */}
              <div className="flex gap-2">
                <div className="relative w-48 md:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={
                      section === "tournaments"
                        ? "Search tournaments…"
                        : "Search scrims…"
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
                {section === "scrims" && (
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="appearance-none pr-8 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30"
                      title="Sort"
                    >
                      <option value="dateAsc">Date ↑</option>
                      <option value="dateDesc">Date ↓</option>
                      <option value="playersDesc">Players ↓</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
                  </div>
                )}
                {section === "tournaments" && (
                  <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white">
                    <Filter className="h-4 w-4" /> Active only
                  </div>
                )}
              </div>
            </div>

            {/* scrim sub-tabs for small screens */}
            {section === "scrims" && (
              <div className="flex md:hidden items-center gap-2 pb-3">
                <Chip
                  active={scrimTab === "upcoming"}
                  onClick={() => setScrimTab("upcoming")}
                >
                  Upcoming ({upcomingScrims.length})
                </Chip>
                <Chip
                  active={scrimTab === "ongoing"}
                  onClick={() => setScrimTab("ongoing")}
                >
                  Ongoing ({ongoingScrims.length})
                </Chip>
                <Chip
                  active={scrimTab === "completed"}
                  onClick={() => setScrimTab("completed")}
                >
                  Completed ({completedScrims.length})
                </Chip>
              </div>
            )}
          </div>
        </div>

        {/* Main */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Tournaments */}
          {section === "tournaments" ? (
            loadingTournaments ? (
              <SkeletonGrid />
            ) : (
              <>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filterByQuery(myTournaments).map((t) => {
                    const start = t.startAt || t?.timeSlot?.start;
                    const end = t.endAt || t?.timeSlot?.end;
                    const dateLabel = start
                      ? end
                        ? formatTimeRange(start, end)
                        : formatDateTime(start)
                      : "TBA";
                    const status = (() => {
                      const sDate = start ? new Date(start) : null;
                      const eDate = end ? new Date(end) : null;
                      if (!sDate) return "upcoming";
                      if (eDate && eDate < now) return "completed";
                      if (sDate > now) return "upcoming";
                      return "ongoing";
                    })();

                    const cap = Number(t.capacity || 0);
                    const reg = Number(t.registeredCount || 0);

                    return (
                      <div
                        key={t._id}
                        className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur group"
                      >
                        <div className="relative">
                          {t.bannerUrl ? (
                            <img
                              src={t.bannerUrl}
                              alt={t.title}
                              className="h-36 w-full object-cover group-hover:brightness-110 transition"
                            />
                          ) : (
                            <div className="h-36 w-full bg-[radial-gradient(900px_450px_at_20%_10%,#6d28d9_0,#111827_55%,#0b0f1a_100%)]" />
                          )}
                          <div className="absolute left-3 top-3 flex items-center gap-2">
                            <StatusBadge status={status} />
                            <span className="rounded-full bg-black/40 px-2 py-0.5 text-[11px] text-white/80">
                              {t.entryFee > 0
                                ? `₹${Number(t.entryFee).toLocaleString(
                                    "en-IN"
                                  )}`
                                : "Free"}
                            </span>
                          </div>
                        </div>

                        <div className="p-4">
                          <h3 className="line-clamp-1 text-[15px] font-semibold">
                            {t.title}
                          </h3>

                          <div className="mt-2 grid grid-cols-2 items-center gap-2 text-xs text-white/70">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="line-clamp-1">{dateLabel}</span>
                            </div>
                            <div className="flex items-center justify-end gap-1.5">
                              <Users className="h-3.5 w-3.5" />
                              <span>
                                {reg}/{cap} slots
                              </span>
                            </div>
                          </div>

                          <div className="mt-2">
                            <Progress value={reg} max={cap || 1} />
                          </div>

                          <div className="mt-3 flex gap-2">
                            <Link
                              to={`/tournaments/${t._id}`}
                              className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white hover:bg-white/10"
                            >
                              View
                            </Link>
                            <Link
                              to={`/tournaments/${t._id}/manage`}
                              className="inline-flex items-center rounded-xl bg-indigo-500 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-600"
                            >
                              Players / Groups
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filterByQuery(myTournaments).length === 0 && (
                  <div className="mt-8 grid place-items-center rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
                    <div className="text-4xl">🏆</div>
                    <h3 className="mt-3 text-lg font-semibold">
                      No tournaments found
                    </h3>
                    <p className="mt-1 text-sm text-white/60">
                      Try changing the search, or create your first tournament.
                    </p>
                    <Link
                      to="/tournaments/new"
                      className="mt-4 inline-flex items-center rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600"
                    >
                      <Plus className="mr-2 h-4 w-4" /> Create
                    </Link>
                  </div>
                )}
              </>
            )
          ) : // Scrims
          loadingScrims ? (
            <SkeletonGrid />
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {visibleScrims.map((scrim) => (
                  <div key={scrim._id} className="relative group">
                    <ScrimCard scrim={scrim} />
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition">
                      <Link
                        to={`/scrims/${scrim._id}`}
                        className="rounded-full bg-indigo-500/90 p-2 text-white hover:bg-indigo-600"
                        title="Manage Scrim"
                      >
                        <Settings className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {visibleScrims.length === 0 && (
                <div className="mt-8 grid place-items-center rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
                  <div className="text-4xl">🎮</div>
                  <h3 className="mt-3 text-lg font-semibold">
                    No scrims in this view
                  </h3>
                  <p className="mt-1 text-sm text-white/60">
                    Try changing the search/sort or create a new scrim.
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 inline-flex items-center rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Create Scrim
                  </button>
                </div>
              )}
            </>
          )}

          {/* Sticky create button (mobile) */}
          <div className="fixed inset-x-0 bottom-4 z-20 flex justify-center sm:hidden">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30"
            >
              <Plus className="h-4 w-4" /> New Scrim
            </button>
          </div>

          {/* Create Scrim Modal */}
          <CreateScrimModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onScrimCreated={handleScrimCreated}
          />

          {/* Profile Modal */}
          {showProfile && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-xl font-bold">
                    Edit Organization Profile
                  </h3>
                  <button
                    onClick={() => setShowProfile(false)}
                    className="text-white/70 hover:text-white"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="text-center">
                    <div className="relative inline-block">
                      {profileForm.avatarUrl ? (
                        <img
                          src={profileForm.avatarUrl}
                          alt="Avatar"
                          className="h-20 w-20 rounded-full object-cover ring-2 ring-white/10"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-full bg-white/10 ring-2 ring-white/10 grid place-items-center">
                          <span className="text-2xl font-bold text-white">
                            {profileForm.name?.charAt(0)?.toUpperCase() || "O"}
                          </span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={onPickFile}
                        disabled={uploading}
                        className="absolute bottom-0 right-0 rounded-full bg-indigo-500 p-1.5 text-white hover:bg-indigo-600"
                        title="Upload from device"
                      >
                        {uploading ? "…" : <ImageIcon className="h-4 w-4" />}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={onFileChange}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs text-white/70">
                      Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, name: e.target.value })
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs text-white/70">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.organizationInfo.orgName}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          organizationInfo: {
                            ...profileForm.organizationInfo,
                            orgName: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs text-white/70">
                      Location
                    </label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                      <input
                        type="text"
                        value={profileForm.organizationInfo.location}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            organizationInfo: {
                              ...profileForm.organizationInfo,
                              location: e.target.value,
                            },
                          })
                        }
                        className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 py-2.5 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30"
                        placeholder="City, Country"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowProfile(false)}
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white hover:bg-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 inline-flex items-center justify-center rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600"
                      disabled={uploading}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Update Profile
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default OrgDashboard;