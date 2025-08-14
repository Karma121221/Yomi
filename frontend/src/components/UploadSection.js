import React from 'react';

export default function UploadSection({
  previewUrl,
  pastedText,
  handleFileSelect,
  handleTextInput,
  handleUpload,
  inputMode,
  loading
}) {
  return (
    <div className="upload-section">
      <p className="upload-description">
        Upload an image with Japanese text to extract it with furigana annotations
      </p>
      <div className="file-input-container">
        <input type="file" id="file-input" accept="image/*" onChange={handleFileSelect} className="file-input" />
        <label htmlFor="file-input" className="file-input-label">Choose Image File</label>
      </div>
      <div className="input-divider"><span className="divider-text">OR</span></div>
      <div className="text-input-container">
        <label htmlFor="text-input" className="text-input-label">Paste Japanese Text</label>
        <textarea id="text-input" value={pastedText} onChange={handleTextInput} placeholder="Paste your Japanese text here..." className="text-input" rows="4" />
      </div>
      {(previewUrl || pastedText.trim()) && (
        <div className="preview-container">
          {previewUrl && (<img src={previewUrl} alt="Preview" className="image-preview" />)}
          {pastedText.trim() && (
            <div className="text-preview">
              <h4>Text to Process:</h4>
              <div className="preview-text">{pastedText}</div>
            </div>
          )}
          <button onClick={handleUpload} disabled={loading} className="upload-button">
            {loading ? 'Processing...' : inputMode === 'text' ? 'Generate Furigana' : 'Extract Text with Furigana'}
          </button>
        </div>
      )}
    </div>
  );
}
