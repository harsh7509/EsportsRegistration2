import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Gamepad2,
  Trophy,
  Users,
  Calendar,
  ArrowRight,
  Crown,
  Activity,
  BarChart3,
  Sparkles,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PromoCarousel from "../components/PromoCarousel";
import ScrimCard from "../components/ScrimCard";
import { scrimsAPI } from "../services/api";
import SEO from "../components/SEO"


const TZ = "Asia/Kolkata";
const asDate = (v) => (v ? new Date(v) : null);

const getStartDate = (s) =>
  asDate(
    s?.startTime ??
      s?.startAt ??
      s?.scheduledAt ??
      s?.date ??
      s?.startDate ??
      null
  );

// Compare Y-M-D in IST
const isTodayInIST = (dateObj) => {
  if (!dateObj || isNaN(dateObj.getTime?.())) return false;
  const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  const dIST = new Date(dateObj.toLocaleString("en-US", { timeZone: TZ }));
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return ymd(nowIST) === ymd(dIST);
};

/* -------------------- UI atoms -------------------- */
const SectionHeader = ({ title, cta, to }) => (
  <div className="mb-8 flex items-center justify-between">
    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
    {cta && to && (
      <Link to={to} className="text-cyan-300 hover:text-cyan-200 transition">
        {cta} →
      </Link>
    )}
  </div>
);

const StatPill = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-2xl bg-white/5 ring-1 ring-white/10 px-5 py-4 backdrop-blur">
    <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-sm text-white/70">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  </div>
);

const LoadingCard = () => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur animate-pulse">
    <div className="h-40 w-full rounded-xl bg-white/10" />
    <div className="mt-4 h-4 w-2/3 rounded bg-white/10" />
    <div className="mt-2 h-3 w-1/2 rounded bg-white/10" />
  </div>
);

const Empty = ({ msg }) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
    <p className="text-white/80">{msg}</p>
  </div>
);

const LiveTicker = ({ items = [] }) => (
  <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5">
    <motion.div
      className="flex gap-8 whitespace-nowrap py-3 px-4"
      initial={{ x: 0 }}
      animate={{ x: [0, -600] }}
      transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
    >
      {items.concat(items).map((s, i) => (
        <div
          key={i}
          className="inline-flex items-center gap-2 text-sm text-white/90"
        >
          <Activity className="h-4 w-4 text-emerald-300" />
          <span className="font-medium">{s?.game || "Game"}</span>
          <span className="opacity-70">|</span>
          <span className="opacity-80">{s?.title || s?.name || "Matchup"}</span>
          <span className="opacity-50">•</span>
          <span className="text-emerald-300">today</span>
        </div>
      ))}
    </motion.div>
  </div>
);

/* -------------------- fee buckets (fixed ranges) -------------------- */
const getFee = (s) => {
  const v = s?.entryFee ?? s?.fee ?? 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const feeBuckets = [
  {
    key: "free",
    label: "Free Scrims (₹0)",
    icon: Sparkles,
    test: (s) => getFee(s) === 0,
  },
  {
    key: "starter",
    label: "Starter Scrims(₹25)",
    icon: Trophy,
    test: (s) => {
      const f = getFee(s);
      return f >= 1 && f <= 25;
    },
  },
  {
    key: "challenger",
    label: "Challenger Scrims (₹50)",
    icon: Crown,
    test: (s) => {
      const f = getFee(s);
      return f >= 26 && f <= 50;
    },
  },
  {
    key: "premium",
    label: "Premium Scrims ",
    icon: Crown,
    test: (s) => getFee(s) >= 51,
  },
];

/* -------------------- chart data -------------------- */
const mkChartData = (list = []) => {
  const base = list.slice(0, 8).map((s, i) => ({
    idx: i + 1,
    rank: Math.max(300 + (s?.rankScore || 0) * 10, 280 + i * 10),
  }));
  if (base.length === 0) {
    return Array.from({ length: 8 }, (_, i) => ({
      idx: i + 1,
      rank: 280 + i * 15 + ((Math.random() * 20) | 0),
    }));
  }
  return base;
};

/* -------------------- page -------------------- */
const Landing = () => {
  // allScrims => NO date filter (used by Top Ranked)
  const [allScrims, setAllScrims] = useState([]);
  // todayScrims => IST today's filter (used by buckets + ticker)
  const [todayScrims, setTodayScrims] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const res = await scrimsAPI.getList({
          sort: "rank",
          limit: 50,
          status: "upcoming",
        });

        if (!mounted) return;

        const items = Array.isArray(res?.data?.items) ? res.data.items : [];
        setAllScrims(items);

        const todayOnly = items.filter((s) => isTodayInIST(getStartDate(s)));
        setTodayScrims(todayOnly);
      } catch (e) {
        console.error(e);
        if (mounted) setError("Unable to load scrims right now.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  // Buckets & counts from TODAY ONLY
  const buckets = useMemo(
    () =>
      feeBuckets.map((b) => ({
        ...b,
        list: todayScrims.filter(b.test).slice(0, 3),
        count: todayScrims.filter(b.test).length,
      })),
    [todayScrims]
  );

  // Chart can reflect overall activity
  const chartData = useMemo(() => mkChartData(allScrims), [allScrims]);

  return (<>
      <SEO
        title="ArenaPulse – Centralized Esports Platform for Scrims & Tournaments"
        description="ArenaPulse is the ultimate esports hub where players and organizations create, host, and join scrims and tournaments. Access multiple orgs, manage matches, and compete — all without Discord or WhatsApp."
        keywords="thearenapulse, esports platform, tournaments, scrims, gaming events, ArenaPulse, esports hub, online competitions, host scrims, join tournaments"
        canonical="https://thearenapulse.xyz/"
        schema={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "ArenaPulse",
          url: "https://thearenapulse.xyz/",
          description:
            "A centralized esports platform for hosting and joining scrims and tournaments.",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://thearenapulse.xyz/search?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }}
      />
    <div className="min-h-screen bg-[#0b0b12] text-white">

      <section className="relative overflow-hidden">
        {/* glow orbs */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-[32rem] w-[32rem] rounded-full bg-gradient-to-br from-fuchsia-500/30 via-violet-500/20 to-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-[28rem] w-[28rem] rounded-full bg-gradient-to-tr from-cyan-400/20 via-sky-400/10 to-fuchsia-500/20 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 pt-14 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="pb-8">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-balance text-5xl font-extrabold leading-tight md:text-6xl"
            >
              <span className="bg-gradient-to-r from-fuchsia-400 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
                Arena Pulse
              </span>
              <br />
              The Pro Hub
            </motion.h1>
            <p className="mt-4 max-w-xl text-white/80">
              Your mission control for competitive gaming — live matches,
              analytics, rankings, and community. Built for pros.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-lg font-semibold text-gray-900 transition hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Start Competing{" "}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/scrims"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-lg font-semibold text-white backdrop-blur transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/50"
              >
                Browse Scrims
              </Link>
            </div>

            {/* quick stats */}
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <StatPill
                icon={Gamepad2}
                label="Today's Scrims"
                value={todayScrims.length || "—"}
              />
              <StatPill icon={Users} label="Community" value="10k+ players" />
              <StatPill icon={Trophy} label="Events Hosted" value="1.2k+" />
            </div>
          </div>

          {/* Decorative hero card instead of 3D */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-white/0 p-1">
            <div className="rounded-[calc(theme(borderRadius.3xl)-0.25rem)] bg-[#0f0f19] p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm text-white/70">
                    <Trophy className="h-4 w-4" /> Featured Tournament
                  </div>
                  <p className="text-white/90">
                    Champions Circuit — Qualifiers
                  </p>
                  <p className="mt-1 text-sm text-white/60">
                    Starts 7 PM IST • ₹50K Prize Pool
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm text-white/70">
                    <Calendar className="h-4 w-4" /> Your Next Match
                  </div>
                  <p className="text-white/90">Valorant — Ascent</p>
                  <p className="mt-1 text-sm text-white/60">
                    Tomorrow • Slot #12
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 md:col-span-2">
                  <div className="mb-3 flex items-center gap-2 text-sm text-white/70">
                    <BarChart3 className="h-4 w-4" /> Rank Momentum
                  </div>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chartData}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="gradL"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#22d3ee"
                              stopOpacity={0.9}
                            />
                            <stop
                              offset="100%"
                              stopColor="#a78bfa"
                              stopOpacity={0.1}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#ffffff14"
                        />
                        <XAxis
                          dataKey="idx"
                          stroke="#9ca3af"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#9ca3af"
                          fontSize={12}
                          width={28}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#0f172a",
                            border: "1px solid #334155",
                            color: "#e5e7eb",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="rank"
                          stroke="#22d3ee"
                          fill="url(#gradL)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* live ticker (today only) */}
        <div className="relative mx-auto -mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
          <LiveTicker
            items={
              todayScrims.length
                ? todayScrims
                : [
                    { title: "Alpha vs Bravo", game: "Valorant" },
                    { title: "Kings vs Knights", game: "BGMI" },
                    { title: "Squad Rush", game: "CODM" },
                  ]
            }
          />
        </div>
      </section>

      {/* Promo */}
      <section className="bg-[#0e0e17] py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <PromoCarousel />
        </div>
      </section>

      {/* Browse by Entry Fee (today only) */}
      <section className="bg-[#0b0b12] py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Browse by Entry Fee (Today)"
            cta="View All"
            to="/scrims"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {buckets.map(({ key, label, count, icon: Icon }) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-white/70">{label}</p>
                    <p className="text-lg font-semibold">{count}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-white/60" />
              </div>
            ))}
          </div>

          <div className="mt-10 space-y-12">
            {buckets.map(({ key, label, list }) => (
              <div key={key}>
                <h3 className="mb-5 text-xl font-semibold">{label}</h3>
                {loading ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <LoadingCard key={i} />
                    ))}
                  </div>
                ) : list.length ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {list.map((s) => (
                      <ScrimCard key={s._id || s.id} scrim={s} />
                    ))}
                  </div>
                ) : (
                  <Empty msg={`No Scrims available`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Ranked (NO date filter) */}
      <section className="bg-[#0e0e17] py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Top Ranked Scrims"
            cta="View All"
            to="/scrims"
          />
          {error && (
            <div className="mb-6 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-200">
              {error}
            </div>
          )}
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <LoadingCard key={i} />
              ))}
            </div>
          ) : allScrims.length ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {allScrims.map((s) => (
                <ScrimCard key={s._id || s.id} scrim={s} />
              ))}
            </div>
          ) : (
            <Empty msg="No top ranked scrims yet" />
          )}
        </div>
      </section>

      {/* Community Preview */}
      {/* <section className="bg-[#0b0b12] py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader title="Community Hub" cta="Open Hub" to="/community" />
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="mb-3 flex items-center gap-2 text-sm text-white/70">
                  <Users className="h-4 w-4" />
                  Recruitments
                </div>
                <p className="text-white/90">
                  Team {i} is looking for a Sniper (Valorant) — Avg ELO Diamond.
                </p>
                <div className="mt-4 flex items-center gap-3 text-xs text-white/60">
                  <Calendar className="h-4 w-4" /> just now
                </div>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0e0e17] py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-white/60">
              © {new Date().getFullYear()} Arena Pulse. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-white/70">
              <Link to="/terms" className="transition hover:text-white">
                Terms
              </Link>
              <span className="opacity-30">•</span>
              <Link to="/privacy" className="transition hover:text-white">
                Privacy
              </Link>
              <span className="opacity-30">•</span>
              <Link to="/scrims" className="transition hover:text-white">
                Browse
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
};

export default Landing;
