import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { extractKanji, fetchKanjiInfo } from './utils/kanjiUtils';
import { handlePlayAudio } from './utils/audioUtils';
import { renderFuriganaText } from './utils/furiganaUtils';
import { renderKanjiCard } from './utils/kanjiCardUtils';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginModal from './components/auth/LoginModal';
import RegisterModal from './components/auth/RegisterModal';
import UserProfile from './components/UserProfile';
import Dashboard from './components/Dashboard';
import ProfileEditor from './components/ProfileEditor';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_API_URL || '' 
  : 'http://localhost:5000';

function AppContent() {
  const { user, isAuthenticated } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pastedText, setPastedText] = useState('');
  const [inputMode, setInputMode] = useState('file'); // 'file' or 'text'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(true); // Changed to true for default dark mode
  const [playingAudio, setPlayingAudio] = useState(null);
  const [audioLoadingStates, setAudioLoadingStates] = useState({});
  
  // Add notification state
  const [showNotification, setShowNotification] = useState(false);
  const [showKanjiNotification, setShowKanjiNotification] = useState(false);
  const [kanjiNotificationText, setKanjiNotificationText] = useState('');
  
  // Sidebar states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [kanjiList, setKanjiList] = useState([]);
  const [kanjiData, setKanjiData] = useState({});
  const [kanjiLoading, setKanjiLoading] = useState({});
  const [selectedKanji, setSelectedKanji] = useState(new Set());

  // Function to toggle kanji selection
  const toggleKanjiSelection = (kanji) => {
    setSelectedKanji(prev => {
      const newSet = new Set(prev);
      if (newSet.has(kanji)) {
        newSet.delete(kanji);
      } else {
        newSet.add(kanji);
      }
      return newSet;
    });
  };

  // Function to save selected kanji to user's collection
  const saveSelectedKanji = async () => {
    if (selectedKanji.size === 0) {
      alert('Please select at least one kanji to save.');
      return;
    }

    try {
      const kanjiToSave = Array.from(selectedKanji).map(kanji => ({
        char: kanji,
        data: kanjiData[kanji]
      }));

      const response = await fetch(`${API_BASE_URL}/api/kanji/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ kanji: kanjiToSave }),
      });

      if (response.ok) {
        setKanjiNotificationText(`Successfully saved ${selectedKanji.size} kanji to your collection!`);
        setShowKanjiNotification(true);
        setTimeout(() => setShowKanjiNotification(false), 5000);
        setSelectedKanji(new Set()); // Clear selection
      } else {
        throw new Error('Failed to save kanji');
      }
    } catch (error) {
      console.error('Error saving kanji:', error);
      alert('Failed to save kanji. Please try again.');
    }
  };

  // Function to select all kanji
  const selectAllKanji = () => {
    setSelectedKanji(new Set(kanjiList));
  };

  // Function to clear all selections
  const clearAllSelections = () => {
    setSelectedKanji(new Set());
  };

  // Add sorting state
  const [kanjiSortOption, setKanjiSortOption] = useState('chronological');
  
  // Add furigana display mode state
  const [showTraditionalFurigana, setShowTraditionalFurigana] = useState(false);

  // Auth modal states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [currentPage, setCurrentPage] = useState('main'); // 'main' or 'dashboard'

  useEffect(() => {
    // Check if user has a saved preference, otherwise default to dark mode
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === 'true');
    } else {
      // First time visit - default to dark mode and save preference
      setDarkMode(true);
      localStorage.setItem('darkMode', 'true');
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  // Extract kanji when result changes
  useEffect(() => {
    if (result && result.original_text) {
      const extractedKanji = extractKanji(result.original_text);
      setKanjiList(extractedKanji);
    }
  }, [result]);

  // Separate effect to load kanji info when kanjiList changes
  useEffect(() => {
    kanjiList.forEach(kanji => {
      if (!kanjiData[kanji] && !kanjiLoading[kanji]) {
        loadKanjiInfo(kanji);
      }
    });
  }, [kanjiList]); // eslint-disable-line react-hooks/exhaustive-deps

  // Function to sort kanji based on selected option
  const getSortedKanjiList = () => {
    const kanjiWithInfo = kanjiList.map(kanji => ({
      char: kanji,
      data: kanjiData[kanji]
    }));

    switch (kanjiSortOption) {
      case 'jlpt-easy':
        return kanjiWithInfo.sort((a, b) => {
          const aJlpt = a.data?.data?.jlpt || 0;
          const bJlpt = b.data?.data?.jlpt || 0;
          return bJlpt - aJlpt; // N5 (easiest) to N1 (hardest)
        }).map(item => item.char);
        
      case 'jlpt-hard':
        return kanjiWithInfo.sort((a, b) => {
          const aJlpt = a.data?.data?.jlpt || 0;
          const bJlpt = b.data?.data?.jlpt || 0;
          return aJlpt - bJlpt; // N1 (hardest) to N5 (easiest)
        }).map(item => item.char);
        
      case 'stroke-asc':
        return kanjiWithInfo.sort((a, b) => {
          const aStrokes = a.data?.data?.stroke_count || 0;
          const bStrokes = b.data?.data?.stroke_count || 0;
          return aStrokes - bStrokes;
        }).map(item => item.char);
        
      case 'stroke-desc':
        return kanjiWithInfo.sort((a, b) => {
          const aStrokes = a.data?.data?.stroke_count || 0;
          const bStrokes = b.data?.data?.stroke_count || 0;
          return bStrokes - aStrokes;
        }).map(item => item.char);
        
      case 'chronological':
      default:
        return kanjiList; // Keep original order
    }
  };

  const loadKanjiInfo = async (kanji) => {
    if (kanjiData[kanji] || kanjiLoading[kanji]) return;
    
    setKanjiLoading(prev => ({ ...prev, [kanji]: true }));
    
    try {
      const result = await fetchKanjiInfo(kanji);
      setKanjiData(prev => ({ 
        ...prev, 
        [kanji]: result 
      }));
    } catch (error) {
      setKanjiData(prev => ({ 
        ...prev, 
        [kanji]: { success: false, error: error.message } 
      }));
    } finally {
      setKanjiLoading(prev => ({ ...prev, [kanji]: false }));
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
      setPastedText(''); // Clear pasted text when file is selected
      setInputMode('file');
      // Reset kanji data when new file is selected
      setKanjiList([]);
      setKanjiData({});
      setSidebarOpen(false);
    }
  };

  const handleTextInput = (event) => {
    const text = event.target.value;
    setPastedText(text);
    if (text.trim()) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setResult(null);
      setError(null);
      setInputMode('text');
      // Reset kanji data when new text is entered
      setKanjiList([]);
      setKanjiData({});
      setSidebarOpen(false);
    }
  };

  const handleUpload = async () => {
    if (inputMode === 'file' && !selectedFile) {
      setError('Please select an image file');
      return;
    }
    
    if (inputMode === 'text' && !pastedText.trim()) {
      setError('Please enter some Japanese text');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let response;
      
      if (inputMode === 'text') {
        // Process text directly without OCR
        response = await axios.post(`${API_BASE_URL}/api/process-text`, {
          text: pastedText
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } else {
        // Process image with OCR
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        response = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      setResult(response.data);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'An error occurred while processing the input';
      setError(errorMessage);
      
      // Show notification popup when there's an error
      setShowNotification(true);
      
      // Auto-hide notification after 8 seconds
      setTimeout(() => {
        setShowNotification(false);
      }, 8000);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudioWrapper = async (text, lineKey) => {
    await handlePlayAudio(text, lineKey, playingAudio, setPlayingAudio, audioLoadingStates, setAudioLoadingStates);
  };

  return (
    <div className="App">
      {/* SVG Gradients for buttons */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="lightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbfbfb" />
            <stop offset="50%" stopColor="#6deeff" />
            <stop offset="100%" stopColor="#a6babb" />
          </linearGradient>
          <linearGradient id="darkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffd700" />
            <stop offset="50%" stopColor="#ffa500" />
            <stop offset="100%" stopColor="#ffd700" />
          </linearGradient>
        </defs>
      </svg>

      {/* Dashboard Page */}
      {currentPage === 'dashboard' && (
        <Dashboard onClose={() => setCurrentPage('main')} />
      )}

      {/* Main Application - only show when on main page */}
      {currentPage === 'main' && (
        <>
          {/* Notification Popup */}
          {showNotification && (
        <div className="notification-overlay">
          <div className="notification-popup">
            <div className="notification-header">
              <svg className="notification-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2L13.09,8.26L22,9L13.09,9.74L12,16L10.91,9.74L2,9L10.91,8.26L12,2M12,21C7.03,21 3,16.97 3,12C3,7.03 7.03,3 12,3C16.97,3 21,7.03 21,12C21,16.97 16.97,21 12,21M12,19A7,7 0 0,0 19,12A7,7 0 0,0 12,5A7,7 0 0,0 5,12A7,7 0 0,0 12,19Z"/>
              </svg>
              <h3>Service Starting Up</h3>
              <button 
                className="notification-close"
                onClick={() => setShowNotification(false)}
              >
                ×
              </button>
            </div>
            <div className="notification-content">
              <p>
                If you're experiencing errors, our backend service might be starting up. 
                This is normal for Render's free tier - services sleep after inactivity.
              </p>
              <p>
                <strong>Please wait 30-60 seconds and try again.</strong>
              </p>
              <div className="notification-actions">
                <button 
                  className="notification-button primary"
                  onClick={() => {
                    setShowNotification(false);
                    setTimeout(() => handleUpload(), 1000);
                  }}
                >
                  Retry Now
                </button>
                <button 
                  className="notification-button secondary"
                  onClick={() => setShowNotification(false)}
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

          {/* Kanji Save Notification */}
          {showKanjiNotification && (
            <div className="kanji-notification">
              <div className="kanji-notification-content">
                <svg className="kanji-notification-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
                </svg>
                <span>{kanjiNotificationText}</span>
              </div>
            </div>
          )}

      <nav className="navbar">
        <div className="navbar-container">
          <h1 className="navbar-brand">
            Yomi 
            <ruby className="furigana-ruby">
              方
              <rt className="furigana-rt">かた</rt>
            </ruby>
          </h1>
          <div className="navbar-controls">
            {isAuthenticated && (
              <button className="dashboard-toggle" onClick={() => setCurrentPage('dashboard')}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,3H21V5H3V3M3,7H21V9H3V7M3,11H21V13H3V11M3,15H21V17H3V15M3,19H21V21H3V19Z"/>
                </svg>
                Dashboard
              </button>
            )}
            <button className="sidebar-toggle" onClick={toggleSidebar}>
              <svg className="kanji-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4,6H20V8H4V6M4,11H20V13H4V11M4,16H20V18H4V16Z"/>
              </svg>
              Kanji List
              {kanjiList.length > 0 && (
                <span className="kanji-count">{kanjiList.length}</span>
              )}
            </button>
            <button className="dark-mode-toggle" onClick={toggleDarkMode}>
              <img 
                src="/moon.png" 
                alt="Dark mode" 
                className="theme-icon moon-icon"
              />
              <img 
                src="/sun.png" 
                alt="Light mode" 
                className="theme-icon sun-icon"
              />
            </button>
            {!isAuthenticated ? (
              <div className="auth-buttons">
                <button className="login-btn" onClick={() => setShowLoginModal(true)}>
                  Login
                </button>
                <button className="register-btn" onClick={() => setShowRegisterModal(true)}>
                  Get Started
                </button>
              </div>
            ) : (
              <div className="user-section">
                <button 
                  className="user-profile-btn" 
                  onClick={() => setShowUserProfile(!showUserProfile)}
                >
                  <div className="user-avatar">
                    {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                  </div>
                </button>
                {showUserProfile && (
                  <UserProfile 
                    onClose={() => setShowUserProfile(false)}
                    onOpenProfile={() => setShowProfileEditor(true)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <h3>Kanji Information</h3>
          <button className="sidebar-close" onClick={toggleSidebar}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
            </svg>
          </button>
        </div>
        <div className="sidebar-content">
          {kanjiList.length === 0 ? (
            <p className="no-kanji">No kanji found in extracted text.</p>
          ) : (
            <>
              {isAuthenticated && (
                <div className="kanji-selection-controls">
                  <div className="selection-info">
                    <span className="selection-count">
                      {selectedKanji.size} of {kanjiList.length} selected
                    </span>
                  </div>
                  <div className="selection-buttons">
                    <button 
                      className="select-all-btn"
                      onClick={selectAllKanji}
                      disabled={selectedKanji.size === kanjiList.length}
                    >
                      Select All
                    </button>
                    <button 
                      className="clear-all-btn"
                      onClick={clearAllSelections}
                      disabled={selectedKanji.size === 0}
                    >
                      Clear All
                    </button>
                    <button 
                      className="save-selected-btn"
                      onClick={saveSelectedKanji}
                      disabled={selectedKanji.size === 0}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3M19,19H5V5H16.17L19,7.83V19M12,12C10.34,12 9,13.34 9,15C9,16.66 10.34,18 12,18C13.66,18 15,16.66 15,15C15,13.34 13.66,12 12,12Z"/>
                      </svg>
                      Save to Collection ({selectedKanji.size})
                    </button>
                  </div>
                </div>
              )}
              <div className="kanji-sort-controls">
                <label htmlFor="kanji-sort">Sort by:</label>
                <select 
                  id="kanji-sort"
                  value={kanjiSortOption} 
                  onChange={(e) => setKanjiSortOption(e.target.value)}
                  className="kanji-sort-select"
                >
                  <option value="chronological">Chronological Order</option>
                  <option value="jlpt-easy">JLPT Level (Easy to Hard)</option>
                  <option value="jlpt-hard">JLPT Level (Hard to Easy)</option>
                  <option value="stroke-asc">Stroke Count (Less to More)</option>
                  <option value="stroke-desc">Stroke Count (More to Less)</option>
                </select>
              </div>
              <div className="kanji-grid">
                {getSortedKanjiList().map(kanji => 
                  renderKanjiCard(kanji, kanjiData, kanjiLoading, selectedKanji, toggleKanjiSelection)
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sidebar overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

      <main className="app-main">
        <div className="upload-section">
          <p className="upload-description">
            Upload an image with Japanese text to extract it with furigana annotations
          </p>
          
          <div className="file-input-container">
            <input
              type="file"
              id="file-input"
              accept="image/*"
              onChange={handleFileSelect}
              className="file-input"
            />
            <label htmlFor="file-input" className="file-input-label">
              Choose Image File
            </label>
          </div>

          <div className="input-divider">
            <span className="divider-text">OR</span>
          </div>

          <div className="text-input-container">
            <label htmlFor="text-input" className="text-input-label">
              Paste Japanese Text
            </label>
            <textarea
              id="text-input"
              value={pastedText}
              onChange={handleTextInput}
              placeholder="Paste your Japanese text here..."
              className="text-input"
              rows="4"
            />
          </div>

          {(previewUrl || pastedText.trim()) && (
            <div className="preview-container">
              {previewUrl && (
                <img src={previewUrl} alt="Preview" className="image-preview" />
              )}
              {pastedText.trim() && (
                <div className="text-preview">
                  <h4>Text to Process:</h4>
                  <div className="preview-text">{pastedText}</div>
                </div>
              )}
              <button
                onClick={handleUpload}
                disabled={loading}
                className="upload-button"
              >
                {loading ? 'Processing...' : 
                 inputMode === 'text' ? 'Generate Furigana' : 'Extract Text with Furigana'}
              </button>
            </div>
          )}
        </div>

        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Processing image/text and generating furigana...</p>
          </div>
        )}

        {error && (
          <div className="error-container">
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="results-container">
            <h2>Results</h2>
            
            <div className="result-section">
              <h3>Original Text</h3>
              <div className="original-text">
                {result.original_text}
              </div>
            </div>

            <div className="result-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3>Text with Furigana</h3>
                <button 
                  className="sidebar-toggle-inline"
                  onClick={toggleSidebar}
                  style={{
                    background: 'var(--accent-blue)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '0.9em',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <svg className="kanji-icon" viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                    <path d="M4,6H20V8H4V6M4,11H20V13H4V11M4,16H20V18H4V16Z"/>
                  </svg>
                  Show Kanji List
                  <span className="kanji-count-inline" style={{
                    background: 'rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    fontSize: '0.8em',
                    fontWeight: '600',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    minWidth: '18px',
                    textAlign: 'center',
                    marginLeft: '4px'
                  }}>
                    {kanjiList.length}
                  </span>
                </button>
              </div>
              <div className="furigana-container">
                {result.pages.map((page, pageIndex) => (
                  <div key={pageIndex} className="page-container">
                    {page.lines.map((sentence, sentenceIndex) => {
                      const confidenceLevel = sentence.confidence >= 0.8 ? 'high' : 
                                            sentence.confidence >= 0.6 ? 'medium' : 'low';
                      
                      const lineKey = `page-${pageIndex}-sentence-${sentenceIndex}`;
                      const isLoadingAudio = audioLoadingStates[lineKey];
                      
                      return (
                        <div key={sentenceIndex} className="line-container sentence-container">
                          <div className="sentence-number">
                            Sentence {sentenceIndex + 1}
                          </div>
                          <div className="line-content">
                            <div className="furigana-line">
                              {renderFuriganaText(sentence.parts)}
                            </div>
                            <button
                              className="listen-button"
                              onClick={() => handlePlayAudioWrapper(sentence.original, lineKey)}
                              disabled={isLoadingAudio}
                              title="Listen to pronunciation"
                            >
                              {isLoadingAudio ? (
                                <div className="button-spinner"></div>
                              ) : (
                                <svg className="speaker-icon" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M3,9V15H7L12,20V4L7,9H3M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23Z"/>
                                </svg>
                              )}
                            </button>
                          </div>
                          <div className={`confidence-score confidence-${confidenceLevel}`}>
                            Confidence: {(sentence.confidence * 100).toFixed(1)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="result-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3>Simple Format</h3>
                <button 
                  className="furigana-toggle-button"
                  onClick={() => setShowTraditionalFurigana(!showTraditionalFurigana)}
                  style={{
                    background: showTraditionalFurigana ? 'var(--accent-green)' : 'var(--accent-blue)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '0.9em',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {showTraditionalFurigana ? 'Show Bracket Format' : 'Show Traditional Furigana'}
                </button>
              </div>
              <div className="simple-text">
                {showTraditionalFurigana ? (
                  <div className="traditional-furigana">
                    {result.pages.map((page, pageIndex) => (
                      <div key={pageIndex}>
                        {page.lines.map((sentence, sentenceIndex) => (
                          <div key={sentenceIndex} style={{ marginBottom: '12px' }}>
                            {renderFuriganaText(sentence.parts)}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  result.furigana_text
                )}
              </div>
            </div>

            {result.translated_text && (
              <div className="result-section">
                <h3>English Translation</h3>
                <div className="translated-text">
                  {result.translated_text}
                </div>
              </div>
            )}

            {!result.translated_text && (
              <div className="result-section">
                <h3>English Translation</h3>
                <div className="translation-error">
                  Translation service temporarily unavailable
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add these components at the end of your return statement */}
      <Analytics />
      <SpeedInsights />

      {/* Authentication Modals */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        switchToRegister={() => {
          setShowLoginModal(false);
          setShowRegisterModal(true);
        }}
      />
      
      <RegisterModal 
        isOpen={showRegisterModal} 
        onClose={() => setShowRegisterModal(false)}
        switchToLogin={() => {
          setShowRegisterModal(false);
          setShowLoginModal(true);
        }}
      />
        </>
      )}

      {/* Profile Editor Modal */}
      {showProfileEditor && (
        <ProfileEditor onClose={() => setShowProfileEditor(false)} />
      )}

      {/* Dashboard Page */}
      {currentPage === 'dashboard' && (
        <Dashboard onClose={() => setCurrentPage('main')} />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
