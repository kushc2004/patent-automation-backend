
// alert.jsx
import React from "react";

const Alert = ({ variant = "default",className="", children, ...props }) => {
    const variantStyles = {
      default: "bg-gray-100 text-gray-900",
      destructive: "bg-red-100 text-red-900",
    };
  
    return (
      <div
        role="alert"
        className={`relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:translate-y-[-3px] [&:has(svg)]:pl-11 ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  };
  
  const AlertDescription = ({ children, className="", ...props }) => {
    return (
      <div
        className={`text-sm [&_p]:leading-relaxed ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  };

export {
  Alert,
  AlertDescription,
};