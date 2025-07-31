import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { extractKanji, fetchKanjiInfo } from './utils/kanjiUtils';
import { handlePlayAudio } from './utils/audioUtils';
import { renderFuriganaText } from './utils/furiganaUtils';
import { renderKanjiCard } from './utils/kanjiCardUtils';

const API_BASE_URL = 'http://localhost:5000';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [audioLoadingStates, setAudioLoadingStates] = useState({});
  
  // Sidebar states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [kanjiList, setKanjiList] = useState([]);
  const [kanjiData, setKanjiData] = useState({});
  const [kanjiLoading, setKanjiLoading] = useState({});

  // Add sorting state
  const [kanjiSortOption, setKanjiSortOption] = useState('chronological');
  
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
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
      
      // Fetch data for each kanji
      extractedKanji.forEach(kanji => {
        if (!kanjiData[kanji]) {
          loadKanjiInfo(kanji);
        }
      });
    }
  }, [result]);

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
      // Reset kanji data when new file is selected
      setKanjiList([]);
      setKanjiData({});
      setSidebarOpen(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select an image file');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred while processing the image');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudioWrapper = async (text, lineKey) => {
    await handlePlayAudio(text, lineKey, playingAudio, setPlayingAudio, audioLoadingStates, setAudioLoadingStates);
  };

  return (
    <div className="App">
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
            <button className="sidebar-toggle" onClick={toggleSidebar}>
              <svg className="kanji-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4,6H20V8H4V6M4,11H20V13H4V11M4,16H20V18H4V16Z"/>
              </svg>
              {kanjiList.length > 0 && (
                <span className="kanji-count">{kanjiList.length}</span>
              )}
            </button>
            <button className="dark-mode-toggle" onClick={toggleDarkMode}>
              <img 
                src="/sun.png" 
                alt="Light mode" 
                className="theme-icon sun-icon"
              />
              <img 
                src="/moon.png" 
                alt="Dark mode" 
                className="theme-icon moon-icon"
              />
            </button>
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
                {getSortedKanjiList().map(kanji => renderKanjiCard(kanji, kanjiData, kanjiLoading))}
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

          {previewUrl && (
            <div className="preview-container">
              <img src={previewUrl} alt="Preview" className="image-preview" />
              <button
                onClick={handleUpload}
                disabled={loading}
                className="upload-button"
              >
                {loading ? 'Processing...' : 'Extract Text with Furigana'}
              </button>
            </div>
          )}
        </div>

        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Processing image and generating furigana...</p>
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
                    <h4>Page {page.page_number}</h4>
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
              <h3>Simple Format</h3>
              <div className="simple-text">
                {result.furigana_text}
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

      <footer className="app-footer">
        <p>Powered by Azure Computer Vision API, pykakasi, and LibreTranslate</p>
      </footer>
    </div>
  );
}

export default App;
