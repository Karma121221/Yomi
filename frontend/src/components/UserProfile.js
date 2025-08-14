import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/UserProfile.css';

const UserProfile = ({ onClose, onOpenProfile }) => {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleLogout = () => {
    logout();
    onClose();
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="user-profile-dropdown" ref={dropdownRef}>
      <div className="profile-header">
        <div className="profile-avatar">
          {getInitials(user?.full_name || user?.username)}
        </div>
        <div className="profile-info">
          <h3>{user?.full_name || user?.username}</h3>
          <p>{user?.email}</p>
        </div>
      </div>

      <div className="profile-menu">
        <button 
          className="profile-menu-item"
          onClick={() => {
            onOpenProfile();
            onClose();
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
          </svg>
          Profile
        </button>

        <div className="profile-divider"></div>

        <button 
          className="profile-menu-item logout"
          onClick={() => setShowLogoutConfirm(true)}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17,7L15.59,8.41L18.17,11H8V13H18.17L15.59,15.59L17,17L22,12L17,7M4,5H12V3H4A2,2 0 0,0 2,5V19A2,2 0 0,0 4,21H12V19H4V5Z"/>
          </svg>
          Sign Out
        </button>
      </div>

      {showLogoutConfirm && (
        <div className="logout-confirm-overlay">
          <div className="logout-confirm">
            <h3>Sign Out</h3>
            <p>Are you sure you want to sign out?</p>
            <div className="logout-confirm-actions">
              <button 
                className="logout-cancel"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="logout-proceed"
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
