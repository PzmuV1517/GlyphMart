import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, User, Menu, X, LogOut, Settings, Plus, Heart, Store } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cleanImageUrl } from '../utils/apiClient';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <nav className="bg-nothing-black border-b border-nothing-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-nothing-red rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-nothing-white rounded-full animate-glow"></div>
              </div>
              <span className="text-xl font-bold text-nothing-white font-nothing">
                GlyphMart
              </span>
            </Link>
          </div>

          {/* Search Bar (hidden on /search) */}
          {location.pathname !== '/search' && (
            <div className="hidden md:block flex-1 max-w-lg mx-8">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search glyphs..."
                  className="w-full bg-nothing-gray-900 border border-nothing-gray-700 rounded-lg py-2 pl-10 pr-4 text-nothing-white placeholder-nothing-gray-400 focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-transparent transition-all duration-200"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-nothing-gray-400" />
              </form>
            </div>
          )}

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {currentUser ? (
              <>
                <Link
                  to="/upload"
                  className="bg-nothing-red hover:bg-red-700 text-nothing-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Upload Glyph</span>
                </Link>
                
                <div className="relative group">
                  <button className="flex items-center space-x-2 text-nothing-white hover:text-nothing-gray-300 transition-colors duration-200">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-nothing-gray-600">
                      {userProfile?.profilePicture || currentUser.photoURL ? (
                        <img
                          src={cleanImageUrl(userProfile?.profilePicture || currentUser.photoURL)}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-nothing-gray-700 flex items-center justify-center">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <span className="font-medium">{userProfile?.username || currentUser.displayName}</span>
                  </button>
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-nothing-gray-900 border border-nothing-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="py-1">
                      <Link
                        to={`/storefront/${userProfile?.username || currentUser.displayName}`}
                        className="block px-4 py-2 text-sm text-nothing-white hover:bg-nothing-gray-800 transition-colors duration-200 flex items-center space-x-2"
                      >
                        <Store className="h-4 w-4" />
                        <span>My Storefront</span>
                      </Link>
                      <Link
                        to="/liked"
                        className="block px-4 py-2 text-sm text-nothing-white hover:bg-nothing-gray-800 transition-colors duration-200 flex items-center space-x-2"
                      >
                        <Heart className="h-4 w-4" />
                        <span>Liked Posts</span>
                      </Link>
                      <Link
                        to="/settings"
                        className="block px-4 py-2 text-sm text-nothing-white hover:bg-nothing-gray-800 transition-colors duration-200 flex items-center space-x-2"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left block px-4 py-2 text-sm text-nothing-white hover:bg-nothing-gray-800 transition-colors duration-200 flex items-center space-x-2"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-nothing-white hover:text-nothing-gray-300 font-medium transition-colors duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="bg-nothing-red hover:bg-red-700 text-nothing-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-nothing-white hover:text-nothing-gray-300 transition-colors duration-200"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-4">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search glyphs..."
              className="w-full bg-nothing-gray-900 border border-nothing-gray-700 rounded-lg py-2 pl-10 pr-4 text-nothing-white placeholder-nothing-gray-400 focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-transparent transition-all duration-200"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-nothing-gray-400" />
          </form>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-nothing-gray-900 border-t border-nothing-gray-800"
          >
            <div className="px-4 py-4 space-y-4">
              {currentUser ? (
                <>
                  <Link
                    to="/upload"
                    className="block bg-nothing-red hover:bg-red-700 text-nothing-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Upload Glyph
                  </Link>
                  <Link
                    to={`/storefront/${userProfile?.username || currentUser.displayName}`}
                    className="block text-nothing-white hover:text-nothing-gray-300 font-medium transition-colors duration-200 flex items-center space-x-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Store className="h-4 w-4" />
                    <span>My Storefront</span>
                  </Link>
                  <Link
                    to="/liked"
                    className="block text-nothing-white hover:text-nothing-gray-300 font-medium transition-colors duration-200 flex items-center space-x-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Heart className="h-4 w-4" />
                    <span>Liked Posts</span>
                  </Link>
                  <Link
                    to="/settings"
                    className="block text-nothing-white hover:text-nothing-gray-300 font-medium transition-colors duration-200 flex items-center space-x-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left text-nothing-white hover:text-nothing-gray-300 font-medium transition-colors duration-200 flex items-center space-x-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block text-nothing-white hover:text-nothing-gray-300 font-medium transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="block bg-nothing-red hover:bg-red-700 text-nothing-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
