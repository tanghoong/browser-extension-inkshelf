// Authentication Module for InkShelf v2.0
// Handles Tulis.app account authentication

class AuthManager {
  constructor() {
    this.user = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.isInitialized = false;
    this.listeners = [];
  }

  /**
   * Initialize auth state from localStorage
   */
  async init() {
    if (this.isInitialized) return;
    
    try {
      const userData = localStorage.getItem(CONFIG.USER_DATA_KEY);
      const accessToken = localStorage.getItem(CONFIG.ACCESS_TOKEN_KEY);
      const refreshToken = localStorage.getItem(CONFIG.REFRESH_TOKEN_KEY);
      
      if (userData && accessToken) {
        this.user = JSON.parse(userData);
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        
        // Validate token is still valid
        const isValid = await this.validateToken();
        if (!isValid) {
          // Try to refresh
          const refreshed = await this.refreshAccessToken();
          if (!refreshed) {
            this.clearAuth();
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      this.clearAuth();
    }
    
    this.isInitialized = true;
    this.notifyListeners();
  }

  /**
   * Register a new user account
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} name - User display name
   */
  async register(email, password, name) {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, name })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Registration failed');
      }
      
      this.setAuth(data.data);
      return { success: true, user: this.user };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Login with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   */
  async login(email, password) {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Login failed');
      }
      
      this.setAuth(data.data);
      return { success: true, user: this.user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Logout and clear auth state
   */
  async logout() {
    try {
      if (this.accessToken && this.refreshToken) {
        await fetch(`${CONFIG.API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refreshToken: this.refreshToken })
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
    }
    
    return { success: true };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      return false;
    }
    
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return false;
      }
      
      this.accessToken = data.data.accessToken;
      this.refreshToken = data.data.refreshToken;
      
      localStorage.setItem(CONFIG.ACCESS_TOKEN_KEY, this.accessToken);
      localStorage.setItem(CONFIG.REFRESH_TOKEN_KEY, this.refreshToken);
      
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  /**
   * Validate current access token
   */
  async validateToken() {
    if (!this.accessToken) {
      return false;
    }
    
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current user profile from server
   */
  async getProfile() {
    if (!this.accessToken) {
      return null;
    }
    
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      this.user = data.data;
      localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(this.user));
      
      return this.user;
    } catch (error) {
      console.error('Get profile error:', error);
      return null;
    }
  }

  /**
   * Set auth state from login/register response
   * @private
   */
  setAuth(data) {
    this.user = data.user;
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    
    localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(this.user));
    localStorage.setItem(CONFIG.ACCESS_TOKEN_KEY, this.accessToken);
    localStorage.setItem(CONFIG.REFRESH_TOKEN_KEY, this.refreshToken);
    
    this.notifyListeners();
  }

  /**
   * Clear auth state
   * @private
   */
  clearAuth() {
    this.user = null;
    this.accessToken = null;
    this.refreshToken = null;
    
    localStorage.removeItem(CONFIG.USER_DATA_KEY);
    localStorage.removeItem(CONFIG.ACCESS_TOKEN_KEY);
    localStorage.removeItem(CONFIG.REFRESH_TOKEN_KEY);
    
    this.notifyListeners();
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    return !!this.user && !!this.accessToken;
  }

  /**
   * Get current user
   */
  getUser() {
    return this.user;
  }

  /**
   * Get access token for API requests
   */
  getAccessToken() {
    return this.accessToken;
  }

  /**
   * Make authenticated API request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   */
  async apiRequest(endpoint, options = {}) {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }
    
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    let response = await fetch(url, { ...options, headers });
    
    // If unauthorized, try to refresh token
    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        response = await fetch(url, { ...options, headers });
      } else {
        this.clearAuth();
        throw new Error('Session expired. Please login again.');
      }
    }
    
    return response;
  }

  /**
   * Add listener for auth state changes
   * @param {Function} callback - Callback function
   */
  onAuthStateChange(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notify all listeners of auth state change
   * @private
   */
  notifyListeners() {
    const state = {
      isLoggedIn: this.isLoggedIn(),
      user: this.user
    };
    this.listeners.forEach(callback => callback(state));
  }
}

// Export singleton instance
const authManager = new AuthManager();
