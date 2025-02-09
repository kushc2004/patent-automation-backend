// card.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";


// tabs.jsx
const Tabs = ({ value, onValueChange, className="", children, ...props }) => {
  return (
    <div className={`w-full ${className}`} {...props}>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { value, onValueChange })
      )}
    </div>
  );
};

const TabsList = ({children, className="", ...props }) => {
  return (
    <div 
      className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

const TabsTrigger = ({ value, children, className="", ...props }) => {
  const isSelected = props.selected === value;
  
  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
        ${isSelected ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'} 
        ${className}`}
      onClick={() => props.onValueChange?.(value)}
      {...props}
    >
      {children}
    </button>
  );
};

const TabsContent = ({ value, className="",tabValue="", onClickNavigate="", children, ...props }) => {
  //if (value !== tabValue) return null;
  
  return (
    <div
      className={`mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};


export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
};