// ChatPage.jsx

import React, { useEffect, useState } from 'react';
import ChatWindow from './ChatWindow';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import { Transition } from '@headlessui/react'; // For smooth transitions
import { MenuIcon, XIcon } from '@heroicons/react/outline'; // Icons for menu

const ChatPage = () => {
    const [files, setFiles] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [showChatWindow, setShowChatWindow] = useState(false);
    const [isCaseOverlayOpen, setIsCaseOverlayOpen] = useState(false);
    const [overlayContent, setOverlayContent] = useState('');
    const [isDocumentCollapsed, setIsDocumentCollapsed] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false); // New state for mobile sidebar

    // States for Chat Histories
    const [chatHistories, setChatHistories] = useState([]);
    const [activeChat, setActiveChat] = useState(null); // { title, messages }

    useEffect(() => {
        const fetchInitialData = async () => {
            const storedData = JSON.parse(sessionStorage.getItem("caseFormData")) || {};
            const uploadedFiles = storedData.document || [];
            setFiles(uploadedFiles);
            setShowChatWindow(true);

            // Fetch Chat Histories from Backend
            try {
                const response = await axios.get('https://legalai-backend.onrender.com/api/get_chat_histories', { withCredentials: true });
                if (response.data.chat_histories) {
                    setChatHistories(response.data.chat_histories);
                }
            } catch (error) {
                console.error("Error fetching chat histories:", error.message);
                toast.error("Error fetching chat histories.");
            }
        };

        fetchInitialData();
    }, []);

    const handleFileUpload = (event) => {
        const uploadedFiles = Array.from(event.target.files);
        const updatedFiles = uploadedFiles.map(file => ({
            name: file.name,
            type: file.type,
            data: btoa(String.fromCharCode(...new Uint8Array(file))) // Corrected base64 encoding
        }));
        setFiles(prevFiles => [...prevFiles, ...updatedFiles]);

        // Save to session storage
        sessionStorage.setItem("caseFormData", JSON.stringify({ document: [...files, ...updatedFiles] }));
    };

    const handleOpenFile = (file) => {
        const byteCharacters = atob(file.data);
        const byteNumbers = new Array(byteCharacters.length).fill(null).map((_, i) => byteCharacters.charCodeAt(i));
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: file.type });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
    };

    const openCaseOverlay = (content) => {
        setIsDocumentCollapsed(false);
        const textContent = typeof content === 'string' ? content : content?.content || JSON.stringify(content);
        toggleMobileSidebar();
        setOverlayContent(textContent);
        setIsCaseOverlayOpen(true);
    };

    const closeCaseOverlay = () => {
        setIsCaseOverlayOpen(false);
        setOverlayContent('');
    };

    const toggleDocumentCollapse = () => {
        setIsDocumentCollapsed(!isDocumentCollapsed);
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedFiles(files.map(file => file.name));
        } else {
            setSelectedFiles([]);
        }
    };

    const handleCheckboxChange = (fileName) => {
        setSelectedFiles(prevSelected =>
            prevSelected.includes(fileName)
                ? prevSelected.filter(name => name !== fileName)
                : [...prevSelected, fileName]
        );
    };

    const isAllSelected = files.length > 0 && selectedFiles.length === files.length;

    // Function to Load Selected Chat History
    const loadChatHistory = (history) => {
        setActiveChat(history);
        setShowChatWindow(true);
    };

    // Function to toggle mobile sidebar
    const toggleMobileSidebar = () => {
        setIsMobileSidebarOpen(!isMobileSidebarOpen);
        setIsCaseOverlayOpen(false);
    };

    // Close mobile sidebar on pressing Esc
    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                setIsMobileSidebarOpen(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, []);

    return (
        <div className="flex flex-col h-screen w-screen">
            <ToastContainer />
            
            {/* Top Navigation Bar for Mobile */}
            <div className="md:hidden bg-[#EFF3F6] p-4 flex items-center justify-between">
                <div className="flex items-center">
                    <img src="assets/img/logo.svg" alt="App Logo" className="h-10 w-10 mr-2" />
                    <h1 className="text-lg font-bold text-[#26262A]">Banthry AI</h1>
                </div>
                <button onClick={toggleMobileSidebar} className="text-gray-700 focus:outline-none">
                    {isMobileSidebarOpen ? (
                        <XIcon className="h-6 w-6" />
                    ) : (
                        <MenuIcon className="h-6 w-6" />
                    )}
                </button>
            </div>

            <div className="flex flex-1  overflow-hidden">
                {/* Sidebar for Desktop */}
                <div className={`hidden md:block transition-all duration-300 ${
                    isDocumentCollapsed
                        ? 'w-1/12'
                        : isCaseOverlayOpen
                            ? 'w-1/2'
                            : 'w-1/4'
                } bg-[#EFF3F6] p-4 rounded-2xl my-4 mx-2 overflow-y-auto flex-shrink-0`}>
                    <button onClick={toggleDocumentCollapse} className="text-gray-500 hover:text-gray-700 mb-4 focus:outline-none">
                        {isDocumentCollapsed ? <span>➡️ Expand</span> : <span>⬅️ Collapse</span>}
                    </button>
                    {!isDocumentCollapsed && (
                        <>
                            {!isCaseOverlayOpen ? (
                                <div className=''>
                                    <div className="flex items-center justify-center text-white p-4">
                                        <img src="assets/img/logo.svg" alt="App Logo" className="h-14 w-14 mr-4" />
                                        <h1 className="text-xl font-bold text-[#26262A]">Banthry AI</h1>
                                    </div>

                                    {/* Upload Button */}
                                    <div className="flex justify-center items-center py-4">
                                        <label
                                            htmlFor="file-upload"
                                            className="w-full flex items-center px-4 py-2 bg-white text-gray-700 rounded-xl border border-gray-300 shadow-sm cursor-pointer transition duration-200 hover:shadow-md"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth="1.5"
                                                stroke="currentColor"
                                                className="w-5 h-5 mr-2"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M3 16.5v1.75A2.75 2.75 0 005.75 21h12.5A2.75 2.75 0 0021 18.25V16.5M12 12V3m-4.5 4.5L12 3l4.5 4.5"
                                                />
                                            </svg>
                                            Upload new document
                                        </label>
                                        <input
                                            id="file-upload"
                                            type="file"
                                            multiple
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                    </div>

                                    {/* Select All Checkbox */}
                                    <h2 className="text-xl font-bold mb-4 text-[#26262A] text-center">Your Documents</h2>
                                    <div className="flex justify-end items-center mt-4">
                                        <input
                                            type="checkbox"
                                            checked={isAllSelected}
                                            onChange={handleSelectAll}
                                            className="mr-2 w-6 h-6"
                                        />
                                        <span className="text-gray-700 font-medium">Select All</span>
                                    </div>

                                    {files.length > 0 ? (
                                        <ul className="space-y-4 mt-4">
                                            {files.map((file, index) => (
                                                <li
                                                    key={index}
                                                    className="flex items-center p-4 bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out cursor-pointer"
                                                    onClick={() => handleOpenFile(file)}
                                                >
                                                    <div className="mr-4 text-blue-500">
                                                        <img src="https://cdn-icons-png.flaticon.com/512/2258/2258853.png" className="w-6 h-6" alt="Document Icon" />
                                                    </div>
                                                    <span className="text-gray-700 font-normal truncate max-w-xs" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {file.name}
                                                    </span>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedFiles.includes(file.name)}
                                                        onChange={() => handleCheckboxChange(file.name)}
                                                        className="ml-auto w-6 h-6"
                                                        onClick={(e) => e.stopPropagation()} // Prevent triggering handleOpenFile
                                                    />
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-gray-500 text-center mt-6">No files available</p>
                                    )}

                                    {/* Chat Histories Section */}
                                    <div className="mt-8">
                                        <h2 className="text-xl font-bold mb-4 text-[#26262A] text-center">Chat Histories</h2>
                                        {chatHistories.length > 0 ? (
                                            <ul className="space-y-4">
                                                {chatHistories.map(history => (
                                                    <li
                                                        key={history.id}
                                                        className="flex items-center p-4 bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out cursor-pointer"
                                                        onClick={() => loadChatHistory(history)}
                                                    >
                                                        <div className="mr-4 text-blue-500">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10m-5 4v6m-1-6h.01" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-700 font-semibold">{history.title}</span>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-gray-500 text-center">No chat histories available</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full">
                                    <button onClick={() => setIsCaseOverlayOpen(false)} className="float-right text-gray-500 text-lg font-semibold">&times;</button>
                                    <h3 className="text-lg font-bold mb-4">Case Details</h3>
                                    <p className="text-gray-800 whitespace-pre-line" dangerouslySetInnerHTML={{ __html: overlayContent }}></p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Mobile Sidebar Overlay */}
                <Transition show={isMobileSidebarOpen} as={React.Fragment}>
                    <div className="md:hidden">
                        <Transition.Child
                            as={React.Fragment}
                            enter="transition-opacity ease-linear duration-300"
                            enterFrom="opacity-0"
                            enterTo="opacity-100"
                            leave="transition-opacity ease-linear duration-300"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <div className="fixed inset-0 bg-black bg-opacity-50 z-30" onClick={toggleMobileSidebar}></div>
                        </Transition.Child>

                        <Transition.Child
                            as={React.Fragment}
                            enter="transition-transform ease-in-out duration-300"
                            enterFrom="-translate-x-full"
                            enterTo="translate-x-0"
                            leave="transition-transform ease-in-out duration-300"
                            leaveFrom="translate-x-0"
                            leaveTo="-translate-x-full"
                        >
                            <div className={`fixed inset-y-0 left-0 w-3/4 bg-[#EFF3F6] p-4 rounded-tr-2xl rounded-br-2xl z-40 overflow-y-auto`}>
                                <button onClick={toggleMobileSidebar} className="text-gray-500 hover:text-gray-700 mb-4 focus:outline-none">
                                    <XIcon className="h-6 w-6" />
                                </button>
                                {!isDocumentCollapsed && (
                                    <>
                                        {!isCaseOverlayOpen ? (
                                            <div>
                                                <div className="flex items-center justify-center text-white p-4">
                                                    <img src="assets/img/logo.svg" alt="App Logo" className="h-14 w-14 mr-4" />
                                                    <h1 className="text-xl font-bold text-[#26262A]">Banthry AI</h1>
                                                </div>

                                                {/* Upload Button */}
                                                <div className="flex justify-center items-center py-4">
                                                    <label
                                                        htmlFor="file-upload-mobile"
                                                        className="w-full flex items-center px-4 py-2 bg-white text-gray-700 rounded-xl border border-gray-300 shadow-sm cursor-pointer transition duration-200 hover:shadow-md"
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            strokeWidth="1.5"
                                                            stroke="currentColor"
                                                            className="w-5 h-5 mr-2"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                d="M3 16.5v1.75A2.75 2.75 0 005.75 21h12.5A2.75 2.75 0 0021 18.25V16.5M12 12V3m-4.5 4.5L12 3l4.5 4.5"
                                                            />
                                                        </svg>
                                                        Upload new document
                                                    </label>
                                                    <input
                                                        id="file-upload-mobile"
                                                        type="file"
                                                        multiple
                                                        onChange={handleFileUpload}
                                                        className="hidden"
                                                    />
                                                </div>

                                                {/* Select All Checkbox */}
                                                <h2 className="text-xl font-bold mb-4 text-[#26262A] text-center">Your Documents</h2>
                                                <div className="flex justify-end items-center mt-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={isAllSelected}
                                                        onChange={handleSelectAll}
                                                        className="mr-2 w-6 h-6"
                                                    />
                                                    <span className="text-gray-700 font-medium">Select All</span>
                                                </div>

                                                {files.length > 0 ? (
                                                    <ul className="space-y-4 mt-4">
                                                        {files.map((file, index) => (
                                                            <li
                                                                key={index}
                                                                className="flex items-center p-4 bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out cursor-pointer"
                                                                onClick={() => handleOpenFile(file)}
                                                            >
                                                                <div className="mr-4 text-blue-500">
                                                                    <img src="https://cdn-icons-png.flaticon.com/512/2258/2258853.png" className="w-6 h-6" alt="Document Icon" />
                                                                </div>
                                                                <span className="text-gray-700 font-normal truncate max-w-xs" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {file.name}
                                                                </span>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedFiles.includes(file.name)}
                                                                    onChange={() => handleCheckboxChange(file.name)}
                                                                    className="ml-auto w-6 h-6"
                                                                    onClick={(e) => e.stopPropagation()} // Prevent triggering handleOpenFile
                                                                />
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-gray-500 text-center mt-6">No files available</p>
                                                )}

                                                {/* Chat Histories Section */}
                                                <div className="mt-8">
                                                    <h2 className="text-xl font-bold mb-4 text-[#26262A] text-center">Chat Histories</h2>
                                                    {chatHistories.length > 0 ? (
                                                        <ul className="space-y-4">
                                                            {chatHistories.map(history => (
                                                                <li
                                                                    key={history.id}
                                                                    className="flex items-center p-4 bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out cursor-pointer"
                                                                    onClick={() => {
                                                                        loadChatHistory(history);
                                                                        toggleMobileSidebar(); // Close sidebar after selecting
                                                                    }}
                                                                >
                                                                    <div className="mr-4 text-blue-500">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10m-5 4v6m-1-6h.01" />
                                                                        </svg>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-700 font-semibold">{history.title}</span>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-gray-500 text-center">No chat histories available</p>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-full overflow-y-auto"> {/* Added overflow-y-auto here */}

                                            <h3 className="text-lg font-bold mb-4">Case Details</h3>
                                            <p
                                                className="text-gray-800 whitespace-pre-line"
                                                dangerouslySetInnerHTML={{ __html: overlayContent }}
                                            ></p>
                                        </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </Transition.Child>
                    </div>
                </Transition>

                {/* Main Content */}
                <div className={`flex-1 h-full transition-all duration-300 p-4 flex flex-col justify-center items-center rounded-3xl overflow-hidden`}>
                    {showChatWindow && (
                        <ChatWindow 
                            openCaseOverlay={openCaseOverlay} 
                            setIsDocumentCollapsed={toggleDocumentCollapse}
                            setActiveChat={setActiveChat} // Pass setter to ChatWindow
                            activeChat={activeChat} // Pass activeChat to ChatWindow
                        />
                    )}
                </div>
            </div>
        </div>
    );

};

export default ChatPage;
