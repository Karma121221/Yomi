import React from 'react';
import '../styles/LandingPage.css';
import ParticlesBg from './ParticlesBg';

export default function LandingPage({ 
  isAuthenticated, 
  onGetStarted, 
  onShowLogin,
  onShowRegister 
}) {
  const handleGetStarted = () => {
    console.log('Get Started clicked!', { isAuthenticated, onGetStarted, onShowLogin });
    if (isAuthenticated) {
      // If user is already logged in, go directly to main page
      console.log('User is authenticated, calling onGetStarted');
      onGetStarted();
    } else {
      // If not logged in, show login modal
      console.log('User not authenticated, calling onShowLogin');
      onShowLogin();
    }
  };

  return (
    <div className="landing-page">
      <ParticlesBg 
        className="particles-background"
        quantity={400}
        ease={100}
        color="#FFD700"
        staticity={15}
      />
      <div className="landing-container">
        <div className="hero-section">
          <h1 className="hero-title">
            Yomi
            <ruby className="furigana-ruby">
              方
              <rt className="furigana-rt">かた</rt>
            </ruby>
          </h1>
          <p className="hero-subtitle">
            Your bridge from kanji to comprehension
          </p>
          <button className="get-started-btn" onClick={handleGetStarted}>
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
