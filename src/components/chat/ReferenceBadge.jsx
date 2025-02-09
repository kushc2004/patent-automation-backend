// ReferenceBadge.js

import React from 'react';

const ReferenceBadge = ({ number, onClick }) => (
    <span
        onClick={onClick}
        className="cursor-pointer bg-blue-500 text-white font-bold rounded-full px-3 py-1 mr-1"
    >
        {number}
    </span>
);

export default ReferenceBadge;
