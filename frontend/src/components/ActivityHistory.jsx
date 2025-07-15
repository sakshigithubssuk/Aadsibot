// frontend/src/components/ActivityHistory.jsx
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './ActivityHistory.css'; // We will create this CSS file

const ActivityHistory = () => {
  const { token } = useContext(AuthContext);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!token) return;
      try {
        const { data } = await axios.get('https://aadsibot.onrender.com/api/activity/history', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setActivities(data);
      } catch (error) {
        console.error('Failed to fetch activity history', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [token]);

  return (
    <div className="history-container">
      <div className="history-card">
        <h1 className="history-title">📊 Activity Log</h1>
        <p className="history-subtitle">A record of your recent AI usage and credit changes.</p>
        <div className="history-list">
          {loading ? (
            <p>Loading history...</p>
          ) : activities.length > 0 ? (
            activities.map((activity) => (
              <div key={activity._id} className="history-item">
                <div className="item-details">
                  <span className="item-description">{activity.description}</span>
                  <span className="item-date">
                    {new Date(activity.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className={`item-credits credit-change-${activity.creditChange > 0 ? 'positive' : 'negative'}`}>
                  {activity.creditChange > 0 ? `+${activity.creditChange}` : activity.creditChange}
                </div>
              </div>
            ))
          ) : (
            <p>No recent activity found.</p>
          )}
        </div>
        <Link to="/" className="back-button">⬅ Back to Dashboard</Link>
      </div>
    </div>
  );
};

export default ActivityHistory;
