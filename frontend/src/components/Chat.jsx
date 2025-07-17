import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './Chat.css';

const Chat = () => {
  const navigate = useNavigate();
  // Get the full user object, the token for API calls, and the updateUser function
  const { user, token, updateUser } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);

  // If the user data hasn't loaded yet from the context, show a loading message.
  if (!user) {
    return (
      <div className="chat-container">
        <div className="chat-card">
          <p>Loading user data...</p>
        </div>
      </div>
    );
  }

  // This is the function that calls the on/off switch on your main web backend
  const handleToggleBot = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(
        'https://aadsibot.onrender.com/api/user/toggle-bot',
        {}, // The body is empty, the action is defined by the route itself
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // After a successful toggle, update the user state in the entire app
      updateUser({ ...user, isAiBotActive: data.isAiBotActive });
    } catch (error) {
      console.error('Failed to toggle bot status', error);
      // You can add a user-facing error message here
    } finally {
      setLoading(false);
    }
  };

  // Dynamically create the unique linking code for the logged-in user
  const linkCode = `/start ${user._id}`;

  return (
    <div className="chat-container">
      <div className="chat-card">
        <h1 className="chat-title">🤖 Telegram AI Assistant</h1>
        <p className="chat-subtitle">Activate your personal AI to reply to your Telegram messages.</p>
        
        {/* --- MAIN CONTROL SECTION --- */}
        <div className="activation-section">
          <p>Current AI Status: 
            <span className={user.isAiBotActive ? 'status-active' : 'status-inactive'}>
              {user.isAiBotActive ? ' ACTIVE' : ' INACTIVE'}
            </span>
          </p>
          <button onClick={handleToggleBot} className="toggle-button" disabled={loading || !user.telegramId}>
            {loading ? 'Updating...' : (user.isAiBotActive ? 'Deactivate AI Bot' : 'Activate AI Bot')}
          </button>
          {/* Show a message if the user needs to link their account first */}
          {!user.telegramId && (
            <p className="link-required-notice">You must link your Telegram account below before you can activate the bot.</p>
          )}
        </div>

        {/* --- INSTRUCTIONS FOR LINKING TELEGRAM --- */}
        <div className="instructions">
          <h3>How to Link Your Account</h3>
          <p>This is a one-time setup to connect your account to our service.</p>
          <ol>
            <li>Open Telegram and search for our bot: <strong>@Aadsibot</strong>.</li>
            <li>Send the bot this exact, unique message:</li>
          </ol>
          <div className="code-box">{linkCode}</div>
        </div>

        <div className="footer-actions">
          <p className="upgrade-link">
            🌟 Need more credits?{' '}
            <Link to="/payment" className="upgrade-btn">Buy a Plan</Link>
          </p>
          <Link to="/" className="back-button">⬅ Back to Dashboard</Link>
        </div>
      </div>
    </div>
  );
};

export default Chat;
