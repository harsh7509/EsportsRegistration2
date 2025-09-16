import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Trophy, DollarSign } from 'lucide-react';

const ScrimCard = ({ scrim }) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isFull = scrim.participants?.length >= scrim.capacity;
  const isPast = new Date(scrim.date) < new Date();

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
          {formatDate(scrim.date)}
          {isPast && <span className="ml-2 text-red-400 text-xs">(Past)</span>}
        </div>
        
        <div className="flex items-center text-sm text-gray-300">
          <Users className="h-4 w-4 mr-2 text-gaming-cyan" />
          {scrim.participants?.length || 0} / {scrim.capacity} players
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
        
        <Link 
          to={`/scrims/${scrim._id}`}
          className="btn-primary text-sm"
        >
          View Details
        </Link>
      </div>
    </div>
  );
};

export default ScrimCard;