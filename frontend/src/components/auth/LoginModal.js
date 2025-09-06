import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/AuthModal.css';

const LoginModal = ({ isOpen, onClose, switchToRegister, fromLanding = false, onSkip }) => {
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, startGoogleLogin } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData.identifier, formData.password);

    if (result.success) {
      onClose();
      setFormData({ identifier: '', password: '' });
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  const handleClose = () => {
    setFormData({ identifier: '', password: '' });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`auth-modal-overlay ${fromLanding ? 'landing-theme' : ''}`}>
      <div className={`auth-modal ${fromLanding ? 'landing-theme' : ''}`}>
        <div className="auth-modal-header">
          <h2>Welcome Back</h2>
          <button className="auth-modal-close" onClick={handleClose}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="oauth-row">
            <button type="button" className="google-btn" onClick={startGoogleLogin}>
              <img src="/yomu.png" alt="Google" className="google-icon" />
              Continue with Google
            </button>
          </div>
          {error && (
            <div className="auth-error">
              <svg className="error-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
              </svg>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="identifier">Email or Username</label>
            <input
              type="text"
              id="identifier"
              name="identifier"
              value={formData.identifier}
              onChange={handleChange}
              required
              placeholder="Enter your email or username"
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  {showPassword ? (
                    <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
                  ) : (
                    <path d="M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.09L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.76,7.13 11.38,7 12,7Z"/>
                  )}
                </svg>
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <div className="auth-spinner"></div>
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>

          <div className="auth-switch">
            <p>
              Don't have an account?{' '}
              <button type="button" onClick={switchToRegister} className="auth-switch-btn">
                Sign up here
              </button>
              {fromLanding && onSkip && (
                <>
                  {' '}or{' '}
                  <button type="button" onClick={onSkip} className="auth-switch-btn">
                    Skip for now
                  </button>
                </>
              )}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
