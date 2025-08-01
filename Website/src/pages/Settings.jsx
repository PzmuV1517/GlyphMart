import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile, updatePassword, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { User, Mail, Lock, Settings as SettingsIcon, Save, Eye, EyeOff, AlertCircle, CheckCircle, Camera, Image as ImageIcon, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../utils/apiClient';
import FileUpload from '../components/FileUpload';

const Settings = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  
  const [profileData, setProfileData] = useState({
    displayName: '',
    username: '',
    email: '',
    bio: '',
    profilePicture: '',
    bannerImage: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [uploadedProfilePicture, setUploadedProfilePicture] = useState(null);
  const [uploadedBannerImage, setUploadedBannerImage] = useState(null);

  useEffect(() => {
    if (currentUser && userProfile) {
      setProfileData({
        displayName: currentUser.displayName || '',
        username: userProfile.username || '',
        email: currentUser.email || '',
        bio: userProfile.bio || '',
        profilePicture: userProfile.profilePicture || currentUser.photoURL || '',
        bannerImage: userProfile.bannerImage || ''
      });
    }
  }, [currentUser, userProfile]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Update Firebase Auth profile
      if (profileData.displayName !== currentUser.displayName) {
        await updateProfile(currentUser, {
          displayName: profileData.displayName
        });
      }

      // Update profile picture in Firebase Auth if provided
      if (profileData.profilePicture !== currentUser.photoURL) {
        await updateProfile(currentUser, {
          photoURL: profileData.profilePicture
        });
      }

      // Update email if changed
      if (profileData.email !== currentUser.email) {
        await updateEmail(currentUser, profileData.email);
      }

      // Update Firestore user document
      await apiClient.updateUser({
        username: profileData.username,
        displayName: profileData.displayName,
        bio: profileData.bio,
        profilePicture: profileData.profilePicture,
        bannerImage: profileData.bannerImage,
        updatedAt: new Date()
      });

      setMessage('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      if (error.code === 'auth/requires-recent-login') {
        setError('Please log out and log back in before updating your email.');
      } else {
        setError('Failed to update profile: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureUpload = (uploadedFile, removedFile) => {
    if (uploadedFile) {
      // Profile picture was uploaded
      setUploadedProfilePicture(uploadedFile);
      setProfileData(prev => ({
        ...prev,
        profilePicture: `http://127.0.0.1:5000${uploadedFile.url}`
      }));
    } else if (removedFile) {
      // Profile picture was removed
      setUploadedProfilePicture(null);
      setProfileData(prev => ({
        ...prev,
        profilePicture: ''
      }));
    }
  };

  const handleBannerImageUpload = (uploadedFile, removedFile) => {
    if (uploadedFile) {
      // Banner image was uploaded
      setUploadedBannerImage(uploadedFile);
      setProfileData(prev => ({
        ...prev,
        bannerImage: `http://127.0.0.1:5000${uploadedFile.url}`
      }));
    } else if (removedFile) {
      // Banner image was removed
      setUploadedBannerImage(null);
      setProfileData(prev => ({
        ...prev,
        bannerImage: ''
      }));
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, passwordData.newPassword);

      setMessage('Password updated successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/wrong-password') {
        setError('Current password is incorrect');
      } else {
        setError('Failed to update password: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setError('');
    setMessage('');
    setDeleteLoading(true);
    try {
      if (!deletePassword) {
        setError('Please enter your current password to confirm deletion.');
        setDeleteLoading(false);
        return;
      }
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        deletePassword
      );
      await reauthenticateWithCredential(currentUser, credential);


      // Firestore v9+ modular syntax
      await apiClient.deleteUserData();

      // Delete user account
      await currentUser.delete();
      setMessage('Account and all glyphs deleted successfully.');
      logout();
      navigate('/');
    } catch (error) {
      setError('Failed to delete account: ' + (error.message || error.code));
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!currentUser) {
    navigate('/login');
    return null;
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
            <SettingsIcon className="h-8 w-8 mr-3 text-nothing-red" />
            Settings
          </h1>
          <p className="text-nothing-gray-400">Manage your account and preferences</p>
        </motion.div>

        {/* Messages */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-900/20 border border-green-700 text-green-400 px-4 py-3 rounded-lg mb-6 flex items-center"
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            {message}
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded-lg mb-6 flex items-center"
          >
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-1"
          >
            <div className="bg-nothing-gray-900 rounded-lg p-6 border border-nothing-gray-800">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-3 ${
                    activeTab === 'profile'
                      ? 'bg-nothing-red text-nothing-white'
                      : 'text-nothing-gray-400 hover:text-nothing-white hover:bg-nothing-gray-800'
                  }`}
                >
                  <User className="h-5 w-5" />
                  <span>Profile</span>
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-3 ${
                    activeTab === 'security'
                      ? 'bg-nothing-red text-nothing-white'
                      : 'text-nothing-gray-400 hover:text-nothing-white hover:bg-nothing-gray-800'
                  }`}
                >
                  <Lock className="h-5 w-5" />
                  <span>Security</span>
                </button>
              </nav>
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-3"
          >
            {activeTab === 'profile' && (
              <div className="bg-nothing-gray-900 rounded-lg p-6 border border-nothing-gray-800">
                <h2 className="text-2xl font-bold mb-6">Profile Information</h2>
                
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  {/* Banner Image */}
                  <div>
                    <label className="block text-sm font-medium text-nothing-gray-300 mb-2">
                      Banner Image
                    </label>
                    <div className="space-y-4">
                      {/* Banner Preview */}
                      <div className="w-full h-32 bg-nothing-gray-800 rounded-lg border border-nothing-gray-700 overflow-hidden">
                        {profileData.bannerImage ? (
                          <img
                            src={profileData.bannerImage}
                            alt="Banner preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-nothing-gray-600" />
                          </div>
                        )}
                      </div>
                      
                      {/* File Upload Component */}
                      <div className="bg-nothing-gray-800 rounded-lg p-4">
                        <FileUpload
                          onFileUpload={handleBannerImageUpload}
                          acceptedTypes="profile"
                          multiple={false}
                        />
                      </div>

                      {/* URL Input Alternative */}
                      <div className="text-center text-nothing-gray-400">
                        <span className="px-3 py-1 bg-nothing-gray-800 rounded">OR</span>
                      </div>
                      
                      <div className="relative">
                        <ImageIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-nothing-gray-500" />
                        <input
                          type="url"
                          value={uploadedBannerImage ? profileData.bannerImage : profileData.bannerImage}
                          onChange={(e) => setProfileData(prev => ({ ...prev, bannerImage: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 bg-nothing-gray-800 border border-nothing-gray-700 rounded-lg text-nothing-white placeholder-nothing-gray-500 focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-transparent"
                          placeholder="https://example.com/banner-image.jpg"
                          disabled={!!uploadedBannerImage}
                        />
                        {uploadedBannerImage && (
                          <p className="text-sm text-nothing-gray-400 mt-2">
                            Banner image uploaded
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Profile Picture */}
                  <div>
                    <label className="block text-sm font-medium text-nothing-gray-300 mb-2">
                      Profile Picture
                    </label>
                    <div className="space-y-4">
                      {/* Profile Picture Preview */}
                      <div className="flex items-center space-x-4">
                        <div className="w-20 h-20 bg-nothing-gray-800 rounded-full border border-nothing-gray-700 overflow-hidden flex-shrink-0">
                          {profileData.profilePicture ? (
                            <img
                              src={profileData.profilePicture}
                              alt="Profile preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="h-8 w-8 text-nothing-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-nothing-gray-300">Upload a new profile picture</p>
                          <p className="text-xs text-nothing-gray-500">Recommended: 400x400px or larger</p>
                        </div>
                      </div>
                      
                      {/* File Upload Component */}
                      <div className="bg-nothing-gray-800 rounded-lg p-4">
                        <FileUpload
                          onFileUpload={handleProfilePictureUpload}
                          acceptedTypes="profile"
                          multiple={false}
                        />
                      </div>

                      {/* URL Input Alternative */}
                      <div className="text-center text-nothing-gray-400">
                        <span className="px-3 py-1 bg-nothing-gray-800 rounded">OR</span>
                      </div>
                      
                      <div className="relative">
                        <Camera className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-nothing-gray-500" />
                        <input
                          type="url"
                          value={uploadedProfilePicture ? profileData.profilePicture : profileData.profilePicture}
                          onChange={(e) => setProfileData(prev => ({ ...prev, profilePicture: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 bg-nothing-gray-800 border border-nothing-gray-700 rounded-lg text-nothing-white placeholder-nothing-gray-500 focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-transparent"
                          placeholder="https://example.com/profile-picture.jpg"
                          disabled={!!uploadedProfilePicture}
                        />
                        {uploadedProfilePicture && (
                          <p className="text-sm text-nothing-gray-400 mt-2">
                            Profile picture uploaded
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-nothing-gray-300 mb-2">
                        Display Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-nothing-gray-500" />
                        <input
                          type="text"
                          value={profileData.displayName}
                          onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 bg-nothing-gray-800 border border-nothing-gray-700 rounded-lg text-nothing-white placeholder-nothing-gray-500 focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-transparent"
                          placeholder="Your display name"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-nothing-gray-300 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        value={profileData.username}
                        onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                        className="w-full px-4 py-3 bg-nothing-gray-800 border border-nothing-gray-700 rounded-lg text-nothing-white placeholder-nothing-gray-500 focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-transparent"
                        placeholder="Your username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-nothing-gray-300 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-nothing-gray-500" />
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 bg-nothing-gray-800 border border-nothing-gray-700 rounded-lg text-nothing-white placeholder-nothing-gray-500 focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-transparent"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-nothing-gray-300 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-3 bg-nothing-gray-800 border border-nothing-gray-700 rounded-lg text-nothing-white placeholder-nothing-gray-500 focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-transparent resize-none"
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full md:w-auto px-6 py-3 bg-nothing-red hover:bg-red-700 text-nothing-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-nothing-white"></div>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-8">
                {/* Change Password */}
                <div className="bg-nothing-gray-900 rounded-lg p-6 border border-nothing-gray-800">
                  <h2 className="text-2xl font-bold mb-6">Change Password</h2>
                  
                  <form onSubmit={handlePasswordUpdate} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-nothing-gray-300 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-nothing-gray-500" />
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="w-full pl-10 pr-12 py-3 bg-nothing-gray-800 border border-nothing-gray-700 rounded-lg text-nothing-white placeholder-nothing-gray-500 focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-transparent"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-nothing-gray-500 hover:text-nothing-white"
                        >
                          {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-nothing-gray-300 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-nothing-gray-500" />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full pl-10 pr-12 py-3 bg-nothing-gray-800 border border-nothing-gray-700 rounded-lg text-nothing-white placeholder-nothing-gray-500 focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-transparent"
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-nothing-gray-500 hover:text-nothing-white"
                        >
                          {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-nothing-gray-300 mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-nothing-gray-500" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full pl-10 pr-12 py-3 bg-nothing-gray-800 border border-nothing-gray-700 rounded-lg text-nothing-white placeholder-nothing-gray-500 focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-transparent"
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-nothing-gray-500 hover:text-nothing-white"
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full md:w-auto px-6 py-3 bg-nothing-red hover:bg-red-700 text-nothing-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-nothing-white"></div>
                      ) : (
                        <>
                          <Save className="h-5 w-5" />
                          <span>Update Password</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Danger Zone */}
                <div className="bg-red-900/10 border border-red-700/30 rounded-lg p-6">
                  <h2 className="text-2xl font-bold mb-4 text-red-400">Danger Zone</h2>
                  <p className="text-nothing-gray-400 mb-6">
                    Once you delete your account, there is no going back. This will permanently delete all your glyphs and data. Please be certain.
                  </p>
                  <form onSubmit={e => { e.preventDefault(); handleDeleteAccount(); }} className="space-y-4">
                    <label className="block text-sm font-medium text-nothing-gray-300 mb-2">Current Password</label>
                    <div className="relative mb-4">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-nothing-gray-500" />
                      <input
                        type="password"
                        value={deletePassword}
                        onChange={e => setDeletePassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-nothing-gray-800 border border-nothing-gray-700 rounded-lg text-nothing-white placeholder-nothing-gray-500 focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-transparent"
                        placeholder="Enter your current password"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={deleteLoading}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 text-nothing-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleteLoading ? 'Deleting...' : 'Delete Account'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
