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
  ? process.env.REACT_APP_API_URL || '' 
  : 'http://localhost:5000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const initializeAuth = async () => {
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
            });

            if (response.ok) {
              setToken(storedToken);
              // Get user profile
              const profileResponse = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                headers: {
                  'Authorization': `Bearer ${storedToken}`,
                  'Content-Type': 'application/json',
                },
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

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUserProgress,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
