import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { Zap, TrendingUp, Clock, Download, Eye, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '../utils/firebase';

const Home = () => {
  const [latestGlyphs, setLatestGlyphs] = useState([]);
  const [popularGlyphs, setPopularGlyphs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('latest');

  useEffect(() => {
    const fetchGlyphs = async () => {
      try {
        // Fetch latest glyphs
        const latestQuery = query(
          collection(db, 'glyphs'),
          orderBy('createdAt', 'desc'),
          limit(12)
        );
        const latestSnapshot = await getDocs(latestQuery);
        const latest = latestSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Fetch popular glyphs (ordered by downloads)
        const popularQuery = query(
          collection(db, 'glyphs'),
          orderBy('downloads', 'desc'),
          limit(12)
        );
        const popularSnapshot = await getDocs(popularQuery);
        const popular = popularSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setLatestGlyphs(latest);
        setPopularGlyphs(popular);
      } catch (error) {
        console.error('Error fetching glyphs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGlyphs();
  }, []);

  const GlyphCard = ({ glyph }) => (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-nothing-gray-900 border border-nothing-gray-800 rounded-lg overflow-hidden hover:border-nothing-gray-700 transition-all duration-300"
    >
      <Link to={`/glyph/${glyph.id}`}>
        <div className="aspect-square bg-nothing-gray-800 relative overflow-hidden">
          {glyph.images && glyph.images.length > 0 ? (
            <img
              src={glyph.images[0]}
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
          
          <div className="flex items-center justify-between">
            <Link
              to={`/storefront/${glyph.creatorUsername}`}
              className="text-nothing-red hover:text-red-400 text-sm font-medium transition-colors duration-200"
            >
              @{glyph.creatorUsername}
            </Link>
            <div className="flex items-center space-x-4 text-nothing-gray-500 text-sm">
              <div className="flex items-center space-x-1">
                <Download className="h-3 w-3" />
                <span>{glyph.downloads || 0}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Eye className="h-3 w-3" />
                <span>{glyph.views || 0}</span>
              </div>
            </div>
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
          <p className="text-nothing-gray-400">Loading latest glyphs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nothing-black">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold text-nothing-white mb-6 font-nothing">
              Glyph<span className="text-nothing-red">Mart</span>
            </h1>
            <p className="text-xl md:text-2xl text-nothing-gray-300 mb-8 max-w-3xl mx-auto">
              Discover, share, and download custom Nothing Phone(3) glyphs created by the community
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/browse"
                className="bg-nothing-red hover:bg-red-700 text-nothing-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors duration-200"
              >
                Browse Glyphs
              </Link>
              <Link
                to="/upload"
                className="border border-nothing-gray-700 hover:border-nothing-gray-600 text-nothing-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors duration-200"
              >
                Upload Your Glyph
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Floating glyph animation */}
        <div className="absolute top-1/2 left-1/4 transform -translate-y-1/2 opacity-20">
          <div className="w-20 h-20 bg-nothing-red rounded-full flex items-center justify-center animate-float">
            <Zap className="h-10 w-10 text-nothing-white" />
          </div>
        </div>
        <div className="absolute top-1/3 right-1/4 transform -translate-y-1/2 opacity-10">
          <div className="w-16 h-16 bg-nothing-white rounded-full flex items-center justify-center animate-float" style={{ animationDelay: '1s' }}>
            <Zap className="h-8 w-8 text-nothing-black" />
          </div>
        </div>
      </section>

      {/* Tabs Section */}
      <section className="px-4 sm:px-6 lg:px-8 mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex space-x-4 border-b border-nothing-gray-800">
            <button
              onClick={() => setActiveTab('latest')}
              className={`flex items-center space-x-2 px-4 py-3 font-medium border-b-2 transition-colors duration-200 ${
                activeTab === 'latest'
                  ? 'border-nothing-red text-nothing-red'
                  : 'border-transparent text-nothing-gray-400 hover:text-nothing-white'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Latest</span>
            </button>
            <button
              onClick={() => setActiveTab('popular')}
              className={`flex items-center space-x-2 px-4 py-3 font-medium border-b-2 transition-colors duration-200 ${
                activeTab === 'popular'
                  ? 'border-nothing-red text-nothing-red'
                  : 'border-transparent text-nothing-gray-400 hover:text-nothing-white'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Popular</span>
            </button>
          </div>
        </div>
      </section>

      {/* Glyphs Grid */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {(activeTab === 'latest' ? latestGlyphs : popularGlyphs).map((glyph, index) => (
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

          {(activeTab === 'latest' ? latestGlyphs : popularGlyphs).length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-nothing-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-nothing-gray-600" />
              </div>
              <p className="text-nothing-gray-400 text-lg">No glyphs found</p>
              <p className="text-nothing-gray-500 text-sm mt-2">
                Be the first to share your custom Nothing Phone(3) glyph!
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
