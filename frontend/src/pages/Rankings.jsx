import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Users, Star } from 'lucide-react';
import { scrimsAPI } from '../services/api';
import ScrimCard from '../components/ScrimCard';

const Rankings = () => {
  const [topScrims, setTopScrims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopRankedScrims();
  }, []);

  const fetchTopRankedScrims = async () => {
    try {
      const response = await scrimsAPI.getList({ 
        sort: 'rank',
        limit: 20,
        status: 'upcoming'
      });
      setTopScrims(response.data.items || []);
    } catch (error) {
      console.error('Failed to fetch ranked scrims:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <Trophy className="h-16 w-16 text-yellow-500" />
          </div>
          <h1 className="text-4xl font-bold mb-4">
            <span className="gradient-text">Global Rankings</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Discover the highest-rated scrims and tournaments based on our advanced ranking algorithm
          </p>
        </div>

        {/* Ranking Info */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">How Rankings Work</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 text-gaming-purple mx-auto mb-2" />
              <h3 className="font-medium mb-2">Organization Reputation</h3>
              <p className="text-sm text-gray-400">
                Verified organizations with high reputation scores rank higher
              </p>
            </div>
            
            <div className="text-center">
              <Users className="h-8 w-8 text-gaming-cyan mx-auto mb-2" />
              <h3 className="font-medium mb-2">Fill Rate</h3>
              <p className="text-sm text-gray-400">
                Scrims with more participants relative to capacity rank higher
              </p>
            </div>
            
            <div className="text-center">
              <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <h3 className="font-medium mb-2">Community Rating</h3>
              <p className="text-sm text-gray-400">
                Player ratings and feedback influence ranking scores
              </p>
            </div>
          </div>
        </div>

        {/* Top Ranked Scrims */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-6">Top Ranked Scrims</h2>
          
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-32 bg-gray-700 rounded mb-4"></div>
                  <div className="h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : topScrims.length > 0 ? (
            <div className="space-y-6">
              {/* Top 3 Featured */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                {topScrims.slice(0, 3).map((scrim, index) => (
                  <div key={scrim._id} className="relative">
                    {index === 0 && (
                      <div className="absolute -top-3 -right-3 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full z-10">
                        #1
                      </div>
                    )}
                    {index === 1 && (
                      <div className="absolute -top-3 -right-3 bg-gray-400 text-black text-xs font-bold px-2 py-1 rounded-full z-10">
                        #2
                      </div>
                    )}
                    {index === 2 && (
                      <div className="absolute -top-3 -right-3 bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
                        #3
                      </div>
                    )}
                    <ScrimCard scrim={scrim} />
                  </div>
                ))}
              </div>

              {/* Rest of the rankings */}
              {topScrims.length > 3 && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {topScrims.slice(3).map((scrim, index) => (
                    <div key={scrim._id} className="relative">
                      <div className="absolute -top-2 -left-2 bg-gray-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center z-10">
                        {index + 4}
                      </div>
                      <ScrimCard scrim={scrim} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-400 mb-2">No ranked scrims available</h3>
              <p className="text-gray-500">Check back later for updated rankings</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Rankings;