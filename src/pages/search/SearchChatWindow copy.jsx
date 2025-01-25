// SearchChatWindow.jsx

import React, { useState, useRef, useEffect } from 'react';
import Message from '../../components/chat/Message';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import DOMPurify from 'dompurify';

const { GoogleGenerativeAI } = require("@google/generative-ai");

const prompt_template = `
You are an expert in Legal Assistance and your job is to respond to queries by the user. Your name is Banthry AI, and assume yourself as an Legal Assistant. Don't provide any disclaimer or anything. You are an expert in legal assistance that's it.

Refer to the Chat History if required. The format of your answer should be extremely professional and presentable.

**IMPORTANT NOTE**
1. You should respond in simple text format. 
2. You should use <li>, <b>, <br> tags and different numbering/bullet points, indentation for formatting instead of new line character and *, ** tags.
3. You should always answer according to rules and regulations of India and should always include referencing to backup your statements.
4. **MOST IMPORTANT**: You should include the following tags in your every response whenever you are referring to anything (so that the backend can process this and create reference badges).
        FORMAT: <code:code_name:section_numbers>
        - For most acts, 'section_numbers' should be a single number.
        - **For Indian Constitution references**, 'section_numbers' can include multiple article numbers separated by commas (e.g., '14,15,16').
    
        Example: In the Criminal Penal Code Section 17 <code:crpc:17> this means it is referring to section 17 of CrPC.
        Example acts/codes: <code:hma:17> this means section 17 of Hindu Marriage Act.
        <code:dva:23> this means section 23 of Domestic Violence Act.
        <code:ipc:241> this means section 241 of India Penal Code.
        <code:indian_constitution:14,15,16> this means Articles 14, 15, and 16 of the Indian Constitution. Directly give these tags instead of mentioning article numbers and tags seperately.
    
        ** In case you want to refer to the whole Act, use section_number as 1.
5. Use the acts from following list:
    ipc for Indian Penal Code
    crpc for Criminal Penal Code
    dva for Domestic Violence Act
    hma for Hindu Marriage Act
    ida for Indian Divorce Act
    sma for Special Marriage Act
    cpc: "Code of Civil Procedure",
    bns: "Bengal Nuisance Act",
    iea: "Indian Evidence Act",
    mva: "Motor Vehicles Act",
    nia: "Negotiable Instruments Act"
    public_worship_act: Kerala Hindu Places of Public Worship (Authorisation of Entry) Act
    indian_constitution: Indian Constitution. Give referencing as 
    
        ../ and so on

6. When referring to a case you should refer as: <case_id:id>: Example: Cases like Navneet Arora vs Surender Kaur & Ors. <case_id:134312774> support the wife's right to reside in the matrimonial home
    **NOTE** The case id can be of format a number 134312774 or a code like [1981] Supp SCC 87 or [2021] 7 SCR 571. you should give this as <case_id:[2021] 7 SCR 571>.

7. If information is asked for all cases, then create different paragraphs with proper line breaks, highlighting, numbering and bullet points. It should be clearly visible and distinguishable.

8. Dont give doc link in response

Below is the user query:
{user_query}

Below is the case data:
{case_data}

Now answer the user query & ensure accurate referencing is done in every response. Read all instructions again:
`;


const client = async (prompt, history) => {
    const apiKey = "YOUR_API_KEY_HERE"; // Replace with your actual API key
    if (!apiKey) {
        throw new Error("Gemini API key is not set.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash-8b",
    });

    const generationConfig = {
        temperature: 1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: "text/plain",
    };

    const chatSession = model.startChat({
        generationConfig,
        history: history
            .filter(msg => msg.text.trim() !== "") // Filter out any messages with empty text
            .map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: msg.text
                    .split('\n')
                    .filter(part => part.trim() !== "") // Filter out empty lines within each message
                    .map(part => ({ text: part }))
            }))
    });

    console.log(history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: msg.text.split('\n').map(part => ({ text: part }))
    })));

    // console.log("prompt: ", prompt);

    const result = await chatSession.sendMessage(prompt);

    console.log(result);
    return result.response.candidates[0].content.parts[0].text;
};


const SearchChatWindow = ({ openCaseOverlay, setIsDocumentCollapsed, setActiveChat, activeChat, selectedSearchCases }) => {
    const initialHistory = [
        { text: "Hello! I am Banthry AI, <br> Here to assist your legal queries. Please enter query to search cases.", sender: 'model' }
    ];
    
    const [messages, setMessages] = useState(initialHistory);
    const [opinionDirection, setOpinionDirection] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [editReferences, setEditReferences] = useState([]);
    const [editPlaceholders, setEditPlaceholders] = useState({});
    const chatContainerRef = useRef(null);
    const [sessionData, setSessionData] = useState({});
    const [caseRef, setCaseRef] = useState([]);
    const [caseTexts, setCaseTexts] = useState({});
    const [inputMessage, setInputMessage] = useState('');
    const [fileUrls, setFileUrls] = useState({});
    const [isTyping, setIsTyping] = useState(false);
    const [showOpinionButtons, setShowOpinionButtons] = useState(true);
    const [caseCategory, setCaseCategory] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [uniqueIdentifier] = useState(
            sessionStorage.getItem("uniqueIdentifier") || "defaultUser"
          );

    useEffect(() => {
        window.addEventListener("beforeunload", () => {
            localStorage.removeItem("savedSearchFiles");
        });
    
        return () => {
            window.removeEventListener("beforeunload", () => {
                localStorage.removeItem("savedSearchFiles");
            });
        };
    }, []);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    useEffect(() => {
        const storedData = JSON.parse(sessionStorage.getItem("caseFormData")) || {};
        setSessionData(storedData);
    }, []);

    useEffect(() => {
        if (activeChat && activeChat.messages) {
            setMessages(activeChat.messages);
        } else {
            setMessages(initialHistory);
        }
    }, [activeChat]);

    // Helper function to encode HTML entities
    const encodeHtmlEntities = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };


const replacePlaceholdersWithReferences = (text, placeholderMap) => {
    let modifiedText = text;
    console.log("Text with placeholders:", modifiedText);  // Confirm placeholders in text
    console.log("Placeholder Map:", placeholderMap);        // Confirm placeholders in map

    Object.entries(placeholderMap).forEach(([placeholder, ref]) => {
        if (ref.act === 'indian_constitution') {
            // Split multiple articles if present
            const articles = ref.section.split(',').map(article => article.trim());
            const highlightedArticles = articles.map(article => 
                `<span data-ref-code="${ref.act}" data-ref-section="${article}" class="reference-badge" style="cursor:pointer;color:blue;">Article ${article}</span>`
            ).join(', ');
            // Replace the placeholder with the highlighted articles
            modifiedText = modifiedText.replace(new RegExp(placeholder, 'g'), highlightedArticles);
        } else {
            // Encode any special characters in ref.text
            const encodedRefText = encodeHtmlEntities(ref.text);

            const replacement = ref?.type === 'case'
                ? `<span data-ref-case="${ref.id}" class="reference-badge" style="cursor:pointer;color:blue;">${encodedRefText}</span>`
                : `<span data-ref-code="${ref.act}" data-ref-section="${ref.section}" class="reference-badge" style="cursor:pointer;color:blue;">${encodedRefText}</span>`;

            // Escape the placeholder text for use in a regular expression
            const escapedPlaceholder = placeholder.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

            // Create a new regular expression with the global flag to match all occurrences
            const regex = new RegExp(escapedPlaceholder, 'g');

            // Replace all instances of the placeholder with the replacement text
            modifiedText = modifiedText.replace(regex, replacement);
        }
    });

    console.log("After replacement:", modifiedText);
    return modifiedText;
};


    const saveEdit = () => {
        const updatedTextWithPlaceholders = editContent;
        const updatedText = replacePlaceholdersWithReferences(updatedTextWithPlaceholders, editPlaceholders);

        // Update the `messages` state
        setMessages((prev) => {
            const messagesCopy = [...prev];
            const lastBotIndex = messagesCopy.map(msg => msg.sender).lastIndexOf('model');
            
            if (lastBotIndex !== -1) {
                messagesCopy[lastBotIndex] = { ...messagesCopy[lastBotIndex], text: updatedText };
            }
            
            return messagesCopy;
        });

        // Update `activeChat` if necessary
        if (activeChat) {
            setActiveChat(prev => ({
                ...prev,
                messages: prev.messages.map((msg, index) => 
                    index === prev.messages.map(m => m.sender).lastIndexOf('model')
                    ? { ...msg, text: updatedText }
                    : msg
                )
            }));
        }

        // Close the edit mode and the modal
        setEditMode(false);
        setIsDocumentCollapsed(false);
        if (window.innerWidth < 768) {
            setIsEditModalOpen(false);
        }
    };

    const handleQuestionSelect = (question) => {
        setShowDropdown(false); // Close the dropdown
        setInputMessage(question); // Set the input message to the selected question
    };
    

    const fetchCodeText = async (act, section) => {
        try {
            const response = await axios.get(`https://legalai-backend-1.onrender.com/fetch-code-text/${act}/${section.split('(')[0]}`);
            return response.data.content;
        } catch (error) {
            console.error("Error fetching code text:", error);
            return `Could not retrieve text for ${act}, Section ${section}.`;
        }
    };


    const replaceTagsWithLinks = (opinionText, caseRef) => {
        const caseIds = Object.keys(caseRef);
        
        return opinionText
            .replace(/<case_id:([\w\[\]\s]+)>/g, (match, caseId) => {
                const caseIndex = caseIds.indexOf(caseId) !== -1 ? caseIds.indexOf(caseId) + 1 : '?';
                return `<span data-ref-case="${caseId}" class="reference-badge" style="cursor:pointer;color:blue;">Case ${caseIndex}</span>`;
            })
            .replace(/<code:(\w+):([\w(),\s]+)>/g, (match, act, section) => { // Allow commas for multiple sections
                if (act === 'indian_constitution') {
                    // Split the sections by comma and trim whitespace
                    const articles = section.split(',').map(article => article.trim());
                    // Create spans for each article
                    const highlightedArticles = articles.map(article => 
                        `<span data-ref-code="${act}" data-ref-section="${article}" class="reference-badge" style="cursor:pointer;color:blue;">Article ${article}</span>`
                    ).join(', ');
                    return highlightedArticles;
                } else {
                    return `<span data-ref-code="${act}" data-ref-section="${section}" class="reference-badge" style="cursor:pointer;color:blue;">${act.toUpperCase()} Section: ${section}</span>`;
                }
            });
    };
    

    // Function to Handle Reference Clicks
    const handleReferenceClick = ({ type, id, act, section }) => {
        if (type === 'case') {
            openCaseOverlay(caseTexts[id] || "Could not retrieve case text.");
        } else if (type === 'code') {
            fetchCodeText(act, section).then(content => {
                openCaseOverlay(content);
            });
        }
    };

    // Function to Handle Reference Clicks from Messages
    const onReferenceClick = ({ type, id, act, section }) => {
        handleReferenceClick({ type, id, act, section });
    };

    // sendMessage function
    const sendMessage = async (e) => {
        e.preventDefault();
        if (inputMessage.trim() === '') return;

        const newMessage = { text: inputMessage, sender: 'user' };
        setMessages((prev) => [
            ...prev,
            newMessage,
        ]);
        setInputMessage('');

        setIsTyping(true);

        if (activeChat) {
            setActiveChat((prevChat) => ({
                ...prevChat,
                messages: [...prevChat.messages, newMessage],
            }));
            setShowOpinionButtons(false);
        }

        try {

            const arrayBufferToBase64 = (buffer) => {
                let binary = '';
                const bytes = new Uint8Array(buffer);
                const len = bytes.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                return window.btoa(binary);
            };

            const filteredHistory = messages.filter(
                (msg) => msg.text !== "Hello! I am Banthry AI, <br> Here to assist your legal queries. Please enter query to search cases."
            );
            
            const prompt = prompt_template
                .replace('{user_query}', inputMessage)
                .replace('{case_data}', JSON.stringify(selectedSearchCases));
            
            const savedFiles = JSON.parse(localStorage.getItem("savedSearchFiles")) || [];
            console.log(savedFiles);
            
            const filePromises = savedFiles.map(async (file) => {
                const response = await fetch(file.url, { cache: 'no-cache' });
                const buffer = await response.arrayBuffer();
                return {
                    name: file.originalName,
                    base64: arrayBufferToBase64(buffer),
                    mimeType: file.type,
                };
            });
            
            const filesForGemini = await Promise.all(filePromises);
            
            console.log("Files being sent to Gemini client:", filesForGemini);
            
            const aiResponse = await client(prompt, filteredHistory);
            
            console.log("Gemini response:", aiResponse);
            
            
            const processedResponse = replaceTagsWithLinks(aiResponse, {});
            if (aiResponse) {
                // Sanitize the processed response
                const sanitizedResponse = DOMPurify.sanitize(processedResponse, { USE_PROFILES: { html: true } });

                const botMessage = { text: sanitizedResponse, sender: 'model' };
                setMessages((prev) => [
                    ...prev,
                    botMessage,
                ]);

                // Update activeChat if it's already set
                if (activeChat) {
                    setActiveChat((prevChat) => ({
                        ...prevChat,
                        messages: [...prevChat.messages, botMessage],
                    }));
                }
            } else {
                throw new Error("Received empty response from the model.");
            }
        } catch (error) {
            console.error("Error sending message:", error);
            toast.error("Error sending message. Please try again.");
        } finally {
            setIsTyping(false);
        }
    };


    const saveChat = async () => {
        if (!messages || messages.length === 0) {
            toast.error("No active chat to save.");
            return;
        }
    
        try {
            const response = await axios.post('https://legalai-backend-1.onrender.com/api/save_chat_history', {
                chat_history: messages,
                chat_title: activeChat?.title || `${caseCategory}: ${new Date().toLocaleString()}`,
                file_path: `/var/data/users/${uniqueIdentifier}/search/chat_history.json`
            }, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
    
            if (response.data.message) {
                toast.success("Chat history saved successfully.");
            } else {
                throw new Error(response.data.error || "Unknown error");
            }
        } catch (error) {
            console.error("Error saving chat history:", error.message);
            toast.error("Error saving chat history.");
        }
    };

    return (
        <div
            className={`flex flex-col h-full bg-[#EFF3F6] shadow-lg rounded-3xl overflow-hidden transition-all duration-300 w-full`}
            style={{
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
        >

            <ToastContainer />


            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Message Area */}
                <div className={`p-4 flex-1 overflow-y-auto transition-all duration-300`}>
                    <div className="flex flex-col space-y-4">
                        {messages.map((msg, index) => (
                            <Message
                                key={index}
                                message={msg.text}
                                sender={msg.sender}
                                onReferenceClick={onReferenceClick}
                            />
                        ))}

                        <div ref={chatContainerRef} />
                    </div>

                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-gray-50 text-gray-900 rounded-xl shadow-lg px-4 py-2 inline-block">
                                <div className="flex space-x-1">
                                    <span className="w-2 h-2 bg-gray-800 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-2 h-2 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></span>
                                    <span className="w-2 h-2 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Edit Mode Overlay for Desktop */}
                {!isEditModalOpen && editMode && (
                    <div className="hidden md:flex flex-col w-1/2 bg-white p-4 shadow-lg transition-all duration-300 overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Edit Message</h3>
                            <button
                                onClick={() => {
                                    setEditMode(false);
                                    setIsDocumentCollapsed(false);
                                }}
                                className="text-gray-600 hover:text-gray-800 ml-auto text-xl font-semibold mr-2"
                            >
                                &times;
                            </button>
                        </div>

                        <ReactQuill
                            theme="snow"
                            value={editContent}
                            onChange={setEditContent}
                            modules={{
                                toolbar: [
                                    ['bold', 'italic', 'underline', 'strike'],
                                    ['link', 'blockquote', 'code-block'],
                                    [{ 'header': 1 }, { 'header': 2 }],
                                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                    [{ 'align': [] }],
                                    ['clean']
                                ],
                            }}
                            formats={[
                                'header',
                                'bold', 'italic', 'underline', 'strike',
                                'link', 'blockquote', 'code-block',
                                'list', 'bullet', 'align'
                            ]}
                            className="relative h-3/5"
                        />
                        <button
                            onClick={saveEdit}
                            className="relative w-full m-auto px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-500 transition duration-200"
                        >
                            Save
                        </button>
                    </div>
                )}

                {/* Edit Mode Modal for Mobile */}
                {isEditModalOpen && editMode && (
                    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm md:hidden h-screen">
                        <div className="flex flex-col bg-white rounded-lg p-6 w-11/12 max-w-md overflow-y-auto max-h-[80vh]">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold">Edit Message</h3>
                                <button
                                    onClick={() => {
                                        setEditMode(false);
                                        setIsDocumentCollapsed(false);
                                        setIsEditModalOpen(false);
                                    }}
                                    className="text-gray-600 hover:text-gray-800 text-xl font-semibold"
                                >
                                    &times;
                                </button>
                            </div>

                            <ReactQuill
                                theme="snow"
                                value={editContent}
                                onChange={setEditContent}
                                modules={{
                                    toolbar: [
                                        ['bold', 'italic', 'underline', 'strike'],
                                        ['link', 'blockquote', 'code-block'],
                                        [{ 'header': 1 }, { 'header': 2 }],
                                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                        [{ 'align': [] }],
                                        ['clean']
                                    ],
                                }}
                                formats={[
                                    'header',
                                    'bold', 'italic', 'underline', 'strike',
                                    'link', 'blockquote', 'code-block',
                                    'list', 'bullet', 'align'
                                ]}
                                className="relative h-full"
                            />
                            <button
                                onClick={saveEdit}
                                className="relative m-auto mt-4 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-500 transition duration-200 w-full"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                )}

            </div>

            {/* Chat Input Area */}
            <div className="flex items-center px-3 py-2 bg-gray-100 rounded-lg shadow-md w-full overflow-x-auto space-x-2">
    {/* Dropdown Button */}
    <div className="flex-shrink-0">
        <button
            className="bg-gray-700 rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition duration-200 p-2"
            onClick={() => setShowDropdown((prev) => !prev)}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 20.25c4.556 0 8.25-3.694 8.25-8.25s-3.694-8.25-8.25-8.25-8.25 3.694-8.25 8.25a8.193 8.193 0 002.248 5.673c-.093.463-.25 1.17-.517 1.908.811-.11 1.811-.33 2.453-.602a8.23 8.23 0 005.816 2.271z"
                />
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.25 8.5a1.75 1.75 0 113.5 0c0 .871-.71 1.576-1.464 2.23-.616.544-.786.846-.786 1.27m.002 1.75h.007"
                />
            </svg>
        </button>
        {showDropdown && (
            <ul className="absolute bottom-full mb-2 bg-white shadow-lg rounded-lg py-2 w-48 text-sm text-gray-700">
                <li
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleQuestionSelect("What are the case details?")}
                >
                    Case Details
                </li>
                <li
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleQuestionSelect("What is the case summary?")}
                >
                    Case Summary
                </li>
                <li
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleQuestionSelect("What is the judgement?")}
                >
                    Judgement
                </li>
                <li
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleQuestionSelect("What are the legal precedents for this case?")}
                >
                    Legal Precedents
                </li>
                <li
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleQuestionSelect("What sections are referenced in this case?")}
                >
                    Section References
                </li>
                <li
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleQuestionSelect("Can you provide a detailed case analysis?")}
                >
                    Case Analysis
                </li>
            </ul>
        )}
    </div>

    {/* Input Field */}
    <form
        onSubmit={sendMessage}
        className="flex items-center bg-white px-3 py-2 rounded-full shadow-inner flex-grow space-x-2"
    >
        <span className="text-gray-500 text-sm whitespace-nowrap">0 Files</span>
        <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1 bg-transparent outline-none text-gray-700 placeholder-gray-400"
        />
        <button
            type="submit"
            className="bg-gray-700 rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition duration-200 p-2 flex-shrink-0"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
        </button>
    </form>

    {/* Save Chat Button */}
    <button
        className="flex items-center justify-center px-3 py-2 rounded-full bg-gray-700 text-white hover:bg-blue-600 transition duration-200 flex-shrink-0"
        onClick={saveChat}
    >
        <svg
            className="w-5 h-5 mr-2"
            fill="currentColor"
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
        >
            <title>asterisk</title>
            <path d="M28.5 22.35l-10.999-6.35 10.999-6.351c0.231-0.131 0.385-0.375 0.385-0.655 0-0.414-0.336-0.75-0.75-0.75-0.142 0-0.275 0.040-0.388 0.108l0.003-0.002-11 6.35v-12.701c0-0.414-0.336-0.75-0.75-0.75s-0.75 0.336-0.75 0.75v0 12.7l-10.999-6.35c-0.11-0.067-0.243-0.106-0.385-0.106-0.414 0-0.75 0.336-0.75 0.75 0 0.28 0.154 0.524 0.381 0.653l0.004 0.002 10.999 6.351-10.999 6.35c-0.226 0.132-0.375 0.374-0.375 0.65 0 0.415 0.336 0.751 0.751 0.751 0 0 0 0 0.001 0h-0c0.138-0.001 0.266-0.037 0.378-0.102l-0.004 0.002 10.999-6.351v12.7c0 0.414 0.336 0.75 0.75 0.75s0.75-0.336 0.75-0.75v0-12.701l11 6.351c0.107 0.063 0.237 0.1 0.374 0.1 0.277 0 0.518-0.149 0.649-0.371l0.002-0.004c0.063-0.108 0.1-0.237 0.1-0.375 0-0.277-0.15-0.518-0.372-0.648l-0.004-0.002z" />
        </svg>
        Save Chat
    </button>
</div>






            {/* Edit Mode Overlay for Desktop (Removed as it's handled within the component) */}
        </div>
    );
}
export default SearchChatWindow;
