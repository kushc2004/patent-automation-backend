// ChatWindow.jsx

import React, { useState, useRef, useEffect } from 'react';
import Message from '../../components/chat/Message';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import DOMPurify from 'dompurify';

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Template for generating prompts
const prompt_template = `
You are an expert in Legal Assistance and your job is to analyse the User's case and respond to queries by the user. Your name is Banthry AI, and assume yourself as an Legal Assistant. Don't provide any disclaimer or anything. You are an expert in legal assistance that's it.

Refer to the Chat History if required.

**IMPORTANT NOTE**
1. You should respond in simple text format. 
2. You should use <li>, <b>, <br> tags for formatting instead of new line character and *, ** tags.
3. You should always answer according to rules and regulations of India and should always include referencing to backup your statements.
4. You should include the following tags in your opinion whenever you are referring to anything (so that the backend can process this and create reference badges).
        <code:code_name:section_number>: Example: In the Criminal Penal Code Section 17 <code:crpc:17> this means it is referring to section 17 of CrPC.
        Example acts/codes: <code:hma:17> this means section 17 of Hindu Marriage Act.
        <code:dva:23> this means section 23 of Domestic Violence Act.
        <code:ipc:241> this means section 241 of India Penal Code

        In case you want to refer to the whole Act, use section_number as 1 instead of NA.
5. Use:
    ipc for Indian Penal Code
    crpc for Criminal Penal Code
    dva for Domestic Violence Act
    hma for Hindu Marriage Act
    ida for Indian Divorce Act
    sma for Special Marriage Act
    ../ and so on

Below is the user query:
{user_query}

Now answer the user query:
`;

// Client function to interact with Gemini API
const client = async (prompt, history) => {
    const apiKey = "AIzaSyBSbMTaBPs5qD13ZBLuyQvvH4MNmOAyG9E"; // Replace with your actual API key
    if (!apiKey) {
        throw new Error("Gemini API key is not set.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash-002",
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

    console.log("prompt: ", prompt);

    const result = await chatSession.sendMessage(prompt);

    console.log(result);
    return result.response.candidates[0].content.parts[0].text;
};

const ChatWindow = ({ openCaseOverlay, setIsDocumentCollapsed, setActiveChat, activeChat }) => {
    const initialHistory = [
        { text: "Hello! I am Banthry AI, <br> Here to assist your legal queries. Please select 'For' or 'Against' for an opinion.", sender: 'model' }
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

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

    // Helper function to strip HTML tags and get plain text
    const stripHtml = (html) => {
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    };

    // Helper function to encode HTML entities
    const encodeHtmlEntities = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    // Helper function to decode HTML entities
    const decodeHtmlEntities = (text) => {
        const parser = new DOMParser();
        const decodedString = parser.parseFromString(text, 'text/html').documentElement.textContent;
        return decodedString;
    };

    // Helper function to extract references from HTML content
    const extractReferences = (html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const spans = doc.querySelectorAll('span.reference-badge');
        const references = [];

        spans.forEach(span => {
            if (span.getAttribute('data-ref-case')) {
                references.push({
                    type: 'case',
                    id: span.getAttribute('data-ref-case'),
                    text: span.innerText
                });
            }
            if (span.getAttribute('data-ref-code')) {
                references.push({
                    type: 'code',
                    act: span.getAttribute('data-ref-code'),
                    section: span.getAttribute('data-ref-section'),
                    text: span.innerText
                });
            }
        });

        return references;
    };

    // Helper function to replace references with placeholders
    const replaceReferencesWithPlaceholders = async (text, references) => {
        let placeholderMap = {};
        let modifiedText = text;

        for (const [index, ref] of references.entries()) {
            let uniqueId = ref.id || `${ref.act}-${ref.section}`;
            let placeholderText = ref.text;

            if (ref.type === 'case') {
                const titleResult = await fetchCaseTitle(ref.id);
                placeholderText = titleResult ? titleResult : "Unknown Title";
            }

            // Encode placeholder text to handle special characters
            const encodedPlaceholderText = encodeHtmlEntities(placeholderText);

            // Create a unique placeholder (using index to ensure uniqueness)
            const placeholder = `[[ref-${index}-${encodedPlaceholderText}]]`;

            // Encode the original reference text for regex
            const encodedRefText = encodeHtmlEntities(ref.text);

            // Escape special characters for regex
            const escapedRefText = encodedRefText.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

            // Replace all instances of the reference with the placeholder
            const regex = new RegExp(`<span[^>]*>${escapedRefText}</span>`, 'g');
            modifiedText = modifiedText.replace(regex, placeholder);

            // Map the placeholder to the reference
            placeholderMap[placeholder] = ref;
        }
        return { modifiedText, placeholderMap };
    };

    // Helper function to replace placeholders with references
    const replacePlaceholdersWithReferences = (text, placeholderMap) => {
        let modifiedText = text;
        console.log("Text with placeholders:", modifiedText);  // Confirm placeholders in text
        console.log("Placeholder Map:", placeholderMap);        // Confirm placeholders in map

        Object.entries(placeholderMap).forEach(([placeholder, ref]) => {
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
        });

        console.log("After replacement:", modifiedText);
        return modifiedText;
    };

    // Enter edit mode by extracting plain text and references
    const enterEditMode = async () => {
        const latestBotMessage = messages.slice().reverse().find((msg) => msg.sender === 'model');
        if (latestBotMessage) {
            const plainText = stripHtml(latestBotMessage.text);
            const references = extractReferences(latestBotMessage.text);
            const { modifiedText, placeholderMap } = await replaceReferencesWithPlaceholders(latestBotMessage.text, references);
            setEditContent(modifiedText);
            setEditReferences(references);
            setEditPlaceholders(placeholderMap);
            setEditMode(true);
            setIsDocumentCollapsed(true);

            if (window.innerWidth < 768) { // Tailwind's md breakpoint is 768px
                setIsEditModalOpen(true);
            }
        }
    };

    // Save edited message by reinserting references
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

    const handleOpinionSelection = async (direction) => {
        setOpinionDirection(direction);
        setShowOpinionButtons(false);  // Hide buttons after selection
        const userMessage = `I would like an opinion ${direction === 'for' ? 'in favor' : 'against'} the case.`;
        setMessages((prev) => [
            ...prev,
            { text: userMessage, sender: 'user' },
            { text: `Generating opinion ${direction === 'for' ? 'in favor' : 'against'} the case...`, sender: 'model' },
        ]);

        try {
            const storedData = JSON.parse(sessionStorage.getItem("caseFormData")) || {};
            const { facts, category, caseState, document } = storedData;

            const formData = new FormData();
            formData.append("query", facts);
            formData.append("category", category);
            formData.append("status", caseState);
            formData.append("opinion_direction", direction);
            setCaseCategory(category);
            
            // Append each file to formData
            document.forEach((file, index) => {
                formData.append(`file_${index}`, file.data); // Ensure data format matches backend needs
            });

            const textresponse = await axios.post('https://legalai-backend-1.onrender.com/api/generate_opinion', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const response = JSON.parse(textresponse.data.opinion);
            console.log(response);

            const refCases = response.ref_case || {};
            setCaseRef(refCases);

            if (Object.keys(refCases).length > 0) {
                const texts = await Promise.all(Object.keys(refCases).map(id => fetchCaseText(id, refCases[id])));
                const caseTextMap = Object.keys(refCases).reduce((acc, id, index) => {
                    acc[id] = texts[index];
                    return acc;
                }, {});
                setCaseTexts(caseTextMap);
            } else {
                setCaseTexts({});
            }

            const processedOpinion = replaceTagsWithLinks(response.opinion, refCases); // Pass refCases as argument
            setMessages((prev) => [
                ...prev,
                { text: processedOpinion, sender: 'model' },
            ]);

            // Update activeChat if necessary
            if (activeChat) {
                setActiveChat(prev => ({
                    ...prev,
                    messages: [...prev.messages, { text: processedOpinion, sender: 'model' }]
                }));
            }

        } catch (error) {
            console.error("Error:", error.message);
            toast.error("Error generating opinion. Please try again.");
        }
    };

    const fetchCaseText = async (caseId, highlightIndexes) => {
        try {
            const response = await axios.get(`https://legalai-backend-1.onrender.com/fetch-case-text/${caseId}`);
            const caseText = response.data;

            // Split the text into paragraphs and add highlighting for specific indexes
            const paragraphs = caseText.paragraphs.map((para, index) =>
                highlightIndexes.includes(index) ? `<span style="background-color: #f9f9128a;">${para}</span>` : para
            );

            return paragraphs.join('\n\n');
        } catch (error) {
            console.error("Error fetching case text:", error);
            return `Could not retrieve case text for ${caseId}.`;
        }
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

    const fetchCaseTitle = async(caseId) => {
        try {
            const response = await axios.get(`https://legalai-backend-1.onrender.com/fetch-case-title/${caseId}`);
            const data = response.data;
    
            if (data.error) {
                console.error(data.error);
                return null;
            }
    
            const title = data.title || "No title available";
            
            return title;
        } catch (error) {
            console.error("Error fetching case data:", error);
            return null;
        }
    }

    const replaceTagsWithLinks = (opinionText, caseRef) => {
        const caseIds = Object.keys(caseRef);
        
        return opinionText
            .replace(/<case_id:(\w+)>/g, (match, caseId) => {
                const caseIndex = caseIds.indexOf(caseId) !== -1 ? caseIds.indexOf(caseId) + 1 : '?';
                return `<span data-ref-case="${caseId}" class="reference-badge" style="cursor:pointer;color:blue;">Case ${caseIndex}</span>`;
            })
            .replace(/<code:(\w+):([\w()\s]+)>/g, (match, act, section) => { // Allow spaces and parentheses
                return `<span data-ref-code="${act}" data-ref-section="${section}" class="reference-badge" style="cursor:pointer;color:blue;">${act} Section: ${section}</span>`;
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
            const filteredHistory = messages.filter(
                (msg) => msg.text !== "Hello! I am Banthry AI, <br> Here to assist your legal queries. Please select 'For' or 'Against' for an opinion."
            );
            const prompt = prompt_template.replace('{user_query}', inputMessage);
            const aiResponse = await client(prompt, filteredHistory);
            console.log("gemini response: ", aiResponse);
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
                chat_title: activeChat?.title || `${caseCategory}: ${new Date().toLocaleString()}`
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

            {/* Edit Button */}
            <div className="flex justify-between items-center px-4 py-2 space-x-4">
                {/* Opinion Toggle Button */}
                <div className="w-1/3 flex items-center">
                    <button
                        onClick={() => handleOpinionSelection(opinionDirection === 'for' ? 'against' : 'for')}
                        className="flex items-center px-4 py-2 bg-gray-700 rounded-full font-semibold transition duration-200"
                        style={{ width: 'auto' }}
                    >
                        <div
                            className={`flex items-center justify-center w-6 h-6 rounded-full bg-white transition-all duration-200 ${
                                opinionDirection === 'for' ? 'translate-x-2' : 'translate-x-0'
                            }`}
                        ></div>
                        <span
                            className={`ml-2 transition-all duration-200 text-white ${
                                opinionDirection === 'for' ? 'order-first' : 'order-last'
                            } text-gray-700`}
                        >
                            {opinionDirection === 'for' ? 'In Favor' : 'Against'}
                        </span>
                    </button>
                </div>

                {/* Edit Opinion Button */}
                {!editMode && (
                    <button
                        onClick={enterEditMode}
                        className="w-1/6 min-w-fit self-end m-4 px-2 text-gray-700 hover:text-gray-800 hover:bg-gray-300 rounded-full bg-white py-2 whitespace-nowrap"
                    >
                        ✏️ Edit Opinion
                    </button>
                )}
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex overflow-hidden">
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
                        {!activeChat && showOpinionButtons && (
                            <div className="relative flex justify-start space-x-4 mt-0 ml-8 -top-2">
                                <button
                                    onClick={() => handleOpinionSelection('for')}
                                    className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-green-600 transition"
                                >
                                    For
                                </button>
                                <button
                                    onClick={() => handleOpinionSelection('against')}
                                    className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-red-600 transition"
                                >
                                    Against
                                </button>
                            </div>
                        )}
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
                    <div className="flex flex-col w-1/2 bg-white p-4 shadow-lg transition-all duration-300 overflow-y-auto">
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
            <div className="flex items-center px-4 py-2 space-x-3 bg-gray-100">
                {/* Left Section: Save Chat Button */}
                <button
                    
                    className="bg-gray-700 rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition duration-200 p-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5 3a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7.414a2 2 0 00-.586-1.414l-4-4A2 2 0 0014.586 2H5zm4 14a1 1 0 112 0 1 1 0 01-2 0zm0-4a1 1 0 012 0v3h2v-3a1 1 0 112 0v3h2v-5H9v5zM13 6V4h1.586L17 6.414V8h-4V6z"/>
                    </svg>
                </button>

                {/* Middle Section: Chat Input */}
                <form onSubmit={sendMessage} className="flex items-center space-x-4 bg-white px-4 py-2 rounded-full flex-1 shadow-inner">
                    <span className="text-gray-500 text-sm">{Object.keys(fileUrls).length} Files</span>

                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Type your message here..."
                        className="flex-1 bg-transparent outline-none text-gray-700 placeholder-gray-400"
                    />

                    {/* Send Button */}
                    <button
                        type="submit"
                        className="bg-gray-700 rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition duration-200 p-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </form>

                {/* Right Section: Guide */}
                <div className="flex items-center py-2 rounded-full">
                    <div className='flex items-center px-3 py-2 m-auto rounded-full bg-gray-700 shadow-inner hover:bg-blue-600'
                        onClick={saveChat}>
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                            <title>asterisk</title>
                            <path d="M28.5 22.35l-10.999-6.35 10.999-6.351c0.231-0.131 0.385-0.375 0.385-0.655 0-0.414-0.336-0.75-0.75-0.75-0.142 0-0.275 0.040-0.388 0.108l0.003-0.002-11 6.35v-12.701c0-0.414-0.336-0.75-0.75-0.75s-0.75 0.336-0.75 0.75v0 12.7l-10.999-6.35c-0.11-0.067-0.243-0.106-0.385-0.106-0.414 0-0.75 0.336-0.75 0.75 0 0.28 0.154 0.524 0.381 0.653l0.004 0.002 10.999 6.351-10.999 6.35c-0.226 0.132-0.375 0.374-0.375 0.65 0 0.415 0.336 0.751 0.751 0.751 0 0 0 0 0.001 0h-0c0.138-0.001 0.266-0.037 0.378-0.102l-0.004 0.002 10.999-6.351v12.7c0 0.414 0.336 0.75 0.75 0.75s0.75-0.336 0.75-0.75v0-12.701l11 6.351c0.107 0.063 0.237 0.1 0.374 0.1 0.277 0 0.518-0.149 0.649-0.371l0.002-0.004c0.063-0.108 0.1-0.237 0.1-0.375 0-0.277-0.15-0.518-0.372-0.648l-0.004-0.002z"></path>
                        </svg>

                        <h2 className='mx-2 text-white font-semibold'>Save Chat</h2>
                    </div>
                </div>
            </div>

            {/* Edit Mode Overlay for Desktop (Removed as it's handled within the component) */}
        </div>
    );
}
export default ChatWindow;
