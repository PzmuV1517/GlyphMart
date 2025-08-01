import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Download, Heart, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

const GlyphCard = ({ glyph }) => {
  const navigate = useNavigate();
  
  const handleCardClick = () => {
    navigate(`/glyph/${glyph.id}`);
  };

  const handleCreatorClick = (e) => {
    e.stopPropagation();
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-nothing-gray-900 border border-nothing-gray-800 rounded-lg overflow-hidden hover:border-nothing-gray-700 transition-all duration-300"
    >
      <div className="cursor-pointer" onClick={handleCardClick}>
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
              onClick={handleCreatorClick}
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
      </div>
    </motion.div>
  );
};

export default GlyphCard;
