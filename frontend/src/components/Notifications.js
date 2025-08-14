import React from 'react';

export default function Notifications({
  showNotification,
  setShowNotification,
  showKanjiNotification,
  kanjiNotificationText,
  setShowKanjiNotification
}) {
  return (
    <>
      {showNotification && (
        <div className="notification-overlay">
          <div className="notification-popup">
            <div className="notification-header">
              <svg className="notification-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2L13.09,8.26L22,9L13.09,9.74L12,16L10.91,9.74L2,9L10.91,8.26L12,2M12,21C7.03,21 3,16.97 3,12C3,7.03 7.03,3 12,3C16.97,3 21,7.03 21,12C21,16.97 16.97,21 12,21M12,19A7,7 0 0,0 19,12A7,7 0 0,0 12,5A7,7 0 0,0 5,12A7,7 0 0,0 12,19Z"/>
              </svg>
              <h3>Service Starting Up</h3>
              <button className="notification-close" onClick={() => setShowNotification(false)}>×</button>
            </div>
            <div className="notification-content">
              <p>If you're experiencing errors, our backend service might be starting up. This is normal for Render's free tier - services sleep after inactivity.</p>
              <p><strong>Please wait 30-60 seconds and try again.</strong></p>
              <div className="notification-actions">
                <button className="notification-button primary" onClick={() => { setShowNotification(false); setTimeout(() => window.dispatchEvent(new Event('retryUpload')), 1000); }}>Retry Now</button>
                <button className="notification-button secondary" onClick={() => setShowNotification(false)}>Got It</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
    </>
  );
}
