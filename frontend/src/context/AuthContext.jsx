import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    const savedUserJSON = localStorage.getItem('user');

    if (savedToken && savedUserJSON) {
      try {
        const savedUser = JSON.parse(savedUserJSON);
        setUser(savedUser);
        setToken(savedToken);
      } catch (error) {
        console.error('Failed to parse user data from localStorage:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
      }
    }
  }, []);

  const login = (userData, tokenData) => {
    if (userData && tokenData) {
      setUser(userData);
      setToken(tokenData);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('authToken', tokenData);
    } else {
      console.error('Login function called with invalid userData or tokenData');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    // It's good practice to keep these cleanup lines from older versions
    localStorage.removeItem('creditDays');
    localStorage.removeItem('lastChecked');
  };

  // --- NEW FUNCTION FOR THE PAYMENT PART ---
  // This function will be used to update the user's data after a successful payment.
  const updateUser = (newUserData) => {
    if (newUserData) {
      // 1. Update the React state, so the UI changes instantly
      setUser(newUserData);
      // 2. Also update localStorage, so the new credit balance persists on page refresh
      localStorage.setItem('user', JSON.stringify(newUserData));
    }
  };

  return (
    // 3. Export the new `updateUser` function
    <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};