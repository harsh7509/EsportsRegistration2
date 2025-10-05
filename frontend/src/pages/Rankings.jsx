
import React, { useEffect, useMemo, useState } from "react";
import {
  Trophy,
  Star,
  Users,
  Award,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
} from "lucide-react";
import { organizationsAPI } from "../services/api";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import OrgRatingModal from "../components/OrgRatingModal";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import SEO from "../components/SEO";

/** ------- helpers ------- */
const num = (v, d = 0) => {
  const n =
    typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : d;
};
const mean = (arr) =>
  arr.length ? arr.reduce((a, c) => a + c, 0) / arr.length : 0;

const pickAverage = (o) => {
  const direct =
    o?.averageRating ??
    o?.avgRating ??
    o?.ratingAverage ??
    o?.avg ??
    o?.rating ??
    o?.ratings?.average;
  if (direct != null) return num(direct, 0);
  const cats = o?.categoryAverages || o?.categories || o?.scores || {};
  const vals = [
    "organization",
    "communication",
    "fairness",
    "experience",
    "overall",
  ]
    .map((k) => num(cats?.[k], NaN))
    .filter((x) => Number.isFinite(x));
  return mean(vals);
};
const pickCount = (o) => {
  const direct =
    o?.totalRatings ??
    o?.ratingsCount ??
    o?.ratingCount ??
    o?.reviewCount ??
    o?.reviews ??
    o?.ratings?.count;
  return num(direct, 0);
};
const normalizeOrg = (o) => {
  const avg = pickAverage(o);
  const total = pickCount(o);
  const catsSrc = o?.categoryAverages || o?.categories || o?.scores || {};
  return {
    _id: o._id,
    name: o.name || o.displayName || "Unnamed Org",
    email: o.email,
    avatarUrl: o.avatarUrl || o.profileImage || o.logoUrl || null,
    averageRating: avg,
    totalRatings: total,
    categoryAverages: {
      organization: num(catsSrc.organization),
      communication: num(catsSrc.communication),
      fairness: num(catsSrc.fairness),
      experience: num(catsSrc.experience),
    },
    scrimCount: num(
      o.scrimCount,
      Array.isArray(o.scrims) ? o.scrims.length : 0
    ),
    organizationInfo: o.organizationInfo || {},
  };
};

const getRankBadge = (index) => {
  if (index === 0)
    return { icon: "🥇", color: "text-yellow-400", bg: "bg-yellow-500/15" };
  if (index === 1)
    return { icon: "🥈", color: "text-slate-300", bg: "bg-slate-300/15" };
  if (index === 2)
    return { icon: "🥉", color: "text-amber-600", bg: "bg-amber-600/15" };
  return { icon: `#${index + 1}`, color: "text-white/70", bg: "bg-white/10" };
};

const Stars = ({ rating = 0, size = "h-4 w-4" }) => (
  <div className="flex items-center">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`${size} ${
          i < Math.round(rating - 0.001)
            ? "text-yellow-400 fill-yellow-400"
            : "text-white/25"
        }`}
      />
    ))}
  </div>
);

const SkeletonCard = () => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
    <div className="flex items-center gap-4">
      <div className="h-14 w-14 rounded-full bg-white/10 animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/3 bg-white/10 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-white/10 rounded animate-pulse" />
      </div>
    </div>
  </div>
);

const CategoryMeter = ({ label, value }) => {
  const pct = Math.min(100, Math.max(0, Math.round((num(value, 0) / 5) * 100)));
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-white/60 mb-1">
        <span>{label}</span>
        <span className="text-white/70">{num(value, 0).toFixed(1)}/5</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-fuchsia-400/90"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

/** ------- component ------- */
const Rankings = () => {
  const { isAuthenticated, user } = useAuth();
  const canRate = isAuthenticated && user?.role === "player";

  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // UI: sort + search + filter
  const [sortBy, setSortBy] = useState("rank"); // rank | rating | reviews
  const [q, setQ] = useState("");
  const [minReviews, setMinReviews] = useState(0);
  const [compact, setCompact] = useState(false);

  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const [didScrollHighlight, setDidScrollHighlight] = useState(false);

  const [rateOpen, setRateOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);

  useEffect(() => {
    fetchOrgRankings();
    // eslint-disable-next-line
  }, [currentPage]);

  useEffect(() => {
    if (loading || !highlightId || didScrollHighlight) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`org-${highlightId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setDidScrollHighlight(true);
      }
    }, 60);
    return () => clearTimeout(t);
  }, [loading, organizations, highlightId, didScrollHighlight]);

  const fetchOrgRankings = async () => {
    setLoading(true);
    try {
      const response = await organizationsAPI.getRankings({
        page: currentPage,
        limit: 10,
      });
      const data = response?.data || {};
      const list = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.organizations)
        ? data.organizations
        : [];
      let base = list.length
        ? list
        : Array.isArray((await organizationsAPI.getAllOrganizations())?.data)
        ? (await organizationsAPI.getAllOrganizations()).data
        : (await organizationsAPI.getAllOrganizations())?.data?.items || [];
      const normalized = (base || []).map(normalizeOrg);
      setOrganizations(normalized);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch organization rankings:", error);
      toast.error("Could not load rankings");
      setOrganizations([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // client-side search + filter + sort
  const processed = useMemo(() => {
    let arr = [...organizations];

    // search
    const term = q.trim().toLowerCase();
    if (term) {
      arr = arr.filter((o) => (o.name || "").toLowerCase().includes(term));
    }

    // min reviews
    if (minReviews > 0) {
      arr = arr.filter((o) => num(o.totalRatings, 0) >= minReviews);
    }

    // sort
    if (sortBy === "rating")
      arr.sort((a, b) => b.averageRating - a.averageRating);
    else if (sortBy === "reviews")
      arr.sort((a, b) => b.totalRatings - a.totalRatings);
    else
      arr.sort(
        (a, b) =>
          b.averageRating - a.averageRating || b.totalRatings - a.totalRatings
      ); // rank

    return arr;
  }, [organizations, sortBy, q, minReviews]);

  const openRate = (org) => {
    setSelectedOrg(org);
    setRateOpen(true);
  };

  // Top-3 podium (first 3)
  const podium = processed.slice(0, 3);
  const rest = processed.slice(3);

  return (
    <>
      <SEO
        title="Esports Organization Rankings – Top Organizations | ArenaPulse"
        description="Discover the top esports organizations ranked by performance in ArenaPulse tournaments. Stay updated with real-time team stats and standings."
        keywords="esports organization rankings, top esports teams, team leaderboard, esports standings"
        canonical="https://thearenapulse.xyz/rankings"
        schema={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Organization Rankings",
          description:
            "Rankings of top-performing esports organizations and teams on ArenaPulse.",
        }}
      />

      <div className="min-h-screen bg-[#0b0b12] text-white">
        {/* Sticky toolbar */}
        <div className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0b12]/80 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="h-7 w-7 text-yellow-400" />
              <div>
                <h1 className="text-xl font-bold leading-tight">
                  Organization Rankings
                </h1>
                <p className="text-xs text-white/60">
                  Top-rated orgs by player feedback & performance
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* search */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search orgs…"
                  className="w-44 sm:w-56 rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>

              {/* sort */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-white/60" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-xl border border-white/10 bg-white/5 py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-white/30"
                >
                  <option value="rank">Sort: Rank</option>
                  <option value="rating">Sort: Rating</option>
                  <option value="reviews">Sort: Reviews</option>
                </select>
              </div>

              {/* min reviews */}
              <select
                value={minReviews}
                onChange={(e) => setMinReviews(Number(e.target.value))}
                className="rounded-xl border border-white/10 bg-white/5 py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-white/30"
                title="Minimum reviews"
              >
                <option value={0}>Min reviews: 0+</option>
                <option value={5}>5+</option>
                <option value={10}>10+</option>
                <option value={25}>25+</option>
                <option value={50}>50+</option>
              </select>

              {/* compact toggle */}
              <button
                onClick={() => setCompact((v) => !v)}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  compact
                    ? "border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-200"
                    : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                }`}
                title="Toggle compact view"
              >
                {compact ? "Comfort" : "Compact"}
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Criteria */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur mb-8">
            <h2 className="text-lg font-semibold mb-4">Ranking Criteria</h2>
            <div className="grid gap-6 md:grid-cols-4 text-sm">
              <div className="text-center">
                <Award className="mx-auto mb-2 h-6 w-6 text-fuchsia-300" />
                <p className="font-medium">Organization</p>
                <p className="text-white/60">Event planning & execution</p>
              </div>
              <div className="text-center">
                <Users className="mx-auto mb-2 h-6 w-6 text-cyan-300" />
                <p className="font-medium">Communication</p>
                <p className="text-white/60">Clarity & responsiveness</p>
              </div>
              <div className="text-center">
                <Trophy className="mx-auto mb-2 h-6 w-6 text-emerald-300" />
                <p className="font-medium">Fairness</p>
                <p className="text-white/60">Rules & fair play</p>
              </div>
              <div className="text-center">
                <Star className="mx-auto mb-2 h-6 w-6 text-yellow-300" />
                <p className="font-medium">Experience</p>
                <p className="text-white/60">Overall satisfaction</p>
              </div>
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : processed.length ? (
            <>
              {/* Podium top-3 */}
              {!!podium.length && (
                <div className="grid gap-4 md:grid-cols-3 mb-8">
                  {podium.map((org, idx) => {
                    const rank = getRankBadge(idx);
                    const avg = num(org.averageRating, 0);
                    const total = num(org.totalRatings, 0);
                    return (
                      <motion.div
                        key={org._id}
                        layout
                        className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.04] p-5 backdrop-blur hover:shadow-2xl hover:shadow-fuchsia-500/10 transition"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`grid h-12 w-12 place-items-center rounded-full ${rank.bg} ${rank.color} text-xl font-bold`}
                            title={`Rank ${idx + 1}`}
                          >
                            {rank.icon}
                          </div>
                          <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/10">
                            {org.avatarUrl ? (
                              <img
                                src={org.avatarUrl}
                                alt={org.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="font-semibold">
                                {org.name?.[0]?.toUpperCase() || "O"}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold leading-tight line-clamp-1">
                              {org.name}
                            </div>
                            <div className="flex items-center gap-2">
                              <Stars rating={avg} />
                              <span className="text-sm font-semibold">
                                {avg.toFixed(1)}
                              </span>
                              <span className="text-xs text-white/60">
                                ({total})
                              </span>
                            </div>
                          </div>
                          <Link
                            to={`/organizations/${org._id}`}
                            className="text-cyan-300 hover:text-cyan-200 text-sm"
                          >
                            View
                          </Link>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Rest of list */}
              <div className="space-y-4 mb-8">
                {rest.map((org, idx) => {
                  const listIndex = idx + 3;
                  const rank = getRankBadge(listIndex);
                  const avg = num(org.averageRating, 0);
                  const total = num(org.totalRatings, 0);
                  const cats = org.categoryAverages || {};
                  const isHighlight = highlightId === org._id;
                  return (
                    <motion.div
                      key={org._id}
                      id={`org-${org._id}`}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className={`rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur hover:border-fuchsia-300/40 transition-all ${
                        isHighlight
                          ? "ring-2 ring-fuchsia-400/60 shadow-[0_0_0_4px_rgba(217,70,239,0.18)]"
                          : ""
                      }`}
                    >
                      <div
                        className={`flex ${
                          compact ? "items-center" : "items-start"
                        } gap-5`}
                      >
                        <div
                          className={`grid ${
                            compact ? "h-12 w-12" : "h-16 w-16"
                          } place-items-center rounded-full ${rank.bg} ${
                            rank.color
                          } text-xl font-bold`}
                          title={`Rank ${listIndex + 1}`}
                        >
                          {rank.icon}
                        </div>
                        <div
                          className={`grid ${
                            compact ? "h-12 w-12" : "h-16 w-16"
                          } place-items-center overflow-hidden rounded-full border border-white/10 bg-white/10`}
                        >
                          {org.avatarUrl ? (
                            <img
                              src={org.avatarUrl}
                              alt={org.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-bold">
                              {org.name?.[0]?.toUpperCase() || "O"}
                            </span>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <h3
                              className={`font-semibold ${
                                compact ? "" : "text-xl"
                              }`}
                            >
                              {org.name}
                            </h3>
                            {org.organizationInfo?.verified && (
                              <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs text-emerald-300">
                                ✓ Verified
                              </span>
                            )}
                            {isHighlight && (
                              <span className="rounded-full bg-fuchsia-400/15 px-2 py-0.5 text-xs text-fuchsia-300">
                                You
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <Stars rating={avg} />
                            <span className="text-lg font-semibold">
                              {avg.toFixed(1)}
                            </span>
                            <span className="text-sm text-white/60">
                              ({total} reviews)
                            </span>
                            <span className="ml-auto text-sm text-fuchsia-300">
                              {org.scrimCount || 0} scrims
                            </span>
                          </div>

                          {!compact && (
                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                              <CategoryMeter
                                label="Organization"
                                value={cats.organization}
                              />
                              <CategoryMeter
                                label="Communication"
                                value={cats.communication}
                              />
                              <CategoryMeter
                                label="Fairness"
                                value={cats.fairness}
                              />
                              <CategoryMeter
                                label="Experience"
                                value={cats.experience}
                              />
                            </div>
                          )}
                        </div>

                        <div className="min-w-[160px] text-right">
                          <div className="flex flex-col gap-2">
                            <Link
                              to={`/organizations/${org._id}`}
                              className="text-cyan-300 hover:text-cyan-200 inline-flex items-center justify-end text-sm"
                            >
                              <Eye className="mr-1 h-4 w-4" />
                              View Profile
                            </Link>
                            {canRate && (
                              <button
                                onClick={() => {
                                  setSelectedOrg(org);
                                  setRateOpen(true);
                                }}
                                className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-white/90"
                              >
                                Rate This Org
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setCurrentPage(i + 1);
                        setDidScrollHighlight(false);
                      }}
                      className={`h-9 w-9 rounded-xl text-sm font-medium ${
                        currentPage === i + 1
                          ? "bg-white text-gray-900"
                          : "bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
              <Trophy className="mx-auto mb-3 h-12 w-12 text-white/30" />
              <p className="text-lg font-semibold">
                No organizations ranked yet
              </p>
              <p className="text-white/60">
                Organizations will appear once they receive ratings.
              </p>
            </div>
          )}
        </div>

        {/* Rating Modal */}
        <OrgRatingModal
          open={rateOpen}
          onClose={() => setRateOpen(false)}
          org={selectedOrg}
          onSubmitted={() => {
            toast.success("Rating saved");
            fetchOrgRankings();
          }}
        />
      </div>
    </>
  );
};

export default Rankings;
