import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './Profile.css';

const Profile = () => {
  const { user, token, logout, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // Consolidated state for better management
  const [status, setStatus] = useState({
    loading: false,
    error: null,
    action: null, // To track 'upload' or 'remove'
  });
  
  const fileInputRef = useRef(null);

  // This function fetches the latest user data to ensure UI is in sync.
  const fetchLatestProfile = useCallback(async () => {
    if (token) {
      try {
        // Kept your production URL
        const res = await axios.get('https://aadsibot.onrender.com/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        updateUser(res.data);
      } catch (err) {
        console.error("Failed to fetch latest profile", err);
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          logout();
          navigate('/login');
        }
      }
    }
  }, [token, navigate, logout, updateUser]);

  // This effect ensures the profile is fresh when the component loads.
  useEffect(() => {
    if (user && !user.hasOwnProperty('isAiBotActive')) {
        fetchLatestProfile();
    }
  }, [fetchLatestProfile, user]);

  // --- UPDATED: Logic to handle file upload ---
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // File validation
    if (!file.type.startsWith('image/')) {
      setStatus({ loading: false, error: 'Please select an image file.', action: null });
      return;
    }
    if (file.size > 4 * 1024 * 1024) { // 4MB limit
      setStatus({ loading: false, error: 'Image size cannot exceed 4MB.', action: null });
      return;
    }

    setStatus({ loading: true, error: null, action: 'upload' });

    try {
      const formData = new FormData();
      formData.append('profileImage', file);

      // --- THE FIX: Using the correct user route, not the auth route ---
      const res = await axios.post(
        'https://aadsibot.onrender.com/api/user/upload-profile',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      updateUser(res.data.user);
      setStatus({ loading: false, error: null, action: null });
    } catch (err) {
      console.error("Upload failed", err);
      const message = err.response?.data?.message || 'Upload failed. Please try again.';
      setStatus({ loading: false, error: message, action: null });
    }
  };
  
  // --- UPDATED: Logic to handle file removal ---
  const handleRemovePicture = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) {
        return;
    }

    setStatus({ loading: true, error: null, action: 'remove' });

    try {
        // --- THE FIX: Using the correct user route, not the auth route ---
        const res = await axios.delete(
            'https://aadsibot.onrender.com/api/user/remove-profile', 
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );

        updateUser(res.data.user);
        setStatus({ loading: false, error: null, action: null });

    } catch (err) {
        console.error("Failed to remove profile picture", err);
        const message = err.response?.data?.message || 'Removal failed. Please try again.';
        setStatus({ loading: false, error: message, action: null });
    }
  };

  // Click handler for the profile picture
  const handleImageClick = () => {
    // A small improvement to prevent clicking while loading
    if (status.loading) return;
    fileInputRef.current.click();
  };

  // Logout handler
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Render a loading state if user data isn't ready
  if (!user) {
    return <p className="profile-loading">Loading Profile...</p>;
  }
  
  const isLoading = status.loading;

  // --- JSX with all logic integrated ---
  return (
    <div className="profile-page-container">
      <div className="profile-card">
        <div className="profile-picture-container" onClick={handleImageClick}>
          {user.profilePicture ? (
            <img
              // key prop forces a re-render on change, avoiding cache issues
              key={user.profilePicture}
              // This correctly constructs the full image URL for your production server
              src={`https://aadsibot.onrender.com${user.profilePicture}`}
              alt="Profile"
              className="profile-picture"
            />
          ) : (
            <div className="profile-picture-placeholder">{user.name.charAt(0).toUpperCase()}</div>
          )}
          <div className="profile-picture-overlay">
            {/* Using the more user-friendly text from your local version */}
            {isLoading && status.action === 'upload' ? 'Uploading...' : 'Change Photo'}
          </div>
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept="image/png, image/jpeg, image/gif"
          disabled={isLoading}
        />

        {status.error && <p className="upload-error">{status.error}</p>}
        
        {user.profilePicture && !isLoading && (
            <button className="remove-picture-btn" onClick={handleRemovePicture}>
                Remove Picture
            </button>
        )}
        {isLoading && status.action === 'remove' && <p className="loading-text">Removing...</p>}


        <h1 className="profile-title">{user.name}</h1>
        <p className="profile-email">{user.email}</p>
        
        {/* The info grid remains the same and will work correctly now */}
        <div className="profile-info-grid">
          <div className="info-item">
            <span className="info-label">Telegram Link Status</span>
            <span className={`info-value status-${user.telegramId ? 'linked' : 'unlinked'}`}>
              {user.telegramId ? '✅ Linked' : '❌ Not Linked'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">AI Assistant Status</span>
            <span className={`info-value status-${user.isAiBotActive ? 'active' : 'inactive'}`}>
              {user.isAiBotActive ? '🟢 Active' : '🔴 Inactive'}
            </span>
          </div>
        </div>

        <div className="profile-actions">
          <button className="profile-dashboard-btn" onClick={() => navigate('/')} disabled={isLoading}>⬅️ Back to Dashboard</button>
          <button className="profile-logout-btn" onClick={handleLogout} disabled={isLoading}>🚪 Logout</button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
