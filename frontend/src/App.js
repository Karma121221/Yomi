import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = 'http://localhost:5000';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(null); // Track which audio is playing
  const [audioLoadingStates, setAudioLoadingStates] = useState({}); // Track loading states for each line

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

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
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

  const handlePlayAudio = async (text, lineKey) => {
    try {
      // Stop any currently playing audio
      if (playingAudio) {
        playingAudio.pause();
        setPlayingAudio(null);
      }

      // Set loading state for this specific line
      setAudioLoadingStates(prev => ({ ...prev, [lineKey]: true }));

      const response = await axios.post(`${API_BASE_URL}/api/tts`, {
        text: text
      }, {
        responseType: 'blob'
      });

      // Create audio blob and play
      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setPlayingAudio(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setPlayingAudio(null);
        URL.revokeObjectURL(audioUrl);
        console.error('Audio playback failed');
      };

      setPlayingAudio(audio);
      await audio.play();

    } catch (error) {
      console.error('TTS request failed:', error);
      // Could add user notification here
    } finally {
      // Clear loading state for this line
      setAudioLoadingStates(prev => ({ ...prev, [lineKey]: false }));
    }
  };

  const renderFuriganaText = (parts) => {
    return parts.map((part, index) => {
      if (part.type === 'kanji' && part.reading) {
        return (
          <ruby key={index} className="furigana-ruby">
            {part.text}
            <rt className="furigana-rt">{part.reading}</rt>
          </ruby>
        );
      } else {
        return <span key={index}>{part.text}</span>;
      }
    });
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
      </nav>

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
              <h3>Text with Furigana</h3>
              <div className="furigana-container">
                {result.pages.map((page, pageIndex) => (
                  <div key={pageIndex} className="page-container">
                    <h4>Page {page.page_number}</h4>
                    {page.lines.map((line, lineIndex) => {
                      // Determine confidence level for coloring
                      const confidenceLevel = line.confidence >= 0.8 ? 'high' : 
                                            line.confidence >= 0.6 ? 'medium' : 'low';
                      
                      // Create unique key for this line
                      const lineKey = `page-${pageIndex}-line-${lineIndex}`;
                      const isLoadingAudio = audioLoadingStates[lineKey];
                      
                      return (
                        <div key={lineIndex} className="line-container">
                          <div className="line-content">
                            <div className="furigana-line">
                              {renderFuriganaText(line.parts)}
                            </div>
                            <button
                              className="listen-button"
                              onClick={() => handlePlayAudio(line.original, lineKey)}
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
                            Confidence: {(line.confidence * 100).toFixed(1)}%
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
