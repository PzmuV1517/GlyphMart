// API client for GlyphMart backend
import { auth } from './firebase';

const API_BASE_URL = process.env.NODE_ENV === 'production' || window.location.hostname !== 'localhost' ? '' : 'http://127.0.0.1:5000';

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
    const response = await fetch(`${this.baseURL}/api/upload-file`, {
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
    return `${this.baseURL}/api/files/${type}/${filename}`;
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
