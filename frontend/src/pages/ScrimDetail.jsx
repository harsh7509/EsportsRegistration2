import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import {
  Calendar,
  Users,
  Trophy,
  DollarSign,
  Lock,
  ExternalLink,
  MessageSquare,
  Star,
  Trash2,
  Clock,
  ShieldCheck,
  ArrowLeft,
  plus,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { X } from "lucide-react";
import BookingModal from "../components/BookingModal";

import ScrimManagement from "../components/ScrimManagement";
import RoomView from "../components/RoomView";
import RatingModal from "../components/RateOrgModal";
import OrgRatingModal from "../components/OrgRatingModal";
import { scrimsAPI } from "../services/api";
import toast from "react-hot-toast";
import SEO from "../components/SEO"


/* --------------------- UI bits --------------------- */

const StatPill = ({ icon: Icon, children, tone = "default", title }) => {
  const map = {
    default: "bg-white/5 border-white/10 text-white/90",
    purple: "bg-gaming-purple/15 border-gaming-purple/30 text-gaming-purple",
    green: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
    yellow: "bg-yellow-500/15 border-yellow-500/30 text-yellow-300",
    red: "bg-red-500/15 border-red-500/30 text-red-300",
    cyan: "bg-gaming-cyan/15 border-gaming-cyan/30 text-gaming-cyan",
  };
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${map[tone]}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />} {children}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    upcoming: { label: "Upcoming", cls: "bg-emerald-500/15 text-emerald-300" },
    ongoing: { label: "Live Now", cls: "bg-pink-500/15 text-pink-300" },
    completed: { label: "Completed", cls: "bg-white/10 text-white/70" },
  };
  const s = map[status] || map.upcoming;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.cls}`}
    >
      {s.label}
    </span>
  );
};

const InfoRow = ({ label, value, icon: Icon }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="flex items-center gap-2 text-white/60">
      {Icon && <Icon className="h-4 w-4" />}
      {label}
    </span>
    <span className="font-medium">{value}</span>
  </div>
);

const Progress = ({ value = 0, max = 1 }) => {
  const pct = Math.min(100, Math.round((value / (max || 1)) * 100));
  return (
    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
      <div className="h-full bg-gaming-purple" style={{ width: `${pct}%` }} />
    </div>
  );
};

/* --------------------- Date helpers (robust) --------------------- */

const toValidDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  if (typeof v === "number") return new Date(v);

  // string cases
  let s = String(v).trim();
  if (!s) return null;

  // "YYYY-MM-DD HH:mm" -> "YYYY-MM-DDTHH:mm:00"
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/.test(s)) {
    s = s.replace(" ", "T") + ":00";
  }
  // "YYYY-MM-DD" (date-only) -> treat as local day start
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [Y, M, D] = s.split("-").map(Number);
    return new Date(Y, M - 1, D, 0, 0, 0, 0);
  }

  // Try native parse for ISO-like strings
  const d = new Date(s);
  if (!isNaN(d)) return d;

  // Fallback: replace '-' with '/' for Safari quirks
  const d2 = new Date(s.replace(/-/g, "/"));
  return isNaN(d2) ? null : d2;
};

const getPhase = (startISO, endISO) => {
  const now = Date.now();
  const s = toValidDate(startISO);
  const e = toValidDate(endISO);

  if (s && now < s.getTime()) return "before"; // future
  if (s && e && now >= s.getTime() && now <= e.getTime()) return "during"; // between
  if (e && now > e.getTime()) return "after"; // past
  return "unknown";
};

const fmtDateLocal = (v) => {
  const d = toValidDate(v);
  return d ? d.toLocaleDateString() : "TBA";
};

const fmtTimeRange = (startISO, endISO) => {
  const s = toValidDate(startISO);
  const e = toValidDate(endISO);
  if (!s) return "TBA";
  const sStr = s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const eStr = e
    ? e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "TBA";
  return `${sStr} – ${eStr}`;
};

const getStartEnd = (scrim) => ({
  start: scrim?.timeSlot?.start || scrim?.date || null,
  end: scrim?.timeSlot?.end || scrim?.timeSlot?.finish || null,
});

const pad2 = (n) => String(Math.max(0, n)).padStart(2, "0");

const Countdown = ({ startISO }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const start = toValidDate(startISO);
  if (!start) return <span className="text-white/60">TBA</span>;

  const diffMs = start.getTime() - now;
  if (diffMs <= 0) {
    return <span className="text-pink-300">Starting…</span>;
  }
  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  return (
    <span className="tabular-nums">
      {days > 0 ? `${days}d ` : ""}
      {pad2(hours)}h {pad2(mins)}m {pad2(secs)}s
    </span>
  );
};

/* --------------------- Main Component --------------------- */

const ScrimDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { user, isAuthenticated } = useAuth();
  const { socket } = useSocket();

  // ---------- state ----------
  const [scrim, setScrim] = useState(null);
  const [isBooked, setIsBooked] = useState(false);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [roomCredentials, setRoomCredentials] = useState(null);
  const [showManagement, setShowManagement] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showRoom, setShowRoom] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showOrgRatingModal, setShowOrgRatingModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // ---------- fetch ----------
  async function fetchScrimDetails() {
    try {
      const response = await scrimsAPI.getDetails(id);
      setScrim(response.data.scrim);
      setIsBooked(response.data.isBooked);
      setBooking(response.data.booking ?? null);
    } catch (error) {
      console.error("Failed to fetch scrim details:", error);
      toast.error("Failed to load scrim details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchScrimDetails(); /* eslint-disable-next-line */
  }, [id]);

  // After Cashfree redirect (?paid=1 or ?status=PAID), refresh and show success
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paid = params.get("paid");
    const status = (params.get("status") || "").toUpperCase();
    if (paid === "1" || status === "PAID") {
      toast.success("Payment confirmed! You’re registered.");
      fetchScrimDetails();
    }
  }, [location.search]);

  useEffect(() => {
    if (!socket || !scrim?._id) return;
    socket.emit("join-scrim", scrim._id);
    const onAdded = (data) => {
      if (data?.scrimId === scrim._id) {
        setScrim((prev) => ({
          ...prev,
          participants: [...(prev?.participants || []), data.participant],
        }));
        toast.success("New participant joined!");
      }
    };
    const onPoints = (data) => {
      if (data?.scrimId === scrim._id) {
        setScrim((prev) => ({ ...prev, pointsTableUrl: data.pointsTableUrl }));
        toast.success("Points table updated!");
      }
    };
    socket.on("scrim:participant_added", onAdded);
    socket.on("scrim:points_updated", onPoints);
    return () => {
      socket.off("scrim:participant_added", onAdded);
      socket.off("scrim:points_updated", onPoints);
    };
  }, [socket, scrim]);

  // ---------- guards ----------
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="card w-72">
          <div className="h-3 w-1/2 bg-white/10 rounded mb-2 animate-pulse" />
          <div className="h-3 w-1/3 bg-white/10 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!scrim) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-3">
            Scrim Not Found
          </h2>
          <Link to="/scrims" className="btn-primary inline-flex items-center">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Scrims
          </Link>
        </div>
      </div>
    );
  }

  // ---------- derived ----------
  const { start, end } = getStartEnd(scrim);
  const capacity = Number(scrim.capacity || 0);
  const joined = Number(scrim.participants?.length || 0);
  const isFull = joined >= capacity;
  const bookedPaid = isBooked || !!booking?.paid; // unified “I’m in” flag
  const isOwner = user && scrim.createdBy?._id === (user.id || user._id);
  const isOrg = isAuthenticated && user?.role === "organization";

  const startDate = toValidDate(start);
  const endDate = toValidDate(end);
  const showCountdown =
    scrim.status === "upcoming" &&
    startDate &&
    startDate.getTime() > Date.now();
  const liveLabel =
    scrim.status === "ongoing" ? (
      <span className="text-pink-300">Live now</span>
    ) : scrim.status === "completed" ? (
      <span className="text-white/70">Ended</span>
    ) : null;

  const bookingOpen = (() => {
    if (!scrim) return false;
    const s = toValidDate(start);
    const now = new Date();
    return s && now <= s && scrim.status === "upcoming";
  })();

  const canBook =
    isAuthenticated &&
    user?.role === "player" &&
    !isBooked &&
    !isFull &&
    bookingOpen;

  // ---------- handlers ----------
  const handleViewRoom = async () => {
    try {
      const response = await scrimsAPI.getRoomCredentials(id);
      setRoomCredentials(response.data);
    } catch {
      toast.error("Failed to get room credentials");
    }
  };

  const handleBookingSuccess = () => {
   setIsBooked(true);
   // For free scrims BookingModal will fetch room creds; just refresh details here.
   fetchScrimDetails();
 };

  // (remove this function or keep only the lines below if you ever call it)
  const handlePaymentSuccess = () => {
    fetchScrimDetails();
    toast.success("You have been added to the scrim room!");
  };

  const handleScrimUpdate = (updatedScrim) => setScrim(updatedScrim);
  const handleRatingSubmitted = () => fetchScrimDetails();

  const handleDeleteScrim = async (scrimId) => {
    if (deletingId) return;
    setDeletingId(scrimId);
    try {
      await scrimsAPI.deleteScrim(scrimId);
      toast.success("Scrim deleted successfully");
      setShowDeleteConfirm(false);
      navigate("/scrims");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete scrim");
    } finally {
      setDeletingId(null);
    }
  };

  // ---------- render ----------
  return (
    <>
      <SEO
        title="Scrim Details – Match Info & Teams | ArenaPulse"
        description="View complete details of this esports scrim including teams, schedule, format, and rules. Join and compete directly on ArenaPulse."
        keywords="scrim details, esports match info, join scrim, scrim schedule"
        canonical={`https://thearenapulse.xyz/scrims/${id}`} // dynamic
        schema={{
          "@context": "https://schema.org",
          "@type": "Event",
          name: "Esports Scrim",
          eventStatus: "https://schema.org/EventScheduled",
        }}
      />

      <div className="min-h-screen pb-20 sm:pb-8">
        {/* HERO */}
        <div className="relative">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(1200px_500px_at_10%_-10%,rgba(140,97,255,0.15),transparent_60%)]" />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() => navigate(-1)}
                className="text-white/70 hover:text-white inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <div className="flex items-center gap-2">
                <StatusBadge status={scrim.status} />
                {Number(scrim.rankScore) > 0 && (
                  <StatPill icon={Trophy} tone="purple" title="Rank score">
                    Rank {Number(scrim.rankScore).toFixed(1)}
                  </StatPill>
                )}
                {isOrg && (
        <button
          onClick={() => navigate("/scrims/create")}
          className="inline-flex items-center gap-2 bg-gaming-purple/80 hover:bg-gaming-purple text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
          title="Create a new scrim"
        >
          <Plus className="h-4 w-4" /> Create Scrim
        </button>
      )}
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden ring-1 ring-white/10 bg-white/5">
              {/* cover */}
              <div className="relative">
                {scrim.promoImageUrl ? (
                  <img
                    src={scrim.promoImageUrl}
                    alt={scrim.title}
                    className="w-full h-60 object-cover"
                  />
                ) : (
                  <div className="h-60 w-full bg-[radial-gradient(900px_450px_at_20%_10%,#6d28d9_0,#111827_55%,#0b0f1a_100%)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-2">
                  <StatPill icon={Calendar} tone="default">
                    {fmtDateLocal(scrim.date || start)}
                  </StatPill>
                  <StatPill icon={Users} tone="cyan">
                    {joined}/{capacity} players
                  </StatPill>
                  {Number(scrim.entryFee) > 0 ? (
                    <StatPill icon={DollarSign} tone="yellow">
                      ₹
                      {Number(scrim.entryFee || scrim.price).toLocaleString(
                        "en-IN"
                      )}
                    </StatPill>
                  ) : (
                    <StatPill icon={DollarSign} tone="green">
                      Free
                    </StatPill>
                  )}
                  {scrim.createdBy?.organizationInfo?.verified && (
                    <StatPill icon={ShieldCheck} tone="green">
                      Verified Org
                    </StatPill>
                  )}
                </div>
              </div>

              {/* title bar */}
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h1 className="text-2xl font-bold">{scrim.title}</h1>
                  <div className="text-sm text-white/70">
                    {(() => {
                      const phase = getPhase(start, end);
                      if (phase === "before")
                        return (
                          <>
                            Starts in: <Countdown startISO={start} />
                          </>
                        );
                      if (phase === "during")
                        return <span className="text-pink-300">Live now</span>;
                      if (phase === "after")
                        return <span className="text-white/70">Ended</span>;
                      // fallback if we truly can't parse dates:
                      return "TBA";
                    })()}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <StatPill icon={Clock} tone="default">
                    {fmtTimeRange(start, end)}
                  </StatPill>
                  <StatPill tone="default">{scrim.game}</StatPill>
                  <StatPill tone="default">{scrim.platform}</StatPill>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid lg:grid-cols-3 gap-8">
          {/* Left: content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h2 className="text-xl font-semibold mb-3">About This Scrim</h2>
              <p className="text-gray-300 leading-relaxed">
                {scrim.description || "No description provided."}
              </p>
            </div>

            {scrim.pointsTableUrl && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-3">
                  Points & Standings
                </h2>
                <a
                  href={scrim.pointsTableUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-gaming-cyan hover:text-gaming-cyan/80"
                >
                  View Points Table <ExternalLink className="h-4 w-4 ml-1" />
                </a>
              </div>
            )}

            {/* Owner management toggle */}
            {isOwner && showManagement && (
              <div className="card p-0 overflow-hidden">
                <ScrimManagement
                  scrim={scrim}
                  onScrimUpdate={handleScrimUpdate}
                />
              </div>
            )}

            {/* Room chat for players */}
            {isBooked && showRoom && (
              <div className="card p-0 overflow-hidden">
                <RoomView scrimId={scrim._id} isOwner={false} />
              </div>
            )}
          </div>

          {/* Right: sidebar */}
          <aside className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Join This Scrim</h3>

              <div className="space-y-3 mb-5">
                <InfoRow label="Game" value={scrim.game} />
                <InfoRow label="Platform" value={scrim.platform} />
                <InfoRow
                  label="Time"
                  value={fmtTimeRange(start, end)}
                  icon={Clock}
                />
              </div>

              {/* Capacity */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Participants</span>
                  <span>
                    {joined} / {capacity}
                  </span>
                </div>
                <Progress value={joined} max={capacity || 1} />
              </div>

              {/* Actions */}
              <div className="space-y-3">
                {bookedPaid ? (
                  <>
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
                      <span className="text-emerald-300 font-medium">
                        ✓ You're registered
                      </span>
                    </div>
                    <button
                      onClick={handleViewRoom}
                      className="w-full btn-primary"
                    >
                      
                      <Lock className="h-4 w-4 mr-2" /> View Room Credentials
                    </button>
                    <button
                      onClick={() => setShowRoom((v) => !v)}
                      className="w-full btn-secondary"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {showRoom ? "Hide" : "Show"} Room Chat
                    </button>
                    {scrim.status === "completed" && (
                      <>
                        <button
                          onClick={() => setShowRatingModal(true)}
                          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg transition-colors"
                        >
                          <Star className="h-4 w-4 mr-2" /> Rate Scrim
                        </button>
                        <button
                          onClick={() => setShowOrgRatingModal(true)}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors"
                        >
                          <Star className="h-4 w-4 mr-2" /> Rate Organization
                        </button>
                      </>
                    )}
                  </>
                ) : canBook ? (
                  <button
                    onClick={() => setShowBookingModal(true)}
                    className="w-full btn-primary"
                  >
                    Book Slot
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full bg-white/10 text-white/50 py-2 px-4 rounded-lg cursor-not-allowed"
                  >
                    {!isAuthenticated
                      ? "Login to Book"
                      : isFull
                      ? "Scrim Full"
                      : user?.role !== "player"
                      ? "Players Only"
                      : !bookingOpen
                      ? `Booking closed — starts at ${
                          startDate
                            ? startDate.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "TBA"
                        }`
                      : "Cannot Book"}
                  </button>
                )}

                {isOwner && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowManagement((v) => !v)}
                      className="w-full btn-secondary"
                    >
                      {showManagement ? "Hide Management" : "Manage Scrim"}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete Scrim
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Organizer card */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Organized By</h3>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/10 ring-1 ring-white/10 grid place-items-center text-sm font-bold">
                  {scrim.createdBy?.avatarUrl ? (
                    <img
                      src={scrim.createdBy.avatarUrl}
                      alt={scrim.createdBy?.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <span>
                      {scrim.createdBy?.name?.charAt(0)?.toUpperCase() || "O"}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium leading-tight">
                    {scrim.createdBy?.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {scrim.createdBy?.organizationInfo?.verified && (
                      <StatPill tone="green">✓ Verified</StatPill>
                    )}
                    <Link
                      to={`/organizations/${scrim.createdBy?._id}`}
                      className="text-gaming-cyan hover:text-gaming-cyan/80 text-sm"
                    >
                      View Profile
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Sticky mobile action bar */}
        <div className="fixed bottom-0 left-0 right-0 z-20 sm:hidden border-t border-white/10 bg-[#0b0b12]/95 backdrop-blur">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
            <div className="text-xs text-white/60">
              {joined}/{capacity} joined
            </div>
            <div className="flex-1">
              <Progress value={joined} max={capacity || 1} />
            </div>
            {bookedPaid ? (
              <button
                onClick={handleViewRoom}
                className="btn-primary px-4 py-2"
              >
                Room
              </button>
            ) : canBook ? (
              <button
                onClick={() => setShowBookingModal(true)}
                className="btn-primary px-4 py-2"
              >
                Book
              </button>
            ) : (
              <button disabled className="btn-secondary px-4 py-2 opacity-60">
                Closed
              </button>
            )}
            {isOrg && (
        <button
          onClick={() => navigate("/scrims/create")}
          className="inline-flex items-center gap-2 bg-gaming-purple/80 hover:bg-gaming-purple text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
          title="Create a new scrim"
        >
          <Plus className="h-4 w-4" /> Create Scrim
        </button>
      )}
          </div>
        </div>

        {/* Room Credentials Modal */}
        {roomCredentials && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 ring-1 ring-white/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Room Credentials</h3>
                <button
                  onClick={() => setRoomCredentials(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <div className="bg-gray-700 rounded-lg p-3">
                  <label className="text-xs text-gray-400 uppercase tracking-wide">
                    Room ID
                  </label>
                  <div className="flex items-center justify-between">
                    <code className="text-gaming-cyan font-mono">
                      {roomCredentials.roomId}
                    </code>
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(roomCredentials.roomId)
                      }
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div className="bg-gray-700 rounded-lg p-3">
                  <label className="text-xs text-gray-400 uppercase tracking-wide">
                    Password
                  </label>
                  <div className="flex items-center justify-between">
                    <code className="text-gaming-cyan font-mono">
                      {roomCredentials.roomPassword}
                    </code>
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(
                          roomCredentials.roomPassword
                        )
                      }
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setRoomCredentials(null)}
                className="w-full btn-primary"
              >
                Got it!
              </button>
            </div>
          </div>
        )}

        {/* Booking Modal */}
        <BookingModal
          scrim={scrim}
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          onBookingSuccess={handleBookingSuccess}
        />

        

        {/* Rating Modals */}
        <RatingModal
          scrim={scrim}
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          onRatingSubmitted={handleRatingSubmitted}
        />
        <OrgRatingModal
          organization={scrim.createdBy}
          scrim={scrim}
          isOpen={showOrgRatingModal}
          onClose={() => setShowOrgRatingModal(false)}
          onRatingSubmitted={handleRatingSubmitted}
        />

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 ring-1 ring-white/10">
              <h3 className="text-lg font-semibold mb-4">Delete Scrim</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete "
                <span className="font-medium">{scrim.title}</span>"? This action
                cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
                  onClick={() => handleDeleteScrim(scrim._id)}
                  disabled={deletingId === scrim._id}
                >
                  {deletingId === scrim._id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ScrimDetail;