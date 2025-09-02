import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { promosAPI } from '../services/api';

const PromoCarousel = () => {
  const [promos, setPromos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const response = await promosAPI.getActive();
        setPromos(response.data || []);
      } catch (error) {
        console.error('Failed to fetch promos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPromos();
  }, []);

  useEffect(() => {
    if (promos.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % promos.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [promos.length]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % promos.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + promos.length) % promos.length);
  };

  if (loading) {
    return (
      <div className="relative h-64 bg-gray-800 rounded-lg animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-700 to-gray-600 rounded-lg"></div>
      </div>
    );
  }

  if (promos.length === 0) {
    return null;
  }

  const currentPromo = promos[currentIndex];

  return (
    <div className="relative h-64 rounded-lg overflow-hidden group">
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-500"
        style={{ 
          backgroundImage: currentPromo.imageUrl 
            ? `url(${currentPromo.imageUrl})` 
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <div className="absolute inset-0 bg-black/50"></div>
      </div>

      <div className="relative h-full flex items-center justify-center text-center p-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-4">
            {currentPromo.title}
          </h2>
          {currentPromo.targetScrimId && (
            <Link 
              to={`/scrims/${currentPromo.targetScrimId}`}
              className="btn-primary inline-flex items-center"
            >
              Join Now
            </Link>
          )}
        </div>
      </div>

      {promos.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {promos.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PromoCarousel;