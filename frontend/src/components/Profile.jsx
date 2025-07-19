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

  const fetchLatestProfile = useCallback(async () => {
    if (token) {
      try {
        const res = await axios.get('http://localhost:5000/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        updateUser(res.data);
      } catch (err) {
        console.error("Failed to fetch latest profile", err);
        // If token is invalid, log out the user
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          logout();
          navigate('/login');
        }
      }
    }
  }, [token, navigate, logout, updateUser]);

  useEffect(() => {
    // Fetch profile only once on component mount if user data is not fully loaded
    if (user && !user.hasOwnProperty('isAiBotActive')) { // A more robust check
        fetchLatestProfile();
    }
  }, [fetchLatestProfile, user]);

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

      const res = await axios.post(
        'http://localhost:5000/api/auth/upload-profile',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      updateUser(res.data.user); // Update context with new user data from backend
      setStatus({ loading: false, error: null, action: null });
    } catch (err) {
      console.error("Upload failed", err);
      const message = err.response?.data?.message || 'Upload failed. Please try again.';
      setStatus({ loading: false, error: message, action: null });
    }
  };
  
  const handleRemovePicture = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) {
        return;
    }

    setStatus({ loading: true, error: null, action: 'remove' });

    try {
        const res = await axios.delete(
            'http://localhost:5000/api/auth/remove-profile', 
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );

        updateUser(res.data.user); // Update context with user data (with cleared picture)
        setStatus({ loading: false, error: null, action: null });

    } catch (err) {
        console.error("Failed to remove profile picture", err);
        const message = err.response?.data?.message || 'Removal failed. Please try again.';
        setStatus({ loading: false, error: message, action: null });
    }
  };


  const handleImageClick = () => {
    if (status.loading) return;
    fileInputRef.current.click();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return <p className="profile-loading">Loading Profile...</p>;
  }
  
  const isLoading = status.loading;

  return (
    <div className="profile-page-container">
      <div className="profile-card">
        <div className="profile-picture-container" onClick={handleImageClick}>
          {user.profilePicture ? (
            <img
              src={`http://localhost:5000${user.profilePicture}`}
              alt="Profile"
              className="profile-picture"
            />
          ) : (
            <div className="profile-picture-placeholder">{user.name.charAt(0).toUpperCase()}</div>
          )}
          <div className="profile-picture-overlay">
            {isLoading && status.action === 'upload' ? 'Uploading...' : 'Uploading...'}
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
        
        {/* UPDATED: The grid now only contains two items */}
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
