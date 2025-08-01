import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Globe, Calendar, Zap, Download, Eye, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient, { cleanImageUrl } from '../utils/apiClient';

const Storefront = () => {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [glyphs, setGlyphs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('latest');
  const [debugInfo, setDebugInfo] = useState('');

  // Debug function to show information on the page
  const addDebug = (message) => {
    console.log(message);
    setDebugInfo(prev => prev + '\n' + message);
  };

  useEffect(() => {
    const fetchUserAndGlyphs = async () => {
      try {
        addDebug('Fetching storefront for username: ' + username);
        
        // Get user by username
        const userData = await apiClient.getUserByUsername(username);
        addDebug('Found user data: ' + JSON.stringify({
          uid: userData.uid,
          username: userData.username,
          displayName: userData.displayName
        }));
        setUser(userData);

        // Fetch user's glyphs
        addDebug('Fetching glyphs for creatorId: ' + userData.uid);
        const userGlyphs = await apiClient.getGlyphs({ 
          creator_id: userData.uid,
          sort: 'latest',
          limit: 100
        });

        addDebug('Found glyphs: ' + userGlyphs.length);
        if (userGlyphs.length > 0) {
          addDebug('First glyph: ' + JSON.stringify({
            id: userGlyphs[0].id,
            title: userGlyphs[0].title,
            creatorId: userGlyphs[0].creatorId
          }));
        } else {
          addDebug('No glyphs found for this user. Check if glyphs were created with the correct creatorId.');
        }
        
        // Convert createdAt strings back to Date objects for display
        userGlyphs.forEach(glyph => {
          if (glyph.createdAt) {
            glyph.createdAt = new Date(glyph.createdAt);
          }
        });
        
        setGlyphs(userGlyphs);
      } catch (error) {
        addDebug('Error fetching user data: ' + error.message);
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchUserAndGlyphs();
    }
  }, [username]);

  const getSortedGlyphs = () => {
    switch (activeTab) {
      case 'popular':
        return [...glyphs].sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
      case 'liked':
        return [...glyphs].sort((a, b) => (b.likes || 0) - (a.likes || 0));
      default:
        return glyphs; // Already sorted by createdAt desc
    }
  };

  const GlyphCard = ({ glyph }) => (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-nothing-gray-900 border border-nothing-gray-800 rounded-lg overflow-hidden hover:border-nothing-gray-700 transition-all duration-300"
    >
      <Link to={`/glyph/${glyph.id}`}>
        <div className="aspect-square bg-nothing-gray-800 relative overflow-hidden">
          {glyph.images && glyph.images.length > 0 ? (
            <img
              src={cleanImageUrl(glyph.images[0])}
              alt={glyph.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-16 h-16 bg-nothing-red rounded-full flex items-center justify-center glyph-animation">
                <Zap className="h-8 w-8 text-nothing-white" />
              </div>
            </div>
          )}
          
          {/* Overlay with stats */}
          <div className="absolute inset-0 bg-gradient-to-t from-nothing-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center justify-between text-nothing-white text-sm">
                <div className="flex items-center space-x-2">
                  <Download className="h-4 w-4" />
                  <span>{glyph.downloads || 0}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Heart className="h-4 w-4" />
                  <span>{glyph.likes || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="text-nothing-white font-semibold text-lg mb-2 truncate">
            {glyph.title}
          </h3>
          <p className="text-nothing-gray-400 text-sm mb-3 line-clamp-2">
            {glyph.description}
          </p>
          
          <div className="flex items-center justify-between text-nothing-gray-500 text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Download className="h-3 w-3" />
                <span>{glyph.downloads || 0}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Eye className="h-3 w-3" />
                <span>{glyph.views || 0}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Heart className="h-3 w-3" />
                <span>{glyph.likes || 0}</span>
              </div>
            </div>
            <span className="text-xs">
              {glyph.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-nothing-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-nothing-red rounded-full flex items-center justify-center mx-auto mb-4 glyph-animation">
            <Zap className="h-8 w-8 text-nothing-white" />
          </div>
          <p className="text-nothing-gray-400">Loading storefront...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-nothing-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-nothing-white mb-4">User not found</h1>
          <p className="text-nothing-gray-400 mb-6">
            The user @{username} does not exist.
          </p>
          <Link 
            to="/" 
            className="bg-nothing-red hover:bg-red-700 text-nothing-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
          >
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  const totalDownloads = glyphs.reduce((sum, glyph) => sum + (glyph.downloads || 0), 0);
  const totalLikes = glyphs.reduce((sum, glyph) => sum + (glyph.likes || 0), 0);

  return (
    <div className="min-h-screen bg-nothing-black">
      {/* Profile Header */}
      <div className="bg-nothing-gray-900 border-b border-nothing-gray-800 relative overflow-hidden">
        {/* Banner Image */}
        {user.bannerImage && (
          <div className="absolute inset-0 w-full h-full">
            <img
              src={cleanImageUrl(user.bannerImage)}
              alt="Profile banner"
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-nothing-gray-900 via-nothing-gray-900/80 to-nothing-gray-900/40"></div>
          </div>
        )}
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            {/* Profile Picture */}
            <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-6 border-4 border-nothing-white shadow-lg">
              {user.profilePicture ? (
                <img
                  src={cleanImageUrl(user.profilePicture)}
                  alt={user.displayName || user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-nothing-red flex items-center justify-center">
                  <span className="text-2xl font-bold text-nothing-white">
                    {user.displayName?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <h1 className="text-3xl font-bold text-nothing-white mb-2 font-nothing">
              {user.username}
            </h1>
            <p className="text-nothing-red text-lg mb-4">@{user.username}</p>

            {user.bio && (
              <p className="text-nothing-gray-300 max-w-2xl mx-auto mb-6">
                {user.bio}
              </p>
            )}

            {/* User Info */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-nothing-gray-400 text-sm mb-6">
              {user.location && (
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>{user.location}</span>
                </div>
              )}
              {user.website && (
                <a
                  href={user.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 hover:text-nothing-white transition-colors duration-200"
                >
                  <Globe className="h-4 w-4" />
                  <span>Website</span>
                </a>
              )}
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>
                  Joined {user.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center space-x-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-nothing-white">{glyphs.length}</div>
                <div className="text-nothing-gray-400 text-sm">Glyphs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-nothing-white">{totalDownloads}</div>
                <div className="text-nothing-gray-400 text-sm">Downloads</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-nothing-white">{totalLikes}</div>
                <div className="text-nothing-gray-400 text-sm">Likes</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Glyphs Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex space-x-4 border-b border-nothing-gray-800 mb-8">
          <button
            onClick={() => setActiveTab('latest')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors duration-200 ${
              activeTab === 'latest'
                ? 'border-nothing-red text-nothing-red'
                : 'border-transparent text-nothing-gray-400 hover:text-nothing-white'
            }`}
          >
            Latest
          </button>
          <button
            onClick={() => setActiveTab('popular')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors duration-200 ${
              activeTab === 'popular'
                ? 'border-nothing-red text-nothing-red'
                : 'border-transparent text-nothing-gray-400 hover:text-nothing-white'
            }`}
          >
            Most Downloaded
          </button>
          <button
            onClick={() => setActiveTab('liked')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors duration-200 ${
              activeTab === 'liked'
                ? 'border-nothing-red text-nothing-red'
                : 'border-transparent text-nothing-gray-400 hover:text-nothing-white'
            }`}
          >
            Most Liked
          </button>
        </div>

        {/* Glyphs Grid */}
        {glyphs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {getSortedGlyphs().map((glyph, index) => (
              <motion.div
                key={glyph.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <GlyphCard glyph={glyph} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-nothing-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-nothing-gray-600" />
            </div>
            <h3 className="text-nothing-white text-lg font-medium mb-2">No glyphs yet</h3>
            <p className="text-nothing-gray-400">
              {user.username} hasn't shared any glyphs yet.
            </p>
          </div>
        )}
      </div>
      
      {/* Debug Information - Remove this after fixing */}
      {debugInfo && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-nothing-gray-900 border border-nothing-gray-700 rounded-lg p-4">
            <h3 className="text-nothing-white font-bold mb-2">Debug Info:</h3>
            <pre className="text-nothing-gray-300 text-xs whitespace-pre-wrap overflow-auto">
              {debugInfo}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default Storefront;
