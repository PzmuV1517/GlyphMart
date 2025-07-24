import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, increment, collection, addDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { Download, Eye, Heart, Share2, AlertTriangle, Github, ExternalLink, Calendar, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';
import { recordGlyphView, recordGlyphDownload } from '../utils/viewTracking';
import { hasUserLikedGlyph, toggleGlyphLike } from '../utils/likeTracking';

const GlyphDetail = () => {
  const { id } = useParams();
  const [glyph, setGlyph] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const { currentUser, userProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGlyph = async () => {
      try {
        const glyphDoc = await getDoc(doc(db, 'glyphs', id));
        if (glyphDoc.exists()) {
          const glyphData = { id: glyphDoc.id, ...glyphDoc.data() };
          setGlyph(glyphData);
          
          // Record view with IP-based tracking (only increments if new IP)
          await recordGlyphView(id);
          
          // Check if current user has liked this glyph
          if (currentUser) {
            const userLiked = await hasUserLikedGlyph(id, currentUser.uid);
            setLiked(userLiked);
          }
        } else {
          navigate('/404');
        }
      } catch (error) {
        console.error('Error fetching glyph:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchGlyph();
    }
  }, [id, navigate, currentUser]);

  const handleDownload = async () => {
    if (!glyph.apkUrl && !glyph.githubUrl) return;
    
    if (glyph.apkUrl) {
      // Direct APK download
      setShowDisclaimer(true);
    } else if (glyph.githubUrl) {
      // Redirect to GitHub repository
      window.open(glyph.githubUrl, '_blank');
      // Record download with IP-based tracking (only increments if new IP)
      try {
        const wasNewDownload = await recordGlyphDownload(id);
        if (wasNewDownload) {
          setGlyph(prev => ({
            ...prev,
            downloads: (prev.downloads || 0) + 1
          }));
        }
      } catch (error) {
        console.error('Error updating download count:', error);
      }
    }
  };

  const confirmDownload = async () => {
    setDownloadLoading(true);
    try {
      // Record download with IP-based tracking (only increments if new IP)
      const wasNewDownload = await recordGlyphDownload(id);

      // Create download link
      const link = document.createElement('a');
      link.href = glyph.apkUrl;
      link.download = `${glyph.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.apk`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Update local state only if it was a new download
      if (wasNewDownload) {
        setGlyph(prev => ({
          ...prev,
          downloads: (prev.downloads || 0) + 1
        }));
      }
    } catch (error) {
      console.error('Error downloading glyph:', error);
    } finally {
      setDownloadLoading(false);
      setShowDisclaimer(false);
    }
  };

  const handleLike = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    try {
      const newLikedState = await toggleGlyphLike(id, currentUser.uid);
      const increment_value = newLikedState ? 1 : -1;
      
      setLiked(newLikedState);
      setGlyph(prev => ({
        ...prev,
        likes: (prev.likes || 0) + increment_value
      }));
    } catch (error) {
      console.error('Error liking glyph:', error);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: glyph.title,
          text: glyph.description,
          url: url,
        });
      } catch (error) {
        console.error('Error sharing:', error);
        copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // Show toast notification
      alert('Link copied to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  useEffect(() => {
    if (editing && glyph) {
      setEditData({
        title: glyph.title,
        description: glyph.description,
        apkUrl: glyph.apkUrl || '',
        githubUrl: glyph.githubUrl || '',
        instructions: glyph.instructions || '',
        images: glyph.images || [],
      });
    }
  }, [editing, glyph]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
    setEditError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      await updateDoc(doc(db, 'glyphs', glyph.id), {
        title: editData.title,
        description: editData.description,
        apkUrl: editData.apkUrl,
        githubUrl: editData.githubUrl,
        instructions: editData.instructions,
        images: editData.images,
      });
      setEditing(false);
      setGlyph(prev => ({ ...prev, ...editData }));
    } catch (error) {
      setEditError('Failed to update glyph: ' + error.message);
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-nothing-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-nothing-red rounded-full flex items-center justify-center mx-auto mb-4 glyph-animation">
            <div className="w-8 h-8 bg-nothing-white rounded-full"></div>
          </div>
          <p className="text-nothing-gray-400">Loading glyph...</p>
        </div>
      </div>
    );
  }

  if (!glyph) {
    return (
      <div className="min-h-screen bg-nothing-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-nothing-white mb-4">Glyph not found</h1>
          <Link to="/" className="text-nothing-red hover:text-red-400">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  if (glyph.deleted) {
    return (
      <div className="min-h-screen bg-nothing-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Glyph Deleted</h1>
          <p className="text-nothing-gray-400 mb-6">This glyph has been deleted by its creator and is no longer available.</p>
          <Link to="/" className="bg-nothing-red hover:bg-red-700 text-nothing-white px-6 py-3 rounded-lg font-medium transition-colors duration-200">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nothing-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Images Section */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="aspect-square bg-nothing-gray-900 rounded-lg overflow-hidden"
            >
              {glyph.images && glyph.images.length > 0 ? (
                <img
                  src={glyph.images[0]}
                  alt={glyph.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-24 h-24 bg-nothing-red rounded-full flex items-center justify-center glyph-animation">
                    <div className="w-12 h-12 bg-nothing-white rounded-full"></div>
                  </div>
                </div>
              )}
            </motion.div>

        {/* Edit/Delete controls for creator */}
        {userProfile && glyph.creatorUsername === userProfile.username && (
          <>
            <div className="flex space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="px-6 py-3 bg-nothing-gray-700 hover:bg-nothing-gray-800 text-nothing-white rounded-lg font-medium transition-colors duration-200"
              >
                Edit Glyph
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-6 py-3 bg-nothing-red hover:bg-red-700 text-nothing-white rounded-lg font-medium transition-colors duration-200"
              >
                Delete Glyph
              </button>
            </div>
            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-nothing-black/80 flex items-center justify-center z-50 p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-nothing-gray-900 border border-nothing-gray-800 rounded-lg p-6 max-w-md w-full"
                >
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-nothing-white mb-4">Delete Glyph?</h2>
                    <p className="text-nothing-gray-300 mb-4">Are you sure you want to permanently delete this glyph and all its related data? This action cannot be undone.</p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={async () => {
                        if (deleteLoading) return; // Prevent double delete
                        setDeleteLoading(true);
                        try {
                          // Delete glyph document
                          await deleteDoc(doc(db, 'glyphs', glyph.id));
                          // Delete all likes
                          const likesQuery = query(collection(db, 'likes'), where('glyphId', '==', glyph.id));
                          const likesSnapshot = await getDocs(likesQuery);
                          for (const likeDoc of likesSnapshot.docs) {
                            await deleteDoc(likeDoc.ref);
                          }
                          // Delete all views
                          const viewsQuery = query(collection(db, 'glyphViews'), where('glyphId', '==', glyph.id));
                          const viewsSnapshot = await getDocs(viewsQuery);
                          for (const viewDoc of viewsSnapshot.docs) {
                            await deleteDoc(viewDoc.ref);
                          }
                          // Delete all downloads
                          const downloadsQuery = query(collection(db, 'glyphDownloads'), where('glyphId', '==', glyph.id));
                          const downloadsSnapshot = await getDocs(downloadsQuery);
                          for (const downloadDoc of downloadsSnapshot.docs) {
                            await deleteDoc(downloadDoc.ref);
                          }
                        } finally {
                          setDeleteLoading(false);
                          setShowDeleteConfirm(false);
                          navigate('/');
                        }
                      }}
                      disabled={deleteLoading}
                      className="flex-1 bg-nothing-red hover:bg-red-700 text-nothing-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
                    >
                      {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleteLoading}
                      className="px-4 py-2 border border-nothing-gray-700 text-nothing-white hover:border-nothing-gray-600 rounded-lg font-medium transition-colors duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </>
        )}
      </div>

          {/* Details Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <div>
              <h1 className="text-3xl font-bold text-nothing-white mb-4 font-nothing">
                {glyph.title}
              </h1>
              
              <div className="flex items-center space-x-4 mb-6">
                <Link
                  to={`/storefront/${glyph.creatorUsername || glyph.creatorId}`}
                  className="flex items-center space-x-2 text-nothing-red hover:text-red-400 transition-colors duration-200"
                >
                  <User className="h-4 w-4" />
                  <span className="font-medium">@{glyph.creatorUsername || glyph.creatorId}</span>
                </Link>
                
                <div className="flex items-center space-x-1 text-nothing-gray-400">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">
                    {glyph.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}
                  </span>
                </div>
              </div>

              <p className="text-nothing-gray-300 text-lg leading-relaxed mb-6">
                {glyph.description}
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center space-x-6 py-4 border-y border-nothing-gray-800">
              <div className="flex items-center space-x-2 text-nothing-gray-400">
                <Download className="h-5 w-5" />
                <span>{glyph.downloads || 0} downloads</span>
              </div>
              <div className="flex items-center space-x-2 text-nothing-gray-400">
                <Eye className="h-5 w-5" />
                <span>{glyph.views || 0} views</span>
              </div>
              <div className="flex items-center space-x-2 text-nothing-gray-400">
                <Heart className="h-5 w-5" />
                <span>{glyph.likes || 0} likes</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              {(glyph.apkUrl || glyph.githubUrl) && (
                <button
                  onClick={handleDownload}
                  className="flex-1 bg-nothing-red hover:bg-red-700 text-nothing-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors duration-200"
                >
                  <Download className="h-5 w-5" />
                  <span>
                    {glyph.apkUrl ? 'Download APK' : 'View on GitHub'}
                  </span>
                </button>
              )}
              
              <button
                onClick={handleLike}
                className={`px-6 py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors duration-200 min-w-[120px] ${
                  liked
                    ? 'bg-nothing-red text-nothing-white'
                    : 'border border-nothing-gray-700 text-nothing-white hover:border-nothing-gray-600'
                }`}
              >
                <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
                <span>{liked ? 'Liked' : 'Like'}</span>
              </button>
              
              <button
                onClick={handleShare}
                className="px-6 py-3 border border-nothing-gray-700 text-nothing-white hover:border-nothing-gray-600 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors duration-200"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>

            {/* Links */}
            {(glyph.githubUrl || glyph.instructions) && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-nothing-white">
                  {glyph.githubUrl && glyph.instructions ? 'Links & Instructions' : 
                   glyph.githubUrl ? 'Repository' : 'Instructions'}
                </h3>
                
                {glyph.githubUrl && (
                  <a
                    href={glyph.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-nothing-gray-300 hover:text-nothing-white transition-colors duration-200"
                  >
                    <Github className="h-5 w-5" />
                    <span>View on GitHub</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                
                {glyph.instructions && (
                  <div className="bg-nothing-gray-900 border border-nothing-gray-800 rounded-lg p-4">
                    <h4 className="text-nothing-white font-medium mb-2">Installation Instructions</h4>
                    <p className="text-nothing-gray-300 text-sm whitespace-pre-wrap">
                      {glyph.instructions}
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Download Disclaimer Modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 bg-nothing-black/80 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-nothing-gray-900 border border-nothing-gray-800 rounded-lg p-6 max-w-md w-full"
          >
            <div className="flex items-start space-x-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-nothing-white mb-2">
                  Download Disclaimer
                </h3>
                <p className="text-nothing-gray-300 text-sm">
                  This APK is shared by the community. GlyphMart does not guarantee the safety or functionality of third-party files. Download and install at your own risk.
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={confirmDownload}
                disabled={downloadLoading}
                className="flex-1 bg-nothing-red hover:bg-red-700 text-nothing-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
              >
                {downloadLoading ? 'Downloading...' : 'I Understand, Download'}
              </button>
              <button
                onClick={() => setShowDisclaimer(false)}
                className="px-4 py-2 border border-nothing-gray-700 text-nothing-white hover:border-nothing-gray-600 rounded-lg font-medium transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Glyph Modal */}
      {editing && editData ? (
        <div className="min-h-screen bg-nothing-black flex items-center justify-center p-4">
          <div className="bg-nothing-gray-900 border border-nothing-gray-800 rounded-lg p-8 max-w-lg w-full">
            <h2 className="text-2xl font-bold text-nothing-white mb-6">Edit Glyph</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-nothing-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  name="title"
                  value={editData.title}
                  onChange={handleEditChange}
                  className="w-full px-4 py-3 bg-nothing-gray-800 border border-nothing-gray-700 rounded-lg text-nothing-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-nothing-gray-300 mb-2">Description</label>
                <textarea
                  name="description"
                  value={editData.description}
                  onChange={handleEditChange}
                  rows={4}
                  className="w-full px-4 py-3 bg-nothing-gray-800 border border-nothing-gray-700 rounded-lg text-nothing-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-nothing-gray-300 mb-2">APK URL</label>
                <input
                  type="url"
                  name="apkUrl"
                  value={editData.apkUrl}
                  onChange={handleEditChange}
                  className="w-full px-4 py-3 bg-nothing-gray-800 border border-nothing-gray-700 rounded-lg text-nothing-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-nothing-gray-300 mb-2">GitHub URL</label>
                <input
                  type="url"
                  name="githubUrl"
                  value={editData.githubUrl}
                  onChange={handleEditChange}
                  className="w-full px-4 py-3 bg-nothing-gray-800 border border-nothing-gray-700 rounded-lg text-nothing-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-nothing-gray-300 mb-2">Instructions</label>
                <textarea
                  name="instructions"
                  value={editData.instructions}
                  onChange={handleEditChange}
                  rows={2}
                  className="w-full px-4 py-3 bg-nothing-gray-800 border border-nothing-gray-700 rounded-lg text-nothing-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-nothing-gray-300 mb-2">Image URLs (comma separated)</label>
                <input
                  type="text"
                  name="images"
                  value={editData.images.join(', ')}
                  onChange={e => setEditData(prev => ({ ...prev, images: e.target.value.split(',').map(s => s.trim()) }))
                  }
                  className="w-full px-4 py-3 bg-nothing-gray-800 border border-nothing-gray-700 rounded-lg text-nothing-white"
                />
              </div>
              {editError && (
                <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-2 rounded-lg mb-4">{editError}</div>
              )}
              <div className="flex space-x-3 mt-6">
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-6 py-3 bg-nothing-red hover:bg-red-700 text-nothing-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-6 py-3 bg-nothing-gray-700 hover:bg-nothing-gray-800 text-nothing-white rounded-lg font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <></>
      )}
    </div>
  );
};

export default GlyphDetail;
