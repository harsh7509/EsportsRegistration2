import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { organizationsAPI } from '../services/api';
import toast from 'react-hot-toast';

const OrgRatingModal = ({ organization, scrim, isOpen, onClose, onRatingSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [categories, setCategories] = useState({
    organization: 0,
    communication: 0,
    fairness: 0,
    experience: 0
  });
  const [loading, setLoading] = useState(false);

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
        categories
      });
      toast.success('Organization rating submitted successfully!');
      onRatingSubmitted();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  const setCategoryRating = (category, value) => {
    setCategories(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const renderStarRating = (value, onChange, label) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`p-1 transition-colors ${
              star <= value ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-300'
            }`}
          >
            <Star className="h-5 w-5 fill-current" />
          </button>
        ))}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Rate Organization</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Organization Info */}
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-gaming-purple rounded-full flex items-center justify-center">
                {organization.avatarUrl ? (
                  <img src={organization.avatarUrl} alt={organization.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span className="font-bold">{organization.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <h4 className="font-semibold">{organization.name}</h4>
                <p className="text-sm text-gray-400">for "{scrim.title}"</p>
              </div>
            </div>
          </div>

          {/* Overall Rating */}
          {renderStarRating(rating, setRating, "Overall Rating")}

          {/* Category Ratings */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-300">Detailed Ratings</h4>
            
            {renderStarRating(
              categories.organization, 
              (value) => setCategoryRating('organization', value),
              "Organization & Planning"
            )}
            
            {renderStarRating(
              categories.communication, 
              (value) => setCategoryRating('communication', value),
              "Communication Quality"
            )}
            
            {renderStarRating(
              categories.fairness, 
              (value) => setCategoryRating('fairness', value),
              "Fairness & Rules"
            )}
            
            {renderStarRating(
              categories.experience, 
              (value) => setCategoryRating('experience', value),
              "Overall Experience"
            )}
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Comment (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="input w-full h-24 resize-none"
              placeholder="Share your experience with this organization..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
              disabled={loading || rating === 0}
            >
              {loading ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrgRatingModal;