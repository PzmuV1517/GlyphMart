import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, updateDoc, doc, increment, getDocs } from 'firebase/firestore';
import { Upload, Image, Link2, Github, FileText, AlertCircle, Plus, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';

const UploadGlyph = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    images: [''], // Array of image URLs
    apkUrl: '',
    githubUrl: '',
    instructions: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  // Debug function to check all glyphs in database
  const checkAllGlyphs = async () => {
    try {
      const glyphsSnapshot = await getDocs(collection(db, 'glyphs'));
      const allGlyphs = glyphsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const myGlyphs = allGlyphs.filter(glyph => glyph.creatorId === currentUser.uid);
      
      const debugMsg = `Total glyphs in database: ${allGlyphs.length}\n` +
                      `My glyphs: ${myGlyphs.length}\n` +
                      `My UID: ${currentUser.uid}\n` +
                      `My username: ${userProfile?.username}\n` +
                      `My displayName: ${currentUser.displayName}\n\n` +
                      `My glyphs:\n` +
                      myGlyphs.map(g => `- ${g.title} (ID: ${g.id})`).join('\n');
      
      setDebugInfo(debugMsg);
      console.log('Debug info:', debugMsg);
    } catch (error) {
      console.error('Error checking glyphs:', error);
      setDebugInfo('Error checking glyphs: ' + error.message);
    }
  };

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleImageUrlChange = (index, value) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    setFormData(prev => ({
      ...prev,
      images: newImages
    }));
  };

  const addImageUrl = () => {
    if (formData.images.length < 5) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, '']
      }));
    }
  };

  const removeImageUrl = (index) => {
    if (formData.images.length > 1) {
      const newImages = formData.images.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        images: newImages
      }));
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return false;
    }
    
    // Require either APK URL or GitHub URL (or both)
    if (!formData.apkUrl.trim() && !formData.githubUrl.trim()) {
      setError('Either APK download URL or GitHub repository URL is required');
      return false;
    }

    // Validate URLs
    const urlPattern = /^https?:\/\/.+/;
    if (formData.apkUrl.trim() && !urlPattern.test(formData.apkUrl)) {
      setError('APK URL must be a valid HTTP/HTTPS URL');
      return false;
    }

    if (formData.githubUrl.trim() && !urlPattern.test(formData.githubUrl)) {
      setError('GitHub URL must be a valid HTTP/HTTPS URL');
      return false;
    }

    // Validate image URLs (if provided)
    const validImages = formData.images.filter(url => url.trim());
    
    for (const imageUrl of validImages) {
      if (!urlPattern.test(imageUrl)) {
        setError('All image URLs must be valid HTTP/HTTPS URLs');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      // Filter out empty image URLs
      const validImages = formData.images.filter(url => url.trim());

      // Create glyph document
      const glyphData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        images: validImages.length > 0 ? validImages : [], // Empty array if no images
        apkUrl: formData.apkUrl.trim() || null,
        githubUrl: formData.githubUrl.trim() || null,
        instructions: formData.instructions.trim() || null,
        creatorId: currentUser.uid,
        creatorUsername: userProfile?.username || currentUser.displayName,
        downloads: 0,
        views: 0,
        likes: 0,
        createdAt: new Date()
      };

      console.log('Creating glyph with data:', glyphData);
      const docRef = await addDoc(collection(db, 'glyphs'), glyphData);
      console.log('Glyph created with ID:', docRef.id);

      // Update user's glyph count
      if (userProfile) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          glyphsCount: increment(1)
        });
      }

      // Redirect to the new glyph page
      navigate(`/glyph/${docRef.id}`);
    } catch (error) {
      console.error('Error creating glyph:', error);
      setError('Failed to upload glyph. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-nothing-black py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 bg-nothing-red rounded-full flex items-center justify-center mx-auto mb-6 glyph-animation">
            <Upload className="h-8 w-8 text-nothing-white" />
          </div>
          <h1 className="text-3xl font-bold text-nothing-white font-nothing mb-4">
            Share Your Glyph
          </h1>
          <p className="text-nothing-gray-400">
            Upload your custom Nothing Phone(3) glyph and share it with the community
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-nothing-gray-900 border border-nothing-gray-800 rounded-lg p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-nothing-white mb-2">
                Glyph Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Custom Boot Animation Glyph"
                className="w-full px-4 py-3 bg-nothing-gray-800 border border-nothing-gray-700 rounded-lg text-nothing-white placeholder-nothing-gray-400 focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-transparent transition-all duration-200"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-nothing-white mb-2">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                placeholder="Describe your glyph, what it does, and any special features..."
                className="w-full px-4 py-3 bg-nothing-gray-800 border border-nothing-gray-700 rounded-lg text-nothing-white placeholder-nothing-gray-400 focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-transparent transition-all duration-200 resize-vertical"
                required
              />
            </div>

            {/* Image URLs */}
            <div>
              <label className="block text-sm font-medium text-nothing-white mb-2">
                Image URLs (Optional)
              </label>
              <p className="text-sm text-nothing-gray-400 mb-4">
                Add URLs to images showcasing your glyph (screenshots, demos, etc.)
              </p>
              
              {formData.images.map((imageUrl, index) => (
                <div key={index} className="flex items-center space-x-2 mb-3">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Image className="h-5 w-5 text-nothing-gray-400" />
                    </div>
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => handleImageUrlChange(index, e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full pl-10 pr-4 py-3 bg-nothing-gray-800 border border-nothing-gray-700 rounded-lg text-nothing-white placeholder-nothing-gray-400 focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-transparent transition-all duration-200"
                    />
                  </div>
                  {formData.images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeImageUrl(index)}
                      className="p-2 text-nothing-gray-400 hover:text-nothing-red transition-colors duration-200"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
              
              {formData.images.length < 5 && (
                <button
                  type="button"
                  onClick={addImageUrl}
                  className="flex items-center space-x-2 text-nothing-red hover:text-red-400 text-sm font-medium transition-colors duration-200"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add another image</span>
                </button>
              )}
            </div>

            {/* APK URL */}
            <div>
              <label htmlFor="apkUrl" className="block text-sm font-medium text-nothing-white mb-2">
                APK Download URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Link2 className="h-5 w-5 text-nothing-gray-400" />
                </div>
                <input
                  type="url"
                  id="apkUrl"
                  name="apkUrl"
                  value={formData.apkUrl}
                  onChange={handleChange}
                  placeholder="https://github.com/username/repo/releases/download/v1.0/glyph.apk"
                  className="w-full pl-10 pr-4 py-3 bg-nothing-gray-800 border border-nothing-gray-700 rounded-lg text-nothing-white placeholder-nothing-gray-400 focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-transparent transition-all duration-200"
                />
              </div>
              <p className="text-sm text-nothing-gray-400 mt-2">
                Direct link to your APK file (GitHub Releases, Google Drive, etc.)
              </p>
            </div>

            {/* GitHub URL */}
            <div>
              <label htmlFor="githubUrl" className="block text-sm font-medium text-nothing-white mb-2">
                GitHub Repository
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Github className="h-5 w-5 text-nothing-gray-400" />
                </div>
                <input
                  type="url"
                  id="githubUrl"
                  name="githubUrl"
                  value={formData.githubUrl}
                  onChange={handleChange}
                  placeholder="https://github.com/username/repository"
                  className="w-full pl-10 pr-4 py-3 bg-nothing-gray-800 border border-nothing-gray-700 rounded-lg text-nothing-white placeholder-nothing-gray-400 focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-transparent transition-all duration-200"
                />
              </div>
              <p className="text-sm text-nothing-gray-400 mt-2">
                Link to your GitHub repository with source code
              </p>
            </div>

            {/* Requirement Notice */}
            <div className="bg-blue-900/20 border border-blue-700 text-blue-400 px-4 py-3 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-4 h-4 bg-blue-400 rounded-full flex items-center justify-center">
                    <span className="text-blue-900 text-xs font-bold">!</span>
                  </div>
                </div>
                <div className="text-sm">
                  <p className="font-medium mb-1">Download Requirement</p>
                  <p>
                    You must provide either an APK download URL or a GitHub repository link (or both). 
                    Users need a way to access your glyph.
                  </p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <label htmlFor="instructions" className="block text-sm font-medium text-nothing-white mb-2">
                Installation Instructions (Optional)
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none">
                  <FileText className="h-5 w-5 text-nothing-gray-400" />
                </div>
                <textarea
                  id="instructions"
                  name="instructions"
                  value={formData.instructions}
                  onChange={handleChange}
                  rows={4}
                  placeholder="1. Download the APK file&#10;2. Enable installation from unknown sources&#10;3. Install the APK&#10;4. Open Nothing Glyph Composer..."
                  className="w-full pl-10 pr-4 py-3 bg-nothing-gray-800 border border-nothing-gray-700 rounded-lg text-nothing-white placeholder-nothing-gray-400 focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-transparent transition-all duration-200 resize-vertical"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded-lg flex items-start space-x-3"
              >
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}

            {/* Disclaimer */}
            <div className="bg-yellow-900/20 border border-yellow-700 text-yellow-400 px-4 py-3 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Important Disclaimer</p>
                  <p>
                    By uploading your glyph, you confirm that you own the rights to share this content. 
                    GlyphMart is not responsible for the safety or functionality of user-generated content.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-6 py-3 border border-nothing-gray-700 text-nothing-white hover:border-nothing-gray-600 rounded-lg font-medium transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-nothing-red hover:bg-red-700 text-nothing-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-nothing-white"></div>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Share Glyph</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
        
        {/* Debug Section - Remove this after fixing */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-nothing-gray-900 rounded-lg p-6 border border-nothing-gray-800 mt-6"
        >
          <h2 className="text-nothing-white text-lg font-bold mb-4">Debug: Check My Glyphs</h2>
          <button
            type="button"
            onClick={checkAllGlyphs}
            className="px-4 py-2 bg-nothing-gray-800 hover:bg-nothing-gray-700 text-nothing-white rounded-lg font-medium transition-colors duration-200 mb-4"
          >
            Check Database
          </button>
          
          {debugInfo && (
            <div className="bg-nothing-gray-800 rounded-lg p-4">
              <pre className="text-nothing-gray-300 text-xs whitespace-pre-wrap overflow-auto">
                {debugInfo}
              </pre>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default UploadGlyph;
