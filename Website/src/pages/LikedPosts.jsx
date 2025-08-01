import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Download, Eye, User, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import apiClient, { cleanImageUrl } from '../utils/apiClient';

const LikedPosts = () => {
  const [likedGlyphs, setLikedGlyphs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchLikedGlyphs = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching liked glyphs for user:', currentUser.uid);
        const glyphs = await apiClient.getUserLikes();
        console.log('Retrieved liked glyphs:', glyphs);
        setLikedGlyphs(glyphs);
      } catch (error) {
        console.error('Error fetching liked glyphs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLikedGlyphs();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-nothing-black text-nothing-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in to view your liked posts</h1>
          <Link
            to="/login"
            className="bg-nothing-red text-nothing-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors duration-200"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-nothing-black text-nothing-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-nothing-red"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nothing-black text-nothing-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2 flex items-center">
            <Heart className="h-8 w-8 mr-3 text-nothing-red fill-current" />
            Liked Posts
          </h1>
          <p className="text-nothing-gray-400">
            {likedGlyphs.length} glyph{likedGlyphs.length !== 1 ? 's' : ''} you've liked
          </p>
        </motion.div>

        {/* Liked Glyphs Grid */}
        {likedGlyphs.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {likedGlyphs.map((glyph, index) => (
              <motion.div
                key={glyph.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group"
              >
                <Link to={`/glyph/${glyph.id}`}>
                  <div className="bg-nothing-gray-900 rounded-lg overflow-hidden border border-nothing-gray-800 hover:border-nothing-gray-700 transition-all duration-300 hover:scale-105">
                    {/* Image */}
                    <div className="aspect-square bg-nothing-gray-800 relative overflow-hidden">
                      {glyph.images && glyph.images.length > 0 ? (
                        <img
                          src={cleanImageUrl(glyph.images[0])}
                          alt={glyph.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-nothing-gray-500 text-6xl">📱</div>
                        </div>
                      )}
                      
                      {/* Overlay with stats */}
                      <div className="absolute inset-0 bg-gradient-to-t from-nothing-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="flex items-center justify-between text-nothing-white text-sm">
                            <div className="flex items-center space-x-2">
                              <Download className="h-4 w-4" />
                              <span>{glyph.downloads || 0}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Eye className="h-4 w-4" />
                              <span>{glyph.views || 0}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Heart className="h-4 w-4 fill-current text-nothing-red" />
                              <span>{glyph.likes || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-semibold text-nothing-white mb-2 line-clamp-2">
                        {glyph.title}
                      </h3>
                      <p className="text-nothing-gray-400 text-sm mb-3 line-clamp-2">
                        {glyph.description}
                      </p>
                      
                      {/* Creator and Date */}
                      <div className="flex items-center justify-between text-xs text-nothing-gray-500">
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>{glyph.creatorUsername}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {glyph.createdAt?.toDate ? 
                              glyph.createdAt.toDate().toLocaleDateString() : 
                              new Date(glyph.createdAt).toLocaleDateString()
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center py-16"
          >
            <Heart className="h-16 w-16 mx-auto mb-4 text-nothing-gray-600" />
            <h2 className="text-2xl font-bold mb-2 text-nothing-gray-400">No liked posts yet</h2>
            <p className="text-nothing-gray-500 mb-6">
              Start exploring glyphs and like the ones you love!
            </p>
            <Link
              to="/"
              className="bg-nothing-red text-nothing-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors duration-200"
            >
              Explore Glyphs
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default LikedPosts;
