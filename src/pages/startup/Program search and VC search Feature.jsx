import React, { useState } from 'react';
import { Search, Mail, Send, Eye, Clock, Check, ExternalLink, Filter, RefreshCw } from 'lucide-react';

const OutreachDashboard = () => {
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

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex space-x-4 mb-6">
          <button 
            className={`px-4 py-2 rounded-lg ${
              searchType === 'programs' ? 'bg-blue-600 text-white' : 'bg-gray-100'
            }`}
            onClick={() => setSearchType('programs')}
          >
            Program Search
          </button>
          <button 
            className={`px-4 py-2 rounded-lg ${
              searchType === 'vc' ? 'bg-blue-600 text-white' : 'bg-gray-100'
            }`}
            onClick={() => setSearchType('vc')}
          >
            VC Research
          </button>
        </div>

        {searchType === 'programs' && (
          <div>
            <div className="flex space-x-4">
              <input 
                type="text"
                placeholder="Search accelerators, incubators..."
                className="flex-1 p-2 border rounded-lg"
              />
              <button className="p-2 bg-blue-600 text-white rounded-lg">
                <Search size={20} />
              </button>
            </div>
            
            <div className="mt-4 flex space-x-2">
              <button className="flex items-center px-3 py-1 border rounded-lg text-sm">
                <Filter size={14} className="mr-1" />
                Location
              </button>
              <button className="flex items-center px-3 py-1 border rounded-lg text-sm">
                Stage
              </button>
              <button className="flex items-center px-3 py-1 border rounded-lg text-sm">
                Industry
              </button>
            </div>
          </div>
        )}

        {searchType === 'vc' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input 
                type="text"
                placeholder="VC Name"
                className="p-2 border rounded-lg"
              />
              <input 
                type="email"
                placeholder="Email Address"
                className="p-2 border rounded-lg"
              />
            </div>
            <button className="w-full p-2 bg-blue-600 text-white rounded-lg flex items-center justify-center">
              <RefreshCw size={16} className="mr-2" />
              Research & Draft Email
            </button>
          </div>
        )}
      </div>

      {/* Email Management */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Mail className="mr-2" />
          VC Outreach
        </h3>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left">VC</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Research Date</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {emails.map((email) => (
                <tr key={email.id} className="border-b">
                  <td className="px-4 py-3">{email.vc}</td>
                  <td className="px-4 py-3">{email.company}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center">
                      {email.status === 'draft' ? (
                        <Clock size={14} className="mr-1 text-yellow-500" />
                      ) : (
                        <Check size={14} className="mr-1 text-green-500" />
                      )}
                      {email.status.charAt(0).toUpperCase() + email.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">{email.lastResearch}</td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Eye size={16} />
                      </button>
                      <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                        <Send size={16} />
                      </button>
                      <button className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg">
                        <ExternalLink size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OutreachDashboard;
