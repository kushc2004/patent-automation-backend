import React, { useEffect, useState } from "react";
import axios from "axios";
import { NavLink, useNavigate } from "react-router-dom";

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


const Home = () => {
    const [userData, setUserData] = useState(null);
    const [text, setText] = useState(""); // For typewriter effect
    const fullText = "Banthry AI";

    const [uniqueIdentifier, setUniqueIdentifier] = useState(
        sessionStorage.getItem("uniqueIdentifier") || null
    );

    const visibleCards = [
        { title: "Get Opinion", path: "/get-opinion-form", points: [
            "Reduce research, review, and drafting time by 80%",
            "Generates legal opinions with comprehensive insights for case analysis",
            "Identifies precedents, statutes, and enables interactive chat with opinions",
            "Edit option to incorporate your own insights into the opinion",
        ] },
        { title: "Search", description: "Perform document searches quickly.", path: "/search" },
        ...(uniqueIdentifier === "110076670715218464191" || uniqueIdentifier === "105155585129049510954" ? [
            { title: "Redact", description: "Redact sensitive information securely.", path: "/redact" },
            { title: "Patent", description: "Draft Patent.", path: "/patent" },
            { title: "Admin Dashboard", description: "Dashboard for Admin to see the user activities.", path: "/admin" },
            { title: "Startup Dashboard", description: "Dashboard for Startups.", path: "/startup-application" },
        ] : [])
    ];

    useEffect(() => {
        const fetchUserData = async () => {
            const data = await fetchFile(`/var/data/users/${uniqueIdentifier}/user_data.json`);
            setUserData(data);
        };
        fetchUserData();
    }, []);


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

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Top Bar */}
            <div className="flex justify-between items-center bg-white shadow-md p-4">
                <h1 className="text-2xl font-bold text-gray-800">Banthry AI</h1>
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
                <Sidebar uniqueIdentifier={uniqueIdentifier} />

                {/* Page Content */}
                <div className="flex flex-col flex-1 p-6">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">
                        Welcome to Bantry AI
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {visibleCards.map((card, index) => (
                            <Card
                                key={index}
                                title={card.title}
                                description={card.description}
                                points={card.points}
                                path={card.path}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};


const Sidebar = ({ uniqueIdentifier }) => {
    const [collapsed, setCollapsed] = useState(true); // Sidebar is collapsed by default

    const menuItems = [
        { name: "Home", path: "/home", icon: "🏠" },
        { name: "Get Opinion", path: "/get-opinion-form", icon: "📝" },
        { name: "Search", path: "/search", icon: "🔍" },
        ...(uniqueIdentifier === "110076670715218464191" ? [
            { name: "Redact", path: "/redact", icon: "✂️" },
            { name: "Patent", path: "/patent", icon: "✂️" },
        ] : [])
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

export default Home;