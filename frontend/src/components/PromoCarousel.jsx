import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, Users as UsersIcon, Trophy, Eye } from 'lucide-react';
import { promosAPI, adminAPI } from '../services/api';

const PromoCarousel = () => {
  const [promotions, setPromotions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPromotions(); }, []);
  useEffect(() => {
    if (promotions.length > 1) {
      const id = setInterval(() => setCurrentIndex((p) => (p + 1) % promotions.length), 6000);
      return () => clearInterval(id);
    }
  }, [promotions.length]);

  const fetchPromotions = async () => {
    try {
      const res = await promosAPI.getActive();
      setPromotions(res?.data?.promotions || []);
    } catch (err) {
      console.error('Failed to fetch promotions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePromoClick = async (promoId) => {
    try { await adminAPI.trackPromoClick(promoId); } catch {}
  };

  const nextSlide = () => setCurrentIndex((p) => (p + 1) % promotions.length);
  const prevSlide = () => setCurrentIndex((p) => (p - 1 + promotions.length) % promotions.length);

  if (loading) {
    return (
      <div className="relative h-80 bg-gray-800 rounded-lg animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-700 to-gray-600 rounded-lg" />
      </div>
    );
  }
  if (promotions.length === 0) return null;

  const currentPromo = promotions[currentIndex] || {};
  const bg = currentPromo?.imageUrl
    ? { backgroundImage: `url(${currentPromo.imageUrl})` }
    : { backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };

  const scrim = currentPromo?.scrimId;
  const tournament = currentPromo?.tournamentId;

  const scrimDateValue = scrim?.timeSlot?.start || scrim?.date;
  const scrimDate = scrimDateValue ? new Date(scrimDateValue).toLocaleString() : 'TBA';
  const participantsNow = Array.isArray(scrim?.participants) ? scrim.participants.length : 0;

  return (
    <div className="relative h-80 rounded-lg overflow-hidden group">
      <div className="absolute inset-0 bg-cover bg-center transition-all duration-500" style={bg}>
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="relative h-full flex items-center p-8">
        <div className="max-w-2xl">
          <div className="flex items-center space-x-2 mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              currentPromo?.type === 'tournament' ? 'bg-yellow-500/20 text-yellow-400'
              : currentPromo?.type === 'scrim' ? 'bg-gaming-purple/20 text-gaming-purple'
              : 'bg-blue-500/20 text-blue-400'
            }`}>
              {currentPromo?.type?.toUpperCase() || 'PROMO'}
            </span>
            <span className="text-xs text-gray-300">Featured Promotion</span>
          </div>

          <h2 className="text-4xl font-bold text-white mb-4">{currentPromo?.title || '—'}</h2>
          {currentPromo?.description && (
            <p className="text-lg text-gray-200 mb-6">{currentPromo.description}</p>
          )}

          {/* Organization */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-gaming-purple rounded-full flex items-center justify-center overflow-hidden">
              {currentPromo?.organizationId?.avatarUrl
                ? <img src={currentPromo.organizationId.avatarUrl} alt={currentPromo?.organizationId?.name || 'Organization'} className="w-full h-full object-cover" />
                : <span className="text-lg font-bold text-white">{currentPromo?.organizationId?.name?.charAt(0) || 'O'}</span>}
            </div>
            <div>
              <p className="font-semibold text-white">{currentPromo?.organizationId?.name || 'Organization'}</p>
              <div className="flex items-center space-x-2">
                {currentPromo?.organizationId?.organizationInfo?.verified && (
                  <span className="text-green-400 text-xs">✓ Verified</span>
                )}
                {currentPromo?.organizationId?.organizationInfo?.location && (
                  <span className="text-gray-300 text-sm">{currentPromo.organizationId.organizationInfo.location}</span>
                )}
              </div>
            </div>
          </div>

          {/* Scrim details (if promo is for scrim) */}
          {scrim && (
            <div className="bg-black/30 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-white mb-2">{scrim?.title}</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center text-gray-300"><Calendar className="h-4 w-4 mr-2" />{scrimDate}</div>
                <div className="flex items-center text-gray-300"><UsersIcon className="h-4 w-4 mr-2" />{participantsNow}/{scrim?.capacity || 0} players</div>
                <div className="flex items-center text-green-400"><Trophy className="h-4 w-4 mr-2" />₹{scrim?.entryFee || 0}</div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-4">
            {tournament ? (
              <Link
                to={`/tournaments/${tournament._id || tournament}`}
                onClick={() => handlePromoClick(currentPromo._id)}
                className="btn-primary inline-flex items-center"
              >
                View Tournament Details
              </Link>
            ) : scrim ? (
              <Link
                to={`/scrims/${scrim._id || scrim}`}
                onClick={() => handlePromoClick(currentPromo._id)}
                className="btn-primary inline-flex items-center"
              >
                View Scrim Details
              </Link>
            ) : (
              <Link
                to={`/organizations/${currentPromo?.organizationId?._id || ''}`}
                onClick={() => handlePromoClick(currentPromo._id)}
                className="btn-primary inline-flex items-center"
              >
                View Organization
              </Link>
            )}

            <Link
              to={`/organizations/${currentPromo?.organizationId?._id || ''}`}
              className="btn-secondary inline-flex items-center"
            >
              <Eye className="h-4 w-4 mr-2" />
              Organization Profile
            </Link>
          </div>
        </div>
      </div>

      {promotions.length > 1 && (
        <>
          <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
            {promotions.map((_, i) => (
              <button key={i} onClick={() => setCurrentIndex(i)} className={`w-3 h-3 rounded-full transition-colors ${i === currentIndex ? 'bg-white' : 'bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PromoCarousel;
