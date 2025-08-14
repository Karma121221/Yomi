import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/ProfileEditor.css';

const ProfileEditor = ({ onClose }) => {
  const { user, updateUserProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [isLoading, setIsLoading] = useState(false);
  const modalRef = useRef(null);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleSave = async () => {
    if (!fullName.trim() || !username.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NODE_ENV === 'production' 
        ? process.env.REACT_APP_API_URL || '' 
        : 'http://localhost:5000';
      
      const response = await fetch(`${API_BASE_URL}/api/update-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          username: username.trim()
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update the user context with the correct field names
        updateUserProfile({ full_name: fullName.trim(), username: username.trim() });
        alert('Profile updated successfully!');
        onClose();
      } else {
        alert(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="profile-editor-overlay">
      <div className="profile-editor-modal" ref={modalRef}>
        <div className="profile-editor-header">
          <h2>Edit Profile</h2>
          <button className="profile-editor-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div className="profile-editor-content">
          <div className="profile-editor-field">
            <label htmlFor="fullName">Full Name</label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              disabled={isLoading}
            />
          </div>

          <div className="profile-editor-field">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="profile-editor-footer">
          <div className="profile-editor-actions">
            <button className="profile-editor-cancel" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button className="profile-editor-save" onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditor;
