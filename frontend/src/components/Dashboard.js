import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Dashboard.css';

const Dashboard = ({ onClose }) => {
  const { token } = useAuth();
  const [savedKanji, setSavedKanji] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? process.env.REACT_APP_API_URL || '' 
    : 'http://localhost:5000';

  const fetchSavedKanji = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/kanji/saved`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSavedKanji(data.kanji || []);
      }
    } catch (error) {
      console.error('Error fetching saved kanji:', error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, token]);

  useEffect(() => {
    fetchSavedKanji();
  }, [fetchSavedKanji]);

  const removeKanji = async (kanjiChar) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/kanji/remove`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ kanji: kanjiChar }),
      });

      if (response.ok) {
        setSavedKanji(prev => prev.filter(k => k.char !== kanjiChar));
      }
    } catch (error) {
      console.error('Error removing kanji:', error);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>My Kanji Collection</h1>
          <p>Your personal collection of saved kanji characters</p>
        </div>
        <button className="dashboard-close" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
          </svg>
        </button>
      </div>

      <div className="dashboard-content">
        {loading ? (
          <div className="dashboard-loading">
            <div className="loading-spinner"></div>
            <p>Loading your kanji collection...</p>
          </div>
        ) : savedKanji.length === 0 ? (
          <div className="empty-collection">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z"/>
              </svg>
            </div>
            <h3>No Kanji Saved Yet</h3>
            <p>Start processing Japanese text and save kanji to build your collection!</p>
          </div>
        ) : (
          <div className="kanji-collection">
            <div className="collection-stats">
              <div className="stat-item">
                <span className="stat-number">{savedKanji.length}</span>
                <span className="stat-label">Kanji Saved</span>
              </div>
            </div>
            
            <div className="kanji-grid">
              {savedKanji.map((kanjiInfo) => (
                <div key={kanjiInfo.char} className="saved-kanji-card">
                  <div className="kanji-card-header">
                    <div className="kanji-character">{kanjiInfo.char}</div>
                  </div>
                  
                  <div className="kanji-details">
                    {/* Readings Section */}
                    <div className="kanji-info-section">
                      <div className="info-label">Readings</div>
                      <div className="readings-container">
                        {kanjiInfo.data && kanjiInfo.data.success && kanjiInfo.data.data.kun_readings && kanjiInfo.data.data.kun_readings.length > 0 && (
                          <div className="reading-group">
                            <div className="reading-label">Kun'yomi</div>
                            <div className="reading-value">{kanjiInfo.data.data.kun_readings.join(', ')}</div>
                          </div>
                        )}
                        {kanjiInfo.data && kanjiInfo.data.success && kanjiInfo.data.data.on_readings && kanjiInfo.data.data.on_readings.length > 0 && (
                          <div className="reading-group">
                            <div className="reading-label">On'yomi</div>
                            <div className="reading-value">{kanjiInfo.data.data.on_readings.join(', ')}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Meanings Section */}
                    {kanjiInfo.data && kanjiInfo.data.success && kanjiInfo.data.data.meanings && (
                      <div className="kanji-info-section meaning-section">
                        <div className="info-label">Meanings</div>
                        <div className="info-value meaning-value">
                          {kanjiInfo.data.data.meanings.join(', ')}
                        </div>
                      </div>
                    )}

                    {/* Meta Information */}
                    <div className="kanji-info-section">
                      <div className="info-label">Details</div>
                      <div className="meta-section">
                        {kanjiInfo.data && kanjiInfo.data.success && kanjiInfo.data.data.stroke_count && (
                          <div className="meta-item">
                            <span className="meta-label">Strokes:</span>
                            <span className="meta-value">{kanjiInfo.data.data.stroke_count}</span>
                          </div>
                        )}
                        {kanjiInfo.data && kanjiInfo.data.success && kanjiInfo.data.data.jlpt && (
                          <div className="meta-item">
                            <span className="meta-label">JLPT:</span>
                            <span className="meta-value jlpt-badge">N{kanjiInfo.data.data.jlpt}</span>
                          </div>
                        )}
                        {kanjiInfo.data && kanjiInfo.data.success && kanjiInfo.data.data.grade && (
                          <div className="meta-item">
                            <span className="meta-label">Grade:</span>
                            <span className="meta-value">{kanjiInfo.data.data.grade}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button 
                    className="remove-kanji-btn"
                    onClick={() => removeKanji(kanjiInfo.char)}
                    title="Remove from collection"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
