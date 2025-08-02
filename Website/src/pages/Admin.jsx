import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  FileImage, 
  Shield, 
  Search, 
  Edit, 
  Trash2, 
  UserPlus, 
  Crown,
  BarChart3,
  TrendingUp,
  Eye,
  Download,
  Heart,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import apiClient, { cleanImageUrl } from '../utils/apiClient';

const Admin = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  
  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGlyphs: 0,
    totalDownloads: 0,
    totalViews: 0,
    totalLikes: 0,
    totalAdmins: 0,
    uniqueViewers: 0,
    uniqueDownloaders: 0,
    topGlyphs: []
  });
  
  // Users management
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(false);
  
  // Glyphs management
  const [allGlyphs, setAllGlyphs] = useState([]);
  const [selectedGlyph, setSelectedGlyph] = useState(null);
  
  // Requests management
  const [allRequests, setAllRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  
  // Admin management
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminUsers, setAdminUsers] = useState([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Active tab
  const [activeTab, setActiveTab] = useState('stats');
  
  // Check if user is admin
  const isAdmin = currentUser?.uid === '9H3pw5zS6GRDFTZaoYspEmruORj2' || 
                  userProfile?.isAdmin === true;

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    if (!isAdmin) {
      navigate('/');
      return;
    }
    
    loadAdminData();
  }, [currentUser, isAdmin, navigate]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      // Load stats, users, glyphs, and requests
      const [statsData, usersData, glyphsData, requestsData] = await Promise.all([
        apiClient.getAdminStats(),
        apiClient.getAllUsers(),
        apiClient.getGlyphs({ limit: 1000 }), // Get all glyphs for admin
        apiClient.getGlyphRequests({ limit: 1000 }) // Get all requests for admin
      ]);
      
      setStats(statsData);
      setUsers(usersData);
      setFilteredUsers(usersData);
      setAllGlyphs(glyphsData);
      setAllRequests(requestsData.requests || []);
      
      // Filter admin users
      const admins = usersData.filter(user => 
        user.uid === '9H3pw5zS6GRDFTZaoYspEmruORj2' || user.isAdmin
      );
      setAdminUsers(admins);
      
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user =>
        user.username?.toLowerCase().includes(query.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(query.toLowerCase()) ||
        user.email?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  };

  const handleEditUser = async (userId, updatedData) => {
    try {
      setActionLoading(true);
      await apiClient.adminUpdateUser(userId, updatedData);
      
      // Reload users
      const usersData = await apiClient.getAllUsers();
      setUsers(usersData);
      setFilteredUsers(usersData);
      setEditingUser(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMakeAdmin = async (userId) => {
    try {
      setActionLoading(true);
      await apiClient.makeUserAdmin(userId);
      loadAdminData(); // Reload all data
      alert('User promoted to admin successfully!');
    } catch (error) {
      console.error('Error making user admin:', error);
      alert('Failed to promote user to admin');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddAdminByEmail = async () => {
    if (!newAdminEmail.trim()) return;
    
    try {
      setActionLoading(true);
      await apiClient.addAdminByEmail(newAdminEmail);
      setNewAdminEmail('');
      loadAdminData();
      alert('Admin added successfully!');
    } catch (error) {
      console.error('Error adding admin:', error);
      alert('Failed to add admin: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteGlyph = async (glyphId) => {
    if (!confirm('Are you sure you want to delete this glyph?')) return;
    
    try {
      setActionLoading(true);
      await apiClient.adminDeleteGlyph(glyphId);
      
      // Remove from local state
      setAllGlyphs(prev => prev.filter(g => g.id !== glyphId));
      alert('Glyph deleted successfully!');
    } catch (error) {
      console.error('Error deleting glyph:', error);
      alert('Failed to delete glyph');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRequest = async (requestId) => {
    if (!confirm('Are you sure you want to delete this request?')) return;
    
    try {
      setActionLoading(true);
      // This will need a new backend endpoint
      await apiClient.request(`/admin/glyph-requests/${requestId}`, {
        method: 'DELETE'
      });
      
      // Remove from local state
      setAllRequests(prev => prev.filter(r => r.id !== requestId));
      alert('Request deleted successfully!');
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('Failed to delete request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleForceCompleteRequest = async (requestId) => {
    if (!confirm('Are you sure you want to force complete this request?')) return;
    
    try {
      setActionLoading(true);
      // This will need a new backend endpoint
      await apiClient.request(`/admin/glyph-requests/${requestId}/force-complete`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      
      // Update local state
      setAllRequests(prev => 
        prev.map(r => r.id === requestId ? { ...r, status: 'completed' } : r)
      );
      alert('Request marked as completed!');
    } catch (error) {
      console.error('Error completing request:', error);
      alert('Failed to complete request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetRequest = async (requestId) => {
    if (!confirm('Are you sure you want to reset this request to open status?')) return;
    
    try {
      setActionLoading(true);
      // This will need a new backend endpoint
      await apiClient.request(`/admin/glyph-requests/${requestId}/reset`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      
      // Update local state
      setAllRequests(prev => 
        prev.map(r => r.id === requestId ? { ...r, status: 'open', assigned_to: null } : r)
      );
      alert('Request reset to open status!');
    } catch (error) {
      console.error('Error resetting request:', error);
      alert('Failed to reset request');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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

  if (loading) {
    return (
      <div className="min-h-screen bg-nothing-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-nothing-red rounded-full flex items-center justify-center mx-auto mb-4 glyph-animation">
            <Crown className="h-8 w-8 text-nothing-white" />
          </div>
          <p className="text-nothing-gray-400">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-nothing-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h1>
          <p className="text-nothing-gray-400 mb-6">You don't have permission to access the admin panel.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-nothing-red hover:bg-red-700 text-nothing-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nothing-black text-nothing-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-3 mb-4">
            <Crown className="h-8 w-8 text-nothing-red" />
            <h1 className="text-4xl font-bold font-nothing">Admin Panel</h1>
          </div>
          <p className="text-nothing-gray-400">
            Welcome back, {userProfile?.displayName || currentUser?.displayName}. Manage your GlyphMart platform.
          </p>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="border-b border-nothing-gray-800 mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'stats', label: 'Statistics', icon: BarChart3 },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'glyphs', label: 'Glyphs', icon: FileImage },
              { id: 'requests', label: 'Requests', icon: MessageSquare },
              { id: 'admins', label: 'Admins', icon: Shield }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === id
                    ? 'border-nothing-red text-nothing-red'
                    : 'border-transparent text-nothing-gray-400 hover:text-nothing-white hover:border-nothing-gray-600'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'stats' && (
            <div className="space-y-6">
              {/* Main Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-nothing-gray-900 border border-nothing-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-nothing-gray-400 text-sm">Total Users</p>
                      <p className="text-3xl font-bold text-nothing-white">{stats.totalUsers}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </div>

                <div className="bg-nothing-gray-900 border border-nothing-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-nothing-gray-400 text-sm">Total Glyphs</p>
                      <p className="text-3xl font-bold text-nothing-white">{stats.totalGlyphs}</p>
                    </div>
                    <FileImage className="h-8 w-8 text-green-500" />
                  </div>
                </div>

                <div className="bg-nothing-gray-900 border border-nothing-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-nothing-gray-400 text-sm">Unique Downloads</p>
                      <p className="text-3xl font-bold text-nothing-white">{stats.uniqueDownloaders}</p>
                    </div>
                    <Download className="h-8 w-8 text-purple-500" />
                  </div>
                </div>

                <div className="bg-nothing-gray-900 border border-nothing-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-nothing-gray-400 text-sm">Unique Views</p>
                      <p className="text-3xl font-bold text-nothing-white">{stats.uniqueViewers}</p>
                    </div>
                    <Eye className="h-8 w-8 text-orange-500" />
                  </div>
                </div>
              </div>

              {/* Secondary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-nothing-gray-900 border border-nothing-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-nothing-white">Additional Metrics</h3>
                    <TrendingUp className="h-6 w-6 text-nothing-red" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-nothing-gray-400">Total Likes</span>
                      <span className="text-nothing-white font-semibold">{stats.totalLikes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nothing-gray-400">Active Admins</span>
                      <span className="text-nothing-white font-semibold">{stats.totalAdmins}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nothing-gray-400">Avg Unique Downloads/Glyph</span>
                      <span className="text-nothing-white font-semibold">
                        {(stats.totalGlyphs || 0) > 0 ? Math.round((stats.uniqueDownloaders || 0) / stats.totalGlyphs) : 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nothing-gray-400">Avg Unique Views/Glyph</span>
                      <span className="text-nothing-white font-semibold">
                        {(stats.totalGlyphs || 0) > 0 ? Math.round((stats.uniqueViewers || 0) / stats.totalGlyphs) : 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Top Glyphs */}
                <div className="bg-nothing-gray-900 border border-nothing-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-nothing-white">Top Performing Glyphs</h3>
                    <BarChart3 className="h-6 w-6 text-nothing-red" />
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {(stats.topGlyphs || []).slice(0, 5).map((glyph, index) => (
                      <div key={glyph.id} className="flex items-center justify-between p-2 bg-nothing-gray-800 rounded">
                        <div className="flex items-center space-x-2">
                          <span className="text-nothing-red font-bold text-sm">#{index + 1}</span>
                          <span className="text-nothing-white text-sm truncate max-w-32" title={glyph.title}>
                            {glyph.title}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-nothing-gray-400">
                          <span>{glyph.views}v</span>
                          <span>{glyph.downloads}d</span>
                          <span>{glyph.likes}♥</span>
                        </div>
                      </div>
                    ))}
                    {(!stats.topGlyphs || stats.topGlyphs.length === 0) && (
                      <div className="text-center text-nothing-gray-400 py-4">
                        <p>No glyph data available yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notice about broken features */}
              <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-yellow-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-yellow-500 font-medium text-sm">Known Issues</h4>
                    <p className="text-yellow-200/80 text-sm mt-1">
                      Additional metrics and top performing glyphs are currently broken and may not display accurate data.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Search */}
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-nothing-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users by username, name, or email..."
                    value={searchQuery}
                    onChange={(e) => handleUserSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-nothing-gray-900 border border-nothing-gray-700 rounded-lg text-nothing-white placeholder-nothing-gray-400 focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-transparent"
                  />
                </div>
              </div>

              {/* Users List */}
              <div className="bg-nothing-gray-900 border border-nothing-gray-800 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-nothing-gray-800">
                  <h3 className="text-lg font-semibold">Users ({(filteredUsers || []).length})</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {(filteredUsers || []).map((user) => (
                    <div key={user.uid} className="px-6 py-4 border-b border-nothing-gray-800 last:border-b-0 hover:bg-nothing-gray-800 transition-colors duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-nothing-gray-600">
                            {user.profilePicture ? (
                              <img
                                src={cleanImageUrl(user.profilePicture)}
                                alt={user.displayName}
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-nothing-red flex items-center justify-center">
                                <span className="text-sm font-bold text-nothing-white">
                                  {user.displayName?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || 'U'}
                                </span>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-nothing-white">
                              {user.displayName || user.username}
                              {(user.uid === '9H3pw5zS6GRDFTZaoYspEmruORj2' || user.isAdmin) && (
                                <Crown className="inline h-4 w-4 ml-2 text-nothing-red" />
                              )}
                            </p>
                            <p className="text-sm text-nothing-gray-400">@{user.username}</p>
                            <p className="text-xs text-nothing-gray-500">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!user.isAdmin && user.uid !== '9H3pw5zS6GRDFTZaoYspEmruORj2' && (
                            <button
                              onClick={() => handleMakeAdmin(user.uid)}
                              disabled={actionLoading}
                              className="px-3 py-1 bg-nothing-red hover:bg-red-700 text-nothing-white text-sm rounded transition-colors duration-200 disabled:opacity-50"
                            >
                              Make Admin
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="p-2 text-nothing-gray-400 hover:text-nothing-white transition-colors duration-200"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'glyphs' && (
            <div className="space-y-6">
              <div className="bg-nothing-gray-900 border border-nothing-gray-800 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-nothing-gray-800">
                  <h3 className="text-lg font-semibold">All Glyphs ({(allGlyphs || []).length})</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {(allGlyphs || []).map((glyph) => (
                    <div key={glyph.id} className="px-6 py-4 border-b border-nothing-gray-800 last:border-b-0 hover:bg-nothing-gray-800 transition-colors duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-nothing-gray-600">
                            {glyph.images && glyph.images.length > 0 ? (
                              <img
                                src={cleanImageUrl(glyph.images[0])}
                                alt={glyph.title}
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-nothing-gray-700 flex items-center justify-center">
                                <FileImage className="h-6 w-6 text-nothing-gray-500" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-nothing-white">{glyph.title}</p>
                            <p className="text-sm text-nothing-gray-400">by @{glyph.creatorUsername}</p>
                            <p className="text-xs text-nothing-gray-500">
                              {glyph.downloads || 0} downloads • {glyph.views || 0} views • {glyph.likes || 0} likes
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => navigate(`/glyph/${glyph.id}`)}
                            className="px-3 py-1 bg-nothing-gray-700 hover:bg-nothing-gray-600 text-nothing-white text-sm rounded transition-colors duration-200"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteGlyph(glyph.id)}
                            disabled={actionLoading}
                            className="p-2 text-red-400 hover:text-red-300 transition-colors duration-200 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-6">
              {/* Requests Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-nothing-gray-900 border border-nothing-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-nothing-gray-400 text-sm">Total Requests</p>
                      <p className="text-3xl font-bold text-nothing-white">{allRequests.length}</p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-purple-500" />
                  </div>
                </div>
                <div className="bg-nothing-gray-900 border border-nothing-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-nothing-gray-400 text-sm">Open</p>
                      <p className="text-3xl font-bold text-nothing-white">
                        {allRequests.filter(r => r.status === 'open').length}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-green-500" />
                  </div>
                </div>
                <div className="bg-nothing-gray-900 border border-nothing-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-nothing-gray-400 text-sm">In Progress</p>
                      <p className="text-3xl font-bold text-nothing-white">
                        {allRequests.filter(r => r.status === 'in_progress').length}
                      </p>
                    </div>
                    <Eye className="h-8 w-8 text-yellow-500" />
                  </div>
                </div>
                <div className="bg-nothing-gray-900 border border-nothing-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-nothing-gray-400 text-sm">Completed</p>
                      <p className="text-3xl font-bold text-nothing-white">
                        {allRequests.filter(r => r.status === 'completed').length}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-blue-500" />
                  </div>
                </div>
              </div>

              {/* Requests List */}
              <div className="bg-nothing-gray-900 border border-nothing-gray-800 rounded-lg">
                <div className="p-6 border-b border-nothing-gray-800">
                  <h3 className="text-lg font-semibold">All Glyph Requests</h3>
                  <p className="text-nothing-gray-400 text-sm">Manage and monitor all glyph requests</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-nothing-gray-800">
                        <th className="text-left p-4 text-nothing-gray-400 font-medium">Title</th>
                        <th className="text-left p-4 text-nothing-gray-400 font-medium">Status</th>
                        <th className="text-left p-4 text-nothing-gray-400 font-medium">Requester</th>
                        <th className="text-left p-4 text-nothing-gray-400 font-medium">Assigned To</th>
                        <th className="text-left p-4 text-nothing-gray-400 font-medium">Created</th>
                        <th className="text-left p-4 text-nothing-gray-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allRequests.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-nothing-gray-400">
                            No requests found
                          </td>
                        </tr>
                      ) : (
                        allRequests.map((request) => (
                          <tr key={request.id} className="border-b border-nothing-gray-800 hover:bg-nothing-gray-800/50">
                            <td className="p-4">
                              <div>
                                <p className="text-nothing-white font-medium">{request.title}</p>
                                <p className="text-nothing-gray-400 text-sm truncate max-w-xs">
                                  {request.description}
                                </p>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                                {request.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="text-nothing-white">
                                {request.user?.username || 'Unknown'}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="text-nothing-white">
                                {request.assigned_user?.username || (request.assigned_to ? 'Unknown' : 'None')}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="text-nothing-gray-400 text-sm">
                                {formatDate(request.created_at)}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center space-x-2">
                                {request.status === 'in_progress' && (
                                  <button
                                    onClick={() => handleForceCompleteRequest(request.id)}
                                    disabled={actionLoading}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors duration-200 disabled:opacity-50"
                                  >
                                    Complete
                                  </button>
                                )}
                                {(request.status === 'in_progress' || request.status === 'completed') && (
                                  <button
                                    onClick={() => handleResetRequest(request.id)}
                                    disabled={actionLoading}
                                    className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors duration-200 disabled:opacity-50"
                                  >
                                    Reset
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteRequest(request.id)}
                                  disabled={actionLoading}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors duration-200 disabled:opacity-50"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admins' && (
            <div className="space-y-6">
              {/* Add New Admin */}
              <div className="bg-nothing-gray-900 border border-nothing-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Add New Admin</h3>
                <div className="flex items-center space-x-4">
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="flex-1 px-4 py-3 bg-nothing-gray-800 border border-nothing-gray-700 rounded-lg text-nothing-white placeholder-nothing-gray-400 focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-transparent"
                  />
                  <button
                    onClick={handleAddAdminByEmail}
                    disabled={actionLoading || !newAdminEmail.trim()}
                    className="px-6 py-3 bg-nothing-red hover:bg-red-700 text-nothing-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 flex items-center space-x-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Add Admin</span>
                  </button>
                </div>
              </div>

              {/* Current Admins */}
              <div className="bg-nothing-gray-900 border border-nothing-gray-800 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-nothing-gray-800">
                  <h3 className="text-lg font-semibold">Current Admins ({adminUsers.length})</h3>
                </div>
                <div>
                  {adminUsers.map((admin) => (
                    <div key={admin.uid} className="px-6 py-4 border-b border-nothing-gray-800 last:border-b-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-nothing-gray-600">
                            {admin.profilePicture ? (
                              <img
                                src={cleanImageUrl(admin.profilePicture)}
                                alt={admin.displayName}
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-nothing-red flex items-center justify-center">
                                <span className="text-sm font-bold text-nothing-white">
                                  {admin.displayName?.charAt(0)?.toUpperCase() || admin.username?.charAt(0)?.toUpperCase() || 'A'}
                                </span>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-nothing-white flex items-center">
                              {admin.displayName || admin.username}
                              <Crown className="h-4 w-4 ml-2 text-nothing-red" />
                              {admin.uid === '9H3pw5zS6GRDFTZaoYspEmruORj2' && (
                                <span className="ml-2 px-2 py-1 bg-nothing-red text-nothing-white text-xs rounded">
                                  Super Admin
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-nothing-gray-400">@{admin.username}</p>
                            <p className="text-xs text-nothing-gray-500">{admin.email}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Admin;
