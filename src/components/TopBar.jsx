import React, { useEffect, useState } from "react";
import axios from "axios";

const TopBar = () => {

    const [userData, setUserData] = useState(null);
    const [text, setText] = useState("");
    const fullText = "Banthry AI";

    const [uniqueIdentifier, setUniqueIdentifier] = useState(
                sessionStorage.getItem("uniqueIdentifier") || null
            );

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

    useEffect(() => {
            const fetchUserData = async () => {
                const data = await fetchFile(`/var/data/users/${uniqueIdentifier}/user_data.json`);
                setUserData(data);
            };
            fetchUserData();
        }, []);

    return (
        <div className="flex justify-between items-center bg-white shadow-md p-2">
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
    );
}

export default TopBar;