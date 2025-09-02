import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Gamepad2, User, LogOut, Trophy, Calendar } from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Gamepad2 className="h-8 w-8 text-gaming-purple" />
              <span className="text-xl font-bold gradient-text">EsportsPro</span>
            </Link>
            
            <div className="hidden md:flex ml-10 space-x-8">
              <Link to="/scrims" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                <Calendar className="inline h-4 w-4 mr-1" />
                Scrims
              </Link>
              <Link to="/rankings" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                <Trophy className="inline h-4 w-4 mr-1" />
                Rankings
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Link 
                  to={user?.role === 'organization' ? '/dashboard/org' : '/dashboard/player'}
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <User className="inline h-4 w-4 mr-1" />
                  Dashboard
                </Link>
                <span className="text-sm text-gray-400">
                  {user?.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-gray-300 hover:text-white p-2 rounded-md transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Login
                </Link>
                <Link to="/signup" className="btn-primary">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;