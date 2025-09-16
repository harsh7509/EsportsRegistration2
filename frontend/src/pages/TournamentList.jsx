import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tournamentsAPI } from './../services/api.js';

export default function TournamentList() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
       const res = await tournamentsAPI.list({ limit: 50 });
      const data = res?.data;
      const arr =
        Array.isArray(data) ? data :
        (Array.isArray(data?.items) ? data.items :
        (Array.isArray(data?.tournaments) ? data.tournaments : []));
      setItems(arr);
      setError('');
      } catch (e) {
         console.error('fetch tournaments failed:', e);
      console.error('fetch tournaments failed:', e);
      setError(e?.response?.data?.message || e?.message || 'Failed to load tournaments');
      setItems([]);
      }
    })();
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tournaments</h1>
        <Link to="/tournaments/new" className="btn-primary">Create Tournament</Link>
      </div>
      {error && (
      <div className="mb-4 text-red-400 text-sm">
        {error}
      </div>
    )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(t => (
          <Link key={t._id} to={`/tournaments/${t._id}`} className="card hover:ring-1 hover:ring-gaming-purple">
            {t.bannerUrl && <img src={t.bannerUrl} alt={t.title} className="h-40 w-full object-cover rounded mb-3" />}
            <div className="font-semibold">{t.title}</div>
            <div className="text-sm text-gray-400">{t.game || '—'}</div>
            <div className="text-xs text-gray-500 mt-2">Slots: {t.registeredCount || 0}/{t.capacity}</div>
          </Link>
        ))}
        {items.length === 0 && <div className="text-gray-400">No tournaments yet</div>}
      </div>
    </div>
  );
}
