// src/components/AdminPage.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';

const AdminPage = () => {
  const navigate = useNavigate();

  const features = [
    { name: 'opinion', title: 'Opinion' },
    { name: 'search', title: 'Search' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      <h1 className="text-4xl font-bold text-gray-700 mb-8">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        {features.map((feature) => (
          <div
            key={feature.name}
            className="bg-white shadow-lg rounded-lg p-6 cursor-pointer hover:bg-gray-200 transition"
            onClick={() => navigate(`/feature/${feature.name}`)}
          >
            <h2 className="text-2xl font-semibold text-gray-700">{feature.title}</h2>
            <p className="text-gray-500 mt-2">View and manage {feature.title} related data.</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPage;
