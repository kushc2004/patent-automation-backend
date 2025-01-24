import React from "react";

const LeftContent = ({ options, onOptionClick, selectedOption }) => {
  return (
    <div className="w-1/4 bg-gray-800 text-gray-100 rounded-lg shadow-lg px-4 py-6">
      <h2 className="text-lg font-bold mb-4 text-gray-200">Navigation</h2>
      <div className="space-y-3">
        {options.map((option, index) => (
          <div
            key={index}
            className={`p-4 rounded-md cursor-pointer transition ${
              selectedOption === option
                ? "bg-gray-600 text-white font-semibold shadow-md"
                : "hover:bg-gray-700 text-gray-300"
            }`}
            onClick={() => onOptionClick(option)}
          >
            {option}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeftContent;
