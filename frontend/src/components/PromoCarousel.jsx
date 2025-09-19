// frontend/src/components/PromoCarousel.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users as UsersIcon,
  Trophy,
  Eye,
} from "lucide-react";
import { promosAPI, adminAPI } from "../services/api";

export default function PromoCarousel() {
  const [promotions, setPromotions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const hoverRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await promosAPI.getActive();
        setPromotions(res?.data?.promotions || []);
      } catch (e) {
        console.error("Failed to fetch promotions:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // autoplay (pause on hover)
  useEffect(() => {
    if (promotions.length <= 1) return;
    const id = setInterval(() => {
      if (!hoverRef.current) {
        setCurrentIndex((p) => (p + 1) % promotions.length);
      }
    }, 6000);
    return () => clearInterval(id);
  }, [promotions.length]);

  const next = () => setCurrentIndex((p) => (p + 1) % promotions.length);
  const prev = () =>
    setCurrentIndex((p) => (p - 1 + promotions.length) % promotions.length);


  // helper somewhere near your component
const getPromoLink = (p) => {
  const tid = p?.tournamentId?._id || p?.tournamentId;
  if (tid) return `/tournaments/${tid}`;

  const sid = p?.scrimId?._id || p?.scrimId;
  if (sid) return `/scrims/${sid}`;

  const oid = p?.organizationId?._id || p?.organizationId;
  return `/organizations/${oid || ''}`;
};


  const handlePromoClick = async (promoId) => {
    try {
      await adminAPI.trackPromoClick(promoId);
    } catch {}
  };

  if (loading) {
    return (
      <div className="relative h-80 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800" />
        <div className="relative h-full p-6 flex items-end">
          <div className="w-full max-w-xl backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="h-6 w-40 bg-white/10 rounded animate-pulse mb-3" />
            <div className="h-4 w-72 bg-white/10 rounded animate-pulse mb-1.5" />
            <div className="h-4 w-64 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!promotions.length) return null;

  const promo = promotions[currentIndex] || {};
  const bgStyle = promo?.imageUrl
    ? { backgroundImage: `url(${promo.imageUrl})` }
    : {
        backgroundImage:
          "linear-gradient(135deg, rgb(99,102,241) 0%, rgb(147,51,234) 100%)",
      };

  const scrim = promo?.scrimId;
  const tournament = promo?.tournamentId;

  const scrimDateValue = scrim?.timeSlot?.start || scrim?.date;
  const scrimDate = scrimDateValue
    ? new Date(scrimDateValue).toLocaleString()
    : "TBA";
  const participantsNow = Array.isArray(scrim?.participants)
    ? scrim.participants.length
    : 0;

  return (
    <div
      className="relative h-80 rounded-2xl overflow-hidden group"
      onMouseEnter={() => (hoverRef.current = true)}
      onMouseLeave={() => (hoverRef.current = false)}
    >
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={bgStyle}
        aria-hidden
      />
      {/* Dark overlay with subtle gradient vignette */}
      <div className="absolute inset-0 bg-black/60" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

      {/* Glass card content */}
      <div className="relative h-full p-6 sm:p-8 flex items-center">
        <div className="max-w-2xl">
          {/* Type chip */}
          <div className="flex items-center gap-2 mb-4">
            <span
              className={[
                "px-3 py-1 rounded-full text-[10px] tracking-wide font-bold border",
                promo?.type === "tournament"
                  ? "bg-yellow-500/15 text-yellow-300 border-yellow-400/20"
                  : promo?.type === "scrim"
                  ? "bg-gaming-purple/15 text-gaming-purple border-gaming-purple/20"
                  : "bg-blue-500/15 text-blue-300 border-blue-400/20",
              ].join(" ")}
            >
              {promo?.type?.toUpperCase() || "PROMO"}
            </span>
            <span className="text-xs text-gray-300/90">Featured</span>
          </div>

          {/* GLASS PANEL */}
          <div className="backdrop-blur-2xl bg-white/10 border border-white/15 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] p-5 sm:p-6">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight mb-3">
              {promo?.title || "—"}
            </h2>
            {promo?.description && (
              <p className="text-base sm:text-lg text-gray-200/90 mb-5">
                {promo.description}
              </p>
            )}

            {/* Organization */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-white/20">
                {promo?.organizationId?.avatarUrl ? (
                  <img
                    src={promo.organizationId.avatarUrl}
                    alt={promo?.organizationId?.name || "Organization"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gaming-purple grid place-items-center">
                    <span className="text-white font-bold">
                      {promo?.organizationId?.name?.charAt(0) || "O"}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-white">
                  {promo?.organizationId?.name || "Organization"}
                </p>
                <div className="flex items-center gap-2">
                  {promo?.organizationId?.organizationInfo?.verified && (
                    <span className="text-emerald-300/90 text-xs">✓ Verified</span>
                  )}
                  {promo?.organizationId?.organizationInfo?.location && (
                    <span className="text-gray-300/90 text-xs sm:text-sm">
                      {promo.organizationId.organizationInfo.location}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Scrim summary (if any) */}
            {scrim && (
              <div className="rounded-xl p-4 mb-6 bg-black/30 border border-white/10">
                <h3 className="font-semibold text-white mb-2">{scrim?.title}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center text-gray-300">
                    <Calendar className="h-4 w-4 mr-2 opacity-90" />
                    {scrimDate}
                  </div>
                  <div className="flex items-center text-gray-300">
                    <UsersIcon className="h-4 w-4 mr-2 opacity-90" />
                    {participantsNow}/{scrim?.capacity || 0} players
                  </div>
                  <div className="flex items-center text-emerald-300">
                    <Trophy className="h-4 w-4 mr-2 opacity-90" />
                    ₹{scrim?.entryFee || 0}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {tournament ? (
                <Link
                  to={`/tournaments/${tournament._id || tournament}`}
                  onClick={() => handlePromoClick(promo._id)}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gaming-purple text-white font-medium shadow-lg shadow-gaming-purple/30 hover:bg-gaming-purple/90 transition"
                >
                  View Tournament
                </Link>
              ) : scrim ? (
                <Link
                  to={`/scrims/${scrim._id || scrim}`}
                  onClick={() => handlePromoClick(promo._id)}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gaming-purple text-white font-medium shadow-lg shadow-gaming-purple/30 hover:bg-gaming-purple/90 transition"
                >
                  View Scrim
                </Link>
              ) : (
                <Link
  to={getPromoLink(promo)}
  onClick={() => handlePromoClick(promo._id)}   // keeps your click tracking
  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gaming-purple text-white font-medium shadow-lg shadow-gaming-purple/30 hover:bg-gaming-purple/90 transition"
>
  View Details
</Link>
              )}

              <Link
                to={`/organizations/${promo?.organizationId?._id || ""}`}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white/10 text-white border border-white/15 hover:bg-white/15 transition"
              >
                <Eye className="h-4 w-4 mr-2" />
                Organization
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Nav & dots */}
      {promotions.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {promotions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={[
                  "h-2 w-6 rounded-full transition-all",
                  i === currentIndex
                    ? "bg-white"
                    : "bg-white/50 hover:bg-white/70",
                ].join(" ")}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
