import React from 'react';

export const renderKanjiCard = (kanji, kanjiData, kanjiLoading, selectedKanji = new Set(), onToggleSelection = null) => {
  const data = kanjiData[kanji];
  const isLoading = kanjiLoading[kanji];
  const isSelected = selectedKanji.has(kanji);

  if (isLoading) {
    return (
      <div key={kanji} className="kanji-card loading">
        <div className="kanji-char">{kanji}</div>
        <div className="loading-spinner-small"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!data || !data.success) {
    return (
      <div key={kanji} className="kanji-card error">
        <div className="kanji-char">{kanji}</div>
        <p className="error-text">
          {data?.error || 'Failed to load kanji information'}
        </p>
      </div>
    );
  }

  const kanjiInfo = data.data;

  return (
    <div key={kanji} className={`kanji-card ${isSelected ? 'selected' : ''}`}>
      {onToggleSelection && (
        <div className="kanji-checkbox-container">
          <input
            type="checkbox"
            id={`kanji-${kanji}`}
            checked={isSelected}
            onChange={() => onToggleSelection(kanji)}
            className="kanji-checkbox"
          />
          <label htmlFor={`kanji-${kanji}`} className="kanji-checkbox-label">
            <svg viewBox="0 0 24 24" className="check-icon">
              <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
            </svg>
          </label>
        </div>
      )}
      
      <div className="kanji-char">{kanji}</div>
      
      <div className="kanji-info">
        <div className="info-section">
          <h4>Meanings</h4>
          <p>{kanjiInfo.meanings?.join(', ') || 'N/A'}</p>
        </div>

        <div className="info-section">
          <h4>On'yomi (音読み)</h4>
          <p>{kanjiInfo.on_readings?.length > 0 ? kanjiInfo.on_readings.join(', ') : 'NULL'}</p>
        </div>

        <div className="info-section">
          <h4>Kun'yomi (訓読み)</h4>
          <p>{kanjiInfo.kun_readings?.length > 0 ? kanjiInfo.kun_readings.join(', ') : 'NULL'}</p>
        </div>

        {kanjiInfo.jlpt && (
          <div className="info-section">
            <h4>JLPT Level</h4>
            <p>N{kanjiInfo.jlpt}</p>
          </div>
        )}

        <div className="info-section">
          <h4>Stroke Count</h4>
          <p>{kanjiInfo.stroke_count}</p>
        </div>
      </div>
    </div>
  );
};