import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, User, MessageSquare, Tag, FileImage, Paperclip, CheckCircle, XCircle, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../utils/apiClient';

const MyRequests = () => {
  const [requests, setRequests] = useState([]);
  const [myGlyphs, setMyGlyphs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('taken'); // taken, created
  const { currentUser, userProfile } = useAuth();

  useEffect(() => {
    if (currentUser) {
      fetchMyRequests();
      fetchMyGlyphs();
    }
  }, [currentUser, activeTab]);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'taken') {
        const data = await apiClient.getMyGlyphRequests('assigned');
        setRequests(data.requests.filter(req => req.type === 'assigned'));
      } else {
        const data = await apiClient.getMyGlyphRequests('created');
        setRequests(data.requests.filter(req => req.type === 'created'));
      }
    } catch (error) {
      console.error('Error fetching my requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyGlyphs = async () => {
    try {
      const data = await apiClient.getGlyphs({ creator_id: currentUser.uid, limit: 100 });
      setMyGlyphs(data);
    } catch (error) {
      console.error('Error fetching my glyphs:', error);
      setMyGlyphs([]);
    }
  };

  const handleCompleteRequest = async (requestId, glyphId = null) => {
    try {
      await apiClient.completeGlyphRequest(requestId, glyphId);
      alert('Request marked as completed!');
      fetchMyRequests();
    } catch (error) {
      console.error('Error completing request:', error);
      alert(error.message || 'Failed to complete request');
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!confirm('Are you sure you want to cancel this request?')) return;
    
    try {
      await apiClient.cancelGlyphRequest(requestId);
      alert('Request cancelled');
      fetchMyRequests();
    } catch (error) {
      console.error('Error cancelling request:', error);
      alert(error.message || 'Failed to cancel request');
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

  const truncateText = (text, maxLength = 100) => {
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
          <p className="text-nothing-gray-400">Loading your requests...</p>
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
                My <span className="text-nothing-red">Requests</span>
              </h1>
              <p className="text-xl text-nothing-gray-300 mb-8 max-w-3xl mx-auto">
                Manage the glyph requests you've taken on and created
              </p>
            </motion.div>
          </div>

          {/* Tabs */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="flex space-x-4 border-b border-nothing-gray-800">
              <button
                onClick={() => setActiveTab('taken')}
                className={`flex items-center space-x-2 px-4 py-3 font-medium border-b-2 transition-colors duration-200 ${
                  activeTab === 'taken'
                    ? 'border-nothing-red text-nothing-red'
                    : 'border-transparent text-nothing-gray-400 hover:text-nothing-white'
                }`}
              >
                <Upload className="h-4 w-4" />
                <span>Taken On ({requests.filter(r => r.assigned_to === currentUser?.uid).length})</span>
              </button>
              <button
                onClick={() => setActiveTab('created')}
                className={`flex items-center space-x-2 px-4 py-3 font-medium border-b-2 transition-colors duration-200 ${
                  activeTab === 'created'
                    ? 'border-nothing-red text-nothing-red'
                    : 'border-transparent text-nothing-gray-400 hover:text-nothing-white'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                <span>Created ({requests.filter(r => r.user_id === currentUser?.uid).length})</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Requests List */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          {requests.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-nothing-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-nothing-gray-600" />
              </div>
              <p className="text-nothing-gray-400 text-lg">
                {activeTab === 'taken' ? 'No requests taken on yet' : 'No requests created yet'}
              </p>
              <p className="text-nothing-gray-500 text-sm mt-2">
                {activeTab === 'taken' 
                  ? 'Browse available requests to take on' 
                  : 'Create your first glyph request!'}
              </p>
              <Link
                to={activeTab === 'taken' ? '/request-glyphs' : '/request-glyphs'}
                className="inline-block mt-4 bg-nothing-red hover:bg-red-700 text-nothing-white px-6 py-2 rounded-lg transition-colors duration-200"
              >
                {activeTab === 'taken' ? 'Browse Requests' : 'Create Request'}
              </Link>
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
                        
                        {/* Action buttons for taken requests */}
                        {activeTab === 'taken' && request.status === 'in_progress' && (
                          <div className="flex space-x-2">
                            {/* Complete with glyph selection */}
                            <div className="relative group">
                              <button className="bg-green-600 hover:bg-green-700 text-nothing-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200">
                                Complete
                              </button>
                              <div className="absolute right-0 top-full mt-1 w-64 bg-nothing-gray-800 border border-nothing-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                                <div className="p-3">
                                  <p className="text-nothing-white text-sm mb-2">Complete with glyph:</p>
                                  <div className="space-y-1 max-h-32 overflow-y-auto">
                                    <button
                                      onClick={() => handleCompleteRequest(request.id)}
                                      className="w-full text-left px-2 py-1 text-nothing-gray-300 hover:bg-nothing-gray-700 rounded text-xs"
                                    >
                                      Mark as complete (no glyph)
                                    </button>
                                    {myGlyphs.map(glyph => (
                                      <button
                                        key={glyph.id}
                                        onClick={() => handleCompleteRequest(request.id, glyph.id)}
                                        className="w-full text-left px-2 py-1 text-nothing-gray-300 hover:bg-nothing-gray-700 rounded text-xs"
                                      >
                                        {truncateText(glyph.title, 30)}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => handleCancelRequest(request.id)}
                              className="bg-red-600 hover:bg-red-700 text-nothing-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {/* Show assigned user for created requests */}
                        {activeTab === 'created' && request.assigned_to && (
                          <div className="text-nothing-gray-400 text-sm">
                            Assigned to: {request.assigned_user?.username || 'Unknown'}
                          </div>
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

export default MyRequests;
