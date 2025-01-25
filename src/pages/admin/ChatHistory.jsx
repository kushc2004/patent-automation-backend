import React, { useRef, useEffect } from "react";
import Message from "./Message";
import { toast } from "react-toastify";

const ChatHistory = ({ chatHistories, onBack }) => {
  const [activeChat, setActiveChat] = React.useState(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [activeChat]);

  const handleChatClick = (chat) => {
    setActiveChat(chat);
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
            className="overflow-y-auto max-h-96 p-4 border rounded-lg"
            ref={chatContainerRef}
          >
            {activeChat.messages.map((msg, index) => (
              <Message
                key={index}
                message={msg.text}
                sender={msg.sender}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHistory;
