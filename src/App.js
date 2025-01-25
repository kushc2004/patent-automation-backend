// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import ChatPage from './pages/chat/ChatPage';
import CaseForm from './pages/CaseForm';
import ChatLoginPage from './pages/chat/ChatLoginPage';
import SelectPage from './pages/SelectPage';
import LoginPage from './pages/LoginPage'
import Home from './pages/Home'
import GetOpinion from './pages/opinion/GetOpinion'
import GetOpinionForm from './pages/opinion/GetOpinionForm'
import SearchPage from './pages/search/SearchPage'
import RedactTool from './pages/redact/RedactTool'
import PatentPage from './pages/patent/PatentPage'
import DraftPage from './pages/patent/DraftPage';
import AdminPage from './pages/admin/AdminPage';
import FeatureView from './pages/admin/FeatureView';


function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (name, phone) => {
    // Logic to handle login (you can add validation here)
    setUser({ name, phone });
  };

  return (
    <Router>
  <Routes>
    <Route path="/" element={<LoginPage />} />
    <Route path="/home" element={<Home />} />
    <Route path="/get-opinion-form" element={<GetOpinionForm />} />
    <Route path="/get-opinion" element={<GetOpinion />} />
    <Route path="/search" element={<SearchPage />} />
    <Route path="/redact" element={<RedactTool />} />
    <Route path="/patent" element={<PatentPage />} />
    <Route path="/draft" element={<DraftPage />} />
    <Route path="/chat-form" element={<CaseForm />} />
    <Route path="/chat" element={<ChatPage />} />
    <Route path="/select" element={<SelectPage />} />
    <Route path="/admin" element={<AdminPage />} />
    <Route path="/feature/:feature" element={<FeatureView />} />
    <Route path="*" element={<Navigate to="/" />} />
  </Routes>
</Router>

  );
}

export default App;
