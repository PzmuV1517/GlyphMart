import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { Search as SearchIcon, Filter, SortAsc, SortDesc, Download, Eye, Heart, Zap, User } from 'lucide-react';
import GlyphCard from '../components/GlyphCard';
import { motion } from 'framer-motion';
import { db } from '../utils/firebase';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('latest');
  const [filterBy, setFilterBy] = useState('all');

  useEffect(() => {
    const searchTermRaw = searchParams.get('q');
    if (searchTermRaw) {
      setSearchQuery(searchTermRaw);
      performSearch(searchTermRaw);
    }
  }, [searchParams]);

  const performSearch = async (searchTermRaw, sort = sortBy, filter = filterBy) => {
    if (!searchTermRaw.trim()) return;
    
    setLoading(true);
    try {
      // Since Firestore doesn't support full-text search natively,
      // we'll fetch all glyphs and filter client-side for this demo
      // In production, you'd want to use Algolia or similar service
      
      let glyphsQuery = collection(db, 'glyphs');
      
      // Apply sorting
      switch (sort) {
        case 'popular':
          glyphsQuery = query(glyphsQuery, orderBy('downloads', 'desc'), limit(100));
          break;
        case 'liked':
          glyphsQuery = query(glyphsQuery, orderBy('likes', 'desc'), limit(100));
          break;
        case 'viewed':
          glyphsQuery = query(glyphsQuery, orderBy('views', 'desc'), limit(100));
          break;
        default:
          glyphsQuery = query(glyphsQuery, orderBy('createdAt', 'desc'), limit(100));
      }

      const snapshot = await getDocs(glyphsQuery);
      const allGlyphs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Client-side search filtering
      const searchTerm = searchTermRaw.toLowerCase();
      const filtered = allGlyphs.filter(glyph => 
        glyph.title.toLowerCase().includes(searchTerm) ||
        glyph.description.toLowerCase().includes(searchTerm) ||
        glyph.creatorUsername.toLowerCase().includes(searchTerm)
      );

      setResults(filtered);
    } catch (error) {
      console.error('Error searching glyphs:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery.trim() });
      performSearch(searchQuery.trim());
    }
  };

// ...existing code...

  return (
    <div className="min-h-screen bg-nothing-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-16 h-16 bg-nothing-red rounded-full flex items-center justify-center mx-auto mb-6 glyph-animation">
              <SearchIcon className="h-8 w-8 text-nothing-white" />
            </div>
            <h1 className="text-3xl font-bold text-nothing-white font-nothing mb-4">
              Search Glyphs
            </h1>
            <p className="text-nothing-gray-400 max-w-2xl mx-auto">
              Discover custom Nothing Phone(3) glyphs created by the community
            </p>
          </motion.div>
        </div>

        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto mb-8"
        >
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for glyphs, creators, or keywords..."
              className="w-full px-6 py-4 pl-14 pr-16 bg-nothing-gray-900 border border-nothing-gray-700 rounded-lg text-nothing-white placeholder-nothing-gray-400 focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-transparent transition-all duration-200 text-lg"
            />
            <SearchIcon className="absolute left-4 top-4 h-6 w-6 text-nothing-gray-400" />
            <button
              type="submit"
              className="absolute right-2 top-2 bottom-2 px-4 bg-nothing-red hover:bg-red-700 text-nothing-white rounded-md font-medium transition-colors duration-200"
            >
              Search
            </button>
          </form>
        </motion.div>

        {/* Filters and Sorting */}
        {(results.length > 0 || loading) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 space-y-4 sm:space-y-0"
          >
            <div className="flex items-center space-x-4">
              <span className="text-nothing-gray-400 text-sm">
                {loading ? 'Searching...' : `${results.length} results found`}
              </span>
              {searchQuery && (
                <span className="text-nothing-white text-sm">
                  for "<span className="text-nothing-red">{searchQuery}</span>"
                </span>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-nothing-gray-400" />
                <span className="text-nothing-gray-400 text-sm">Sort by:</span>
              </div>
              
              <div className="flex space-x-2">
                {[
                  { value: 'latest', label: 'Latest', icon: SortDesc },
                  { value: 'popular', label: 'Popular', icon: Download },
                  { value: 'liked', label: 'Most Liked', icon: Heart },
                  { value: 'viewed', label: 'Most Viewed', icon: Eye }
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => handleSortChange(value)}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      sortBy === value
                        ? 'bg-nothing-red text-nothing-white'
                        : 'bg-nothing-gray-800 text-nothing-gray-300 hover:bg-nothing-gray-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-nothing-red rounded-full flex items-center justify-center mx-auto mb-4 glyph-animation">
                <SearchIcon className="h-8 w-8 text-nothing-white" />
              </div>
              <p className="text-nothing-gray-400">Searching glyphs...</p>
            </div>
          </div>
        )}

         {/* Results Grid */}
         {!loading && results.length > 0 && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.4 }}
             className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
           >
             {results.map((glyph, index) => (
               <motion.div
                 key={glyph.id}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.5, delay: index * 0.1 }}
               >
                 <GlyphCard glyph={glyph} />
               </motion.div>
             ))}
           </motion.div>
         )}

        {/* No Results */}
        {!loading && searchQuery && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 bg-nothing-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <SearchIcon className="h-8 w-8 text-nothing-gray-600" />
            </div>
            <h3 className="text-nothing-white text-lg font-medium mb-2">No results found</h3>
            <p className="text-nothing-gray-400 mb-6">
              Try searching with different keywords or browse all glyphs.
            </p>
            <Link
              to="/"
              className="bg-nothing-red hover:bg-red-700 text-nothing-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
            >
              Browse All Glyphs
            </Link>
          </motion.div>
        )}

        {/* Empty State (no search performed) */}
        {!loading && !searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 bg-nothing-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <SearchIcon className="h-8 w-8 text-nothing-gray-600" />
            </div>
            <h3 className="text-nothing-white text-lg font-medium mb-2">Start searching</h3>
            <p className="text-nothing-gray-400 mb-6">
              Enter a search term to find glyphs, creators, or specific features.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['boot animation', 'notification', 'charging', 'custom'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setSearchQuery(suggestion);
                    setSearchParams({ q: suggestion });
                    performSearch(suggestion);
                  }}
                  className="px-3 py-1 bg-nothing-gray-800 hover:bg-nothing-gray-700 text-nothing-gray-300 rounded-full text-sm transition-colors duration-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Search;
