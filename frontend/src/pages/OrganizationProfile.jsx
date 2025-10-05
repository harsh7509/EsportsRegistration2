// src/pages/OrganizationProfile.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Star,
  Calendar,
  MapPin,
  Shield,
  Camera,
  Trophy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  organizationsAPI,
  uploadAPI,
  authAPI,
  tournamentsAPI,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import ScrimCard from "../components/ScrimCard";
import toast from "react-hot-toast";
import SEO from "../components/SEO";

export default function OrganizationProfile() {
  const { orgId } = useParams();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  // base organization data
  const [orgData, setOrgData] = useState(null);
  const [loading, setLoading] = useState(true);

  // avatar upload
  const [uploading, setUploading] = useState(false);
  const [imgBroken, setImgBroken] = useState(false);

  // tournaments
  const [tourLoading, setTourLoading] = useState(true);
  const [tournaments, setTournaments] = useState([]);

  // UI toggles
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [showAllScrims, setShowAllScrims] = useState(false);
  const [showPastTournaments, setShowPastTournaments] = useState(false);

  // ---- effects: load org details + tournaments ----
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setImgBroken(false);
      try {
        const res = await organizationsAPI.getDetails(orgId);
        if (alive) setOrgData(res.data);
      } catch (error) {
        console.error("Failed to fetch organization details:", error);
        toast.error(error?.response?.data?.message || "Organization not found");
        if (alive) setOrgData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [orgId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setTourLoading(true);
      try {
        // Try server-side filter first
        const res = await tournamentsAPI.list({ organizationId: orgId });
        let list =
          res?.data?.items || res?.data?.tournaments || res?.data || [];

        // fallback: fetch all and filter client-side
        if (!Array.isArray(list) || !list.length) {
          const all = await tournamentsAPI.list();
          const arr =
            all?.data?.items || all?.data?.tournaments || all?.data || [];
          list = arr.filter((t) => {
            const oid = t?.organizationId?._id || t?.organizationId;
            return String(oid) === String(orgId);
          });
        }

        if (alive) setTournaments(Array.isArray(list) ? list : []);
      } catch (e) {
        console.warn("tournaments load failed:", e);
        if (alive) setTournaments([]);
      } finally {
        if (alive) setTourLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [orgId]);

  // ---- derived helpers (memoized, always called in same order) ----
  const canEditAvatar = useMemo(() => {
    if (!user || !orgData?.organization) return false;
    const uid = user._id || user.id;
    return (
      user.role === "organization" &&
      uid &&
      String(uid) === String(orgData.organization._id)
    );
  }, [user, orgData]);

  const {
    organization,
    averageRating = 0,
    totalRatings = 0,
    categoryAverages = {},
    ratings = [],
    scrims = [],
  } = orgData || {};

  const avatarSrc =
    !imgBroken &&
    (organization?.avatarUrl ||
      organization?.profileImage ||
      organization?.organizationInfo?.logoUrl ||
      null);

  const banner =
    organization?.organizationInfo?.coverUrl ||
    organization?.coverImage ||
    null;

  const { ongoingOrUpcoming, past } = useMemo(() => {
    const now = Date.now();
    const list = Array.isArray(tournaments) ? tournaments : [];

    const isPast = (t) => {
      const end = t?.endAt ? new Date(t.endAt).getTime() : null;
      const start = t?.startAt ? new Date(t.startAt).getTime() : null;
      if (end) return end < now;
      if (start) return start < now - 6 * 60 * 60 * 1000; // started >6h ago → treat as past
      return false; // unknown dates → assume upcoming
    };

    const upcomingSort = (a, b) =>
      new Date(a?.startAt || 0).getTime() - new Date(b?.startAt || 0).getTime();

    const pastSort = (a, b) =>
      new Date(b?.startAt || 0).getTime() - new Date(a?.startAt || 0).getTime();

    const up = list.filter((t) => !isPast(t)).sort(upcomingSort);
    const ps = list.filter((t) => isPast(t)).sort(pastSort);

    return { ongoingOrUpcoming: up, past: ps };
  }, [tournaments]);

  const visibleScrims = useMemo(
    () => (showAllScrims ? scrims : scrims.slice(0, 4)),
    [scrims, showAllScrims]
  );

  // ---- actions ----
  const handlePickFile = () => fileInputRef.current?.click();

  const handleUploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setUploading(true);
    try {
      const res = await uploadAPI.uploadImage(file);
      const imageUrl = res?.data?.imageUrl || res?.data?.avatarUrl;
      if (!imageUrl) throw new Error("Upload did not return an image URL");

      await authAPI.updateProfile({ avatarUrl: imageUrl });

      try {
        const me = await authAPI.getMe();
        localStorage.setItem("user", JSON.stringify(me?.data?.user || {}));
      } catch {}

      setImgBroken(false);
      setOrgData((prev) =>
        prev
          ? {
              ...prev,
              organization: { ...prev.organization, avatarUrl: imageUrl },
            }
          : prev
      );

      toast.success("Profile photo updated!");
    } catch (err) {
      console.error("Avatar upload failed:", err);
      toast.error(err?.response?.data?.message || "Failed to upload photo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ---- tiny UI helpers ----
  const renderStars = (rating = 0) =>
    [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating)
            ? "text-yellow-400 fill-current"
            : "text-gray-600"
        }`}
      />
    ));

  // ---- skeletons / empty states ----
  if (loading) {
    return (
      <div className="min-h-[60vh] px-4">
        <div className="mx-auto mt-8 max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 ring-1 ring-white/10">
          <div className="h-40 w-full animate-pulse bg-gradient-to-r from-slate-800 to-slate-700" />
          <div className="p-6 sm:p-8">
            <div className="mb-6 flex items-start gap-5">
              <div className="h-24 w-24 rounded-full bg-white/10 ring-1 ring-white/10 animate-pulse" />
              <div className="flex-1 space-y-3">
                <div className="h-7 w-64 rounded bg-white/10 animate-pulse" />
                <div className="h-4 w-40 rounded bg-white/10 animate-pulse" />
                <div className="h-4 w-72 rounded bg-white/10 animate-pulse" />
              </div>
              <div className="hidden h-12 w-24 rounded bg-white/10 animate-pulse sm:block" />
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="h-40 rounded-xl bg-white/5 ring-1 ring-white/10 animate-pulse" />
              <div className="h-40 rounded-xl bg-white/5 ring-1 ring-white/10 animate-pulse" />
              <div className="h-40 rounded-xl bg-white/5 ring-1 ring-white/10 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!orgData) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-rose-400">
            Organization Not Found
          </h2>
          <p className="text-slate-400">
            Please check the URL or try again later.
          </p>
        </div>
      </div>
    );
  }

  // ---- view ----
  return (
    <>
      <SEO
        title="Esports Organization Profile – Events & Stats | ArenaPulse"
        description="View the profile of this esports organization — their hosted events, player rosters, and past achievements on ArenaPulse."
        keywords="esports organization, org profile, hosted tournaments, esports team"
        canonical={`https://thearenapulse.xyz/organizations/${orgId}`}
        schema={{
          "@context": "https://schema.org",
          "@type": "SportsOrganization",
          name: "Esports Organization",
        }}
      />

      <div className="min-h-screen py-6 sm:py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Banner Card */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 ring-1 ring-white/10">
            {/* Banner */}
            <div className="relative h-36 sm:h-44">
              {banner ? (
                <img
                  src={banner}
                  alt={`${organization.name} banner`}
                  className="h-full w-full object-cover opacity-80"
                  title={`${organization.name} banner`}
                />
              ) : (
                <div className="h-full w-full bg-[linear-gradient(135deg,#4f46e5_0%,#7c3aed_50%,#db2777_100%)] opacity-90" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/30 to-transparent" />
            </div>

            {/* Header */}
            <div className="p-6 sm:p-8">
              <div className="flex items-start gap-6">
                {/* Avatar */}
                <div className="relative -mt-16 h-24 w-24 shrink-0 rounded-full ring-4 ring-slate-900/80">
                  <div className="h-full w-full overflow-hidden rounded-full bg-indigo-500/20 ring-1 ring-white/15 grid place-items-center">
                    {avatarSrc ? (
                      <img
                        key={avatarSrc}
                        src={avatarSrc}
                        alt={organization.name}
                        title={`${organization.name} avtar`}
                        className="h-full w-full object-cover"
                        onError={() => setImgBroken(true)}
                      />
                    ) : (
                      <span className="text-3xl font-bold text-white">
                        {organization.name?.charAt(0)?.toUpperCase() || "O"}
                      </span>
                    )}
                  </div>

                  {canEditAvatar && (
                    <>
                      <button
                        type="button"
                        onClick={handlePickFile}
                        disabled={uploading}
                        className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full bg-indigo-600 text-white shadow-md
                                 ring-2 ring-slate-900/80 transition hover:bg-indigo-500 disabled:opacity-60"
                        title="Change photo"
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleUploadAvatar}
                        className="hidden"
                      />
                    </>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <h1 className="truncate text-2xl font-bold text-white sm:text-3xl">
                      {organization.name}
                    </h1>
                    {organization.organizationInfo?.verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-3 py-1 text-sm text-emerald-300 ring-1 ring-emerald-300/20">
                        <Shield className="h-4 w-4" />
                        Verified
                      </span>
                    )}
                  </div>

                  {organization.organizationInfo?.location && (
                    <div className="mb-3 inline-flex items-center gap-2 text-slate-300">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">
                        {organization.organizationInfo.location}
                      </span>
                    </div>
                  )}

                  {/* Rating summary + toggles */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      {renderStars(averageRating)}
                      <span className="text-2xl font-bold text-white">
                        {Number(averageRating).toFixed(1)}
                      </span>
                      <span className="text-slate-400">({totalRatings})</span>
                    </div>

                    <button
                      onClick={() => setShowBreakdown((v) => !v)}
                      className="text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15"
                    >
                      Rating breakdown{" "}
                      {showBreakdown ? (
                        <ChevronUp className="inline h-3 w-3" />
                      ) : (
                        <ChevronDown className="inline h-3 w-3" />
                      )}
                    </button>

                    <button
                      onClick={() => setShowReviews((v) => !v)}
                      className="text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15"
                    >
                      Reviews{" "}
                      {showReviews ? (
                        <ChevronUp className="inline h-3 w-3" />
                      ) : (
                        <ChevronDown className="inline h-3 w-3" />
                      )}
                    </button>
                  </div>

                  {uploading && (
                    <div className="mt-2 text-sm text-slate-300">
                      Uploading photo…
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="hidden text-right sm:block">
                  <div className="text-3xl font-bold text-indigo-400">
                    {scrims?.length || 0}
                  </div>
                  <div className="text-sm text-slate-400">Scrims Created</div>
                </div>
              </div>
            </div>
          </div>

          {/* Collapsibles under the header */}
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {/* LEFT: breakdown + reviews (collapsible) */}
            <div className="space-y-6 lg:col-span-1">
              {/* Rating Breakdown */}
              {showBreakdown && (
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 ring-1 ring-white/10">
                  <h2 className="mb-4 text-xl font-semibold text-white">
                    Rating Breakdown
                  </h2>
                  {orgData && Object.keys(categoryAverages || {}).length ? (
                    <div className="space-y-4">
                      {Object.entries(categoryAverages).map(
                        ([category, rating]) => (
                          <div key={category}>
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-sm font-medium capitalize text-slate-200">
                                {category}
                              </span>
                              <span className="text-sm font-bold text-white">
                                {Number(rating || 0).toFixed(1)}/5
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(0, ((rating || 0) / 5) * 100)
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">
                      No category ratings yet.
                    </p>
                  )}
                </div>
              )}

              {/* Recent Reviews */}
              {showReviews && (
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 ring-1 ring-white/10">
                  <h2 className="mb-4 text-xl font-semibold text-white">
                    Recent Reviews
                  </h2>
                  <div className="space-y-4">
                    {ratings?.length ? (
                      ratings.slice(0, 6).map((r) => (
                        <div
                          key={r._id}
                          className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="font-medium text-white">
                              {r.playerId?.name || "Player"}
                            </span>
                            <div className="flex items-center space-x-1">
                              {renderStars(r.rating || 0)}
                            </div>
                          </div>
                          {r.comment && (
                            <p className="mb-2 text-sm text-slate-200">
                              {r.comment}
                            </p>
                          )}
                          {r.scrimId?.title && (
                            <div className="text-xs text-slate-400">
                              for “{r.scrimId.title}”
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="py-4 text-center text-slate-400">
                        No reviews yet
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Scrims + Tournaments */}
            <div className="lg:col-span-2 space-y-8">
              {/* Scrims */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 ring-1 ring-white/10">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">
                    Recent Scrims
                  </h2>
                  <div className="flex items-center gap-3">
                    <div className="hidden text-right sm:block">
                      <div className="text-sm text-slate-400">Total</div>
                      <div className="text-2xl font-bold text-indigo-400">
                        {scrims?.length || 0}
                      </div>
                    </div>
                    {scrims?.length > 4 && (
                      <button
                        onClick={() => setShowAllScrims((v) => !v)}
                        className="text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15"
                      >
                        {showAllScrims ? "Show fewer" : "View all"}
                      </button>
                    )}
                  </div>
                </div>

                {visibleScrims?.length ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    {visibleScrims.map((scrim) => (
                      <ScrimCard key={scrim._id} scrim={scrim} />
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Calendar className="mx-auto mb-4 h-14 w-14 text-slate-600" />
                    <h3 className="mb-1 text-xl font-medium text-slate-300">
                      No scrims yet
                    </h3>
                    <p className="text-slate-400">
                      This organization hasn&apos;t created any scrims
                    </p>
                  </div>
                )}
              </div>

              {/* Tournaments */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 ring-1 ring-white/10">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">
                    Tournaments
                  </h2>
                  <div className="flex items-center gap-3">
                    <div className="hidden text-right sm:block">
                      <div className="text-sm text-slate-400">Total</div>
                      <div className="text-2xl font-bold text-indigo-400">
                        {tournaments?.length || 0}
                      </div>
                    </div>
                    {past?.length > 0 && (
                      <button
                        onClick={() => setShowPastTournaments((v) => !v)}
                        className="text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15"
                      >
                        {showPastTournaments
                          ? "Hide past"
                          : "See past tournaments"}
                      </button>
                    )}
                  </div>
                </div>

                {tourLoading ? (
                  <div className="py-12 text-center text-slate-400">
                    Loading…
                  </div>
                ) : (
                  <>
                    {/* ongoing/upcoming */}
                    {ongoingOrUpcoming?.length ? (
                      <>
                        <h3 className="mb-3 text-sm font-medium text-slate-300">
                          Ongoing / Upcoming
                        </h3>
                        <div className="grid gap-6 md:grid-cols-2">
                          {ongoingOrUpcoming.map((t) => (
                            <TournamentCard key={t._id} t={t} />
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="py-8 text-center text-slate-400">
                        No upcoming tournaments
                      </div>
                    )}

                    {/* past (collapsible) */}
                    {showPastTournaments && past?.length > 0 && (
                      <div className="mt-8">
                        <h3 className="mb-3 text-sm font-medium text-slate-300">
                          Past
                        </h3>
                        <div className="grid gap-6 md:grid-cols-2">
                          {past.map((t) => (
                            <TournamentCard key={t._id} t={t} />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- Helper card ---------------- */
function TournamentCard({ t }) {
  const startAt = t?.startAt ? new Date(t.startAt).toLocaleString() : "TBA";
  const entry = Number(t?.entryFee || t?.price || 0);

  return (
    <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10 hover:ring-white/20 transition">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white line-clamp-1">
            {t?.title || "Tournament"}
          </h3>
          <div className="mt-1 text-sm text-slate-300">{startAt}</div>
        </div>
        <div className="text-right">
          <div className="text-slate-400 text-xs">Entry</div>
          <div className="text-indigo-300 font-bold">₹{entry}</div>
        </div>
      </div>

      {t?.description && (
        <p className="mt-2 text-sm text-slate-300 line-clamp-2">
          {t.description}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-slate-400">
          Capacity: {t?.capacity || 0}
        </div>
        <Link
          to={`/tournaments/${t?._id}`}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
        >
          View details
        </Link>
      </div>
    </div>
  );
}
