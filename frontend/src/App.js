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
          <h1 className="navbar-brand">Yomi</h1>
          <button className="dark-mode-toggle" onClick={toggleDarkMode}>
            {darkMode ? '☀️' : '🌙'}
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
                      
                      return (
                        <div key={lineIndex} className="line-container">
                          <div className="furigana-line">
                            {renderFuriganaText(line.parts)}
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
