import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { organizationsAPI } from '../services/api';
import toast from 'react-hot-toast';

const StarRow = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`p-1 rounded ${v <= value ? 'text-yellow-400' : 'text-gray-400 hover:text-gray-300'}`}
          title={`${v} star${v>1?'s':''}`}
        >
          <Star className="h-5 w-5" fill={v <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
};

const RateOrgModal = ({ open, onClose, org, scrimId, onSubmitted }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [categories, setCategories] = useState({
    organization: 5,
    communication: 5,
    fairness: 5,
    experience: 5,
  });
  const [submitting, setSubmitting] = useState(false);

  if (!open || !org) return null;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { rating, comment, categories };
      if (scrimId) payload.scrimId = scrimId; // from dashboard booking flow
      await organizationsAPI.rate(org._id || org.id, payload);
      toast.success('Thanks for rating!');
      onSubmitted?.();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to submit rating';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const field = (key, label) => (
    <div>
      <label className="block text-sm text-gray-300 mb-1">{label}</label>
      <StarRow
        value={categories[key]}
        onChange={(v) => setCategories((c) => ({ ...c, [key]: v }))}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold">Rate {org.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Overall</label>
            <StarRow value={rating} onChange={setRating} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {field('organization', 'Organization')}
            {field('communication', 'Communication')}
            {field('fairness', 'Fairness')}
            {field('experience', 'Experience')}
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Comment (optional)</label>
            <textarea
              className="input w-full h-24 resize-none"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience…"
            />
          </div>

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
