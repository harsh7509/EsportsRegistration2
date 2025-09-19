import React, { useEffect, useMemo, useState } from 'react';
import { X, Star } from 'lucide-react';
import { organizationsAPI } from '../services/api';
import toast from 'react-hot-toast';

/* ---------- Stars (accessible + hover preview) ---------- */
const StarRow = ({ value, onChange, ariaLabel = 'rating' }) => {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <div
      className="flex items-center gap-1"
      role="radiogroup"
      aria-label={ariaLabel}
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((v) => {
        const filled = v <= active;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onMouseEnter={() => setHover(v)}
            onClick={() => onChange(v)}
            title={`${v} star${v > 1 ? 's' : ''}`}
            className={`rounded p-1 transition ${
              filled ? 'text-yellow-400' : 'text-slate-400 hover:text-slate-300'
            } focus:outline-none focus:ring-2 focus:ring-indigo-500/50`}
          >
            <Star className="h-5 w-5" fill={filled ? 'currentColor' : 'none'} />
          </button>
        );
      })}
    </div>
  );
};

const RateOrgModal = ({ open, onClose, org, scrimId, onSubmitted }) => {
  // hooks at top (don’t call conditionally)
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [categories, setCategories] = useState({
    organization: 5,
    communication: 5,
    fairness: 5,
    experience: 5,
  });
  const [submitting, setSubmitting] = useState(false);

  // close on Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const commentLeft = useMemo(() => 400 - (comment?.length || 0), [comment]);

  if (!open || !org) return null;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { rating, comment, categories };
      if (scrimId) payload.scrimId = scrimId;
      await organizationsAPI.rate(org._id || org.id, payload);
      toast.success('Thanks for rating!');
      onSubmitted?.();
      onClose?.();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to submit rating';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const field = (key, label) => (
    <div>
      <label className="mb-1 block text-sm text-slate-300">{label}</label>
      <StarRow
        value={categories[key]}
        onChange={(v) => setCategories((c) => ({ ...c, [key]: v }))}
        ariaLabel={label}
      />
    </div>
  );

  const avatar = org?.avatarUrl;
  const initial = (org?.name || 'O').charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* card */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg bg-slate-800 text-slate-200">
              {avatar ? (
                <img src={avatar} alt={org.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-semibold">{initial}</span>
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">Rate {org.name}</h3>
              <p className="text-xs text-slate-400">Your feedback helps players and orgs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-slate-300 hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* body */}
        <form onSubmit={submit} className="space-y-5 p-5">
          {/* overall */}
          <div>
            <label className="mb-1 block text-sm text-slate-300">Overall</label>
            <StarRow value={rating} onChange={setRating} ariaLabel="Overall rating" />
          </div>

          {/* categories */}
          <div className="grid grid-cols-2 gap-4">
            {field('organization', 'Organization')}
            {field('communication', 'Communication')}
            {field('fairness', 'Fairness')}
            {field('experience', 'Experience')}
          </div>

          {/* comment */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm text-slate-300">Comment (optional)</label>
              <span className={`text-[11px] ${commentLeft < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                {Math.max(0, commentLeft)} chars left
              </span>
            </div>
            <textarea
              className="input w-full h-24 resize-none bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:ring-0"
              value={comment}
              onChange={(e) => {
                const v = e.target.value;
                if (v.length <= 400) setComment(v);
              }}
              placeholder="Share your experience…"
            />
          </div>

          {/* actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Submitting…' : 'Submit Rating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RateOrgModal;
