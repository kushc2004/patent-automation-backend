import React, { useEffect, useState } from "react";
import axios from "axios";
import { NavLink, useNavigate } from "react-router-dom";

const Home = () => {
    const [userData, setUserData] = useState(null);
    const [text, setText] = useState(""); // For typewriter effect
    const fullText = "Banthry AI";

    const [uniqueIdentifier, setUniqueIdentifier] = useState(
            sessionStorage.getItem("uniqueIdentifier") || null
        );


    useEffect(() => {
        let index = 0;
        const typingSpeed = 200; // Time delay for typing (in milliseconds)
        const pauseTime = 1; // Pause time at the end of the animation
        const interval = setInterval(() => {
            setText((prevText) =>
                index < fullText.length ? fullText.slice(0, index + 1) : ""
            );
    
            if (index === fullText.length) {
                setTimeout(() => {
                    index = 0; // Reset index after the pause
                }, pauseTime);
            } else {
                index = (index + 1) % (fullText.length + 1);
            }
        }, typingSpeed);
    
        return () => clearInterval(interval);
    }, []);
    


    // Generalized function to fetch any file
    const fetchFile = async (filePath) => {
        try {
            const response = await axios.post(
                "https://legalai-backend-1.onrender.com/api/get_file",
                { file_path: filePath },
                {
                    headers: { "Content-Type": "application/json" },
                    responseType: "json", // Ensure JSON data is returned
                }
            );
            return response.data;
        } catch (error) {
            console.error("Error fetching file:", error);
            return null;
        }
    };

    // Fetch user_data.json on component mount
    useEffect(() => {
        const fetchUserData = async () => {
            const data = await fetchFile(`/var/data/users/${uniqueIdentifier}/user_data.json`);
            setUserData(data);
        };
        fetchUserData();
    }, []);

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Top Bar */}
            <div className="flex justify-between items-center bg-white shadow-md p-4">
                <h1 className="text-2xl font-bold text-gray-800">{text}</h1>
                {userData ? (
                    <img
                        src={userData.picture}
                        alt="Profile"
                        className="w-10 h-10 rounded-full"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 animate-pulse"></div>
                )}
            </div>

            {/* Main Layout */}
            <div className="flex flex-1">
                {/* Sidebar */}
                <Sidebar />

                {/* Page Content */}
                <div className="flex flex-col flex-1 p-6">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">
                        Welcome to Bantry AI
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <Card
                            title="Get Opinion"
                            points={[
                                "Reduce research, review, and drafting time by 80%",
                                "Generates legal opinions with comprehensive insights for case analysis",
                                "Identifies precedents, statutes, and enables interactive chat with opinions",
                                "Edit option to incorporate your own insights into the opinion",
                            ]}
                            path="/get-opinion-form"
                        />
                        <Card
                            title="Search"
                            description="Perform document searches quickly."
                            path="/search"
                        />
                        <Card
                            title="Redact"
                            description="Redact sensitive information securely."
                            path="/redact"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};


const Sidebar = () => {
    const [collapsed, setCollapsed] = useState(true); // Sidebar is collapsed by default

    const menuItems = [
        { name: "Home", path: "/home", icon: "🏠" },
        { name: "Get Opinion", path: "/get-opinion-form", icon: "📝" },
        { name: "Search", path: "/search", icon: "🔍" },
        { name: "Redact", path: "/redact", icon: "✂️" },
    ];

    return (
        <div
            className={`bg-white shadow-md p-4 ${
                collapsed ? "w-16" : "w-64"
            } transition-all duration-300`}
        >
            {/* Toggle Button */}
            <button
                className="text-gray-700 mb-4 focus:outline-none"
                onClick={() => setCollapsed(!collapsed)}
            >
                {collapsed ? "➡️" : "⬅️"} {/* Toggle icons */}
            </button>

            {/* Menu Items */}
            <ul className="space-y-4">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center text-gray-700 hover:text-blue-500 ${
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



const Card = ({ title, description = [], points = [], path }) => {
    const navigate = useNavigate(); // Get the navigate function

    return (
        <div className="bg-white shadow-lg rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
            <p className="text-sm text-gray-600 mb-4">{description}</p>
            {points.length > 0 && (
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                    {points.map((point, index) => (
                        <li key={index}>{point}</li>
                    ))}
                </ul>
            )}
            <button
                className="mt-4 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-blue-600"
                onClick={() => navigate(path)} // Navigate on button click
            >
                Learn More
            </button>
        </div>
    );
};



export default Home;
