import React, { useRef, useEffect, useState } from "react";
import Message from "./Message";
import { toast } from "react-toastify";
import axios from "axios";

const ChatHistory = ({ chatHistories, onBack, uniqueIdentifier }) => {
  const [activeChat, setActiveChat] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [activeChat]);

  const handleChatClick = async (chat) => {
    setActiveChat(chat);

    // Extract and fetch uploaded files from the first message
    const firstMessage = chat.messages[0]?.text || "";
    if (firstMessage.includes("<b>Uploaded Files:</b>")) {
      try {
        // Extract file names from the "Uploaded Files" section


        const fileNames = firstMessage
          .match(/<ul>(.*?)<\/ul>/)?.[1] // Extract the contents of <ul>
          .split("</li>") // Split by list items
          .filter((item) => item.trim() !== "") // Remove empty items
          .map((item) => item.replace(/<li>/g, "").trim()); // Remove <li> tags and trim spaces

        // Fetch each file using the backend API
        const filePromises = fileNames.map(async (fileName) => {
          const filePath = `/var/data/users/${uniqueIdentifier}/opinion/${fileName}`;
          console.log(filePath);
          const response = await axios.post(
            "https://legalai-backend-1.onrender.com/api/get_file",
            { file_path: filePath },
            {
              headers: { "Content-Type": "application/json" },
              responseType: "json",
            }
          );
          return { name: fileName, data: response.data };
        });

        const files = await Promise.all(filePromises);
        setUploadedFiles(files);
      } catch (error) {
        console.error("Error fetching uploaded files:", error.message);
        toast.error("Error fetching uploaded files.");
      }
    } else {
      setUploadedFiles([]);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg">
      {!activeChat ? (
        <div>
          <button
            onClick={onBack}
            className="mb-4 px-4 py-2 bg-gray-700 hover:bg-gray-400 rounded text-gray-50"
          >
            Back to Users
          </button>
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Chat History</h3>
          {chatHistories.length === 0 ? (
            <p className="text-gray-600">No chats available.</p>
          ) : (
            <ul className="space-y-3">
              {chatHistories.map((chat) => (
                <li
                  key={chat.id}
                  className="p-4 border rounded hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleChatClick(chat)}
                >
                  <h4 className="text-lg font-medium text-gray-700">{chat.title}</h4>
                  <p className="text-sm text-gray-500">
                    Last Updated: {new Date(chat.timestamp).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div>
          <button
            onClick={() => setActiveChat(null)}
            className="mb-4 px-4 py-2 bg-gray-700 hover:bg-gray-400 rounded text-gray-50"
          >
            Back to Chats
          </button>
          <h3 className="text-xl font-semibold text-gray-700 mb-4">
            {activeChat.title}
          </h3>
          <div
            className="overflow-y-auto max-h-[70vh] p-4 border rounded-lg"
            ref={chatContainerRef}
          >

            {uploadedFiles.length > 0 && (
                          <div className="mt-6">
                            <h4 className="text-lg font-semibold text-gray-700 mb-2">Uploaded Files:</h4>
                            <ul className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <li
                  key={index}
                  className="text-blue-500 underline cursor-pointer"
                  onClick={async () => {
                    try {
                      const filePath = `/var/data/users/${uniqueIdentifier}/opinion/${file.name}`;
                      const response = await axios.post(
                        "https://legalai-backend-1.onrender.com/api/get_file",
                        { file_path: filePath },
                        {
                          headers: { "Content-Type": "application/json" },
                          responseType: "blob", // Ensure binary data is handled
                        }
                      );

                      const blob = new Blob([response.data], { type: response.headers['content-type'] });
                      const url = URL.createObjectURL(blob);
                      window.open(url, "_blank", "noopener,noreferrer"); // Open the file in a new tab
                    } catch (error) {
                      console.error("Error fetching the file:", error.message);
                      toast.error("Failed to open the file.");
                    }
                  }}
                >
                  {file.name}
                </li>
              ))}
            </ul>

              </div>
            )}
            {activeChat.messages.map((msg, index) => (
              <Message key={index} message={msg.text} sender={msg.sender} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHistory;