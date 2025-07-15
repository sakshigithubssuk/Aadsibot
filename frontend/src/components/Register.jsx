import React, { useState, useContext } from 'react'; // 1. Import useContext
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios'; // 2. Import axios
import { AuthContext } from '../context/AuthContext'; // 3. Import AuthContext
import './Register.css';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState(''); // Renamed for clarity
  const navigate = useNavigate();
  const { login } = useContext(AuthContext); // 4. Get the login function from context

  // 5. Make the handler async to use await
  const handleRegister = async (e) => {
    e.preventDefault();

   
    try {
      // 7. Make the API call to your backend's register endpoint
      const res = await axios.post('https://aadsibot.onrender.com/api/auth/register', {
        name,
        email,
        password,
        whatsappNumber, // Ensure this matches the backend model field name
      });

      // 8. If the API call is successful, the backend will return the user data and token
      // Use the login function from your context to save them
      console.log("res data",res.data);
      if (res.data) {
        login(res.data, res.data.token);
        navigate('/'); // 9. Navigate to the profile page, not the login page
      }

    } catch (err) {
      // 10. If the backend returns an error (e.g., "User already exists"), log it
      console.error(err.response ? err.response.data.message : err.message);
      // You can also set an error state here to show the user a message
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h1 className="register-title">✨ Welcome to ChatBot</h1>
        <p className="register-subtitle">Create your account to start chatting with AI</p>
        <form onSubmit={handleRegister} className="register-form">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full Name"
            className="register-input"
            required
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address"
            className="register-input"
            required
          />
            <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="register-input"
            required
          />
          <input
            type="tel"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="WhatsApp Number"
            className="register-input"
            required
          />
          <button type="submit" className="register-button">Register</button>
        </form>
        <p className="register-footer">
          Already have an account?{' '}
          <Link to="/login" className="register-link">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
