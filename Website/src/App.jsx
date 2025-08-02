import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import GlyphDetail from './pages/GlyphDetail';
import Storefront from './pages/Storefront';
import UploadGlyph from './pages/UploadGlyph';
import Search from './pages/Search';
import LikedPosts from './pages/LikedPosts';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import RequestGlyphs from './pages/RequestGlyphs';
import MyRequests from './pages/MyRequests';
import './App.css';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
};

// Public Route component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return !currentUser ? children : <Navigate to="/" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            <Route 
              path="/signup" 
              element={
                <PublicRoute>
                  <SignUp />
                </PublicRoute>
              } 
            />
            <Route path="/glyph/:id" element={<GlyphDetail />} />
            <Route path="/storefront/:username" element={<Storefront />} />
            <Route 
              path="/upload" 
              element={
                <ProtectedRoute>
                  <UploadGlyph />
                </ProtectedRoute>
              } 
            />
            <Route path="/search" element={<Search />} />
            <Route path="/request-glyphs" element={<RequestGlyphs />} />
            <Route 
              path="/my-requests" 
              element={
                <ProtectedRoute>
                  <MyRequests />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/liked" 
              element={
                <ProtectedRoute>
                  <LikedPosts />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              } 
            />
            {/* TODO: Add more routes */}
            {/* <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} /> */}
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
