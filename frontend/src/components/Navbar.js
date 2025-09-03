import React from 'react';
import UserProfile from './UserProfile';

export default function Navbar({
  isAuthenticated,
  onOpenDashboard,
  onToggleSidebar,
  toggleDarkMode,
  darkMode,
  onShowLogin,
  onShowRegister,
  onGoToLanding,
  user,
  showUserProfile,
  setShowUserProfile,
  onOpenProfileEditor,
  kanjiList
}) {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <h1 className="navbar-brand" onClick={onGoToLanding} style={{ cursor: 'pointer' }}>
          Yomi 
          <ruby className="furigana-ruby">
            方
            <rt className="furigana-rt">かた</rt>
          </ruby>
        </h1>
        <div className="navbar-controls">
          {isAuthenticated && (
            <button className="dashboard-toggle" onClick={onOpenDashboard}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,3H21V5H3V3M3,7H21V9H3V7M3,11H21V13H3V11M3,15H21V17H3V15M3,19H21V21H3V19Z"/>
              </svg>
              Dashboard
            </button>
          )}
          <button className="sidebar-toggle" onClick={onToggleSidebar}>
            <svg className="kanji-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4,6H20V8H4V6M4,11H20V13H4V11M4,16H20V18H4V16Z"/>
            </svg>
            Kanji List
            {kanjiList.length > 0 && (
              <span className="kanji-count">{kanjiList.length}</span>
            )}
          </button>
          <button className="dark-mode-toggle" onClick={toggleDarkMode}>
            <img src="/moon.png" alt="Dark mode" className="theme-icon moon-icon" />
            <img src="/sun.png" alt="Light mode" className="theme-icon sun-icon" />
          </button>
          {!isAuthenticated ? (
            <div className="auth-buttons">
              <button className="login-btn" onClick={onShowLogin}>
                Login
              </button>
              <button className="register-btn" onClick={onShowRegister}>
                Get Started
              </button>
            </div>
          ) : (
            <div className="user-section">
              <button className="user-profile-btn" onClick={() => setShowUserProfile(!showUserProfile)}>
                <div className="user-avatar">
                  {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </div>
              </button>
              {showUserProfile && (
                <UserProfile 
                  onClose={() => setShowUserProfile(false)}
                  onOpenProfile={() => onOpenProfileEditor()}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
