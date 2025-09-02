import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Users, Trophy, Upload, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { scrimsAPI } from '../services/api';
import ScrimCard from '../components/ScrimCard';
import CreateScrimModal from '../components/CreateScrimModal';
import { Link } from 'react-router-dom';

const OrgDashboard = () => {
  const { user } = useAuth();
  const [scrims, setScrims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    fetchOrgScrims();
  }, []);

  const fetchOrgScrims = async () => {
    try {
      // In a real implementation, you'd have an endpoint for organization's scrims
      const response = await scrimsAPI.getList({ 
        limit: 50 
      });
      
      // Filter scrims created by this organization
      const orgScrims = response.data.items?.filter(scrim => 
        scrim.createdBy?._id === user.id
      ) || [];
      
      setScrims(orgScrims);
    } catch (error) {
      console.error('Failed to fetch organization scrims:', error);
    } finally {
      setLoading(false);
    }
  };

  const upcomingScrims = scrims.filter(s => s.status === 'upcoming');
  const completedScrims = scrims.filter(s => s.status === 'completed');
  const ongoingScrims = scrims.filter(s => s.status === 'ongoing');

  const stats = {
    totalScrims: scrims.length,
    upcomingScrims: upcomingScrims.length,
    ongoingScrims: ongoingScrims.length,
    totalParticipants: scrims.reduce((acc, scrim) => acc + (scrim.participants?.length || 0), 0)
  };

  const handleScrimCreated = () => {
    setShowCreateModal(false);
    fetchOrgScrims();
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Organization Dashboard</h1>
            <p className="text-gray-400">Manage your scrims and tournaments</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Scrim
          </button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card text-center">
            <Calendar className="h-8 w-8 text-gaming-purple mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.totalScrims}</div>
            <div className="text-sm text-gray-400">Total Scrims</div>
          </div>
          
          <div className="card text-center">
            <Trophy className="h-8 w-8 text-gaming-cyan mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.upcomingScrims}</div>
            <div className="text-sm text-gray-400">Upcoming</div>
          </div>
          
          <div className="card text-center">
            <div className="h-8 w-8 bg-green-500 rounded-full mx-auto mb-2 flex items-center justify-center">
              <div className="h-3 w-3 bg-white rounded-full animate-pulse"></div>
            </div>
            <div className="text-2xl font-bold">{stats.ongoingScrims}</div>
            <div className="text-sm text-gray-400">Ongoing</div>
          </div>
          
          <div className="card text-center">
            <Users className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.totalParticipants}</div>
            <div className="text-sm text-gray-400">Total Players</div>
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
                Upcoming ({stats.upcomingScrims})
              </button>
              <button
                onClick={() => setActiveTab('ongoing')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'ongoing'
                    ? 'border-gaming-purple text-gaming-purple'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Ongoing ({stats.ongoingScrims})
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'completed'
                    ? 'border-gaming-purple text-gaming-purple'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Completed ({completedScrims.length})
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
            {activeTab === 'upcoming' && upcomingScrims.map((scrim) => (
              <div key={scrim._id} className="relative">
                <ScrimCard scrim={scrim} />
                <div className="absolute top-2 right-2">
                  <Link
                    to={`/scrims/${scrim._id}`}
                    className="bg-gaming-purple/80 hover:bg-gaming-purple text-white p-2 rounded-full transition-colors"
                    title="Manage Scrim"
                  >
                    <Settings className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
            {activeTab === 'ongoing' && ongoingScrims.map((scrim) => (
              <div key={scrim._id} className="relative">
                <ScrimCard scrim={scrim} />
                <div className="absolute top-2 right-2">
                  <Link
                    to={`/scrims/${scrim._id}`}
                    className="bg-gaming-purple/80 hover:bg-gaming-purple text-white p-2 rounded-full transition-colors"
                    title="Manage Scrim"
                  >
                    <Settings className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
            {activeTab === 'completed' && completedScrims.map((scrim) => (
              <ScrimCard key={scrim._id} scrim={scrim} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && (
          (activeTab === 'upcoming' && upcomingScrims.length === 0) ||
          (activeTab === 'ongoing' && ongoingScrims.length === 0) ||
          (activeTab === 'completed' && completedScrims.length === 0)
        ) && (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-400 mb-2">
              No {activeTab} scrims
            </h3>
            <p className="text-gray-500 mb-4">
              {activeTab === 'upcoming' 
                ? "You haven't created any upcoming scrims yet."
                : activeTab === 'ongoing'
                ? "No scrims are currently ongoing."
                : "You haven't completed any scrims yet."
              }
            </p>
            {activeTab === 'upcoming' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Scrim
              </button>
            )}
          </div>
        )}

        {/* Create Scrim Modal */}
        <CreateScrimModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onScrimCreated={handleScrimCreated}
        />
      </div>
    </div>
  );
};

export default OrgDashboard;