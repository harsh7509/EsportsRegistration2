import React, { useState, useEffect } from 'react';
import { Trophy, Star, Users, Award, Eye } from 'lucide-react';
import { organizationsAPI } from '../services/api';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import OrgRatingModal from '../components/OrgRatingModal';
import toast from 'react-hot-toast';

const Rankings = () => {
  const { isAuthenticated, user } = useAuth();
  const canRate = isAuthenticated && user?.role === 'player';

  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // ✅ read ?highlight=<orgId> from URL
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [didScrollHighlight, setDidScrollHighlight] = useState(false);

  // rating modal
  const [rateOpen, setRateOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);

  useEffect(() => {
    fetchOrgRankings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // ✅ after data loads, scroll to highlighted org (if present on this page)
  useEffect(() => {
    if (loading || !highlightId || didScrollHighlight) return;
    // wait for DOM paint
    const t = setTimeout(() => {
      const el = document.getElementById(`org-${highlightId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setDidScrollHighlight(true);
      }
    }, 50);
    return () => clearTimeout(t);
  }, [loading, organizations, highlightId, didScrollHighlight]);

  const normalizeOrg = (o) => ({
    _id: o._id,
    name: o.name,
    email: o.email,
    avatarUrl: o.avatarUrl || o.profileImage || null,
    averageRating: typeof o.averageRating === 'number' ? o.averageRating : 0,
    totalRatings: typeof o.totalRatings === 'number' ? o.totalRatings : 0,
    categoryAverages: {
      organization: o?.categoryAverages?.organization ?? 0,
      communication: o?.categoryAverages?.communication ?? 0,
      fairness: o?.categoryAverages?.fairness ?? 0,
      experience: o?.categoryAverages?.experience ?? 0,
    },
    scrimCount:
      typeof o.scrimCount === 'number'
        ? o.scrimCount
        : Array.isArray(o.scrims)
        ? o.scrims.length
        : 0,
    organizationInfo: o.organizationInfo || {},
  });

  const fetchOrgRankings = async () => {
    setLoading(true);
    try {
      const response = await organizationsAPI.getRankings({
        page: currentPage,
        limit: 10,
      });

      const data = response?.data || {};
      const list = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.organizations)
        ? data.organizations
        : [];

      if (list.length > 0) {
        setOrganizations(list.map(normalizeOrg));
        setTotalPages(data.totalPages || 1);
      } else {
        // fallback: plain org list (0.0 ratings)
        const r = await organizationsAPI.getAllOrganizations();
        const raw = Array.isArray(r?.data) ? r.data : r?.data?.items || [];
        setOrganizations((raw || []).map(normalizeOrg));
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Failed to fetch organization rankings:', error);
      toast.error('Could not load rankings');
      setOrganizations([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (index) => {
    if (index === 0) return { icon: '🥇', color: 'text-yellow-500', bg: 'bg-yellow-500/20' };
    if (index === 1) return { icon: '🥈', color: 'text-gray-400', bg: 'bg-gray-400/20' };
    if (index === 2) return { icon: '🥉', color: 'text-orange-600', bg: 'bg-orange-600/20' };
    return { icon: `#${index + 1}`, color: 'text-gray-500', bg: 'bg-gray-500/20' };
  };

  const renderStars = (rating = 0) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-600'
        }`}
      />
    ));
  };

  const openRate = (org) => {
    setSelectedOrg(org);
    setRateOpen(true);
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <Trophy className="h-16 w-16 text-yellow-500" />
          </div>
          <h1 className="text-4xl font-bold mb-4">
            <span className="gradient-text">Organization Rankings</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Top-rated esports organizations based on player feedback and performance
          </p>
        </div>

        {/* Ranking Criteria */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">Ranking Criteria</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <Award className="h-8 w-8 text-gaming-purple mx-auto mb-2" />
              <h3 className="font-medium mb-2">Organization</h3>
              <p className="text-sm text-gray-400">Event planning and execution quality</p>
            </div>
            <div className="text-center">
              <Users className="h-8 w-8 text-gaming-cyan mx-auto mb-2" />
              <h3 className="font-medium mb-2">Communication</h3>
              <p className="text-sm text-gray-400">Clarity and responsiveness</p>
            </div>
            <div className="text-center">
              <Trophy className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <h3 className="font-medium mb-2">Fairness</h3>
              <p className="text-sm text-gray-400">Fair play and rule enforcement</p>
            </div>
            <div className="text-center">
              <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <h3 className="font-medium mb-2">Experience</h3>
              <p className="text-sm text-gray-400">Overall player satisfaction</p>
            </div>
          </div>
        </div>

        {/* Rankings List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-700 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-700 rounded mb-2" />
                    <div className="h-3 bg-gray-700 rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : organizations.length > 0 ? (
          <>
            <div className="space-y-4 mb-8">
              {organizations.map((org, idx) => {
                const absoluteIndex = idx + (currentPage - 1) * 10;
                const rank = getRankBadge(absoluteIndex);
                const avg = typeof org.averageRating === 'number' ? org.averageRating : 0;
                const cats = org.categoryAverages || {};
                const isHighlight = highlightId === org._id; // ✅ highlight check
                return (
                  <div
                    key={org._id}
                    id={`org-${org._id}`} // ✅ anchor for scrollIntoView
                    className={`card hover:border-gaming-purple transition-all duration-300 ${
                      isHighlight ? 'ring-2 ring-gaming-purple shadow-[0_0_0_4px_rgba(139,92,246,0.25)]' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-6">
                      {/* Rank Badge */}
                      <div
                        className={`w-16 h-16 ${rank.bg} rounded-full flex items-center justify-center text-2xl font-bold ${rank.color}`}
                        title={`Rank ${absoluteIndex + 1}`}
                      >
                        {rank.icon}
                      </div>

                      {/* Organization Avatar */}
                      <div className="w-16 h-16 bg-gaming-purple rounded-full flex items-center justify-center overflow-hidden">
                        {org.avatarUrl ? (
                          <img src={org.avatarUrl} alt={org.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-bold text-white">
                            {org.name?.charAt(0)?.toUpperCase() || 'O'}
                          </span>
                        )}
                      </div>

                      {/* Organization Info */}
                      <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-3 mb-2">
                          <h3 className="text-xl font-semibold">{org.name}</h3>
                          {org.organizationInfo?.verified && (
                            <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
                              ✓ Verified
                            </span>
                          )}
                          {isHighlight && (
                            <span className="bg-gaming-purple/20 text-gaming-purple text-xs px-2 py-1 rounded-full">
                              You
                            </span>
                          )}
                        </div>

                        <div className="flex items-center flex-wrap gap-4 mb-2">
                          <div className="flex items-center space-x-1">
                            {renderStars(avg)}
                            <span className="ml-2 font-semibold text-lg">{avg.toFixed(1)}</span>
                          </div>
                          <span className="text-gray-400 text-sm">({org.totalRatings || 0} reviews)</span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Organization:</span>
                            <div className="font-medium">{(cats.organization ?? 0).toFixed(1)}/5</div>
                          </div>
                          <div>
                            <span className="text-gray-400">Communication:</span>
                            <div className="font-medium">{(cats.communication ?? 0).toFixed(1)}/5</div>
                          </div>
                          <div>
                            <span className="text-gray-400">Fairness:</span>
                            <div className="font-medium">{(cats.fairness ?? 0).toFixed(1)}/5</div>
                          </div>
                          <div>
                            <span className="text-gray-400">Experience:</span>
                            <div className="font-medium">{(cats.experience ?? 0).toFixed(1)}/5</div>
                          </div>
                        </div>
                      </div>

                      {/* Right-side actions/stat */}
                      <div className="text-right min-w-[140px]">
                        <div className="text-2xl font-bold text-gaming-purple mb-1">
                          {org.scrimCount || 0}
                        </div>
                        <div className="text-sm text-gray-400">Scrims Created</div>

                        <div className="mt-3 flex flex-col gap-2">
                          <Link
                            to={`/organizations/${org._id}`}
                            className="inline-flex items-center justify-center text-gaming-cyan hover:text-gaming-cyan/80 text-sm"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Profile
                          </Link>

                          {canRate && (
                            <button
                              onClick={() => openRate(org)}
                              className="btn-primary text-sm"
                              title="Rate this organization"
                            >
                              Rate This Org
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center space-x-2">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentPage(i + 1);
                      // If we change pages while highlighting, allow another scroll
                      setDidScrollHighlight(false);
                    }}
                    className={`px-4 py-2 rounded ${
                      currentPage === i + 1
                        ? 'bg-gaming-purple text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-400 mb-2">No organizations ranked yet</h3>
            <p className="text-gray-500">Organizations will appear here once they receive ratings</p>
          </div>
        )}
      </div>

      {/* Rating Modal */}
      <OrgRatingModal
        open={rateOpen}
        onClose={() => setRateOpen(false)}
        org={selectedOrg}
        onSubmitted={() => {
          toast.success('Rating saved');
          fetchOrgRankings();
        }}
      />
    </div>
  );
};

export default Rankings;
