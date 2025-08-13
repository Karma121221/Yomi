import React, { useState, useEffect, useRef } from 'react';
import './Settings.css';

const Settings = ({ onClose }) => {
  const [fontSize, setFontSize] = useState(localStorage.getItem('yomi-font-size') || '16');
  const [autoSave, setAutoSave] = useState(localStorage.getItem('yomi-auto-save') === 'true');
  const [audioEnabled, setAudioEnabled] = useState(localStorage.getItem('yomi-audio-enabled') !== 'false');
  const [animationsEnabled, setAnimationsEnabled] = useState(localStorage.getItem('yomi-animations') !== 'false');
  const [kanjiDisplayLimit, setKanjiDisplayLimit] = useState(localStorage.getItem('yomi-kanji-limit') || '50');
  const modalRef = useRef(null);

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

  useEffect(() => {
    // Apply font size changes immediately
    document.documentElement.style.setProperty('--user-font-size', `${fontSize}px`);
  }, [fontSize]);

  useEffect(() => {
    // Apply animation settings
    if (!animationsEnabled) {
      document.body.classList.add('no-animations');
    } else {
      document.body.classList.remove('no-animations');
    }
  }, [animationsEnabled]);

  const handleSave = () => {
    localStorage.setItem('yomi-font-size', fontSize);
    localStorage.setItem('yomi-auto-save', autoSave.toString());
    localStorage.setItem('yomi-audio-enabled', audioEnabled.toString());
    localStorage.setItem('yomi-animations', animationsEnabled.toString());
    localStorage.setItem('yomi-kanji-limit', kanjiDisplayLimit);
    onClose();
  };

  const handleReset = () => {
    setFontSize('16');
    setAutoSave(true);
    setAudioEnabled(true);
    setAnimationsEnabled(true);
    setKanjiDisplayLimit('50');
    localStorage.removeItem('yomi-font-size');
    localStorage.removeItem('yomi-auto-save');
    localStorage.removeItem('yomi-audio-enabled');
    localStorage.removeItem('yomi-animations');
    localStorage.removeItem('yomi-kanji-limit');
    document.documentElement.style.setProperty('--user-font-size', '16px');
    document.body.classList.remove('no-animations');
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal" ref={modalRef}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
            </svg>
          </button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h3>Display</h3>
            
            <div className="setting-item">
              <label htmlFor="font-size">Text Size</label>
              <div className="setting-control">
                <input
                  type="range"
                  id="font-size"
                  min="12"
                  max="24"
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                />
                <span className="setting-value">{fontSize}px</span>
              </div>
            </div>

            <div className="setting-item">
              <label htmlFor="animations">Enable Animations</label>
              <div className="setting-control">
                <input
                  type="checkbox"
                  id="animations"
                  checked={animationsEnabled}
                  onChange={(e) => setAnimationsEnabled(e.target.checked)}
                  className="setting-checkbox"
                />
              </div>
            </div>

            <div className="setting-item">
              <label htmlFor="kanji-limit">Kanji Display Limit</label>
              <div className="setting-control">
                <select
                  id="kanji-limit"
                  value={kanjiDisplayLimit}
                  onChange={(e) => setKanjiDisplayLimit(e.target.value)}
                  className="setting-select"
                >
                  <option value="25">25 kanji</option>
                  <option value="50">50 kanji</option>
                  <option value="100">100 kanji</option>
                  <option value="200">200 kanji</option>
                </select>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>Functionality</h3>
            
            <div className="setting-item">
              <label htmlFor="auto-save">Auto-save Progress</label>
              <div className="setting-control">
                <input
                  type="checkbox"
                  id="auto-save"
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                  className="setting-checkbox"
                />
              </div>
            </div>

            <div className="setting-item">
              <label htmlFor="audio">Enable Audio</label>
              <div className="setting-control">
                <input
                  type="checkbox"
                  id="audio"
                  checked={audioEnabled}
                  onChange={(e) => setAudioEnabled(e.target.checked)}
                  className="setting-checkbox"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button className="settings-reset" onClick={handleReset}>
            Reset to Defaults
          </button>
          <div className="settings-actions">
            <button className="settings-cancel" onClick={onClose}>
              Cancel
            </button>
            <button className="settings-save" onClick={handleSave}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
