import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gamepad2, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadAPI } from '../services/api'; // ✅ needed by ProfileModal image upload

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const dropdownRef = useRef(null);
  
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    navigate('/');
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'admin': return '/admin';
      case 'player': return '/dashboard/player';
      case 'organization': return '/dashboard/org';
      default: return '/';
    }
  };

  const goToMyRanking = () => {
    if (!user?._id) return;
    setShowDropdown(false);
    navigate(`/rankings?highlight=${user._id}`); // ✅ highlight on rankings page
  };

  const goToMyOrgProfile = () => {
    if (!user?._id) return;
    setShowDropdown(false);
    navigate(`/organizations/${user._id}`);
  };

  return (
    <nav className="bg-gaming-dark border-b border-gray-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Gamepad2 className="h-8 w-8 text-gaming-purple" />
            <span className="text-xl font-bold gradient-text">EsportsPro</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/scrims" className="text-gray-300 hover:text-white transition-colors">
              Scrims
            </Link>
            <Link to="/rankings" className="text-gray-300 hover:text-white transition-colors">
              Rankings
            </Link>
            <Link to="/tournaments" className="text-gray-300 hover:text-white transition-colors">
              Tournaments
            </Link>
          </div>


          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2 transition-colors"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gaming-purple rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-white">
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                  <span className="text-white font-medium hidden sm:block">{user.name}</span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-2 z-50">
                    {/* User Info */}
                    <div className="px-4 py-2 border-b border-gray-700">
                      <p className="text-sm font-medium text-white">{user.name}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                      <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${user.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                        user.role === 'organization' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                        {user.role}
                      </span>
                    </div>

                    {/* Menu Items */}
                    <Link
                      to={getDashboardLink()}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      <Settings className="h-4 w-4 mr-3" />
                      Dashboard
                    </Link>

                    <button
                      onClick={() => {
                        setShowProfileModal(true);
                        setShowDropdown(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      <User className="h-4 w-4 mr-3" />
                      Edit Profile
                    </button>

                    {/* ⭐ Org-only quick access */}
                    {user.role === 'organization' && (() => {
                      const uid = user?._id || user?.id || user?.userId; // <-- safe id
                      return (
                        <>
                          <Link
                            to={`/rankings?highlight=${uid}`}
                            onClick={() => setShowDropdown(false)}
                            className="flex items-center w-full px-4 py-2 text-sm text-blue-300 hover:bg-gray-700 hover:text-white transition-colors"
                            title="Jump to your ranking on the Rankings page"
                          >
                            ⭐ My Ranking
                          </Link>

                          <Link
                            to={`/organizations/${uid}`}
                            onClick={() => setShowDropdown(false)}
                            className="flex items-center w-full px-4 py-2 text-sm text-blue-300 hover:bg-gray-700 hover:text-white transition-colors"
                            title="Open your public organization profile"
                          >
                            🏆 My Org Profile
                          </Link>
                          {user.role === 'organization' && (
                            <Link to="/org/verify" className="...">✅ Verify your org</Link>
                          )}

                        </>

                      );
                    })()}
                    <hr className="my-2 border-gray-700" />

                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-gray-300 hover:text-white transition-colors">
                  Login
                </Link>
                <Link to="/signup" className="btn-primary">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <ProfileModal
          user={user}
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </nav>
  );
};

// Profile Modal Component
const ProfileModal = ({ user, isOpen, onClose }) => {
  const [formData, setFormData] = React.useState({
    name: user?.name || '',
    avatarUrl: user?.avatarUrl || '',
    organizationInfo: {
      orgName: user?.organizationInfo?.orgName || '',
      location: user?.organizationInfo?.location || ''
    }
  });
  const [loading, setLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef(null);
  const { updateProfile } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await updateProfile(formData);
      if (result.success) {
        onClose();
        window.location.reload(); // Refresh to update navbar
      }
    } catch (error) {
      console.error('Profile update failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await uploadAPI.uploadImage(file);
      setFormData(prev => ({
        ...prev,
        avatarUrl: response.data.imageUrl
      }));
    } catch (error) {
      console.error('Image upload failed:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Edit Profile</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar */}
          <div className="text-center">
            <div className="relative inline-block">
              {formData.avatarUrl ? (
                <img
                  src={formData.avatarUrl}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 bg-gaming-purple rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {formData.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 bg-gaming-purple hover:bg-gaming-purple/80 text-white p-1 rounded-full transition-colors"
              >
                {uploading ? '...' : '📷'}
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input w-full"
              required
            />
          </div>

          {/* Organization fields for org users */}
          {user?.role === 'organization' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Organization Name</label>
                <input
                  type="text"
                  value={formData.organizationInfo.orgName}
                  onChange={(e) => setFormData({
                    ...formData,
                    organizationInfo: {
                      ...formData.organizationInfo,
                      orgName: e.target.value
                    }
                  })}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
                <input
                  type="text"
                  value={formData.organizationInfo.location}
                  onChange={(e) => setFormData({
                    ...formData,
                    organizationInfo: {
                      ...formData.organizationInfo,
                      location: e.target.value
                    }
                  })}
                  className="input w-full"
                  placeholder="City, Country"
                />
              </div>
            </>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
              disabled={loading || uploading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Navbar;
