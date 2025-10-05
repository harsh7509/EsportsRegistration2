// src/pages/TournamentDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  Users,
  Trophy,
  MapPin,
  ExternalLink,
  ArrowLeft,
  Share2,
  ShieldCheck,
  Info,
  ClipboardCopy,
  Edit3,
  Gift,
} from "lucide-react";
import { tournamentsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { NormalizeImageUrl } from "../utils/img";
import PlayerGroupRoomModal from "../components/PlayerGroupRoomModal";
import toast from "react-hot-toast";
import SEO from "../components/SEO";

const emptyPlayer = () => ({ ignName: "", ignId: "" });

const Badge = ({ children, className = "" }) => (
  <span
    className={`inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur ${className}`}
  >
    {children}
  </span>
);

const Row = ({ icon: Icon, children }) => (
  <div className="flex items-center gap-2 text-gray-200">
    <Icon className="h-4 w-4 opacity-80" />
    <span>{children}</span>
  </div>
);

const SectionCard = ({ title, icon: Icon, children }) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 sm:p-5">
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-4 w-4 text-white/70" />
      <h3 className="text-sm font-semibold text-white/90">{title}</h3>
    </div>
    <div className="prose prose-invert max-w-none text-gray-200 whitespace-pre-wrap leading-relaxed">
      {children}
    </div>
  </div>
);

const Field = ({ label, ...props }) => (
  <label className="group block">
    <div className="mb-1.5 text-xs text-gray-300/80">{label}</div>
    <input
      {...props}
      className={`w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none transition
      focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30 ${
        props.className || ""
      }`}
    />
  </label>
);

const PlayerCard = ({ index, value, onChange, required }) => (
  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
    <div className="mb-2 flex items-center justify-between text-xs">
      <div className="font-medium text-white/90">Player {index + 1}</div>
      <div
        className={`text-[10px] ${
          required ? "text-rose-300/90" : "text-white/50"
        }`}
      >
        {required ? "Required" : "Optional"}
      </div>
    </div>
    <div className="grid gap-2">
      <input
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
        placeholder="IGN name"
        value={value.ignName}
        onChange={(e) => onChange({ ...value, ignName: e.target.value })}
      />
      <input
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
        placeholder="IGN ID"
        value={value.ignId}
        onChange={(e) => onChange({ ...value, ignId: e.target.value })}
      />
    </div>
  </div>
);

const Skeleton = () => (
  <div className="max-w-5xl mx-auto p-6">
    <div className="h-64 w-full animate-pulse rounded-2xl bg-white/5" />
    <div className="mt-6 grid gap-4">
      <div className="h-8 w-1/2 animate-pulse rounded bg-white/5" />
      <div className="h-16 w-full animate-pulse rounded bg-white/5" />
      <div className="h-32 w-full animate-pulse rounded bg-white/5" />
    </div>
  </div>
);

/** ---------- Prize Pool UI (reads various shapes safely) ---------- */
const PrizePool = ({ tournament, compact = false }) => {
  const total =
    Number(
      tournament?.prizePoolTotal ??
        tournament?.prizePool ??
        tournament?.prizepool ??
        0
    ) || 0;

  const text =
    typeof tournament?.prizes === "string"
      ? tournament.prizes
      : tournament?.prizes?.description || "";

  let breakdown = [];
  if (Array.isArray(tournament?.prizeBreakdown)) {
    breakdown = tournament.prizeBreakdown;
  } else if (
    tournament?.prizeBreakdown &&
    typeof tournament.prizeBreakdown === "object"
  ) {
    breakdown = Object.entries(tournament.prizeBreakdown).map(
      ([place, amount]) => ({
        place: Number(place),
        amount: Number(amount),
      })
    );
  }

  const fmt = (n) =>
    typeof n === "number" ? `₹${n.toLocaleString("en-IN")}` : n;

  if (total <= 0 && !text && breakdown.length === 0) {
    return (
      <SectionCard title="Prize Pool" icon={Gift}>
        Details will be announced soon.
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Prize Pool" icon={Gift}>
      <div className={`flex ${compact ? "flex-col gap-3" : "flex-col gap-4"}`}>
        {total > 0 && (
          <div className="inline-flex items-center gap-2">
            <Badge className="bg-indigo-500/15 border-indigo-500/30 text-indigo-200">
              <Trophy className="h-3.5 w-3.5 mr-1" />
              Total: {fmt(total)}
            </Badge>
          </div>
        )}

        {breakdown.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {breakdown
              .sort((a, b) => Number(a.place) - Number(b.place))
              .map((row, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm"
                >
                  <span className="text-white/80">
                    {row.place === 1
                      ? "1st"
                      : row.place === 2
                      ? "2nd"
                      : row.place === 3
                      ? "3rd"
                      : `${row.place}th`}{" "}
                    Place
                  </span>
                  <span className="font-semibold">
                    {fmt(Number(row.amount) || 0)}
                  </span>
                </div>
              ))}
          </div>
        )}

        {text && <div className="text-sm text-gray-200/90">{text}</div>}
      </div>
    </SectionCard>
  );
};

const TournamentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [t, setT] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  const [showRegForm, setShowRegForm] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [phone, setPhone] = useState("");
  const [realName, setRealName] = useState("");
  const [players, setPlayers] = useState([
    emptyPlayer(),
    emptyPlayer(),
    emptyPlayer(),
    emptyPlayer(),
    emptyPlayer(),
  ]);

  const [activeTab, setActiveTab] = useState("about"); // about | rules | prizes
  const [localRegistered, setLocalRegistered] = useState(false); // flips true after successful register

  // NEW: my group/room state
  const [myGroup, setMyGroup] = useState(null); // { _id, number?, roomId? }
  const [groupStatusChecked, setGroupStatusChecked] = useState(false); // to control UI once check finishes
  const [roomOpen, setRoomOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await (tournamentsAPI.getDetails
          ? tournamentsAPI.getDetails(id)
          : tournamentsAPI.get(id));
        const doc = res?.data?.tournament || res?.data || null;
        setT(doc);
      } catch (e) {
        console.error("Fetch tournament error:", e);
        toast.error("Failed to load tournament");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const dateValue = t?.startAt || t?.timeSlot?.start || t?.date;
  const dateStr = useMemo(
    () => (dateValue ? new Date(dateValue).toLocaleString() : "TBA"),
    [dateValue]
  );

  // Normalize organizer object
  const org =
    typeof t?.organizationId === "object"
      ? t.organizationId
      : t?.organizationId
      ? { _id: t.organizationId }
      : null;

  const capacity = Math.max(0, Number(t?.capacity || 0));
  const registeredCount = Math.min(
    capacity || 0,
    Number(t?.registeredCount || 0)
  );
  const filledPct = capacity
    ? Math.round((registeredCount / capacity) * 100)
    : 0;

  const entryLabel =
    Number(t?.entryFee || 0) > 0
      ? `₹${Number(t.entryFee).toLocaleString("en-IN")}`
      : "Free";

  const canEdit = useMemo(() => {
    if (!user || !t) return false;
    if (user.role === "admin") return true;
    const uid = user._id || user.id;
    const orgId =
      org?._id ||
      (typeof t?.organizationId === "string" ? t.organizationId : null);
    const createdById =
      (typeof t?.createdBy === "object" && t.createdBy?._id) ||
      (typeof t?.createdBy === "string" ? t.createdBy : null);
    return (
      user.role === "organization" &&
      uid &&
      (uid === orgId || uid === createdById)
    );
  }, [user, t, org]);

  // ---------- Is current user already registered? (robust checks) ----------
  const isRegistered = useMemo(() => {
    if (localRegistered) return true; // trust local flag post-registration
    if (!user || !t) return false;
    const uid = user._id || user.id;

    // Direct boolean flags from backend
    if (typeof t.isRegistered === "boolean") return t.isRegistered;
    if (typeof t.myRegistration === "boolean") return t.myRegistration;

    // Common collections
    const inParticipants = Array.isArray(t.participants)
      ? t.participants.some(
          (p) =>
            (p?.userId?._id || p?.user?._id || p?.userId || p?._id || p) === uid
        )
      : false;

    const inRegistrations = Array.isArray(t.registrations)
      ? t.registrations.some(
          (r) =>
            (r?.userId?._id ||
              r?.captainId ||
              r?.teamLeadId ||
              r?.userId ||
              r?._id) === uid
        )
      : false;

    return inParticipants || inRegistrations;
  }, [t, user, localRegistered]);

  // ---------- Try to detect user's group/room once tournament + user ready ----------
  useEffect(() => {
    const tryFindMyGroup = async () => {
      if (!user || !t) return;
      const uid = user._id || user.id;
      try {
        // 1) Preferred: dedicated endpoint if available
        if (typeof tournamentsAPI.myGroup === "function") {
          const r = await tournamentsAPI.myGroup(t._id || id);
          const g = r?.data?.group || r?.data || null;
          if (g) {
            setMyGroup(g);
            return;
          }
        }

        // 2) Fallback: fetch groups list and search membership
        if (typeof tournamentsAPI.listGroups === "function") {
          const r = await tournamentsAPI.listGroups(t._id || id);
          const groups = r?.data?.groups || r?.groups || r?.data || [];
          if (Array.isArray(groups) && groups.length) {
            const found = groups.find((g, idx) => {
              const number =
                g.number ??
                g.index ??
                (typeof g.name === "string" && g.name.match(/\d+/)?.[0]) ??
                idx + 1;

              // accept many membership shapes
              const memberIds =
                g.memberIds ||
                g.membersIds ||
                g.participantIds ||
                g.userIds ||
                [];
              const membersArr = Array.isArray(memberIds) ? memberIds : [];

              const hasId = membersArr.some(
                (m) => (m?._id || m?.userId || m?.id || m) === uid
              );

              const hasObj = Array.isArray(g.members)
                ? g.members.some(
                    (m) =>
                      (m?.userId?._id ||
                        m?.user?._id ||
                        m?.userId ||
                        m?._id ||
                        m) === uid
                  )
                : false;

              const hasParticipants = Array.isArray(g.participants)
                ? g.participants.some(
                    (m) =>
                      (m?.userId?._id ||
                        m?.user?._id ||
                        m?.userId ||
                        m?._id ||
                        m) === uid
                  )
                : false;

              // attach number for UI convenience
              if ((hasId || hasObj || hasParticipants) && number != null)
                g.__number = Number(number);
              return hasId || hasObj || hasParticipants;
            });

            if (found) {
              setMyGroup(found);
              return;
            }
          }
        }

        // 3) Last fallback: if groups bundled inside tournament object
        if (Array.isArray(t.groups) && t.groups.length) {
          const f = t.groups.find((g, idx) => {
            const number =
              g.number ??
              g.index ??
              (typeof g.name === "string" && g.name.match(/\d+/)?.[0]) ??
              idx + 1;
            const memberIds =
              g.memberIds ||
              g.membersIds ||
              g.participantIds ||
              g.userIds ||
              [];
            const hasId = (Array.isArray(memberIds) ? memberIds : []).some(
              (m) => (m?._id || m?.userId || m?.id || m) === uid
            );
            const hasObj = Array.isArray(g.members)
              ? g.members.some(
                  (m) =>
                    (m?.userId?._id ||
                      m?.user?._id ||
                      m?.userId ||
                      m?._id ||
                      m) === uid
                )
              : false;
            const hasParticipants = Array.isArray(g.participants)
              ? g.participants.some(
                  (m) =>
                    (m?.userId?._id ||
                      m?.user?._id ||
                      m?.userId ||
                      m?._id ||
                      m) === uid
                )
              : false;

            if ((hasId || hasObj || hasParticipants) && number != null)
              g.__number = Number(number);
            return hasId || hasObj || hasParticipants;
          });
          if (f) setMyGroup(f);
        }
      } catch (err) {
        console.warn("myGroup lookup failed (non-fatal):", err);
      } finally {
        setGroupStatusChecked(true);
      }
    };

    if (isRegistered) {
      tryFindMyGroup();
    } else {
      // if not registered, still mark status checked to avoid indefinite "checking..."
      setGroupStatusChecked(true);
    }
  }, [isRegistered, t, id, user]);

  const myGroupNumber = useMemo(() => {
    if (!myGroup) return null;
    if (typeof myGroup.__number === "number") return myGroup.__number;
    if (typeof myGroup.number === "number") return myGroup.number;
    if (typeof myGroup.index === "number") return myGroup.index + 1;
    if (typeof myGroup.name === "string") {
      const m = myGroup.name.match(/\d+/);
      if (m) return Number(m[0]);
    }
    return null;
  }, [myGroup]);

  const goToMyGroup = () => {
    if (!myGroup) return;
    const gid = myGroup._id || myGroup.id || null;
    const roomId =
      myGroup.roomId || myGroup.room?.id || myGroup.room?._id || null;

    if (roomId) {
      navigate(`/rooms/${roomId}`);
      return;
    }
    if (gid) {
      navigate(`/tournaments/${t?._id || id}/groups/${gid}`);
      return;
    }
    toast.error("Group view not available");
  };

  const onPlayerChange = (idx, next) => {
    setPlayers((prev) => {
      const a = [...prev];
      a[idx] = next;
      return a;
    });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const submitRegister = async () => {
    try {
      if (!user) return toast.error("Please sign in to register");

      const p = players.slice(0, 5);
      const firstFourOk = p
        .slice(0, 4)
        .every((pp) => pp.ignName.trim() && pp.ignId.trim());
      if (!teamName.trim()) return toast.error("Team name required");
      if (!phone.trim()) return toast.error("Phone number required");
      if (!realName.trim()) return toast.error("Your real name required");
      if (!firstFourOk) return toast.error("Players 1–4 need IGN name & ID");

      setRegistering(true);
      const res = await tournamentsAPI.register(t?._id || id, {
        teamName,
        phone,
        realName,
        players: p.filter((x) => x.ignName || x.ignId),
      });
      const updated = res?.data?.tournament || res?.data;

      // Prefer updated doc, but at minimum flip the local flag so UI disables CTA
      if (updated) setT(updated);
      setLocalRegistered(true);

      setShowRegForm(false);
      toast.success("Registered!");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      console.error("Register failed:", e);
      toast.error(e?.response?.data?.message || "Registration failed");
    } finally {
      setRegistering(false);
    }
  };

  if (loading) return <Skeleton />;
  if (!t)
    return (
      <div className="max-w-5xl mx-auto p-6 text-red-400">
        Tournament not found
      </div>
    );

  return (
    <>
      <SEO
        title="Tournament Details – Brackets, Teams & Schedule | ArenaPulse"
        description="Explore the full details of this esports tournament — teams, brackets, schedules, and results. Register to compete and climb the ranks."
        keywords="tournament details, esports brackets, match schedule, join tournament"
        canonical={`https://thearenapulse.xyz/tournaments/${id}`}
        schema={{
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: "Esports Tournament",
          eventStatus: "https://schema.org/EventScheduled",
        }}
      />

      <div className="relative">
        {/* sticky mobile CTA */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-gray-900/70 backdrop-blur supports-[backdrop-filter]:bg-gray-900/50 p-3 sm:hidden">
          <div className="mx-auto flex max-w-5xl items-center gap-2">
            {t.registrationUrl ? (
              isRegistered ? (
                <button
                  disabled
                  className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white/70 cursor-not-allowed"
                  title="You are already registered"
                >
                  Already Registered
                </button>
              ) : (
                <a
                  href={t.registrationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 rounded-xl bg-indigo-500 px-4 py-3 text-center text-sm font-semibold text-white active:scale-[0.99]"
                >
                  Register Now
                </a>
              )
            ) : (
              <button
                onClick={() => !isRegistered && setShowRegForm((v) => !v)}
                disabled={isRegistered}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold active:scale-[0.99] ${
                  isRegistered
                    ? "bg-white/10 text-white/70 cursor-not-allowed"
                    : "bg-indigo-500 text-white hover:bg-indigo-600"
                }`}
                title={isRegistered ? "You are already registered" : undefined}
              >
                {isRegistered
                  ? "Already Registered"
                  : showRegForm
                  ? "Hide Form"
                  : "Register Now"}
              </button>
            )}

            {/* NEW: Mobile "My Group" / status */}
            {isRegistered &&
              (groupStatusChecked && myGroup ? (
                <button
                  onClick={() => setRoomOpen(true)}
                  className="rounded-xl bg-emerald-600 px-3 py-3 text-white font-semibold"
                  title="Open your group room"
                >
                  {myGroupNumber
                    ? `My Group: ${myGroupNumber}`
                    : "Check Your Room"}
                </button>
              ) : (
                <Badge className="px-3 py-2">
                  {groupStatusChecked ? "Group not made" : "Checking…"}
                </Badge>
              ))}

            <button
              onClick={copyLink}
              className="rounded-xl border border-white/10 bg-white/5 p-3 text-white"
              aria-label="Copy link"
            >
              <ClipboardCopy className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-6 pb-24 sm:pb-8">
          {/* Top nav back + actions */}
          <div className="mb-4 flex items-center justify-between">
            <Link
              to="/tournaments"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <div className="flex items-center gap-2">
              {canEdit && (
                <Link
                  to={`/tournaments/${t._id || id}/edit`}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10"
                >
                  <Edit3 className="h-4 w-4" /> Edit
                </Link>
              )}
              {/* NEW: Desktop "My Group" / status inline (top actions) */}
              {isRegistered &&
                (groupStatusChecked && myGroup ? (
                  <button
                    onClick={() => setRoomOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
                    title="Open your group room"
                  >
                    <Users className="h-4 w-4" />
                    {myGroupNumber
                      ? `My Group: ${myGroupNumber}`
                      : "Check Your Room"}
                  </button>
                ) : (
                  <Badge className="px-2.5 py-1.5">
                    {groupStatusChecked ? "Group not made" : "Checking…"}
                  </Badge>
                ))}

              <button
                onClick={copyLink}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          </div>

          {/* HERO */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-gray-800/60 to-gray-900/60 backdrop-blur">
            <div className="relative">
              {t.bannerUrl ? (
                <img
                  src={NormalizeImageUrl(t.bannerUrl)}
                  alt={t.title}
                  className="h-64 w-full object-cover"
                />
              ) : (
                <div className="h-64 w-full bg-[radial-gradient(1200px_600px_at_20%_10%,#6d28d9_0,#111827_50%,#0b0f1a_100%)]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2">
                <Badge>{entryLabel}</Badge>
                {capacity > 0 && (
                  <Badge>
                    {registeredCount}/{capacity} slots
                  </Badge>
                )}
                <Badge className="hidden sm:inline-flex">
                  <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Verified
                  Tournament
                </Badge>
              </div>
            </div>

            <div className="grid gap-6 p-6 sm:p-8 sm:grid-cols-[1.4fr_.9fr]">
              {/* Left: title + meta */}
              <div>
                <h1 className="mb-2 text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  {t.title}
                </h1>

                {org && (
                  <div className="mb-4 flex items-center gap-3 text-gray-300">
                    <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/5">
                      {org.avatarUrl ? (
                        <img
                          src={NormalizeImageUrl(org.avatarUrl)}
                          alt={
                            org.name || org.organizationInfo?.orgName || "Org"
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-bold">
                          {
                            (org.name ||
                              org.organizationInfo?.orgName ||
                              "O")?.[0]
                          }
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {org.name ||
                          org.organizationInfo?.orgName ||
                          "Organization"}
                      </span>
                      {org.organizationInfo?.location && (
                        <span className="text-sm inline-flex items-center gap-1 text-white/70">
                          <MapPin className="h-4 w-4" />
                          {org.organizationInfo.location}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid gap-2 text-sm sm:grid-cols-3">
                  <Row icon={Calendar}>{dateStr}</Row>
                  <Row icon={Users}>
                    {capacity
                      ? `${registeredCount}/${capacity} slots`
                      : `${registeredCount} registered`}
                  </Row>
                  <Row icon={Trophy}>{entryLabel}</Row>
                </div>

                {capacity > 0 && (
                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-xs text-white/70">
                      <span>Capacity</span>
                      <span>{filledPct}% filled</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full bg-indigo-500"
                        style={{ width: `${filledPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right: CTA */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
                <div className="mb-3 text-sm text-white/70">
                  Ready to compete?
                </div>
                <div className="flex flex-wrap gap-2">
                  {t.registrationUrl ? (
                    isRegistered ? (
                      <button
                        disabled
                        className="inline-flex flex-1 items-center justify-center rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white/70 cursor-not-allowed"
                        title="You are already registered"
                      >
                        Already Registered
                      </button>
                    ) : (
                      <a
                        href={t.registrationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex flex-1 items-center justify-center rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 active:scale-[0.99]"
                      >
                        Register Now <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    )
                  ) : (
                    <button
                      onClick={() => !isRegistered && setShowRegForm((v) => !v)}
                      disabled={isRegistered}
                      className={`inline-flex flex-1 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold ${
                        isRegistered
                          ? "bg-white/10 text-white/70 cursor-not-allowed"
                          : "bg-indigo-500 text-white hover:bg-indigo-600 active:scale-[0.99]"
                      }`}
                      title={
                        isRegistered ? "You are already registered" : undefined
                      }
                    >
                      {isRegistered
                        ? "Already Registered"
                        : showRegForm
                        ? "Hide Form"
                        : "Register Now"}
                    </button>
                  )}
                  {org?._id && (
                    <Link
                      to={`/organizations/${org._id}`}
                      className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10"
                    >
                      Organization
                    </Link>
                  )}
                  {canEdit && (
                    <Link
                      to={`/tournaments/${t._id || id}/edit`}
                      className="inline-flex items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-2.5 text-sm font-semibold text-indigo-200 hover:bg-indigo-500/20"
                      title="Edit tournament"
                    >
                      <Edit3 className="mr-2 h-4 w-4" /> Edit
                    </Link>
                  )}

                  {/* NEW: Desktop CTA — My Group / status */}
                  {isRegistered &&
                    (groupStatusChecked && myGroup ? (
                      <button
                        onClick={() => setRoomOpen(true)}
                        className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                        title="Open your group room"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        {myGroupNumber
                          ? `My Group: ${myGroupNumber}`
                          : "Check Your Room"}
                      </button>
                    ) : (
                      <Badge className="px-3 py-2">
                        {groupStatusChecked ? "Group not made" : "Checking…"}
                      </Badge>
                    ))}
                </div>
                <div className="mt-3 text-xs text-white/60 leading-relaxed">
                  Payments & refunds (if applicable) are handled by the
                  organizer. Make sure your IGN details are correct.
                </div>
              </div>
            </div>
          </div>
          {/* Group Room Modal */}
          <PlayerGroupRoomModal
            open={roomOpen && isRegistered}
            onClose={() => setRoomOpen(false)}
            tournamentId={t?._id || id}
          />

          {/* Tabs */}
          <div className="mt-6">
            <div className="flex gap-2 overflow-x-auto rounded-xl border border-white/10 bg-white/5 p-1">
              {[
                { key: "about", label: "About", icon: Info },
                { key: "rules", label: "Rules", icon: ShieldCheck },
                { key: "prizes", label: "Prizes", icon: Trophy },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`inline-flex min-w-[100px] items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm transition
                ${
                  activeTab === key
                    ? "bg-indigo-500 text-white"
                    : "text-white/80 hover:bg-white/10"
                }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {/* About */}
            <SectionCard title="About this Tournament" icon={Info}>
              {t.description || "Details will be updated soon."}
            </SectionCard>

            {/* Prize Pool */}
            <PrizePool tournament={t} />

            {/* Conditional blocks for Rules/Prizes with tab emphasis */}
            {activeTab === "rules" && (
              <SectionCard title="Rules" icon={ShieldCheck}>
                {t.rules || "Rules will be shared by the organizer."}
              </SectionCard>
            )}
            {activeTab === "prizes" && (
              <SectionCard title="Prizes" icon={Trophy}>
                {t.prizes || "Prize details will be announced soon."}
              </SectionCard>
            )}
          </div>

          {/* Inline Registration Form */}
          {showRegForm && !isRegistered && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-white/0 p-4 sm:p-6">
              <div className="mb-3 text-lg font-semibold text-white">
                Team Registration
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field
                  label="Team name"
                  placeholder="e.g., NightRaiders"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />
                <Field
                  label="Phone number"
                  placeholder="10-digit phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Field
                  label="Your real name"
                  placeholder="Captain full name"
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                />
              </div>

              <div className="mt-4">
                <div className="mb-2 text-sm text-white/80">
                  Players (1–4 required, 5 optional)
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {players.map((p, idx) => (
                    <PlayerCard
                      key={idx}
                      index={idx}
                      value={p}
                      onChange={(next) => onPlayerChange(idx, next)}
                      required={idx < 4}
                    />
                  ))}
                </div>
                <div className="mt-3 text-xs text-white/60">
                  Ensure IGN name & ID exactly match in-game to avoid
                  disqualification.
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white hover:bg-white/10"
                  onClick={() => setShowRegForm(false)}
                >
                  Cancel
                </button>
                <button
                  className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 active:scale-[0.99]"
                  disabled={registering}
                  onClick={submitRegister}
                >
                  {registering ? "Registering…" : "Submit Registration"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TournamentDetails;
