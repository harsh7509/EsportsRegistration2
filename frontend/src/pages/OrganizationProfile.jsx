import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Calendar, MapPin, Shield, Camera } from 'lucide-react';
import { organizationsAPI, uploadAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ScrimCard from '../components/ScrimCard';
import toast from 'react-hot-toast';

const OrganizationProfile = () => {
  const { orgId } = useParams();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [orgData, setOrgData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [imgBroken, setImgBroken] = useState(false); // <-- handle broken avatar URLs

  useEffect(() => {
    fetchOrgDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const fetchOrgDetails = async () => {
    setLoading(true);
    setImgBroken(false); // reset broken flag when loading a new org
    try {
      const res = await organizationsAPI.getDetails(orgId);
      setOrgData(res.data);
    } catch (error) {
      console.error('Failed to fetch organization details:', error);
      toast.error(error?.response?.data?.message || 'Organization not found');
      setOrgData(null);
    } finally {
      setLoading(false);
    }
  };

  // Only org owner can edit their avatar
  const canEditAvatar = (() => {
    if (!user || !orgData?.organization) return false;
    const uid = user._id || user.id;
    return user.role === 'organization' && uid && String(uid) === String(orgData.organization._id);
  })();

  const handlePickFile = () => fileInputRef.current?.click();

  const handleUploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      // 1) upload
      const res = await uploadAPI.uploadImage(file);
      const imageUrl = res?.data?.imageUrl || res?.data?.avatarUrl;
      if (!imageUrl) throw new Error('Upload did not return an image URL');

      // 2) update profile
      await authAPI.updateProfile({ avatarUrl: imageUrl });

      // 3) refresh "me" in localStorage so Navbar updates
      try {
        const me = await authAPI.getMe();
        localStorage.setItem('user', JSON.stringify(me?.data?.user || {}));
      } catch { /* no-op */ }

      // 4) update current page state immediately
      setImgBroken(false);
      setOrgData((prev) =>
        prev
          ? { ...prev, organization: { ...prev.organization, avatarUrl: imageUrl } }
          : prev
      );

      toast.success('Profile photo updated!');
      // Optional: if your details endpoint decorates more fields, re-fetch them:
      await fetchOrgDetails();
    } catch (err) {
      console.error('Avatar upload failed:', err);
      toast.error(err?.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const renderStars = (rating = 0) =>
    [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-600'}`}
      />
    ));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gaming-purple" />
      </div>
    );
  }

  if (!orgData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Organization Not Found</h2>
        </div>
      </div>
    );
  }

  const {
    organization,
    averageRating = 0,
    totalRatings = 0,
    categoryAverages = {},
    ratings = [],
    scrims = [],
  } = orgData;

  // Robust avatar source (handles different field names)
  const avatarSrc =
    !imgBroken &&
    (organization.avatarUrl ||
      organization.profileImage ||
      organization?.organizationInfo?.logoUrl ||
      null);

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="card mb-8">
          <div className="flex items-start gap-6">
            {/* Avatar + Edit */}
            <div className="relative">
              <div className="w-24 h-24 bg-gaming-purple rounded-full overflow-hidden flex items-center justify-center">
                {avatarSrc ? (
                  <img
                    key={avatarSrc}                  // force re-render when src changes
                    src={avatarSrc}
                    alt={organization.name}
                    className="w-full h-full object-cover"
                    onError={() => setImgBroken(true)} // fallback to initial if 404
                  />
                ) : (
                  <span className="text-3xl font-bold text-white">
                    {organization.name?.charAt(0)?.toUpperCase() || 'O'}
                  </span>
                )}
              </div>

              {canEditAvatar && (
                <>
                  <button
                    type="button"
                    onClick={handlePickFile}
                    disabled={uploading}
                    className="absolute -bottom-2 -right-2 bg-gaming-purple hover:bg-gaming-purple/80 text-white p-2 rounded-full shadow transition-colors"
                    title="Change photo"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadAvatar}
                    className="hidden"
                  />
                </>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center flex-wrap gap-3 mb-2">
                <h1 className="text-3xl font-bold">{organization.name}</h1>
                {organization.organizationInfo?.verified && (
                  <div className="flex items-center bg-green-500/20 text-green-400 px-3 py-1 rounded-full">
                    <Shield className="h-4 w-4 mr-1" />
                    Verified
                  </div>
                )}
              </div>

              {organization.organizationInfo?.location && (
                <div className="flex items-center text-gray-400 mb-3">
                  <MapPin className="h-4 w-4 mr-2" />
                  {organization.organizationInfo.location}
                </div>
              )}

              {/* Rating Summary */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {renderStars(averageRating)}
                  <span className="text-2xl font-bold">{Number(averageRating).toFixed(1)}</span>
                </div>
                <span className="text-gray-400">({totalRatings} reviews)</span>
              </div>

              {uploading && (
                <div className="mt-3 text-sm text-gray-300">Uploading photo…</div>
              )}
            </div>

            {/* Stats */}
            <div className="text-right">
              <div className="text-3xl font-bold text-gaming-purple mb-1">{scrims.length}</div>
              <div className="text-sm text-gray-400">Scrims Created</div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Ratings */}
          <div className="lg:col-span-1 space-y-6">
            {/* Category Ratings */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Rating Breakdown</h2>
              <div className="space-y-4">
                {Object.entries(categoryAverages).map(([category, rating]) => (
                  <div key={category}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium capitalize">{category}</span>
                      <span className="text-sm font-bold">{Number(rating || 0).toFixed(1)}/5</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gaming-purple h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(0, ((rating || 0) / 5) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Reviews */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Recent Reviews</h2>
              <div className="space-y-4">
                {ratings.length > 0 ? (
                  ratings.map((r) => (
                    <div key={r._id} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{r.playerId?.name || 'Player'}</span>
                        <div className="flex items-center space-x-1">
                          {renderStars(r.rating || 0)}
                        </div>
                      </div>
                      {r.comment && <p className="text-sm text-gray-300 mb-2">{r.comment}</p>}
                      {r.scrimId?.title && (
                        <div className="text-xs text-gray-500">for “{r.scrimId.title}”</div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-center py-4">No reviews yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Scrims */}
          <div className="lg:col-span-2">
            <div className="card">
              <h2 className="text-xl font-semibold mb-6">Recent Scrims</h2>
              {scrims.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {scrims.map((scrim) => (
                    <ScrimCard key={scrim._id} scrim={scrim} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-400 mb-2">No scrims yet</h3>
                  <p className="text-gray-500">This organization hasn't created any scrims</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationProfile;
