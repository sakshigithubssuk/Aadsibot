import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Register from './components/Register'
import Chat from './components/Chat'
import Homepage from './components/Homepage.jsx'
import Login from './components/Login';
import Payment from './components/Payment';
import Profile from './components/Profile';
import ActivityHistory from './components/ActivityHistory.jsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login/>}/>
      <Route path="/payment" element={<Payment/>}/>
      <Route path="/profile"element={<Profile/>}/>
      <Route path ="/history"element={<ActivityHistory/>}/>
    </Routes>
  );
}

export default App;
