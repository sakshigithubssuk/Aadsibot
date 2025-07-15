import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './Homepage.css';

const Homepage = () => {
  const navigate = useNavigate();
  // 1. Get the 'user' and 'token' from the context. We need the token for the API call.
  const { user, token, logout } = useContext(AuthContext);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // 2. Add state specifically for the feedback form
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);
  const goToProfile = () => navigate('/profile');

  // 3. Create the handler function for submitting the feedback
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault(); // Stop the page from reloading
    if (!feedbackMessage.trim()) {
      setFeedbackStatus({ loading: false, success: null, error: 'Feedback message cannot be empty.' });
      return;
    }

    setFeedbackStatus({ loading: true, success: null, error: null });

    try {
      // 4. Make an authenticated POST request
      await axios.post(
        'http://localhost:5000/api/feedback/submit',
        { message: feedbackMessage }, // This is the request body
        {
          headers: {
            Authorization: `Bearer ${token}`, // This proves the user is logged in
          },
        }
      );

      // 5. On success, update the status and clear the input
      setFeedbackStatus({ loading: false, error: null, success: 'Thank you for your feedback!' });
      setFeedbackMessage('');
      
      // Optional: hide the success message after 5 seconds
      setTimeout(() => {
        setFeedbackStatus(prevStatus => ({ ...prevStatus, success: null }));
      }, 5000);

    } catch (err) {
      // 6. On failure, capture the error message and display it
      const message = err.response?.data?.message || 'An error occurred. Please try again.';
      setFeedbackStatus({ loading: false, success: null, error: message });
    }
  };

  if (!user) {
    return <div className="homepage-container">Loading...</div>;
  }

  return (
    <div className="homepage-container">
      {/* Credit display */}
      <div className="credit-circle">
        🕒 {user.credits} credit{user.credits !== 1 ? 's' : ''} left
      </div>

      {/* Profile circle */}
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

      {/* Hero section */}
      <div className="hero-section">
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
      </div>

      {/* --- UPDATED FEEDBACK SECTION --- */}
      <div className="feedback-section">
        <h2 className="feedback-title">We value your feedback ❤️</h2>
        {/* 7. Connect the form's onSubmit to our new handler function */}
        <form className="feedback-form" onSubmit={handleFeedbackSubmit}>
          <textarea
            placeholder="Write your feedback here..."
            className="feedback-textarea"
            value={feedbackMessage}
            onChange={(e) => setFeedbackMessage(e.target.value)}
          ></textarea>

          {/* 8. Display success or error messages to the user */}
          {feedbackStatus.success && <p className="feedback-success">{feedbackStatus.success}</p>}
          {feedbackStatus.error && <p className="feedback-error">{feedbackStatus.error}</p>}
          
          {/* 9. The button is now disabled while loading */}
          <button type="submit" className="feedback-submit-btn" disabled={feedbackStatus.loading}>
            {feedbackStatus.loading ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Homepage;