import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './Homepage.css';

const Homepage = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useContext(AuthContext);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState({
    loading: false,
    error: null,
    success: null,
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // --- 👇 1. NEW: A clear variable to check the user's credit status ---
  const isOutOfCredits = user && user.credits <= 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);
  const goToProfile = () => navigate('/profile');
  
  // --- NEW: A handler to navigate to the payment page ---
  const goToPaymentPage = () => navigate('/payment');

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) {
      setFeedbackStatus({ loading: false, success: null, error: 'Feedback message cannot be empty.' });
      return;
    }

    setFeedbackStatus({ loading: true, success: null, error: null });

    try {
      await axios.post(
       'https://aadsibot.onrender.com/api/feedback/submit',
        { message: feedbackMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setFeedbackStatus({ loading: false, error: null, success: 'Thank you for your feedback!' });
      setFeedbackMessage('');
      
      setTimeout(() => {
        setFeedbackStatus(prevStatus => ({ ...prevStatus, success: null }));
      }, 5000);

    } catch (err) {
      const message = err.response?.data?.message || 'An error occurred. Please try again.';
      setFeedbackStatus({ loading: false, success: null, error: message });
    }
  };

  if (!user) {
    return <div className="homepage-container">Loading...</div>;
  }

  return (
    <div className="homepage-container">
      {/* --- 👇 2. MODIFIED: Added a conditional class for styling --- */}
      <div className={`credit-circle ${isOutOfCredits ? 'zero-credits' : ''}`}>
        🕒 {user.credits} credit{user.credits !== 1 ? 's' : ''} left
      </div>

      <div className="top-right-profile">
        <div className="profile-circle" onClick={toggleDropdown}>
          {user.name.charAt(0).toUpperCase()}
        </div>
        {dropdownOpen && (
          <div className="profile-dropdown">
            <button onClick={goToProfile}>👤 Profile</button>
            <button onClick={handleLogout}>🚪 Logout</button>
          </div>
        )}
      </div>
      
      {/* --- 👇 3. MODIFIED: The hero section now changes based on credits --- */}
      <div className="hero-section">
        {isOutOfCredits ? (
          <>
            <h1 className="hero-title">You're Out of Credits!</h1>
            <p className="hero-slogan">Please upgrade your plan to continue using the bot.</p>
            <div className="hero-buttons">
              <button onClick={goToPaymentPage} className="get-started-btn upgrade-btn">
                💰 Upgrade Plan
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="hero-title">Welcome, {user.name}!</h1>
            <p className="hero-slogan">💬 <span className="animated-text">Try to reduce your struggle...</span></p>
            <div className="hero-buttons">
              <button onClick={() => navigate('/chat')} className="get-started-btn">
                🚀 Select Mode
              </button>
              <Link to="/history" className="chat-history-btn">
                📜 Usage History
              </Link>
            </div>
          </>
        )}
      </div>

      <div className="feedback-section">
        <h2 className="feedback-title">We value your feedback ❤️</h2>
        <form className="feedback-form" onSubmit={handleFeedbackSubmit}>
          <textarea
            placeholder="Write your feedback here..."
            className="feedback-textarea"
            value={feedbackMessage}
            onChange={(e) => setFeedbackMessage(e.target.value)}
          ></textarea>

          {feedbackStatus.success && <p className="feedback-success">{feedbackStatus.success}</p>}
          {feedbackStatus.error && <p className="feedback-error">{feedbackStatus.error}</p>}
          
          <button type="submit" className="feedback-submit-btn" disabled={feedbackStatus.loading}>
            {feedbackStatus.loading ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Homepage;
