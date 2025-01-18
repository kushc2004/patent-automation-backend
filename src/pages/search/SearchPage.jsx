// ChatPage.jsx

import React, { useEffect, useState } from 'react';
import SearchChatWindow from './SearchChatWindow';
import SearchPanel from '../../components/search/SearchPanel';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import { Transition } from '@headlessui/react'; // For smooth transitions
import { MenuIcon, XIcon } from '@heroicons/react/outline'; // Icons for menu
import { useNavigate } from 'react-router-dom';

const SearchPage = () => {
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


    useEffect(() => {

        // sessionStorage.removeItem("getOpinion");
        setSelectedOption(null);

        const fetchInitialData = async () => {
            const storedData = JSON.parse(sessionStorage.getItem("caseFormData")) || {};
            const uploadedFiles = storedData.document || [];
            setFiles(uploadedFiles);
            setShowChatWindow(true);

            // Check if the selectedOption was saved and set it
            if (storedData.selectedOption) {
                setSelectedOption(storedData.selectedOption);
            } else {
                setShowChatWindow(true);
            }

            // Fetch Chat Histories from Backend
            try {
                const response = await axios.get('https://legalai-backend-1.onrender.com/api/get_chat_histories', { withCredentials: true });
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

                {/* Main Content */}
                {/* <div className={`flex-1 h-full transition-all duration-300 p-4 flex flex-col justify-center items-center rounded-3xl overflow-hidden`}>
                    {showChatWindow && (
                        <ChatWindow 
                            openCaseOverlay={openCaseOverlay} 
                            setIsDocumentCollapsed={toggleDocumentCollapse}
                            setActiveChat={setActiveChat} // Pass setter to ChatWindow
                            activeChat={activeChat} // Pass activeChat to ChatWindow
                        />
                    )}
                </div> */}

                <div className="flex-1 bg-white p-4">
                    <SearchChatWindow 
                        openCaseOverlay={openCaseOverlay} 
                        setIsDocumentCollapsed={toggleDocumentCollapse}
                        setActiveChat={setActiveChat}
                        activeChat={activeChat}
                        selectedSearchCases={selectedSearchCases}
                    />

            </div>

            </div>
        </div>
    );

};

export default SearchPage;
