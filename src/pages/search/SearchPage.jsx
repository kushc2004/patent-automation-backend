// ChatPage.jsx

import React, { useEffect, useState } from 'react';
import SearchChatWindow from './SearchChatWindow';
import SearchPanel from '../../components/search/SearchPanel'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import { MenuIcon, XIcon } from '@heroicons/react/outline'; // Icons for menu
import { useNavigate } from 'react-router-dom';

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
    const [selectedOption, setSelectedOption] = useState(null);
    const [selectedSearchCases, setSelectedSearchCases] = useState([]);
    const navigate = useNavigate();

    const [uniqueIdentifier] = useState(
        sessionStorage.getItem("uniqueIdentifier") || "defaultUser"
      );



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
                
                {/* Left Side */}
            <div className={`${
                    isDocumentCollapsed
                        ? 'w-1/12'
                        : isCaseOverlayOpen
                            ? 'w-1/2'
                            : 'w-1/4'
                } bg-gray-100 p-4 overflow-y-auto`}>

                    <div>
                        <SearchPanel
                            openCaseOverlay={openCaseOverlay}
                            isCaseOverlayOpen={isCaseOverlayOpen}
                            setIsCaseOverlayOpen={setIsCaseOverlayOpen}
                            setSelectedSearchCases={setSelectedSearchCases}
                            overlayContent={overlayContent}
                            setSelectedOption={setSelectedOption}
                        >
                            </SearchPanel>
                    </div>

            </div>

                <div className="flex-1 bg-white p-4">
                    <SearchChatWindow 
                        openCaseOverlay={openCaseOverlay} 
                        setIsDocumentCollapsed={toggleDocumentCollapse}
                        setActiveChat={setActiveChat}
                        activeChat={activeChat}
                        selectedSearchCases={selectedSearchCases}
                    />

                {!selectedOption && (
                    <div className="text-gray-500 text-center">
                        <p>Select an option on the left to get started.</p>
                    </div>
                )}
            </div>

            </div>
        </div>
    );

};

export default ChatPage;
