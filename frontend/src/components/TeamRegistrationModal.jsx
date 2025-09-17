// src/components/TeamRegistrationModal.jsx
import React, { useState } from 'react';
import { X } from 'lucide-react';

const emptyPlayer = () => ({ ignName: '', ignId: '' });

export default function TeamRegistrationModal({ open, onClose, onSubmit }) {
  const [teamName, setTeamName] = useState('');
  const [players, setPlayers] = useState([emptyPlayer(), emptyPlayer(), emptyPlayer(), emptyPlayer(), emptyPlayer()]);
  const [submitting, setSubmitting] = useState(false);
  const [phone, setPhone] = useState('');
  const [realName, setRealName] = useState('');

  if (!open) return null;

  const updatePlayer = (i, field, value) => {
    setPlayers(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // require first 4
    for (let i = 0; i < 4; i++) {
      if (!players[i].ignName.trim() || !players[i].ignId.trim()) {
        return alert(`Player ${i + 1}: IGN name and ID are required`);
      }
    }
    const payload = {
      teamName: teamName.trim(),
      phone: phone.trim(),
     realName: realName.trim(),
      players: players
        .filter(p => p.ignName.trim() && p.ignId.trim())
        .slice(0, 5),
    };
    setSubmitting(true);
    try {
      await onSubmit?.(payload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 grid place-items-center p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="font-semibold">Team Registration</div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
         <div className="grid md:grid-cols-2 gap-3">
     <div>
       <label className="text-sm text-gray-300">Phone *</label>
       <input className="input w-full mt-1" value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit phone" />
     </div>
     <div>
       <label className="text-sm text-gray-300">Your real name *</label>
       <input className="input w-full mt-1" value={realName} onChange={e => setRealName(e.target.value)} placeholder="e.g. Rahul Sharma" />
     </div>
   </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="text-sm text-gray-300">Team Name</label>
            <input
              className="input w-full mt-1"
              placeholder="Your team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="p-3 rounded bg-gray-700">
                <div className="text-sm font-medium mb-2">
                  Player {i + 1}{i < 4 ? ' *' : ' (optional)'}
                </div>
                <input
                  className="input w-full mb-2"
                  placeholder="IGN Name"
                  value={players[i].ignName}
                  onChange={(e) => updatePlayer(i, 'ignName', e.target.value)}
                  required={i < 4}
                />
                <input
                  className="input w-full"
                  placeholder="IGN ID"
                  value={players[i].ignId}
                  onChange={(e) => updatePlayer(i, 'ignId', e.target.value)}
                  required={i < 4}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
