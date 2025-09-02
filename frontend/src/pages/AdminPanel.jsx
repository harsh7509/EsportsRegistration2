import React, { useState, useEffect } from 'react';
import { Shield, Users, Calendar, TrendingUp } from 'lucide-react';

const AdminPanel = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalScrims: 0,
    activeUsers: 0,
    revenue: 0
  });

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Shield className="h-8 w-8 text-red-500 mr-3" />
            <h1 className="text-3xl font-bold">Admin Panel</h1>
          </div>
          <p className="text-gray-400">Platform administration and moderation tools</p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card text-center">
            <Users className="h-8 w-8 text-gaming-purple mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <div className="text-sm text-gray-400">Total Users</div>
          </div>
          
          <div className="card text-center">
            <Calendar className="h-8 w-8 text-gaming-cyan mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.totalScrims}</div>
            <div className="text-sm text-gray-400">Total Scrims</div>
          </div>
          
          <div className="card text-center">
            <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <div className="text-sm text-gray-400">Active Users</div>
          </div>
          
          <div className="card text-center">
            <div className="h-8 w-8 bg-yellow-500 rounded-full mx-auto mb-2 flex items-center justify-center text-black font-bold text-sm">
              $
            </div>
            <div className="text-2xl font-bold">${stats.revenue}</div>
            <div className="text-sm text-gray-400">Revenue</div>
          </div>
        </div>

        {/* Admin Tools */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">User Management</h2>
            <div className="space-y-3">
              <button className="w-full btn-secondary text-left">
                View All Users
              </button>
              <button className="w-full btn-secondary text-left">
                Pending Verifications
              </button>
              <button className="w-full btn-secondary text-left">
                Banned Users
              </button>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Content Moderation</h2>
            <div className="space-y-3">
              <button className="w-full btn-secondary text-left">
                Review Reported Scrims
              </button>
              <button className="w-full btn-secondary text-left">
                Manage Promotions
              </button>
              <button className="w-full btn-secondary text-left">
                Platform Settings
              </button>
            </div>
          </div>
        </div>

        {/* Coming Soon Notice */}
        <div className="mt-8 card text-center">
          <Shield className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">
            Admin Features Coming Soon
          </h3>
          <p className="text-gray-500">
            Advanced moderation tools and analytics dashboard are in development
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;