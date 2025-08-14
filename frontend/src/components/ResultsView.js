import React from 'react';
import { renderFuriganaText } from '../utils/furiganaUtils';

export default function ResultsView({
  result,
  audioLoadingStates,
  handlePlayAudioWrapper,
  showTraditionalFurigana,
  setShowTraditionalFurigana,
  kanjiList,
  toggleSidebar
}) {
  if (!result) return null;

  return (
    <div className="results-container">
      <h2>Results</h2>
      <div className="result-section">
        <h3>Original Text</h3>
        <div className="original-text">{result.original_text}</div>
      </div>

      <div className="result-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3>Text with Furigana</h3>
          <button className="sidebar-toggle-inline" onClick={toggleSidebar} style={{ background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '0.9em', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.3s ease' }}>
            <svg className="kanji-icon" viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px' }}>
              <path d="M4,6H20V8H4V6M4,11H20V13H4V11M4,16H20V18H4V16Z"/>
            </svg>
            Show Kanji List
            <span className="kanji-count-inline" style={{ background: 'rgba(255, 255, 255, 0.3)', color: 'white', fontSize: '0.8em', fontWeight: '600', padding: '2px 6px', borderRadius: '10px', minWidth: '18px', textAlign: 'center', marginLeft: '4px' }}>{kanjiList.length}</span>
          </button>
        </div>
        <div className="furigana-container">
          {result.pages.map((page, pageIndex) => (
            <div key={pageIndex} className="page-container">
              {page.lines.map((sentence, sentenceIndex) => {
                const confidenceLevel = sentence.confidence >= 0.8 ? 'high' : sentence.confidence >= 0.6 ? 'medium' : 'low';
                const lineKey = `page-${pageIndex}-sentence-${sentenceIndex}`;
                const isLoadingAudio = audioLoadingStates[lineKey];

                return (
                  <div key={sentenceIndex} className="line-container sentence-container">
                    <div className="sentence-number">Sentence {sentenceIndex + 1}</div>
                    <div className="line-content">
                      <div className="furigana-line">{renderFuriganaText(sentence.parts)}</div>
                      <button className="listen-button" onClick={() => handlePlayAudioWrapper(sentence.original, lineKey)} disabled={isLoadingAudio} title="Listen to pronunciation">
                        {isLoadingAudio ? (
                          <div className="button-spinner"></div>
                        ) : (
                          <svg className="speaker-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3,9V15H7L12,20V4L7,9H3M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23Z"/>
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className={`confidence-score confidence-${confidenceLevel}`}>Confidence: {(sentence.confidence * 100).toFixed(1)}%</div>
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
          <button className="furigana-toggle-button" onClick={() => setShowTraditionalFurigana(!showTraditionalFurigana)} style={{ background: showTraditionalFurigana ? 'var(--accent-green)' : 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '0.9em', fontWeight: '500', cursor: 'pointer', transition: 'all 0.3s ease' }}>{showTraditionalFurigana ? 'Show Bracket Format' : 'Show Traditional Furigana'}</button>
        </div>
        <div className="simple-text">
          {showTraditionalFurigana ? (
            <div className="traditional-furigana">
              {result.pages.map((page, pageIndex) => (
                <div key={pageIndex}>
                  {page.lines.map((sentence, sentenceIndex) => (
                    <div key={sentenceIndex} style={{ marginBottom: '12px' }}>{renderFuriganaText(sentence.parts)}</div>
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
          <div className="translated-text">{result.translated_text}</div>
        </div>
      )}

      {!result.translated_text && (
        <div className="result-section">
          <h3>English Translation</h3>
          <div className="translation-error">Translation service temporarily unavailable</div>
        </div>
      )}
    </div>
  );
}
