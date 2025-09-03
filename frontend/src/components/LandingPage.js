import React from 'react';
import '../styles/LandingPage.css';
import ParticlesBg from './ParticlesBg';
import Compare from './Compare';

export default function LandingPage({ 
  isAuthenticated, 
  darkMode = true,
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
    <div className={`landing-page ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <ParticlesBg 
        className="particles-background"
        quantity={400}
        ease={100}
        color={darkMode ? "#FFD700" : "#3498db"}
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
          {/* Comparison section below CTA */}
          <div className="compare-wrapper" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '3rem',
            perspective: '800px',
            transformStyle: 'preserve-3d',
            padding: '0 0.5rem'
          }}>
            <div
              style={{ transform: 'rotateX(15deg) translateZ(80px)' }}
              className="compare-card"
            >
              <Compare
                firstImage={process.env.PUBLIC_URL + '/before.png'}
                secondImage={process.env.PUBLIC_URL + '/after.png'}
                firstImageAlt="Before"
                secondImageAlt="After"
                firstContentClass="object-cover object-left-center w-full h-96"
                secondContentClass="object-cover object-left-center w-full h-96"
                className="size-full rounded-[22px] md:rounded-xl"
                slideMode="hover"
                autoplay={true}
                autoplayDuration={6000}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
