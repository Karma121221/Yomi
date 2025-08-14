import React from 'react';
import { renderKanjiCard } from '../utils/kanjiCardUtils';

export default function SidebarKanji({
  sidebarOpen,
  toggleSidebar,
  kanjiList,
  kanjiData,
  kanjiLoading,
  selectedKanji,
  toggleKanjiSelection,
  selectAllKanji,
  clearAllSelections,
  saveSelectedKanji,
  kanjiSortOption,
  setKanjiSortOption,
  isAuthenticated
}) {
  const getSortedKanjiList = () => {
    const kanjiWithInfo = kanjiList.map(kanji => ({ char: kanji, data: kanjiData[kanji] }));

    switch (kanjiSortOption) {
      case 'jlpt-easy':
        return kanjiWithInfo.sort((a, b) => {
          const aJlpt = a.data?.data?.jlpt || 0;
          const bJlpt = b.data?.data?.jlpt || 0;
          return bJlpt - aJlpt;
        }).map(item => item.char);
      case 'jlpt-hard':
        return kanjiWithInfo.sort((a, b) => {
          const aJlpt = a.data?.data?.jlpt || 0;
          const bJlpt = b.data?.data?.jlpt || 0;
          return aJlpt - bJlpt;
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
        return kanjiList;
    }
  };

  return (
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
                  <span className="selection-count">{selectedKanji.size} of {kanjiList.length} selected</span>
                </div>
                <div className="selection-buttons">
                  <button className="select-all-btn" onClick={selectAllKanji} disabled={selectedKanji.size === kanjiList.length}>Select All</button>
                  <button className="clear-all-btn" onClick={clearAllSelections} disabled={selectedKanji.size === 0}>Clear All</button>
                  <button className="save-selected-btn" onClick={saveSelectedKanji} disabled={selectedKanji.size === 0}>Save to Collection ({selectedKanji.size})</button>
                </div>
              </div>
            )}
            <div className="kanji-sort-controls">
              <label htmlFor="kanji-sort">Sort by:</label>
              <select id="kanji-sort" value={kanjiSortOption} onChange={(e) => setKanjiSortOption(e.target.value)} className="kanji-sort-select">
                <option value="chronological">Chronological Order</option>
                <option value="jlpt-easy">JLPT Level (Easy to Hard)</option>
                <option value="jlpt-hard">JLPT Level (Hard to Easy)</option>
                <option value="stroke-asc">Stroke Count (Less to More)</option>
                <option value="stroke-desc">Stroke Count (More to Less)</option>
              </select>
            </div>
            <div className="kanji-grid">
              {getSortedKanjiList().map(kanji => renderKanjiCard(kanji, kanjiData, kanjiLoading, selectedKanji, toggleKanjiSelection))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
