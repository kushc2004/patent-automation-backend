import React, { useState } from 'react';
import { NavLink, useNavigate } from "react-router-dom";
import { Search, Mail, Send, Eye, Clock, Check, ExternalLink, Filter, RefreshCw } from 'lucide-react';
import StartupDashboard from './StartupDashboard';
import OutreachDashboard from './Program search and VC search Feature';

const StartupPage = () => {
  const [searchType, setSearchType] = useState('programs');
  const [emails, setEmails] = useState([
    {
      id: 1,
      vc: "John Doe",
      company: "Sequoia Capital",
      email: "john@sequoia.com",
      status: "draft",
      sentDate: null,
      lastResearch: "2024-01-28"
    }
  ]);

  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <StartupDashboard/>
    </div>
  );
};

export default StartupPage;
