import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Zap, AtSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const SignUp = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    displayName: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters long');
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return false;
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
      await signup(formData.email, formData.password, formData.username, formData.displayName);
      navigate('/');
    } catch (error) {
      console.error('Signup error:', error);
      switch (error.code) {
        case 'auth/email-already-in-use':
          setError('An account with this email already exists.');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address.');
          break;
        case 'auth/weak-password':
          setError('Password is too weak.');
          break;
        default:
          setError('Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-nothing-black flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md w-full space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-nothing-red rounded-full flex items-center justify-center glyph-animation">
              <Zap className="h-8 w-8 text-nothing-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-nothing-white font-nothing">
            Join GlyphMart
          </h2>
          <p className="mt-2 text-nothing-gray-400">
            Create your account and start sharing glyphs
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-8 space-y-6"
          onSubmit={handleSubmit}
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-nothing-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-10 py-3 border border-nothing-gray-700 placeholder-nothing-gray-400 text-nothing-white bg-nothing-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-nothing-red focus:z-10 transition-all duration-200"
                  placeholder="Email address"
                />
              </div>
            </div>

            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <AtSign className="h-5 w-5 text-nothing-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-10 py-3 border border-nothing-gray-700 placeholder-nothing-gray-400 text-nothing-white bg-nothing-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-nothing-red focus:z-10 transition-all duration-200"
                  placeholder="Username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="displayName" className="sr-only">
                Display Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-nothing-gray-400" />
                </div>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.displayName}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-10 py-3 border border-nothing-gray-700 placeholder-nothing-gray-400 text-nothing-white bg-nothing-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-nothing-red focus:z-10 transition-all duration-200"
                  placeholder="Display Name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-nothing-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-10 py-3 pr-10 border border-nothing-gray-700 placeholder-nothing-gray-400 text-nothing-white bg-nothing-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-nothing-red focus:z-10 transition-all duration-200"
                  placeholder="Password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-nothing-gray-400 hover:text-nothing-gray-300" />
                  ) : (
                    <Eye className="h-5 w-5 text-nothing-gray-400 hover:text-nothing-gray-300" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-nothing-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-10 py-3 pr-10 border border-nothing-gray-700 placeholder-nothing-gray-400 text-nothing-white bg-nothing-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-nothing-red focus:border-nothing-red focus:z-10 transition-all duration-200"
                  placeholder="Confirm Password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-nothing-gray-400 hover:text-nothing-gray-300" />
                  ) : (
                    <Eye className="h-5 w-5 text-nothing-gray-400 hover:text-nothing-gray-300" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded-lg text-sm"
            >
              {error}
            </motion.div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-nothing-white bg-nothing-red hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nothing-red disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-nothing-white mr-2"></div>
                  Creating account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-nothing-gray-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-nothing-red hover:text-red-400 font-medium transition-colors duration-200"
              >
                Sign in
              </Link>
            </p>
          </div>
        </motion.form>
      </div>
    </div>
  );
};

export default SignUp;
