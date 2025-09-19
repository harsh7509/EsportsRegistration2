import React, { useEffect, useMemo, useState } from 'react';
import { X, Star } from 'lucide-react';
import { organizationsAPI } from '../services/api';
import toast from 'react-hot-toast';

const labels = ['Very Bad', 'Bad', 'Okay', 'Good', 'Excellent'];

const OrgRatingModal = ({ organization, scrim, isOpen, onClose, onRatingSubmitted }) => {
  // ---- hooks (always top-level) ----
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [categories, setCategories] = useState({
    organization: 0,
    communication: 0,
    fairness: 0,
    experience: 0,
  });
  const [loading, setLoading] = useState(false);

  // close on Esc
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const setCategoryRating = (category, value) =>
    setCategories((prev) => ({ ...prev, [category]: value }));

  const activeLabel = useMemo(() => labels[(hover || rating) - 1] || '', [hover, rating]);
  const commentLeft = useMemo(() => 400 - (comment?.length || 0), [comment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select an overall rating');
      return;
    }

    setLoading(true);
    try {
      await organizationsAPI.rate(organization._id, {
        scrimId: scrim._id,
        rating,
        comment,
        categories,
      });
      toast.success('Organization rating submitted successfully!');
      onRatingSubmitted?.();
      onClose?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // small reusable star row
  const StarRow = ({ value, onChange, size = 'md', ariaLabel }) => (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={ariaLabel}>
      {[1, 2, 3, 4, 5].map((s) => {
        const filled = s <= value;
        const base =
          'transition-transform rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-indigo-400/50';
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={filled}
            onClick={() => onChange(s)}
            className={`${base} ${filled ? 'text-yellow-400' : 'text-white/30 hover:text-yellow-300'} ${
              size === 'lg' ? 'p-1.5' : 'p-1'
            }`}
          >
            <Star className={`${size === 'lg' ? 'h-7 w-7' : 'h-5 w-5'} fill-current`} />
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,#6d28d9_0,#111827_55%,#0b0f1a_100%)] opacity-60" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/10">
              {organization?.avatarUrl ? (
                <img
                  src={organization.avatarUrl}
                  alt={organization?.name || 'Organization'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-lg font-bold text-white">
                  {(organization?.name || 'O')?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold">Rate {organization?.name || 'Organization'}</h3>
              <p className="mt-0.5 text-xs text-white/70">
                for “{scrim?.title || 'Scrim'}”
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/70 hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Overall rating */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-white/70">Overall Rating</p>
              <div
                className="flex items-center gap-2"
                onMouseLeave={() => setHover(0)}
                aria-label="Overall rating"
              >
                {[1, 2, 3, 4, 5].map((s) => {
                  const showFill = s <= (hover || rating);
                  return (
                    <button
                      key={s}
                      type="button"
                      onMouseEnter={() => setHover(s)}
                      onClick={() => setRating(s)}
                      className="rounded-md p-1.5 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
                      aria-label={`Rate ${s}`}
                    >
                      <Star
                        className={`h-8 w-8 ${showFill ? 'text-yellow-400' : 'text-white/30'} fill-current`}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-xs text-white/70 h-4">{activeLabel}</span>
            </div>
          </section>

          {/* Detailed categories */}
          <section className="grid gap-4 rounded-xl border border-white/10 bg-white/5 p-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-white/70">Organization & Planning</label>
              <StarRow
                value={categories.organization}
                onChange={(v) => setCategoryRating('organization', v)}
                ariaLabel="Organization & Planning"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-white/70">Communication Quality</label>
              <StarRow
                value={categories.communication}
                onChange={(v) => setCategoryRating('communication', v)}
                ariaLabel="Communication Quality"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-white/70">Fairness & Rules</label>
              <StarRow
                value={categories.fairness}
                onChange={(v) => setCategoryRating('fairness', v)}
                ariaLabel="Fairness & Rules"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-white/70">Overall Experience</label>
              <StarRow
                value={categories.experience}
                onChange={(v) => setCategoryRating('experience', v)}
                ariaLabel="Overall Experience"
              />
            </div>
          </section>

          {/* Comment */}
          <section>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-xs text-white/70">Comment (Optional)</label>
              <span className="text-[11px] text-white/50">{commentLeft} chars left</span>
            </div>
            <textarea
              value={comment}
              onChange={(e) =>
                e.target.value.length <= 400 && setComment(e.target.value)
              }
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30 h-28"
              placeholder="Share your experience with this organization…"
            />
          </section>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="group relative flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/90 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || rating === 0}
              className="group relative flex-1 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Submitting…' : 'Submit Rating'}
              <span className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-indigo-400/20 opacity-0 blur transition group-hover:opacity-100" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrgRatingModal;
