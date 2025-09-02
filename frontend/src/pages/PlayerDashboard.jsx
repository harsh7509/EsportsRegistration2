import React, { useState, useEffect } from 'react';
import { Calendar, Trophy, Clock, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { scrimsAPI } from '../services/api';
import ScrimCard from '../components/ScrimCard';

const PlayerDashboard = () => {
  const { user } = useAuth();
  const [upcomingScrims, setUpcomingScrims] = useState([]);
  const [completedScrims, setCompletedScrims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    fetchPlayerScrims();
  }, []);

  const fetchPlayerScrims = async () => {
    try {
      // In a real implementation, you'd have an endpoint for user's scrims
      // For now, we'll fetch all scrims and filter client-side
      const upcomingResponse = await scrimsAPI.getList({ 
        status: 'upcoming',
        limit: 50 
      });
      const completedResponse = await scrimsAPI.getList({ 
        status: 'completed',
        limit: 50 
      });

      // Filter scrims where user is a participant
      const upcoming = upcomingResponse.data.items?.filter(scrim => 
        scrim.participants?.some(p => p._id === user.id)
      ) || [];
      
      const completed = completedResponse.data.items?.filter(scrim => 
        scrim.participants?.some(p => p._id === user.id)
      ) || [];

      setUpcomingScrims(upcoming);
      setCompletedScrims(completed);
    } catch (error) {
      console.error('Failed to fetch player scrims:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalScrims: upcomingScrims.length + completedScrims.length,
    upcomingScrims: upcomingScrims.length,
    completedScrims: completedScrims.length,
    reputation: user?.reputation || 0
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}!</h1>
          <p className="text-gray-400">Manage your scrims and track your progress</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card text-center">
            <Calendar className="h-8 w-8 text-gaming-purple mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.totalScrims}</div>
            <div className="text-sm text-gray-400">Total Scrims</div>
          </div>
          
          <div className="card text-center">
            <Clock className="h-8 w-8 text-gaming-cyan mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.upcomingScrims}</div>
            <div className="text-sm text-gray-400">Upcoming</div>
          </div>
          
          <div className="card text-center">
            <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.completedScrims}</div>
            <div className="text-sm text-gray-400">Completed</div>
          </div>
          
          <div className="card text-center">
            <Users className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.reputation}</div>
            <div className="text-sm text-gray-400">Reputation</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'upcoming'
                    ? 'border-gaming-purple text-gaming-purple'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Upcoming Scrims ({stats.upcomingScrims})
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'completed'
                    ? 'border-gaming-purple text-gaming-purple'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Completed ({stats.completedScrims})
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-32 bg-gray-700 rounded mb-4"></div>
                <div className="h-4 bg-gray-700 rounded mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTab === 'upcoming' 
              ? upcomingScrims.map((scrim) => (
                  <ScrimCard key={scrim._id} scrim={scrim} />
                ))
              : completedScrims.map((scrim) => (
                  <ScrimCard key={scrim._id} scrim={scrim} />
                ))
            }
          </div>
        )}

        {((activeTab === 'upcoming' && upcomingScrims.length === 0) || 
          (activeTab === 'completed' && completedScrims.length === 0)) && !loading && (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-400 mb-2">
              No {activeTab} scrims
            </h3>
            <p className="text-gray-500 mb-4">
              {activeTab === 'upcoming' 
                ? "You haven't booked any upcoming scrims yet."
                : "You haven't completed any scrims yet."
              }
            </p>
            <Link to="/scrims" className="btn-primary">
              Browse Scrims
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerDashboard;