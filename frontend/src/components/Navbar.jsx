import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Gamepad2, User, Settings, LogOut, ChevronDown, Menu, X as XIcon, ShieldCheck, Camera
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadAPI } from '../services/api';
import { NormalizeImageUrl } from '../utils/img';

const navLinks = [
  { to: '/scrims', label: 'Scrims' },
  { to: '/rankings', label: 'Rankings' },
  { to: '/tournaments', label: 'Tournaments' },
];

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    setMobileOpen(false);
    navigate('/');
  };

  const getDashboardLink = useMemo(() => {
    if (!user) return '/';
    switch (user.role) {
      case 'admin': return '/admin';
      case 'player': return '/dashboard/player';
      case 'organization': return '/dashboard/org';
      default: return '/';
    }
  }, [user]);

  const uid = user?._id || user?.id || user?.userId;

  const linkBase =
    'text-gray-300 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-gray-800/70';
  const activeLink =
    'text-white bg-gradient-to-r from-gaming-purple/30 to-gaming-cyan/20 hover:bg-gaming-purple/40';

  return (
    <nav className="backdrop-blur supports-[backdrop-filter]:bg-transparent bg-transparent border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Top Row */}
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="group flex items-center space-x-2">
            <img src='/logo2.png' className='h-16'/>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-2">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `${linkBase} ${isActive ? activeLink : ''}`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>

          {/* Right – Auth/User */}
          <div className="flex items-center gap-3">
            {!isAuthenticated ? (
              <>
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    `hidden sm:inline-block ${linkBase} ${isActive ? activeLink : ''}`
                  }
                >
                  Login
                </NavLink>
                <Link
                  to="/signup"
                  className="btn-primary py-2 px-3 text-sm"
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown((v) => !v)}
                  className="flex items-center gap-2 bg-gray-800/70 hover:bg-gray-700/80 rounded-xl px-2.5 py-2 border border-gray-700 transition-colors"
                  aria-haspopup="menu"
                  aria-expanded={showDropdown}
                >
                  {user.avatarUrl ? (
                    <img
                      src={NormalizeImageUrl(user.avatarUrl)}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-700"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gaming-purple rounded-full grid place-items-center text-white font-bold">
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="hidden sm:block text-left">
                    <div className="text-white text-sm font-semibold leading-tight">
                      {user.name?.length > 16 ? user.name.slice(0, 16) + '…' : user.name}
                    </div>
                    <div className="text-[11px] text-gray-400 leading-tight capitalize">
                      {user.role}
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>

                {/* Dropdown */}
                {showDropdown && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-64 bg-gray-900 rounded-xl shadow-xl border border-gray-800 overflow-hidden animate-in fade-in zoom-in-95"
                  >
                    <div className="px-4 py-3 bg-gradient-to-b from-gray-900 to-gray-800 border-b border-gray-800">
                      <p className="text-sm font-medium text-white">{user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium
                        border border-gray-700 text-gray-300">
                        {user.role === 'admin' && <span className="text-red-400">●</span>}
                        {user.role === 'organization' && <span className="text-blue-400">●</span>}
                        {user.role === 'player' && <span className="text-green-400">●</span>}
                        {user.role}
                      </div>
                    </div>

                    <Link
                      to={getDashboardLink}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800/80 hover:text-white transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Dashboard
                    </Link>

                    <button
                      onClick={() => { setShowProfileModal(true); setShowDropdown(false); }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800/80 hover:text-white transition-colors"
                    >
                      <User className="h-4 w-4" />
                      Edit Profile
                    </button>

                    {/* Org quick actions */}
                    {user.role === 'organization' && uid && (
                      <>
                        <Link
                          to={`/rankings?highlight=${uid}`}
                          onClick={() => setShowDropdown(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-blue-300 hover:bg-gray-800/80 hover:text-white transition-colors"
                          title="Jump to your ranking"
                        >
                          ⭐ My Ranking
                        </Link>

                        <Link
                          to={`/organizations/${uid}`}
                          onClick={() => setShowDropdown(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-blue-300 hover:bg-gray-800/80 hover:text-white transition-colors"
                          title="Open public org profile"
                        >
                          🏆 My Org Profile
                        </Link>

                        <Link
                          to="/org/verify"
                          onClick={() => setShowDropdown(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-emerald-300 hover:bg-gray-800/80 hover:text-white transition-colors"
                          title="Verify your organization"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Verify your org
                        </Link>
                      </>
                    )}

                    <div className="my-1 border-t border-gray-800" />

                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-gray-800/80 hover:text-red-300 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mobile toggle */}
            <button
              className="md:hidden p-2 rounded-lg border border-gray-700 bg-gray-800/70 hover:bg-gray-700/80"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5 text-gray-200" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sheet */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition ${mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!mobileOpen}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileOpen(false)}
        />
        {/* Panel */}
        <div
          className={`absolute right-0 top-0 h-full w-[80%] max-w-sm bg-gray-900 border-l border-gray-800 shadow-2xl
          transition-transform ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex items-center justify-between px-4 h-16 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-6 w-6 text-gaming-purple" />
              <span className="font-semibold">Arena Pulse</span>
            </div>
            <button className="p-2 rounded-lg hover:bg-gray-800" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <XIcon className="h-5 w-5 text-gray-300" />
            </button>
          </div>

          <div className="p-4 space-y-2">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg ${isActive ? activeLink : 'text-gray-300 hover:text-white hover:bg-gray-800/80'}`
                }
              >
                {label}
              </NavLink>
            ))}

            {!isAuthenticated ? (
              <div className="pt-4 space-y-2">
                <NavLink
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-lg ${isActive ? activeLink : 'text-gray-300 hover:text-white hover:bg-gray-800/80'}`
                  }
                >
                  Login
                </NavLink>
                <Link
                  to="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="btn-primary w-full text-center"
                >
                  Sign Up
                </Link>
              </div>
            ) : (
              <div className="pt-4 space-y-2">
                <Link
                  to={getDashboardLink}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/80"
                >
                  Dashboard
                </Link>

                <button
                  onClick={() => { setShowProfileModal(true); setMobileOpen(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/80"
                >
                  Edit Profile
                </button>

                {user.role === 'organization' && uid && (
                  <>
                    <Link
                      to={`/rankings?highlight=${uid}`}
                      onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2 rounded-lg text-blue-300 hover:text-white hover:bg-gray-800/80"
                    >
                      ⭐ My Ranking
                    </Link>
                    <Link
                      to={`/organizations/${uid}`}
                      onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2 rounded-lg text-blue-300 hover:text-white hover:bg-gray-800/80"
                    >
                      🏆 My Org Profile
                    </Link>
                    <Link
                      to="/org/verify"
                      onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2 rounded-lg text-emerald-300 hover:text-white hover:bg-gray-800/80"
                    >
                      <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Verify your org</span>
                    </Link>
                  </>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-gray-800/80"
                >
                  Logout
                </button>
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

/* -------------------- Profile Modal -------------------- */

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
  const [preview, setPreview] = React.useState(user?.avatarUrl || '');
  const fileInputRef = React.useRef(null);
  const { updateProfile } = useAuth();

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await updateProfile(formData);
      if (result.success) {
        onClose();
        window.location.reload();
      }
    } catch (error) {
      console.error('Profile update failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // local preview
    const url = URL.createObjectURL(file);
    setPreview((p) => { if (p?.startsWith('blob:')) URL.revokeObjectURL(p); return url; });

    setUploading(true);
    try {
      const res = await uploadAPI.uploadImage(file);
      setFormData((prev) => ({ ...prev, avatarUrl: res?.data?.imageUrl || '' }));
    } catch (error) {
      console.error('Image upload failed:', error);
      alert('Failed to upload image');
      // revert preview if needed
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 grid place-items-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold">Edit Profile</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-800" aria-label="Close">
            <XIcon className="h-5 w-5 text-gray-300" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Avatar */}
          <div className="text-center">
            <div className="relative inline-block">
              {preview ? (
                <img
                  src={preview}
                  alt="Avatar preview"
                  className="w-24 h-24 rounded-full object-cover ring-2 ring-gray-800"
                />
              ) : (
                <div className="w-24 h-24 bg-gaming-purple rounded-full grid place-items-center text-white text-3xl font-bold">
                  {formData.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1.5 -right-1.5 p-2 rounded-full bg-gaming-purple hover:bg-gaming-purple/90 text-white shadow-md"
                title="Upload new avatar"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            {uploading && <div className="text-xs text-gray-400 mt-1">Uploading…</div>}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input w-full"
              required
            />
          </div>

          {/* Org fields */}
          {user?.role === 'organization' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Organization Name</label>
                <input
                  type="text"
                  value={formData.organizationInfo.orgName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      organizationInfo: { ...formData.organizationInfo, orgName: e.target.value },
                    })
                  }
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.organizationInfo.location}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      organizationInfo: { ...formData.organizationInfo, location: e.target.value },
                    })
                  }
                  className="input w-full"
                  placeholder="City, Country"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="flex-1 btn-primary" disabled={loading || uploading}>
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Navbar;
