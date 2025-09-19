import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { tournamentsAPI } from "./../services/api.js";
import {
  Calendar, Users, Trophy, MapPin, Search, Filter, RefreshCw, ChevronRight,
} from "lucide-react";

const priceLabel = (n) => {
  const v = Number(n || 0);
  return v > 0 ? `₹${v.toLocaleString("en-IN")}` : "Free";
};

const StatusBadge = ({ startAt, endAt }) => {
  const now = Date.now();
  const s = startAt ? new Date(startAt).getTime() : null;
  const e = endAt ? new Date(endAt).getTime() : null;

  let label = "Upcoming";
  let color = "bg-emerald-500/15 text-emerald-300";
  if (s && e && now >= s && now <= e) {
    label = "Live";
    color = "bg-pink-500/15 text-pink-300";
  } else if (e && now > e) {
    label = "Completed";
    color = "bg-white/10 text-white/70";
  }

  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${color}`}>
      {label}
    </span>
  );
};

const CapacityBar = ({ registered = 0, capacity = 0 }) => {
  const pct = capacity ? Math.min(100, Math.round((registered / capacity) * 100)) : 0;
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
    </div>
  );
};

const SkeletonCard = () => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 animate-pulse">
    <div className="h-36 w-full rounded-xl bg-white/10" />
    <div className="mt-3 h-4 w-2/3 rounded bg-white/10" />
    <div className="mt-2 h-3 w-1/3 rounded bg-white/10" />
    <div className="mt-4 h-3 w-1/2 rounded bg-white/10" />
  </div>
);

export default function TournamentList() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // UI state
  const [q, setQ] = useState("");
  const [game, setGame] = useState("all");
  const [sortKey, setSortKey] = useState("date_desc"); // date_desc | fee_asc | fee_desc | cap_desc

  const load = async () => {
    try {
      setLoading(true);
      const res = await tournamentsAPI.list({ limit: 50 });
      const data = res?.data;
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.tournaments)
        ? data.tournaments
        : [];
      setItems(arr);
      setError("");
    } catch (e) {
      console.error("fetch tournaments failed:", e);
      setError(e?.response?.data?.message || e?.message || "Failed to load tournaments");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const games = useMemo(() => {
    const gset = new Set((items || []).map((t) => (t.game || "").trim()).filter(Boolean));
    return ["all", ...Array.from(gset).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const filtered = useMemo(() => {
    let arr = [...items];

    // search
    const term = q.trim().toLowerCase();
    if (term) {
      arr = arr.filter((t) => {
        const title = (t.title || "").toLowerCase();
        const g = (t.game || "").toLowerCase();
        const orgName =
          typeof t.organizationId === "object"
            ? (t.organizationId.name || t.organizationId?.organizationInfo?.orgName || "").toLowerCase()
            : "";
        return title.includes(term) || g.includes(term) || orgName.includes(term);
      });
    }

    // game filter
    if (game !== "all") {
      arr = arr.filter((t) => (t.game || "").trim() === game);
    }

    // sort
    arr.sort((a, b) => {
      const aDate = new Date(a.startAt || a.timeSlot?.start || a.date || 0).getTime();
      const bDate = new Date(b.startAt || b.timeSlot?.start || b.date || 0).getTime();
      const aFee = Number(a.entryFee || 0);
      const bFee = Number(b.entryFee || 0);
      const aCap = Number(a.capacity || 0);
      const bCap = Number(b.capacity || 0);

      switch (sortKey) {
        case "date_desc":
          return (bDate || 0) - (aDate || 0);
        case "fee_asc":
          return aFee - bFee;
        case "fee_desc":
          return bFee - aFee;
        case "cap_desc":
          return (bCap || 0) - (aCap || 0);
        default:
          return 0;
      }
    });

    return arr;
  }, [items, q, game, sortKey]);

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tournaments</h1>
          <p className="text-sm text-white/60">Find, filter & join your next competition.</p>
        </div>
        <Link to="/tournaments/new" className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 active:scale-[0.99]">
          Create Tournament
        </Link>
      </div>

      {/* Controls */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, game, or organizer…"
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        {/* Game filter */}
        <div className="relative">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          <select
            value={game}
            onChange={(e) => setGame(e.target.value)}
            className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 pl-10 pr-10 py-2.5 text-sm text-white outline-none focus:border-white/20"
          >
            {games.map((g) => (
              <option className="bg-gray-900" key={g} value={g}>
                {g === "all" ? "All games" : g}
              </option>
            ))}
          </select>
          <ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-white/50" />
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-3 pr-10 py-2.5 text-sm text-white outline-none focus:border-white/20"
          >
            <option className="bg-gray-900" value="date_desc">Newest first</option>
            <option className="bg-gray-900" value="fee_asc">Lowest fee</option>
            <option className="bg-gray-900" value="fee_desc">Highest fee</option>
            <option className="bg-gray-900" value="cap_desc">Highest capacity</option>
          </select>
          <ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-white/50" />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          <div className="mb-2 font-medium">Couldn’t load tournaments</div>
          <div className="flex items-center gap-2">
            <span className="text-white/80">{error}</span>
            <button
              onClick={load}
              className="ml-auto inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => {
            const dateValue = t?.startAt || t?.timeSlot?.start || t?.date;
            const dateStr = dateValue ? new Date(dateValue).toLocaleString() : "TBA";
            const org =
              typeof t.organizationId === "object" ? t.organizationId : null;
            const registered = Number(t.registeredCount || 0);
            const capacity = Number(t.capacity || 0);

            return (
              <Link
                key={t._id}
                to={`/tournaments/${t._id}`}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur transition hover:border-white/20"
              >
                {/* Banner */}
                <div className="relative">
                  {t.bannerUrl ? (
                    <img
                      src={t.bannerUrl}
                      alt={t.title}
                      className="h-40 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="h-40 w-full bg-[radial-gradient(1000px_500px_at_15%_10%,#6d28d9_0,#111827_55%,#0b0f1a_100%)]" />
                  )}
                  <div className="absolute left-3 top-3 flex items-center gap-2">
                    <StatusBadge startAt={t.startAt || t?.timeSlot?.start} endAt={t.endAt || t?.timeSlot?.end} />
                    <span className="rounded-full bg-black/40 px-2 py-0.5 text-[11px] text-white/80">
                      {priceLabel(t.entryFee)}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4">
                  <h3 className="line-clamp-1 text-[15px] font-semibold text-white">
                    {t.title}
                  </h3>
                  <div className="mt-1 flex items-center gap-2 text-xs text-white/70">
                    <Trophy className="h-3.5 w-3.5" />
                    <span className="line-clamp-1">{t.game || "—"}</span>
                  </div>

                  {org && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-white/60">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="line-clamp-1">
                        {org.name || org.organizationInfo?.orgName || "Organizer"}
                      </span>
                    </div>
                  )}

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/70">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="line-clamp-1">{dateStr}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>
                        {registered}/{capacity || 0} slots
                      </span>
                    </div>
                  </div>

                  {capacity > 0 && (
                    <CapacityBar registered={registered} capacity={capacity} />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        // Empty state
        <div className="grid place-items-center rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
          <div className="mx-auto max-w-md">
            <div className="text-4xl">🎮</div>
            <h3 className="mt-3 text-lg font-semibold">No tournaments found</h3>
            <p className="mt-1 text-sm text-white/60">
              Try changing the filters or create your first tournament.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  setQ("");
                  setGame("all");
                  setSortKey("date_desc");
                }}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                Reset filters
              </button>
              <Link
                to="/tournaments/new"
                className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600"
              >
                Create one
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
