// API client for GlyphMart backend
import { auth } from './firebase';

const API_BASE_URL = process.env.NODE_ENV === 'production' || window.location.hostname !== 'localhost' ? '' : 'http://127.0.0.1:5000';

// Memoization cache for cleaned URLs
const urlCache = new Map();

class APIClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async getAuthToken() {
    if (auth.currentUser) {
      return await auth.currentUser.getIdToken();
    }
    return null;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}/api${endpoint}`;
    
    // Get auth token if user is logged in
    const token = await this.getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Glyph-related methods
  async getGlyphs(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    const endpoint = `/get-glyphs${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await this.request(endpoint);
    return response.glyphs;
  }

  async getGlyph(glyphId) {
    const response = await this.request(`/get-glyph/${glyphId}`);
    return response.glyph;
  }

  async uploadGlyph(glyphData) {
    const response = await this.request('/upload-glyph', {
      method: 'POST',
      body: JSON.stringify(glyphData),
    });
    return response;
  }

  async updateGlyph(glyphId, glyphData) {
    const response = await this.request(`/update-glyph/${glyphId}`, {
      method: 'PUT',
      body: JSON.stringify(glyphData),
    });
    return response;
  }

  async deleteGlyph(glyphId) {
    const response = await this.request(`/delete-glyph/${glyphId}`, {
      method: 'DELETE',
    });
    return response;
  }

  // File upload methods
  async uploadFile(file, type = 'images') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const token = await this.getAuthToken();
    
    // Use the same base URL logic as other requests
    const baseURL = process.env.NODE_ENV === 'production' || window.location.hostname !== 'localhost' ? '' : 'http://127.0.0.1:5000';
    const response = await fetch(`${baseURL}/api/upload-file`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload file');
    }

    return await response.json();
  }

  async deleteFile(filename, type) {
    const response = await this.request('/delete-file', {
      method: 'DELETE',
      body: JSON.stringify({ filename, type }),
    });
    return response;
  }

  getFileUrl(type, filename) {
    // Always use relative URLs in production to go through Nginx proxy
    if (process.env.NODE_ENV === 'production' || window.location.hostname !== 'localhost') {
      return `/api/files/${type}/${filename}`;
    }
    return `${this.baseURL}/api/files/${type}/${filename}`;
  }

  // Clean URLs that might have hardcoded development server addresses
  cleanImageUrl(url) {
    if (!url) return url;
    
    // Check cache first
    if (urlCache.has(url)) {
      return urlCache.get(url);
    }
    
    let cleanedUrl = url;
    
    // If it's already a relative URL, return as-is (most common case first)
    if (url.startsWith('/api/files/')) {
      urlCache.set(url, cleanedUrl);
      return cleanedUrl;
    }
    
    // Quick check for absolute URLs that need cleaning
    if (url.includes('://')) {
      // Remove hardcoded development server URLs
      if (url.includes('127.0.0.1:5000') || url.includes('localhost:5000')) {
        const match = url.match(/\/api\/files\/.*$/);
        if (match) cleanedUrl = match[0];
      }
      
      // If it's a full HTTP/HTTPS URL for our domain, make it relative
      else if (url.includes('glyphmart.andreibanu.com')) {
        const match = url.match(/\/api\/files\/.*$/);
        if (match) cleanedUrl = match[0];
      }
    }
    
    // Cache the result
    urlCache.set(url, cleanedUrl);
    return cleanedUrl;
  }

  // View and download tracking
  async recordView(glyphId) {
    try {
      const response = await this.request('/record-view', {
        method: 'POST',
        body: JSON.stringify({ glyphId }),
      });
      return response.recorded;
    } catch (error) {
      console.error('Failed to record view:', error);
      return false;
    }
  }

  async recordDownload(glyphId) {
    try {
      const response = await this.request('/record-download', {
        method: 'POST',
        body: JSON.stringify({ glyphId }),
      });
      return response.recorded;
    } catch (error) {
      console.error('Failed to record download:', error);
      return false;
    }
  }

  // Like-related methods
  async toggleLike(glyphId) {
    const response = await this.request('/toggle-like', {
      method: 'POST',
      body: JSON.stringify({ glyphId }),
    });
    return {
      liked: response.liked,
      totalLikes: response.totalLikes,
    };
  }

  async checkLikeStatus(glyphId) {
    const response = await this.request(`/check-like-status?glyphId=${glyphId}`);
    return response.liked;
  }

  async getUserLikes() {
    const response = await this.request('/get-user-likes');
    return response.glyphs;
  }

  // User-related methods
  async getUser(userId) {
    const response = await this.request(`/get-user/${userId}`);
    return response.user;
  }

  async getUserByUsername(username) {
    const response = await this.request(`/get-user-by-username/${username}`);
    return response.user;
  }

  async updateUser(userData) {
    const response = await this.request('/update-user', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return response;
  }

  async deleteUserData() {
    const response = await this.request('/delete-user-data', {
      method: 'DELETE',
    });
    return response;
  }

  // Health check
  async healthCheck() {
    const response = await this.request('/health');
    return response;
  }

  // Admin methods
  async getAdminStats() {
    const response = await this.request('/admin/stats');
    return response;
  }

  async getAllUsers() {
    const response = await this.request('/admin/users');
    return response.users;
  }

  async adminUpdateUser(userId, userData) {
    const response = await this.request(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    return response;
  }

  async makeUserAdmin(userId) {
    const response = await this.request(`/admin/make-admin/${userId}`, {
      method: 'POST',
    });
    return response;
  }

  async addAdminByEmail(email) {
    const response = await this.request('/admin/add-admin', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return response;
  }

  async adminDeleteGlyph(glyphId) {
    const response = await this.request(`/admin/glyphs/${glyphId}`, {
      method: 'DELETE',
    });
    return response;
  }

  // Glyph Requests
  async getGlyphRequests(params = {}) {
    const queryParams = new URLSearchParams(params);
    return this.request(`/glyph-requests?${queryParams}`);
  }

  async createGlyphRequest(requestData) {
    return this.request('/glyph-requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  async getGlyphRequest(requestId) {
    return this.request(`/glyph-requests/${requestId}`);
  }

  async takeOnGlyphRequest(requestId) {
    return this.request(`/glyph-requests/${requestId}/take-on`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async completeGlyphRequest(requestId, glyphId = null) {
    const data = glyphId ? { glyph_id: glyphId } : {};
    return this.request(`/glyph-requests/${requestId}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async cancelGlyphRequest(requestId) {
    return this.request(`/glyph-requests/${requestId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getMyGlyphRequests(type = 'all') {
    const params = new URLSearchParams({ type });
    return this.request(`/my-glyph-requests?${params}`);
  }
}

export const apiClient = new APIClient();
export default apiClient;

// Convenience functions for backward compatibility
export const recordGlyphView = (glyphId) => apiClient.recordView(glyphId);
export const recordGlyphDownload = (glyphId) => apiClient.recordDownload(glyphId);
export const hasUserLikedGlyph = (glyphId) => apiClient.checkLikeStatus(glyphId);
export const toggleGlyphLike = async (glyphId) => {
  const result = await apiClient.toggleLike(glyphId);
  return result.liked;
};
export const getUserLikedGlyphs = () => apiClient.getUserLikes();

// URL cleaning utility
export const cleanImageUrl = (url) => apiClient.cleanImageUrl(url);
