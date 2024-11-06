// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import ChatPage from './pages/chat/ChatPage';
import CaseForm from './pages/CaseForm';
import ChatLoginPage from './pages/chat/ChatLoginPage';

function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (name, phone) => {
    // Logic to handle login (you can add validation here)
    setUser({ name, phone });
  };

  return (
    <Router>
  <Routes>
    <Route path="/" element={<ChatLoginPage />} />
    <Route path="/chat-form" element={<CaseForm />} />
    <Route path="/chat" element={<ChatPage />} />
    <Route path="*" element={<Navigate to="/" />} />
  </Routes>
</Router>

  );
}

export default App;
