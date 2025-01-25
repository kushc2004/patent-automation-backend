// src/components/Message.jsx

import React from 'react';

const Message = ({ message, sender, onReferenceClick }) => {
  const handleReferenceClick = (e) => {
    const ref = e.target.getAttribute('data-ref-code') || e.target.getAttribute('data-ref-case');
    if (ref) {
      onReferenceClick(ref);
    }
  };

  return (
    <div className={`flex ${sender === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-lg p-3 rounded-lg ${sender === 'user' ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900'}`}>
        <span
          dangerouslySetInnerHTML={{ __html: message }}
          onClick={handleReferenceClick}
          className="cursor-pointer"
        />
      </div>
    </div>
  );
};

export default Message;
