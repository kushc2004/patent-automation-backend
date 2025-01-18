import React, { useState } from "react";
import { NavLink } from "react-router-dom";

const Sidebar = () => {
    const [collapsed, setCollapsed] = useState(false); // Sidebar starts expanded

    const menuItems = [
        { name: "Home", path: "/", icon: "🏠" },
        { name: "Get Opinion", path: "/get-opinion", icon: "📝" },
        { name: "Search", path: "/search", icon: "🔍" },
        { name: "Redact", path: "/redact", icon: "✂️" },
    ];

    return (
        <div
            className={`flex flex-col bg-white shadow-md h-screen transition-all duration-300 ${
                collapsed ? "w-16" : "w-64"
            }`}
        >
            {/* Toggle Button */}
            <button
                className="text-gray-700 p-4 focus:outline-none"
                onClick={() => setCollapsed(!collapsed)}
            >
                {collapsed ? "➡️" : "⬅️"} {/* Toggle icon */}
            </button>

            {/* Menu Items */}
            <ul className="flex flex-col space-y-4 px-2">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center p-2 text-gray-700 hover:text-blue-500 ${
                                isActive ? "font-bold text-blue-500" : ""
                            }`
                        }
                    >
                        <span className="mr-2">{item.icon}</span> {/* Icon */}
                        {!collapsed && <span>{item.name}</span>} {/* Text hidden when collapsed */}
                    </NavLink>
                ))}
            </ul>
        </div>
    );
};

export default Sidebar;
