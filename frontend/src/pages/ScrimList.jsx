import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Gamepad2 } from 'lucide-react';
import ScrimCard from '../components/ScrimCard';
import { scrimsAPI } from '../services/api';

const ScrimList = () => {
  const [scrims, setScrims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    game: '',
    platform: '',
    date: '',
    sort: 'rank',
    page: 1
  });
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchScrims();
  }, [filters]);

  const fetchScrims = async () => {
    setLoading(true);
    try {
      const response = await scrimsAPI.getList(filters);
      setScrims(response.data.items || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch scrims:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({
      ...filters,
      [key]: value,
      page: 1 // Reset to first page when filtering
    });
  };

  const handlePageChange = (newPage) => {
    setFilters({ ...filters, page: newPage });
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Browse Scrims</h1>
          <p className="text-gray-400">Find and join competitive scrims that match your skill level</p>
        </div>

        {/* Filters */}
        <div className="card mb-8">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Gamepad2 className="inline h-4 w-4 mr-1" />
                Game
              </label>
              <input
                type="text"
                className="input w-full"
                placeholder="Search games..."
                value={filters.game}
                onChange={(e) => handleFilterChange('game', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Platform
              </label>
              <select
                className="input w-full"
                value={filters.platform}
                onChange={(e) => handleFilterChange('platform', e.target.value)}
              >
                <option value="">All Platforms</option>
                <option value="PC">PC</option>
                <option value="PlayStation">PlayStation</option>
                <option value="Xbox">Xbox</option>
                <option value="Mobile">Mobile</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Date
              </label>
              <input
                type="date"
                className="input w-full"
                value={filters.date}
                onChange={(e) => handleFilterChange('date', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sort By
              </label>
              <select
                className="input w-full"
                value={filters.sort}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
              >
                <option value="rank">Rank Score</option>
                <option value="date">Date</option>
                <option value="popularity">Popularity</option>
                <option value="price">Entry Fee</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Entry Fee
              </label>
              <select
                className="input w-full"
                value={filters.entryFee || ''}
                onChange={(e) => handleFilterChange('entryFee', e.target.value)}
              >
                <option value="">All Scrims</option>
                <option value="free">Free Scrims</option>
                <option value="paid">Paid Scrims</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-32 bg-gray-700 rounded mb-4"></div>
                <div className="h-4 bg-gray-700 rounded mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-2/3 mb-4"></div>
                <div className="h-8 bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : scrims.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {scrims.map((scrim) => (
                <ScrimCard key={scrim._id} scrim={scrim} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center space-x-2">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handlePageChange(i + 1)}
                    className={`px-3 py-2 rounded ${
                      filters.page === i + 1
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
            <Gamepad2 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-400 mb-2">No scrims found</h3>
            <p className="text-gray-500">Try adjusting your filters or check back later</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScrimList;