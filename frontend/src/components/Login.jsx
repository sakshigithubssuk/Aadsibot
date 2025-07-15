import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // For displaying user-friendly errors
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(''); // Clear previous errors on a new attempt

    try {
      // 1. The request body should ONLY contain email and password,
      //    matching your backend's loginUser controller.
      const res = await axios.post('https://aadsibot.onrender.com/api/auth/login
', {
        email,
        password,
      });

      // 2. THE CRITICAL FIX:
      //    Call login() with the entire response data object and the token from it.
      //    res.data IS the user object. res.data.token is the token.
      if (res.data && res.data.token) {
        login(res.data, res.data.token);
        navigate('/profile'); // Redirect to a protected page like Profile or Dashboard
      } else {
        setError('Received an invalid response from the server.');
      }

    } catch (err) {
      // 3. Set the error state from the backend's response message for a better UX.
      const message = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">✨ Welcome Back!</h1>
        <p className="login-subtitle">Login to continue chatting</p>

        {/* 4. Display the error message gracefully if it exists */}
        {error && <p className="login-error-message">{error}</p>}

        <form onSubmit={handleLogin} className="login-form">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address"
            className="login-input"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="login-input"
            required
          />
          {/* The WhatsApp input has been removed as it's not needed for login */}
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="login-footer">
          Need an account?{' '}
          <Link to="/register" className="login-link">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
