import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Trophy, IndianRupeeIcon } from 'lucide-react';

const ScrimCard = ({ scrim }) => {
  // Prefer full timeslot
  const start = scrim?.timeSlot?.start ? new Date(scrim.timeSlot.start) : (scrim?.date ? new Date(scrim.date) : null);
  const end   = scrim?.timeSlot?.end   ? new Date(scrim.timeSlot.end)   : start;

  const isPast = end ? end < new Date() : false;
  const isFull = (scrim?.participants?.length || 0) >= (scrim?.capacity || 0);

  const fmtDateTime = (v) => {
  const d = v ? new Date(v) : null;
  return d && !isNaN(d) ? d.toLocaleString() : '—';
};

  const sameDay = start && end && start.toDateString() === end.toDateString();

  const when = (() => {
    if (!start) return 'TBA';
    if (!end) return fmtDateTime(start);
    if (sameDay) {
      const dayPart = start.toLocaleDateString('en-IN', {
        dateStyle: 'medium',
        timeZone: 'Asia/Kolkata',
      });
      const startTime = start.toLocaleTimeString('en-IN', {
        timeStyle: 'short',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      });
      const endTime = end.toLocaleTimeString('en-IN', {
        timeStyle: 'short',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      });
      return `${dayPart}, ${startTime} – ${endTime}`;
    }
    return `${fmtDateTime(start)} → ${fmtDateTime(end)}`;
  })();

  const entryPaid = Number(scrim?.entryFee) > 0;

  return (
    <div
      className={[
        // glass base
        'relative overflow-hidden rounded-2xl border',
        'bg-white/5 backdrop-blur-md',
        'border-white/10 ring-1 ring-white/10',
        'shadow-lg transition-all duration-300',
        'hover:ring-gaming-purple/40 hover:shadow-gaming-purple/20',
        isPast ? 'opacity-70' : '',
      ].join(' ')}
    >
      {/* top soft gradient sheen */}
      <div className="pointer-events-none absolute inset-x-0 -top-16 h-32 bg-gradient-to-b from-white/10 to-transparent" />

      {/* Promo image */}
      {scrim.promoImageUrl && (
        <div className="relative h-36 w-full overflow-hidden">
          <img
            src={scrim.promoImageUrl}
            alt={scrim.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          {/* corner chips */}
          <div className="absolute top-2 left-2 flex gap-2">
            {isPast && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-400/30 backdrop-blur">
                Past
              </span>
            )}
            {isFull && !isPast && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-200 border border-yellow-400/30 backdrop-blur">
                Full
              </span>
            )}
          </div>
          {scrim.rankScore > 0 && (
            <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium bg-gaming-purple/30 text-gaming-purple border border-gaming-purple/40 backdrop-blur">
              <span className="inline-flex items-center gap-1">
                <Trophy className="h-3 w-3" />
                {scrim.rankScore.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base md:text-lg font-semibold text-white/90 hover:text-white">
            {scrim.title}
          </h3>
        </div>

        <p className="mt-1.5 text-sm text-white/60 line-clamp-2">
          {scrim.description || 'No description available'}
        </p>

        <div className="mt-4 space-y-2">
          <div className="flex items-center text-sm text-white/80">
            <Calendar className="h-4 w-4 mr-2 text-gaming-cyan" />
            <span>{when}</span>
          </div>

          <div className="flex items-center text-sm text-white/80">
            <Users className="h-4 w-4 mr-2 text-gaming-cyan" />
            <span>
              {(scrim.participants?.length || 0)} / {(scrim.capacity || 0)} players
            </span>
          </div>

          {entryPaid && (
            <div className="flex items-center text-sm text-emerald-300">
              <IndianRupeeIcon className="h-4 w-4 mr-2" />
              ₹{scrim.entryFee}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-white/5 backdrop-blur-md">
        <div className="text-[11px] md:text-xs text-white/50">
          by <span className="text-white/70">{scrim.createdBy?.name || 'Unknown'}</span>
        </div>
        <Link
          to={`/scrims/${scrim._id}`}
          className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium
                     bg-gaming-purple/70 hover:bg-gaming-purple text-white
                     shadow hover:shadow-gaming-purple/30 transition-colors backdrop-blur"
        >
          View Details
        </Link>
      </div>

      {/* bottom subtle gradient */}
      <div className="pointer-events-none absolute inset-x-0 -bottom-16 h-24 bg-gradient-to-t from-white/10 to-transparent" />
    </div>
  );
};

export default ScrimCard;
