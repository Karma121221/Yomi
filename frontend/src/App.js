import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { extractKanji, fetchKanjiInfo } from './utils/kanjiUtils';
import { handlePlayAudio } from './utils/audioUtils';
import Navbar from './components/Navbar';
import SidebarKanji from './components/SidebarKanji';
import UploadSection from './components/UploadSection';
import ResultsView from './components/ResultsView';
import Notifications from './components/Notifications';
import LandingPage from './components/LandingPage';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginModal from './components/auth/LoginModal';
import RegisterModal from './components/auth/RegisterModal';
import Dashboard from './components/Dashboard';
import ProfileEditor from './components/ProfileEditor';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_API_URL || '' 
  : 'http://localhost:5000';

function AppContent() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
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
  const [currentPage, setCurrentPage] = useState('landing'); // 'landing', 'main' or 'dashboard'
  const [loginFromLanding, setLoginFromLanding] = useState(false);

  // Handle page navigation based on authentication
  useEffect(() => {
    if (isAuthenticated && currentPage === 'landing') {
      // If user logs in while on landing page, stay on landing page
      // They need to click "Get Started" to go to main page
    } else if (!isAuthenticated && currentPage === 'dashboard') {
      // If user logs out while on dashboard, go to landing (dashboard requires auth)
      setCurrentPage('landing');
    }
    // Allow main page access even without authentication (skip functionality)
  }, [isAuthenticated, currentPage]);

  // Auto-navigate to main page after successful login from landing page
  useEffect(() => {
    if (isAuthenticated && loginFromLanding) {
      setCurrentPage('main');
      setLoginFromLanding(false);
    }
  }, [isAuthenticated, loginFromLanding]);

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

  // Sorting is handled inside SidebarKanji component now.

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

  // Handle skip login functionality
  const handleSkipLogin = () => {
    setShowLoginModal(false);
    setShowRegisterModal(false);
    setLoginFromLanding(false);
    setCurrentPage('main'); // Allow access to main page without authentication
  };

  // Show loading spinner while authentication is initializing
  if (authLoading) {
    return (
      <div className="App">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

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

      {/* Landing Page */}
      {currentPage === 'landing' && (
        <LandingPage
          isAuthenticated={isAuthenticated}
          darkMode={darkMode}
          onGetStarted={() => setCurrentPage('main')}
          onShowLogin={() => {
            setLoginFromLanding(true);
            setShowLoginModal(true);
          }}
          onShowRegister={() => {
            setLoginFromLanding(true);
            setShowRegisterModal(true);
          }}
        />
      )}

      {/* Main Application - only show when on main page */}
      {currentPage === 'main' && (
        <>
              <Notifications
                showNotification={showNotification}
                setShowNotification={setShowNotification}
                showKanjiNotification={showKanjiNotification}
                kanjiNotificationText={kanjiNotificationText}
                setShowKanjiNotification={setShowKanjiNotification}
              />

          <Navbar
            isAuthenticated={isAuthenticated}
            onOpenDashboard={() => setCurrentPage('dashboard')}
            onToggleSidebar={toggleSidebar}
            toggleDarkMode={toggleDarkMode}
            darkMode={darkMode}
            onShowLogin={() => setShowLoginModal(true)}
            onShowRegister={() => setShowRegisterModal(true)}
            onGoToLanding={() => setCurrentPage('landing')}
            user={user}
            showUserProfile={showUserProfile}
            setShowUserProfile={setShowUserProfile}
            onOpenProfileEditor={() => setShowProfileEditor(true)}
            kanjiList={kanjiList}
          />

          <SidebarKanji
            sidebarOpen={sidebarOpen}
            toggleSidebar={toggleSidebar}
            kanjiList={kanjiList}
            kanjiData={kanjiData}
            kanjiLoading={kanjiLoading}
            selectedKanji={selectedKanji}
            toggleKanjiSelection={toggleKanjiSelection}
            selectAllKanji={selectAllKanji}
            clearAllSelections={clearAllSelections}
            saveSelectedKanji={saveSelectedKanji}
            kanjiSortOption={kanjiSortOption}
            setKanjiSortOption={setKanjiSortOption}
            isAuthenticated={isAuthenticated}
          />

          {sidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

      <main className="app-main">
        <UploadSection
          previewUrl={previewUrl}
          pastedText={pastedText}
          handleFileSelect={handleFileSelect}
          handleTextInput={handleTextInput}
          handleUpload={handleUpload}
          inputMode={inputMode}
          loading={loading}
        />

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

        <ResultsView
          result={result}
          audioLoadingStates={audioLoadingStates}
          handlePlayAudioWrapper={handlePlayAudioWrapper}
          showTraditionalFurigana={showTraditionalFurigana}
          setShowTraditionalFurigana={setShowTraditionalFurigana}
          kanjiList={kanjiList}
          toggleSidebar={toggleSidebar}
        />
      </main>

      {/* Add these components at the end of your return statement */}
      <Analytics />
      <SpeedInsights />
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

      {/* Authentication Modals - Render on all pages */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => {
          setShowLoginModal(false);
          // Keep loginFromLanding as-is so useEffect can navigate after auth
        }}
        switchToRegister={() => {
          setShowLoginModal(false);
          setShowRegisterModal(true);
        }}
        fromLanding={loginFromLanding}
        onSkip={loginFromLanding ? handleSkipLogin : undefined}
      />
      
      <RegisterModal 
        isOpen={showRegisterModal} 
        onClose={() => {
          setShowRegisterModal(false);
          // Keep loginFromLanding as-is so useEffect can navigate after auth
        }}
        switchToLogin={() => {
          setShowRegisterModal(false);
          setShowLoginModal(true);
        }}
        fromLanding={loginFromLanding}
        onSkip={loginFromLanding ? handleSkipLogin : undefined}
      />
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
