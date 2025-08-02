import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Clock, User, MessageSquare, Tag, FileImage, Paperclip } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../utils/apiClient';

const RequestGlyphs = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { currentUser, userProfile } = useAuth();

  // Form state for creating new request
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    referenceImages: [],
    referenceFiles: []
  });

  useEffect(() => {
    fetchRequests();
  }, [searchQuery]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = {
        limit: '20',
        offset: '0'
      };
      
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const data = await apiClient.getGlyphRequests(params);
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      alert('Please log in to create a request');
      return;
    }

    try {
      const requestData = {
        title: formData.title,
        description: formData.description,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        reference_images: formData.referenceImages,
        reference_files: formData.referenceFiles
      };

      await apiClient.createGlyphRequest(requestData);

      setShowCreateForm(false);
      setFormData({
        title: '',
        description: '',
        tags: '',
        referenceImages: [],
        referenceFiles: []
      });
      fetchRequests(); // Refresh the list
    } catch (error) {
      console.error('Error creating request:', error);
      alert(error.message || 'Failed to create request');
    }
  };

  const handleTakeOnRequest = async (requestId) => {
    if (!currentUser) {
      alert('Please log in to take on requests');
      return;
    }

    try {
      await apiClient.takeOnGlyphRequest(requestId);
      alert('Successfully took on the request!');
      fetchRequests(); // Refresh the list
    } catch (error) {
      console.error('Error taking on request:', error);
      alert(error.message || 'Failed to take on request');
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Unknown date';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'text-green-400 bg-green-400/10';
      case 'in_progress': return 'text-yellow-400 bg-yellow-400/10';
      case 'completed': return 'text-blue-400 bg-blue-400/10';
      case 'cancelled': return 'text-red-400 bg-red-400/10';
      default: return 'text-nothing-gray-400 bg-nothing-gray-400/10';
    }
  };

  const truncateText = (text, maxLength = 150) => {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-nothing-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-nothing-red rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <MessageSquare className="h-8 w-8 text-nothing-white" />
          </div>
          <p className="text-nothing-gray-400">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nothing-black">
      {/* Header */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold text-nothing-white mb-4 font-nothing">
                Request <span className="text-nothing-red">Glyph Toys</span>
              </h1>
              <p className="text-xl text-nothing-gray-300 mb-8 max-w-3xl mx-auto">
                Share your ideas for custom Nothing Phone(3) glyphs and let the community bring them to life
              </p>
            </motion.div>
          </div>

          {/* Search and Create */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search requests..."
                  className="w-full bg-nothing-gray-900 border border-nothing-gray-700 rounded-lg py-3 pl-10 pr-4 text-nothing-white placeholder-nothing-gray-400 focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-transparent transition-all duration-200"
                />
                <Search className="absolute left-3 top-3.5 h-5 w-5 text-nothing-gray-400" />
              </div>

              {/* Create Request Button */}
              {currentUser && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-nothing-red hover:bg-red-700 text-nothing-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center space-x-2"
                >
                  <Plus className="h-5 w-5" />
                  <span>Create Request</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Create Request Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-nothing-gray-900 border border-nothing-gray-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-2xl font-bold text-nothing-white mb-6">Create Glyph Request</h3>
              
              <form onSubmit={handleCreateRequest} className="space-y-4">
                <div>
                  <label className="block text-nothing-white font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                    className="w-full bg-nothing-gray-800 border border-nothing-gray-600 rounded-lg py-2 px-3 text-nothing-white placeholder-nothing-gray-400 focus:outline-none focus:ring-2 focus:ring-nothing-red"
                    placeholder="Brief title for your glyph idea..."
                  />
                </div>

                <div>
                  <label className="block text-nothing-white font-medium mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    required
                    rows={6}
                    className="w-full bg-nothing-gray-800 border border-nothing-gray-600 rounded-lg py-2 px-3 text-nothing-white placeholder-nothing-gray-400 focus:outline-none focus:ring-2 focus:ring-nothing-red resize-none"
                    placeholder="Describe your glyph idea in detail. What should it look like? How should it behave? Any specific requirements?"
                  />
                </div>

                <div>
                  <label className="block text-nothing-white font-medium mb-2">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({...formData, tags: e.target.value})}
                    className="w-full bg-nothing-gray-800 border border-nothing-gray-600 rounded-lg py-2 px-3 text-nothing-white placeholder-nothing-gray-400 focus:outline-none focus:ring-2 focus:ring-nothing-red"
                    placeholder="animation, gaming, utility, fun, etc."
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-6 py-2 border border-nothing-gray-600 text-nothing-gray-300 rounded-lg hover:bg-nothing-gray-800 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-nothing-red hover:bg-red-700 text-nothing-white rounded-lg transition-colors duration-200"
                  >
                    Create Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Requests List */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          {requests.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-nothing-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-nothing-gray-600" />
              </div>
              <p className="text-nothing-gray-400 text-lg">No requests found</p>
              <p className="text-nothing-gray-500 text-sm mt-2">
                {searchQuery ? 'Try a different search term' : 'Be the first to create a glyph request!'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {requests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-nothing-gray-900 border border-nothing-gray-700 rounded-lg p-6 hover:border-nothing-gray-600 transition-colors duration-200"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-nothing-white">{request.title}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                          {request.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="text-nothing-gray-300 mb-4 leading-relaxed">
                        {truncateText(request.description)}
                      </p>

                      {/* Tags */}
                      {request.tags && request.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {request.tags.map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="inline-flex items-center space-x-1 px-2 py-1 bg-nothing-gray-800 text-nothing-gray-300 text-xs rounded-full"
                            >
                              <Tag className="h-3 w-3" />
                              <span>{tag}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Reference indicators */}
                      <div className="flex items-center space-x-4 mb-4">
                        {request.reference_images && request.reference_images.length > 0 && (
                          <span className="inline-flex items-center space-x-1 text-nothing-gray-400 text-sm">
                            <FileImage className="h-4 w-4" />
                            <span>{request.reference_images.length} image{request.reference_images.length !== 1 ? 's' : ''}</span>
                          </span>
                        )}
                        {request.reference_files && request.reference_files.length > 0 && (
                          <span className="inline-flex items-center space-x-1 text-nothing-gray-400 text-sm">
                            <Paperclip className="h-4 w-4" />
                            <span>{request.reference_files.length} file{request.reference_files.length !== 1 ? 's' : ''}</span>
                          </span>
                        )}
                      </div>

                      {/* Request info */}
                      <div className="flex items-center justify-between text-sm text-nothing-gray-400">
                        <div className="flex items-center space-x-4">
                          <span className="inline-flex items-center space-x-1">
                            <User className="h-4 w-4" />
                            <span>by {request.user?.username || 'Unknown'}</span>
                          </span>
                          <span className="inline-flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatDate(request.created_at)}</span>
                          </span>
                        </div>
                        
                        {request.status === 'open' && currentUser && (
                          <button
                            onClick={() => handleTakeOnRequest(request.id)}
                            className="bg-nothing-red hover:bg-red-700 text-nothing-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                          >
                            Take On
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default RequestGlyphs;
