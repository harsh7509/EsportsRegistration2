// src/components/TeamRegistrationModal.jsx
import React, { useState } from 'react';
import { X } from 'lucide-react';

const emptyPlayer = () => ({ ignName: '', ignId: '' });

export default function TeamRegistrationModal({ open, onClose, onSubmit }) {
  const [teamName, setTeamName] = useState('');
  const [players, setPlayers] = useState([
    emptyPlayer(),
    emptyPlayer(),
    emptyPlayer(),
    emptyPlayer(),
    emptyPlayer(),
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [phone, setPhone] = useState('');
  const [realName, setRealName] = useState('');

  if (!open) return null;

  const updatePlayer = (i, field, value) => {
    setPlayers((prev) => {
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
        .filter((p) => p.ignName.trim() && p.ignId.trim())
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
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl ring-1 ring-white/10
                   animate-[fadeIn_.2s_ease-out] "
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div>
            <h3 className="text-lg font-semibold text-white">Team Registration</h3>
            <p className="mt-0.5 text-xs text-slate-300/80">
              Enter team details and at least first 4 players (*mandatory).
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-300 hover:text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Top meta row */}
        <div className="px-6 pt-5 pb-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm text-slate-300">Phone *</label>
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-slate-100 placeholder:text-slate-400
                           focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit phone"
              />
              <p className="mt-1 text-xs text-slate-400">
                WhatsApp/Call contact for coordination.
              </p>
            </div>
            <div>
              <label className="text-sm text-slate-300">Your real name *</label>
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-slate-100 placeholder:text-slate-400
                           focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
              />
              <p className="mt-1 text-xs text-slate-400">
                For verification and prize distribution.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          {/* Team name */}
          <div>
            <label className="text-sm text-slate-300">Team Name</label>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-slate-100 placeholder:text-slate-400
                         focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
              placeholder="Your team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>

          {/* Players */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-slate-200">
                Players <span className="text-slate-400 font-normal">(first 4 required)</span>
              </h4>
              <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300 border border-indigo-300/20">
                Max 5 entries
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {[0, 1, 2, 3, 4].map((i) => {
                const required = i < 4;
                return (
                  <div
                    key={i}
                    className="group rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-4
                               hover:border-indigo-400/40 hover:shadow-[0_0_0_1px_rgba(99,102,241,.25)] transition"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="inline-flex items-center gap-2">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-white/5 text-xs font-semibold text-slate-200 ring-1 ring-white/10">
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium text-slate-200">
                          Player {i + 1}{' '}
                          {required ? (
                            <span className="text-rose-300">*</span>
                          ) : (
                            <span className="text-slate-400">(optional)</span>
                          )}
                        </span>
                      </div>
                      {required && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300 ring-1 ring-emerald-300/20">
                          Required
                        </span>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <input
                        className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400
                                   focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                        placeholder="IGN Name"
                        value={players[i].ignName}
                        onChange={(e) => updatePlayer(i, 'ignName', e.target.value)}
                        required={required}
                      />
                      <input
                        className="w-full rounded-lg border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400
                                   focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                        placeholder="IGN ID"
                        value={players[i].ignId}
                        onChange={(e) => updatePlayer(i, 'ignId', e.target.value)}
                        required={required}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-slate-200
                         hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white
                         hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <svg
                    className="mr-2 h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Submitting…
                </>
              ) : (
                'Submit'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
