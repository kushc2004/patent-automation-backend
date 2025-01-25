import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import ChatHistory from './ChatHistory';
import { toast } from 'react-toastify';

const FeatureView = () => {
    const { feature } = useParams();
    const [uniqueIdentifier] = useState(
      sessionStorage.getItem("uniqueIdentifier") || "defaultUser"
    );
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [chatHistories, setChatHistories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingChatHistories, setLoadingChatHistories] = useState(false); // New state for chat histories loading
    const hasFetchedData = useRef(false);
  
    const allowedIdentifiers = [
      "110076670715218464191",
      "105155585129049510954",
    ];
  
    // Function to fetch folder contents (unchanged)
    async function fetchFolderContents(folderPath) {
      try {
        const response = await fetch(
          "https://legalai-backend-1.onrender.com/api/list_files",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              folder_path: folderPath,
            }),
          }
        );
  
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Error fetching folder contents:", errorData.error);
          toast.error("Error fetching folder contents.");
          return null;
        }
  
        const data = await response.json();
        return data.folder_contents;
      } catch (error) {
        console.error("Error making request:", error);
        toast.error("Error fetching folder contents.");
        return null;
      }
    }
  
    // Function to fetch users with feature (unchanged)
    const fetchUsersWithFeature = async () => {
      setLoading(true);
  
      try {
        if (hasFetchedData.current) return;
  
        const folderContents = await fetchFolderContents("/var/data/users");
  
        if (!folderContents) {
          setLoading(false);
          return;
        }
  
        const usersList = [];
  
        for (const item of folderContents) {
          if (item.root.startsWith("/var/data/users/")) {
            const userFolder = item.root.split("/var/data/users/")[1];
  
            if (item.folders.includes(feature)) {
              const featureFolderPath = `/var/data/users/${userFolder}/${feature}`;
              const featureData = folderContents.find(
                (entry) => entry.root === featureFolderPath
              );
  
              if (featureData && featureData.files.includes("chat_history.json")) {
                const userDataPath = `/var/data/users/${userFolder}/user_data.json`;
  
                const userDataResponse = await axios.post(
                  "https://legalai-backend-1.onrender.com/api/get_file",
                  { file_path: userDataPath },
                  { withCredentials: true }
                );
  
                const userData = userDataResponse.data;
  
                usersList.push({
                  uniqueIdentifier: userFolder,
                  logo: userData.picture || "/default-user.png",
                  name: userData.name || "Unknown User",
                  email: userData.email || "Unknown Email",
                });
              }
            }
          }
        }
  
        setUsers(usersList);
        hasFetchedData.current = true;
      } catch (error) {
        console.error("Error fetching users:", error.message);
        toast.error("Error fetching users.");
      } finally {
        setLoading(false);
      }
    };
  
    const handleUserClick = async (user) => {
      setSelectedUser(user);
      setLoadingChatHistories(true); // Start loading
      try {
        const response = await axios.post(
          "https://legalai-backend-1.onrender.com/api/get_chat_histories",
          {
            file_path: `/var/data/users/${user.uniqueIdentifier}/${feature}/chat_history.json`,
          },
          { withCredentials: true }
        );
        if (response.data.chat_histories) {
          setChatHistories(response.data.chat_histories);
        }
      } catch (error) {
        console.error("Error fetching chat histories:", error.message);
        toast.error("Error fetching chat histories.");
      } finally {
        setLoadingChatHistories(false); // Stop loading
      }
    };
  
    useEffect(() => {
      if (allowedIdentifiers.includes(uniqueIdentifier)) {
        fetchUsersWithFeature();
      }
    }, [uniqueIdentifier, feature]);
  
    if (!allowedIdentifiers.includes(uniqueIdentifier)) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-700">Access Denied</h1>
            <p className="text-gray-600 mt-2">
              You do not have permission to view this feature.
            </p>
          </div>
        </div>
      );
    }
  
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <h2 className="text-3xl font-semibold text-gray-700 mb-6 capitalize">
          User's Activity List: {feature}
        </h2>
  
        {selectedUser ? (
          loadingChatHistories ? ( // Show loader while chat histories are being loaded
            <div className="flex justify-center items-center">
              <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-700 h-12 w-12"></div>
            </div>
          ) : (
            <ChatHistory
              chatHistories={chatHistories}
              onBack={() => setSelectedUser(null)} // Return to user list
            />
          )
        ) : (
          <>
            {loading ? (
              <div className="flex justify-center items-center">
                <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-700 h-12 w-12"></div>
              </div>
            ) : users.length === 0 ? (
              <p className="text-gray-600">
                No users have utilized the "{feature}" feature.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
                  <thead>
                    <tr>
                      <th className="py-3 px-6 bg-gray-700 text-white text-left text-sm uppercase font-semibold">
                        User Logo
                      </th>
                      <th className="py-3 px-6 bg-gray-700 text-white text-left text-sm uppercase font-semibold">
                        User Name
                      </th>
                      <th className="py-3 px-6 bg-gray-700 text-white text-left text-sm uppercase font-semibold">
                        User Email
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.uniqueIdentifier}
                        className="cursor-pointer hover:bg-gray-200"
                        onClick={() => handleUserClick(user)}
                      >
                        <td className="py-4 px-6">
                          <img
                            src={user.logo}
                            alt={user.name}
                            className="w-10 h-10 rounded-full"
                          />
                        </td>
                        <td className="py-4 px-6 text-gray-700">{user.name}</td>
                        <td className="py-4 px-6 text-gray-700">{user.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    );
  };
  
export default FeatureView;