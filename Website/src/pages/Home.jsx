import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, TrendingUp, Clock, Download, Eye, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '../utils/apiClient';
import GlyphCard from '../components/GlyphCard';

const Home = () => {
  const [latestGlyphs, setLatestGlyphs] = useState([]);
  const [popularGlyphs, setPopularGlyphs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('latest');

  useEffect(() => {
    const fetchGlyphs = async () => {
      try {
        // Fetch latest glyphs
        const latest = await apiClient.getGlyphs({ sort: 'latest', limit: 12 });

        // Fetch popular glyphs (ordered by downloads)
        const popular = await apiClient.getGlyphs({ sort: 'popular', limit: 12 });

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

// ...existing code...

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
