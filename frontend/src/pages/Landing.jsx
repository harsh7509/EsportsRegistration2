import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, Trophy, Users, Calendar, ArrowRight } from 'lucide-react';
import PromoCarousel from '../components/PromoCarousel';
import ScrimCard from '../components/ScrimCard';
import { scrimsAPI } from '../services/api';

const Landing = () => {
  const [topScrims, setTopScrims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopScrims = async () => {
      try {
        const response = await scrimsAPI.getList({ 
          sort: 'rank', 
          limit: 6,
          status: 'upcoming' 
        });
        setTopScrims(response.data.items || []);
      } catch (error) {
        console.error('Failed to fetch scrims:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopScrims();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gaming-dark via-gray-900 to-gaming-dark py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="gradient-text">Compete.</span>
              <br />
              <span className="text-white">Dominate.</span>
              <br />
              <span className="gradient-text">Rise.</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join the ultimate esports platform where organizations create epic scrims 
              and tournaments, and players compete for glory.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup" className="btn-primary text-lg px-8 py-3">
                Start Competing
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link to="/scrims" className="btn-secondary text-lg px-8 py-3">
                Browse Scrims
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Promo Carousel */}
      <section className="py-12 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <PromoCarousel />
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-gaming-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose <span className="gradient-text">EsportsPro</span>?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-gaming-purple/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-gaming-purple" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Easy Scheduling</h3>
              <p className="text-gray-400">
                Organizations can create and manage scrims with flexible time slots and capacity management.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-gaming-cyan/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gaming-cyan" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Instant Booking</h3>
              <p className="text-gray-400">
                Players can instantly book available slots and receive room credentials automatically.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-yellow-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-8 w-8 text-yellow-500" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Smart Rankings</h3>
              <p className="text-gray-400">
                Advanced ranking system ensures the best scrims are always featured and discoverable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Top Scrims */}
      <section className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Browse by Entry Fee</h2>
          
          {/* Free Scrims */}
          <div className="mb-12">
            <h3 className="text-2xl font-semibold mb-6 text-green-400">🆓 Free Scrims</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topScrims.filter(s => s.entryFee === 0).slice(0, 3).map((scrim) => (
                <ScrimCard key={scrim._id} scrim={scrim} />
              ))}
            </div>
            {topScrims.filter(s => s.entryFee === 0).length === 0 && (
              <p className="text-gray-500 text-center py-8">No free scrims available</p>
            )}
          </div>

          {/* ₹25 Scrims */}
          <div className="mb-12">
            <h3 className="text-2xl font-semibold mb-6 text-blue-400">💎 ₹25 Entry Fee Scrims</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topScrims.filter(s => s.entryFee === 25).slice(0, 3).map((scrim) => (
                <ScrimCard key={scrim._id} scrim={scrim} />
              ))}
            </div>
            {topScrims.filter(s => s.entryFee === 25).length === 0 && (
              <p className="text-gray-500 text-center py-8">No ₹25 scrims available</p>
            )}
          </div>

          {/* ₹50 Scrims */}
          <div className="mb-12">
            <h3 className="text-2xl font-semibold mb-6 text-purple-400">🏆 ₹50 Entry Fee Scrims</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topScrims.filter(s => s.entryFee === 50).slice(0, 3).map((scrim) => (
                <ScrimCard key={scrim._id} scrim={scrim} />
              ))}
            </div>
            {topScrims.filter(s => s.entryFee === 50).length === 0 && (
              <p className="text-gray-500 text-center py-8">No ₹50 scrims available</p>
            )}
          </div>

          {/* ₹60+ Premium Scrims */}
          <div className="mb-12">
            <h3 className="text-2xl font-semibold mb-6 text-yellow-400">👑 Premium Scrims (₹60+)</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topScrims.filter(s => s.entryFee >= 60).slice(0, 3).map((scrim) => (
                <ScrimCard key={scrim._id} scrim={scrim} />
              ))}
            </div>
            {topScrims.filter(s => s.entryFee >= 60).length === 0 && (
              <p className="text-gray-500 text-center py-8">No premium scrims available</p>
            )}
          </div>
        </div>
      </section>

      {/* Top Ranked Scrims */}
      <section className="py-16 bg-gaming-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Top Ranked Scrims</h2>
            <Link to="/scrims" className="text-gaming-purple hover:text-gaming-purple/80 font-medium">
              View All →
            </Link>
          </div>
          
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
              {topScrims.map((scrim) => (
                <ScrimCard key={scrim._id} scrim={scrim} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Landing;