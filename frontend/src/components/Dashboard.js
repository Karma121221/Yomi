import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Dashboard.css';

const Dashboard = ({ onClose }) => {
  const { user, updateUserProgress } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [studyStats, setStudyStats] = useState({
    textsProcessed: 0,
    kanjiLearned: 0,
    studyStreak: 0,
    totalSessions: 0,
  });

  useEffect(() => {
    if (user && user.study_progress) {
      setStudyStats({
        textsProcessed: user.study_progress.texts_processed || 0,
        kanjiLearned: user.study_progress.kanji_learned?.length || 0,
        studyStreak: user.study_progress.study_streak || 0,
        totalSessions: user.study_progress.total_sessions || 0,
      });
    }
  }, [user]);

  const handleUpdateProgress = async (newKanji) => {
    if (user && user.study_progress) {
      const updatedProgress = {
        ...user.study_progress,
        kanji_learned: [...(user.study_progress.kanji_learned || []), newKanji],
        texts_processed: (user.study_progress.texts_processed || 0) + 1,
      };
      await updateUserProgress(updatedProgress);
    }
  };

  // Function to add this kanji to learned list when user clicks on a kanji
  // eslint-disable-next-line no-unused-vars
  const markKanjiAsLearned = (kanji) => {
    handleUpdateProgress(kanji);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'M3,3H21V5H3V3M3,7H21V9H3V7M3,11H21V13H3V11M3,15H21V17H3V15M3,19H21V21H3V19Z' },
    { id: 'progress', label: 'Progress', icon: 'M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12H16A4,4 0 0,0 12,8V6Z' },
    { id: 'favorites', label: 'Favorites', icon: 'M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z' },
    { id: 'settings', label: 'Settings', icon: 'M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z' }
  ];

  return (
    <div className="dashboard-overlay">
      <div className="dashboard-modal">
        <div className="dashboard-header">
          <div className="dashboard-title">
            <h2>Dashboard</h2>
            <p>{getGreeting()}, {user?.full_name || user?.username}!</p>
          </div>
          <button className="dashboard-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
            </svg>
          </button>
        </div>

        <div className="dashboard-content">
          <div className="dashboard-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="dashboard-body">
            {activeTab === 'overview' && (
              <div className="tab-content">
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                      </svg>
                    </div>
                    <div className="stat-info">
                      <h3>{studyStats.textsProcessed}</h3>
                      <p>Texts Processed</p>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
                      </svg>
                    </div>
                    <div className="stat-info">
                      <h3>{studyStats.kanjiLearned}</h3>
                      <p>Kanji Learned</p>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,2L13.09,8.26L22,9L13.09,9.74L12,16L10.91,9.74L2,9L10.91,8.26L12,2Z"/>
                      </svg>
                    </div>
                    <div className="stat-info">
                      <h3>{studyStats.studyStreak}</h3>
                      <p>Study Streak</p>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12H16A4,4 0 0,0 12,8V6Z"/>
                      </svg>
                    </div>
                    <div className="stat-info">
                      <h3>{studyStats.totalSessions}</h3>
                      <p>Total Sessions</p>
                    </div>
                  </div>
                </div>

                <div className="recent-activity">
                  <h3>Recent Activity</h3>
                  <div className="activity-list">
                    <div className="activity-item">
                      <div className="activity-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                        </svg>
                      </div>
                      <div className="activity-info">
                        <p>Processed Japanese text</p>
                        <span>2 hours ago</span>
                      </div>
                    </div>
                    <div className="activity-item">
                      <div className="activity-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12,2L13.09,8.26L22,9L13.09,9.74L12,16L10.91,9.74L2,9L10.91,8.26L12,2Z"/>
                        </svg>
                      </div>
                      <div className="activity-info">
                        <p>Learned 5 new kanji</p>
                        <span>1 day ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'progress' && (
              <div className="tab-content">
                <div className="progress-section">
                  <h3>Study Progress</h3>
                  <div className="progress-chart">
                    <div className="progress-item">
                      <label>Kanji Mastery</label>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${Math.min((studyStats.kanjiLearned / 100) * 100, 100)}%` }}></div>
                      </div>
                      <span>{studyStats.kanjiLearned}/100</span>
                    </div>
                    <div className="progress-item">
                      <label>Text Processing</label>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${Math.min((studyStats.textsProcessed / 50) * 100, 100)}%` }}></div>
                      </div>
                      <span>{studyStats.textsProcessed}/50</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'favorites' && (
              <div className="tab-content">
                <div className="favorites-section">
                  <h3>Favorite Texts</h3>
                  <div className="favorites-list">
                    <div className="empty-state">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z"/>
                      </svg>
                      <p>No favorite texts yet</p>
                      <span>Start processing texts to add them to your favorites</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="tab-content">
                <div className="settings-section">
                  <h3>Account Settings</h3>
                  <div className="settings-group">
                    <div className="setting-item">
                      <label>Full Name</label>
                      <input type="text" value={user?.full_name || ''} readOnly />
                    </div>
                    <div className="setting-item">
                      <label>Username</label>
                      <input type="text" value={user?.username || ''} readOnly />
                    </div>
                    <div className="setting-item">
                      <label>Email</label>
                      <input type="email" value={user?.email || ''} readOnly />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
