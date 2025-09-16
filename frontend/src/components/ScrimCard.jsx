import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Trophy, DollarSign } from 'lucide-react';

const ScrimCard = ({ scrim }) => {
  // Prefer full timeslot
  const start = scrim?.timeSlot?.start ? new Date(scrim.timeSlot.start) :  new Date(scrim.date) ;
  const end   = scrim?.timeSlot?.end   ? new Date(scrim.timeSlot.end)   : start;

  // Mark past using the end of the scrim
  const isPast = end ? end < new Date() : false;
  const isFull = (scrim?.participants?.length || 0) >= (scrim?.capacity || 0);

  // Format helpers (IST example). If you want browser-local time, remove the timeZone line.
  const fmtDateTime = (d) =>
    d?.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });

    const formatDate = (d) =>
  new Date(d).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const sameDay = start && end && start.toDateString() === end.toDateString();

  const when = (() => {
    if (!start) return 'TBA';
    if (!end) return fmtDateTime(start);
    if (sameDay) {
      // Sep 16, 2025, 04:00 PM – 06:00 PM
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
    // Cross-day range → show both
    return `${fmtDateTime(start)} → ${fmtDateTime(end)}`;
  })();

  return (
    <div className={`card hover:border-gaming-purple transition-all duration-300 group ${isPast ? 'opacity-60' : ''}`}>
      {scrim.promoImageUrl && (
        <div className="mb-4 rounded-lg overflow-hidden">
          <img
            src={scrim.promoImageUrl}
            alt={scrim.title}
            className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-white group-hover:text-gaming-purple transition-colors">
          {scrim.title}
        </h3>
        {scrim.rankScore > 0 && (
          <div className="flex items-center bg-gaming-purple/20 text-gaming-purple px-2 py-1 rounded text-xs">
            <Trophy className="h-3 w-3 mr-1" />
            {scrim.rankScore.toFixed(1)}
          </div>
        )}
      </div>

      <p className="text-gray-400 text-sm mb-4 line-clamp-2">
        {scrim.description || 'No description available'}
      </p>

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-300">
          <Calendar className="h-4 w-4 mr-2 text-gaming-cyan" />
          {formatDate(start)}
          {when}
          {isPast && <span className="ml-2 text-red-400 text-xs">(Past)</span>}
        </div>

        <div className="flex items-center text-sm text-gray-300">
          <Users className="h-4 w-4 mr-2 text-gaming-cyan" />
          {(scrim.participants?.length || 0)} / {(scrim.capacity || 0)} players
          {isFull && <span className="ml-2 text-red-400 text-xs">FULL</span>}
        </div>

        {scrim.isPaid && (
          <div className="flex items-center text-sm text-green-400">
            <DollarSign className="h-4 w-4 mr-2" />
            ₹{scrim.entryFee}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          by {scrim.createdBy?.name || 'Unknown'}
        </div>

        <Link to={`/scrims/${scrim._id}`} className="btn-primary text-sm">
          View Details
        </Link>
      </div>
    </div>
  );
};

export default ScrimCard;
