// frontend/src/components/Profile.jsx

import React, { useContext, useEffect } from 'react'; // 1. Add useEffect
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // 2. Import axios
import { AuthContext } from '../context/AuthContext';
import './Profile.css';

const Profile = () => {
  // 3. Get the token and the updateUser function
  const { user, token, logout, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // 4. NEW: This effect runs every time you visit the profile page
  useEffect(() => {
    const fetchLatestProfile = async () => {
      // We need the token to make an authenticated request
      if (token) {
        try {
          const res = await axios.get('http://localhost:5000/api/auth/profile', {
            headers: { Authorization: `Bearer ${token}` }
          });
          // Update the entire app's user state with the freshest data from the DB
          updateUser(res.data);
        } catch (err) {
          console.error("Failed to fetch latest profile", err);
          // If the token is invalid (e.g., expired), log the user out
          logout();
          navigate('/login');
        }
      }
    };

    fetchLatestProfile();
    // This effect depends on the token. It runs when the token is first available.
  }, [token, navigate, logout, updateUser]);


  if (!user) {
    return <p className="profile-loading">Loading Profile...</p>;
  }
  
  // The rest of your component remains the same and will now always show the latest data.
  // ... (the return JSX for your profile card)
  // ...

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="profile-page-container">
      <div className="profile-card">
        <h1 className="profile-title">👤 User Profile</h1>
        <div className="profile-info-grid">
          {/* ... all your info-items */}
          <div className="info-item">
            <span className="info-label">Name</span>
            <span className="info-value">{user.name}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Email</span>
            <span className="info-value">{user.email}</span>
          </div>
          <div className="info-item">
            <span className="info-label">WhatsApp</span>
            <span className="info-value">{user.whatsappNumber}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Credits</span>
            <span className="info-value">{user.credits}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Telegram Link Status</span>
            <span className={`info-value status-${user.telegramId ? 'linked' : 'unlinked'}`}>
              {user.telegramId ? '✅ Linked' : '❌ Not Linked'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">AI Assistant Status</span>
            <span className={`info-value status-${user.isAiBotActive ? 'active' : 'inactive'}`}>
              {user.isAiBotActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <div className="profile-actions">
          <button className="profile-dashboard-btn" onClick={() => navigate('/')}>⬅️ Back to Dashboard</button>
          <button className="profile-logout-btn" onClick={handleLogout}>🚪 Logout</button>
        </div>
      </div>
    </div>
  );
};

export default Profile;