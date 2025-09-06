import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_API_URL || 'https://yomi-backend.onrender.com/' 
  : 'http://localhost:5000';

// Validate API URL in production
if (process.env.NODE_ENV === 'production' && 
    (!process.env.REACT_APP_API_URL || process.env.REACT_APP_API_URL.includes('your-render-backend-url'))) {
  console.warn('⚠️ REACT_APP_API_URL is not properly configured. Please set it to your actual Render backend URL.');
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const initializeAuth = async () => {
      // Start backend health check in background (non-blocking)
      if (API_BASE_URL) {
        fetch(`${API_BASE_URL}/api/health`, { 
          method: 'GET',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        }).catch(error => {
          console.log('Health check failed, but continuing with auth...', error);
        });
      }
      
      const storedToken = localStorage.getItem('token');
      
      if (storedToken) {
        try {
          // Check if token is expired
          const decodedToken = jwtDecode(storedToken);
          const currentTime = Date.now() / 1000;
          
          if (decodedToken.exp < currentTime) {
            // Token expired, remove it
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
          } else {
            // Token is valid, verify with server
            const response = await fetch(`${API_BASE_URL}/api/auth/verify-token`, {
              headers: {
                'Authorization': `Bearer ${storedToken}`,
                'Content-Type': 'application/json',
              },
              signal: AbortSignal.timeout(10000) // 10 second timeout
            });

            if (response.ok) {
              setToken(storedToken);
              // Get user profile
              const profileResponse = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                headers: {
                  'Authorization': `Bearer ${storedToken}`,
                  'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(10000) // 10 second timeout
              });

              if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                setUser(profileData.user);
              }
            } else {
              // Token invalid, remove it
              localStorage.removeItem('token');
              setToken(null);
              setUser(null);
            }
          }
        } catch (error) {
          console.error('Token validation failed:', error);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Listen for OAuth login events triggered by handleOAuthCallback
  useEffect(() => {
    const handler = (e) => {
      const { token: newToken, user: newUser } = e.detail || {};
      if (newToken) {
        localStorage.setItem('token', newToken);
        setToken(newToken);
      }
      if (newUser) setUser(newUser);
    };

    window.addEventListener('yomi_oauth_login', handler);
    return () => window.removeEventListener('yomi_oauth_login', handler);
  }, []);

  const login = async (identifier, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const { access_token, user } = data;
        localStorage.setItem('token', access_token);
        setToken(access_token);
        setUser(user);
        return { success: true, user };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error occurred' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const { access_token, user } = data;
        localStorage.setItem('token', access_token);
        setToken(access_token);
        setUser(user);
        return { success: true, user };
      } else {
        return { success: false, message: data.message || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Network error occurred' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateUserProgress = async (progressData) => {
    try {
      if (!token) return { success: false, message: 'Not authenticated' };

      const response = await fetch(`${API_BASE_URL}/api/auth/profile/progress`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ progress: progressData }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // Update local user data
        setUser(prev => ({
          ...prev,
          study_progress: progressData
        }));
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Update failed' };
      }
    } catch (error) {
      console.error('Progress update error:', error);
      return { success: false, message: 'Network error occurred' };
    }
  };

  const updateUserProfile = (profileData) => {
    setUser(prev => ({
      ...prev,
      ...profileData
    }));
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
  startGoogleLogin,
  handleOAuthCallback,
    updateUserProgress,
    updateUserProfile,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Helper to initiate Google OAuth by asking backend for redirect URL
export async function startGoogleLogin() {
  try {
    const resp = await fetch(`${API_BASE_URL}/api/auth/google/login`);
    const data = await resp.json();
    if (data && data.redirect) {
      // Open Google's auth in a new tab for better UX
      window.open(data.redirect, '_self');
    }
  } catch (err) {
    console.error('Failed to start Google login', err);
  }
}

// Handle token passed back via URL fragment/hash from OAuth flow
export async function handleOAuthCallback() {
  try {
    // Expect location.hash like '#/auth-callback?token=...'
    const hash = window.location.hash || '';
    const idx = hash.indexOf('token=');
    if (idx === -1) return false;
    const token = decodeURIComponent(hash.substring(idx + 6));
    if (!token) return false;

    localStorage.setItem('token', token);
    // Refresh page state by reloading user profile
    const profileResp = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (profileResp.ok) {
      const profileData = await profileResp.json();
      // profileData may be { success: true, user: {...} }
      if (profileData.user) {
        // set user and token in the provider by dispatching a custom event
        window.dispatchEvent(new CustomEvent('yomi_oauth_login', { detail: { token, user: profileData.user } }));
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error('OAuth callback handling failed', err);
    return false;
  }
}
