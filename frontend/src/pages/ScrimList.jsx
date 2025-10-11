// src/pages/ScrimList.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Gamepad2,
  Users,
  Trophy,
  Eye,
  Clock,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  Plus,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { scrimsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import SEO from "../components/SEO";
import CreateScrimModal from "../components/CreateScrimModal"; // ✅ bring in the same modal used on OrgDashboard

/**
 * ScrimList — Pro Hub+
 * (unchanged features; only added CreateScrimModal hookup)
 */

const Chip = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3.5 py-2 rounded-2xl text-sm font-medium transition-all
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      focus-visible:ring-white/40 focus-visible:ring-offset-[#0b0b12]
      ${
        active
          ? "bg-white text-gray-900 shadow"
          : "bg-white/5 text-white/80 hover:bg-white/10 border border-white/10"
      }`}
  >
    {children}
  </button>
);

const SoftDivider = () => (
  <div className="hidden md:block w-px self-stretch bg-white/10" />
);

const SkeletonRow = () => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
    <div className="h-5 w-1/3 rounded bg-white/10 mb-4 animate-pulse" />
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="min-w-[260px] h-32 rounded-xl bg-white/10 animate-pulse"
        />
      ))}
    </div>
  </div>
);

const EmptyState = ({ onReset }) => (
  <div className="text-center py-16 rounded-2xl border border-white/10 bg-white/5">
    <Gamepad2 className="h-14 w-14 text-white/40 mx-auto mb-4" />
    <h3 className="text-xl font-semibold">No scrims match your search</h3>
    <p className="text-white/60 mt-1">
      Try a different term or clear some filters.
    </p>
    {onReset && (
      <button
        onClick={onReset}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-gray-900 font-medium hover:bg-white/90"
      >
        Reset Filters <X className="h-4 w-4" />
      </button>
    )}
  </div>
);

const FeePill = ({ fee }) => {
  const paid = Number(fee || 0) > 0;
  return (
    <span
      className={`px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap
      ${
        paid
          ? "bg-cyan-500/10 text-cyan-300"
          : "bg-emerald-500/10 text-emerald-300"
      }`}
      aria-label={paid ? `Entry fee ₹${fee}` : "Free scrim"}
      title={paid ? `Entry fee ₹${fee}` : "Free scrim"}
    >
      {paid ? `₹${fee}` : "Free"}
    </span>
  );
};

const GameTag = ({ game }) => (
  <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-white/80 border border-white/10">
    {game || "Game"}
  </span>
);

const CapBar = ({ now = 0, max = 1 }) => {
  const pct = Math.min(100, Math.round((now / (max || 1)) * 100));
  return (
    <div
      className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden"
      aria-label={`Capacity ${now} of ${max}`}
    >
      <div className="h-full bg-fuchsia-400/90" style={{ width: `${pct}%` }} />
    </div>
  );
};

const ScrimList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [scrims, setScrims] = useState([]);
  const [loading, setLoading] = useState(true);

  // Backend filters
  const [filters, setFilters] = useState({
    q: "",
    game: "",
    platform: "",
    sort: "rank",
    page: 1,
  });

  // Client-only quick filters
  const [feeFilter, setFeeFilter] = useState("all");

  const [selectedDate, setSelectedDate] = useState("");
  const [priceExact, setPriceExact] = useState("");
  const [totalPages, setTotalPages] = useState(1);

  // Past-scrims modal
  const [pastOpen, setPastOpen] = useState(false);
  const [pastOrg, setPastOrg] = useState(null);
  const [pastList, setPastList] = useState([]);

  // ✅ NEW: create-scrim modal state
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchScrims(); /* eslint-disable-next-line */
  }, [filters.page, filters.game, filters.platform, filters.sort, filters.q]);

  const fetchScrims = async () => {
    setLoading(true);
    try {
      const response = await scrimsAPI.getList(filters);
      const data = response?.data || {};
      setScrims(data.items || []);
      setTotalPages(data.totalPages || 1);
    } catch {
      setScrims([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  const handlePageChange = (newPage) =>
    setFilters((prev) => ({ ...prev, page: newPage }));
  const clearAll = () => {
    setFilters({ q: "", game: "", platform: "", sort: "rank", page: 1 });
    setSelectedDate("");
    setPriceExact("");
    setFeeFilter("all");
  };

  // ----- Date helpers -----
  const toLocalKey = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(dt.getDate()).padStart(2, "0")}`;
  };
  const todayKey = toLocalKey(new Date());
  const getDateSrc = (s) => s?.timeSlot?.start ?? s?.date;
  const isToday = (s) => {
    const src = getDateSrc(s);
    return src ? toLocalKey(src) === todayKey : false;
  };
  const isPast = (s) => {
    const src = getDateSrc(s);
    return src ? toLocalKey(src) < todayKey : false;
  };
  const isPastScrimStrict = (scrim) => {
    const dt = scrim?.timeSlot?.start
      ? new Date(scrim.timeSlot.start)
      : new Date(scrim.date);
    return dt < new Date();
  };

  const formatDateTime = (scrim) => {
    const dt = scrim?.timeSlot?.start
      ? new Date(scrim.timeSlot.start)
      : new Date(scrim.date);
    try {
      return dt.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return new Date(dt).toLocaleString();
    }
  };

  const currentPlayers = (scrim) =>
    Array.isArray(scrim?.participants)
      ? scrim.participants.length
      : scrim.currentPlayers ?? 0;
  const maxPlayers = (scrim) => scrim?.capacity ?? scrim?.maxPlayers ?? 100;
  const handleBookSlot = (scrimId) => navigate(`/scrims/${scrimId}`);

  // ----- Client filtering -----
  const q = (filters.q || "").trim().toLowerCase();
  const clientFiltered = scrims
    .filter((s) => {
      if (!q) return true;
      const title = (s.title || "").toLowerCase();
      const game = (s.game || "").toLowerCase();
      const orgObj =
        typeof s.createdBy === "object" && s.createdBy ? s.createdBy : null;
      const orgName = (orgObj?.name || s.organizationName || "").toLowerCase();
      return title.includes(q) || game.includes(q) || orgName.includes(q);
    })
    .filter((s) => {
      const fee = Number(s.entryFee || 0);
      if (priceExact !== "" && !Number.isNaN(Number(priceExact)))
        return fee === Number(priceExact);
      return true;
    })
    .filter((s) => {
      if (feeFilter === "all") return true;
      const fee = s.entryFee || 0;
      if (feeFilter === "free") return fee === 0;
      if (feeFilter === "25") return fee <= 25;
      if (feeFilter === "50") return fee >= 25 && fee <= 50;
      if (feeFilter === "60+") return fee >= 60;
      return true;
    })
    .filter((s) => {
      if (!selectedDate) return true;
      const src = getDateSrc(s);
      if (!src) return false;
      return toLocalKey(src) === selectedDate;
    });

  // if a specific date is selected, use that; otherwise default to today's scrims
  const displayList = selectedDate
    ? clientFiltered
    : clientFiltered.filter(isToday);
  const groups = groupByOrg(displayList);
  const headerCount = useMemo(
    () => groups.reduce((acc, g) => acc + g.scrims.length, 0),
    [groups]
  );
  const orgCount = useMemo(() => groups.length, [groups]);

  // Past modal helpers
  const openPastForOrg = (group) => {
    const orgId = group.orgId;
    const items = clientFiltered.filter((s) => {
      const creatorId =
        (typeof s.createdBy === "object" && s.createdBy?._id) ||
        s.createdBy ||
        s.organizationId ||
        s.orgId ||
        null;
      return String(creatorId || "") === String(orgId || "") && isPast(s);
    });
    setPastOrg({
      id: group.orgId,
      name: group.orgName,
      avatar: group.orgAvatar,
    });
    setPastList(items.sort((a, b) => (getDateSrc(b) > getDateSrc(a) ? 1 : -1)));
    setPastOpen(true);
  };

  // ✅ when a scrim is created from this page, close modal & refresh
  const handleScrimCreated = () => {
    setShowCreateModal(false);
    fetchScrims();
  };

  return (
    <>
      <SEO
        title="Find Esports Scrims – Join Competitive Matches | ArenaPulse"
        description="Browse upcoming esports scrims across top games and organizations. Instantly join competitive matches, improve team coordination, and level up your esports journey."
        keywords="esports scrims, find scrims, join scrim, competitive gaming, practice matches"
        canonical="https://thearenapulse.xyz/scrims"
        schema={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Scrim List",
          description: "List of esports scrims available on ArenaPulse.",
        }}
      />

      <div className="min-h-screen bg-[#0b0b12] text-white">
        {/* Sticky Filters Toolbar */}
        <div className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0b12]/80 backdrop-blur">
          <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  {selectedDate
                    ? `Scrims on ${new Date(selectedDate).toLocaleDateString()}`
                    : "Today’s Scrims"}

                  <span className="text-xs font-medium rounded-full bg-white/10 px-2 py-0.5 text-white/70">
                    {orgCount} orgs • {headerCount} matches
                  </span>
                </h1>
                <p className="text-white/60 text-sm">
                  Organizations with scrims scheduled for today
                </p>
              </div>

              {/* Search + Selects */}
              <div className="flex flex-1 md:flex-none items-center gap-3">
                <div className="relative flex-1 md:w-80">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                  <input
                    type="text"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-9 text-sm placeholder-white/50 outline-none focus:ring-2 focus:ring-white/30"
                    placeholder="Search (Org / Scrim / Game)"
                    value={filters.q}
                    onChange={(e) => handleFilterChange("q", e.target.value)}
                    aria-label="Search scrims"
                  />
                  {filters.q && (
                    <button
                      onClick={() => handleFilterChange("q", "")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 hover:bg-white/10"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4 text-white/60" />
                    </button>
                  )}
                </div>

                <SoftDivider />

                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-white/60" />
                  <select
                    className="rounded-xl border border-white/10 bg-white/5 py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-white/30"
                    value={filters.game}
                    onChange={(e) => handleFilterChange("game", e.target.value)}
                  >
                    <option value="">All Games</option>
                    <option value="Valorant">Valorant</option>
                    <option value="BGMI">BGMI</option>
                    <option value="CODM">CODM</option>
                    <option value="CS2">CS2</option>
                  </select>
                  <select
                    className="rounded-xl border border-white/10 bg-white/5 py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-white/30"
                    value={filters.platform}
                    onChange={(e) =>
                      handleFilterChange("platform", e.target.value)
                    }
                  >
                    <option value="">All Platforms</option>
                    <option value="PC">PC</option>
                    <option value="PlayStation">PlayStation</option>
                    <option value="Xbox">Xbox</option>
                    <option value="Mobile">Mobile</option>
                  </select>
                  <select
                    className="rounded-xl border border-white/10 bg-white/5 py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-white/30"
                    value={filters.sort}
                    onChange={(e) => handleFilterChange("sort", e.target.value)}
                  >
                    <option value="rank">Rank Score</option>
                    <option value="date">Date</option>
                    <option value="popularity">Popularity</option>
                    <option value="price">Entry Fee</option>
                  </select>
                </div>

                <SoftDivider />

                {/* Clear all */}
                <button
                  onClick={clearAll}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                  title="Clear all filters"
                >
                  <RefreshCw className="h-4 w-4" /> Clear
                </button>

                {/* ✅ Org-only: open modal directly (no route) */}
                {user?.role === "organization" && (
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    title="Create a new scrim"
                  >
                    <Plus className="h-4 w-4" /> Create Scrim
                  </button>
                )}
              </div>
            </div>

            {/* Quick Chips Row */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Chip
                active={feeFilter === "all"}
                onClick={() => setFeeFilter("all")}
              >
                All Fees
              </Chip>
              <Chip
                active={feeFilter === "free"}
                onClick={() => setFeeFilter("free")}
              >
                Free (₹0)
              </Chip>
              <Chip
                active={feeFilter === "25"}
                onClick={() => setFeeFilter("25")}
              >
                0–₹25
              </Chip>
              <Chip
                active={feeFilter === "50"}
                onClick={() => setFeeFilter("50")}
              >
                ₹25–₹50
              </Chip>
              <Chip
                active={feeFilter === "60+"}
                onClick={() => setFeeFilter("60+")}
              >
                ₹60+
              </Chip>

              <div className="ml-auto flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-white/60" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-xl border border-white/10 bg-white/5 py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-white/30"
                  aria-label="Filter by date"
                />
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate("")}
                    className="rounded-xl border border-white/10 bg-white/5 py-2 px-3 text-sm hover:bg-white/10"
                  >
                    Clear
                  </button>
                )}
                <div className="w-px self-stretch bg-white/10" />
                <span className="text-sm text-white/70">Exact Price</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="w-28 rounded-xl border border-white/10 bg-white/5 py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-white/30"
                  value={priceExact}
                  onChange={(e) => setPriceExact(e.target.value)}
                  placeholder="e.g. 50"
                  aria-label="Exact price"
                />
                {priceExact && (
                  <button
                    onClick={() => setPriceExact("")}
                    className="rounded-xl border border-white/10 bg-white/5 py-2 px-3 text-sm hover:bg-white/10"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="grid gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : groups.length > 0 ? (
            <div className="space-y-6 mb-10">
              {groups.map((g) => {
                const shouldScroll = g.scrims.length > 5;
                const pastCount = clientFiltered.reduce((acc, s) => {
                  const creatorId =
                    (typeof s.createdBy === "object" && s.createdBy?._id) ||
                    s.createdBy ||
                    s.organizationId ||
                    s.orgId ||
                    null;
                  if (
                    String(creatorId || "") === String(g.orgId || "") &&
                    isPast(s)
                  )
                    acc += 1;
                  return acc;
                }, 0);

                return (
                  <section
                    key={g.orgId || g.orgName}
                    aria-label={`${g.orgName} scrims`}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5"
                  >
                    {/* Org header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden grid place-items-center border border-white/10 bg-white/10">
                          {g.orgAvatar ? (
                            <img
                              src={g.orgAvatar}
                              alt={g.orgName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-bold">
                              {g.orgName?.charAt(0)?.toUpperCase() || "O"}
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">
                            {g.orgName || "Unknown Organization"}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-cyan-300/90">
                            {g.orgId && (
                              <Link
                                to={`/organizations/${g.orgId}`}
                                className="inline-flex items-center hover:text-cyan-200"
                              >
                                <Eye className="h-4 w-4 mr-1" /> View Org
                                Profile
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-fuchsia-300 leading-none">
                            {g.scrims.length}
                          </div>
                          <div className="text-sm text-white/60">Today</div>
                        </div>
                        <button
                          onClick={() => openPastForOrg(g)}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-40"
                          disabled={pastCount === 0}
                          title="View past scrims from this organization"
                          aria-disabled={pastCount === 0}
                        >
                          <Clock className="h-4 w-4" /> Past Scrims{" "}
                          {pastCount > 0 ? `(${pastCount})` : ""}
                        </button>
                      </div>
                    </div>

                    {/* Horizontal row */}
                    <div
                      className={`${
                        shouldScroll ? "overflow-x-auto" : "overflow-x-hidden"
                      } -mx-2 px-2`}
                    >
                      <div
                        className={`flex gap-4 ${
                          shouldScroll ? "snap-x snap-mandatory" : ""
                        }`}
                        style={{ paddingBottom: 2 }}
                        role="list"
                      >
                        {g.scrims.map((scrim) => {
                          const pastStrict = isPastScrimStrict(scrim);
                          const playersNow = currentPlayers(scrim);
                          const playersMax = maxPlayers(scrim);
                          const full = playersNow >= playersMax;

                          return (
                            <motion.div
                              key={scrim._id}
                              role="listitem"
                              whileHover={{ y: -2, scale: 1.01 }}
                              transition={{
                                type: "spring",
                                stiffness: 240,
                                damping: 20,
                              }}
                              className={`min-w-[260px] max-w-[300px] rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur
                              ${shouldScroll ? "snap-start" : ""} ${
                                pastStrict ? "opacity-60" : ""
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h4
                                  className="text-base font-semibold line-clamp-2"
                                  title={scrim.title}
                                >
                                  {scrim.title}
                                </h4>
                                <FeePill fee={scrim.entryFee} />
                              </div>

                              <div className="flex items-center gap-2 mb-2">
                                <GameTag game={scrim.game} />
                                <span className="text-[11px] text-white/60">
                                  {scrim.platform}
                                </span>
                              </div>

                              <div className="space-y-1 text-sm text-white/80 mb-3">
                                <div>
                                  <Calendar className="inline w-4 h-4 mr-1" />
                                  {formatDateTime(scrim)}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Users className="inline w-4 h-4" />
                                  <span className="text-white/80 text-sm">
                                    {playersNow}/{playersMax} players
                                  </span>
                                </div>
                                <CapBar now={playersNow} max={playersMax} />
                              </div>

                              <div className="flex gap-2">
                                <Link
                                  to={`/scrims/${scrim._id}`}
                                  className="flex-1 rounded-lg bg-white text-gray-900 text-center py-2 font-medium hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                                >
                                  Details
                                </Link>
                                {user &&
                                  user.role === "player" &&
                                  !pastStrict && (
                                    <button
                                      onClick={() => handleBookSlot(scrim._id)}
                                      disabled={full}
                                      className="flex-1 rounded-lg bg-emerald-500/90 text-white py-2 font-medium hover:bg-emerald-400 disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                                    >
                                      {full ? "Full" : "Book"}
                                    </button>
                                  )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <EmptyState onReset={clearAll} />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              className="mt-6 flex items-center justify-center gap-2"
              aria-label="Pagination"
            >
              <button
                onClick={() => handlePageChange(Math.max(1, filters.page - 1))}
                className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                disabled={filters.page === 1}
                aria-disabled={filters.page === 1}
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handlePageChange(i + 1)}
                    className={`h-9 w-9 rounded-xl text-sm font-medium
                    ${
                      filters.page === i + 1
                        ? "bg-white text-gray-900"
                        : "bg-white/5 hover:bg-white/10"
                    }`}
                    aria-current={filters.page === i + 1 ? "page" : undefined}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() =>
                  handlePageChange(Math.min(totalPages, filters.page + 1))
                }
                className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                disabled={filters.page === totalPages}
                aria-disabled={filters.page === totalPages}
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </nav>
          )}
        </div>

        {/* Past scrims modal */}
        <AnimatePresence>
          {pastOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
              aria-modal="true"
              role="dialog"
            >
              <motion.div
                initial={{ scale: 0.98, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.98, y: 10 }}
                transition={{ type: "spring", stiffness: 220, damping: 20 }}
                className="w-full max-w-4xl rounded-2xl border border-white/10 bg-[#0e0e17] shadow-xl"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden grid place-items-center border border-white/10 bg-white/10">
                      {pastOrg?.avatar ? (
                        <img
                          src={pastOrg.avatar}
                          alt={pastOrg.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-bold">
                          {pastOrg?.name?.charAt(0)?.toUpperCase() || "O"}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">
                        {pastOrg?.name || "Organization"}
                      </h3>
                      <div className="text-xs text-white/60">Past scrims</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setPastOpen(false)}
                    className="rounded-xl border border-white/10 bg-white/5 p-1.5 hover:bg-white/10"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-5 max-h-[70vh] overflow-y-auto">
                  {pastList.length > 0 ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pastList.map((scrim) => (
                        <div
                          key={scrim._id}
                          className="rounded-xl border border-white/10 bg-white/5 p-4"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="text-base font-semibold line-clamp-2">
                              {scrim.title}
                            </h4>
                            <FeePill fee={scrim.entryFee} />
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <GameTag game={scrim.game} />
                            <span className="text-[11px] text-white/60">
                              {scrim.platform}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm text-white/80 mb-3">
                            <div>
                              <Calendar className="inline w-4 h-4 mr-1" />
                              {formatDateTime(scrim)}
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="inline w-4 h-4" />
                              <span className="text-white/80 text-sm">
                                {currentPlayers(scrim)}/{maxPlayers(scrim)}{" "}
                                players
                              </span>
                            </div>
                            <CapBar
                              now={currentPlayers(scrim)}
                              max={maxPlayers(scrim)}
                            />
                          </div>
                          <Link
                            to={`/scrims/${scrim._id}`}
                            onClick={() => setPastOpen(false)}
                            className="block text-center rounded-lg bg-white text-gray-900 py-2 font-medium hover:bg-white/90"
                          >
                            View Details
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-white/60 py-10">
                      No old scrims found for this organization.
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ✅ Create Scrim Modal (same as OrgDashboard) */}
      <CreateScrimModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onScrimCreated={handleScrimCreated}
      />
    </>
  );
};

/** Group scrims by organization (createdBy) — for today's set only. */
function groupByOrg(list) {
  const map = new Map();
  for (const s of list) {
    const orgObj =
      typeof s.createdBy === "object" && s.createdBy ? s.createdBy : null;
    const orgId =
      orgObj?._id || s.createdBy || s.organizationId || s.orgId || null;
    const orgName =
      orgObj?.name || s.organizationName || "Unknown Organization";
    const orgAvatar =
      orgObj?.avatarUrl || orgObj?.profileImage || s.organizationAvatar || null;

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
  return Array.from(map.values()).sort((a, b) =>
    (a.orgName || "").localeCompare(b.orgName || "")
  );
}

export default ScrimList;