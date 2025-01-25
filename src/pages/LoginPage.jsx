import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/outline';
import axios from 'axios';
import './chat/login.css';

const slides = [
    {
        title: "AI Assisted Opinion",
        content: [
            "Reduce research, review, and drafting time by 80%",
            "Generates legal opinions with comprehensive insights for case analysis",
            "Identifies precedents, statutes, and enables interactive chat with opinions",
            "Edit option to incorporate your own insights into the opinion",
            "Submit documents to court registry and clients with a single click",
            "Utilizes state-of-the-art Vision and Language Models, supporting Indian language documents"
        ]
    },
    {
        title: "Auto Research, Draft & Review",
        content: [
            "Automated review of legal documents, including contracts and briefs",
            "Identifies potential issues and discrepancies, suggesting improvements",
            "Searches precise legal precedents and provides summaries with extracted arguments for quick reference",
            "Adapts drafting style based on user-provided documents and instructions"
        ]
    },
    {
        title: "AI Assisted IP Service",
        content: [
            "Patent search with comprehensive prior art analysis through AI-powered searches",
            "AI-assisted patent drafting and prosecution",
            "IP portfolio management and analytics",
            "Automated trademark searches, drafting, and monitoring for brand protection"
        ]
    },
    {
        title: "AI Powered ADR",
        content: [
            "Automates the ADR process for dispute resolution",
            "AI-driven tools to support mediators and arbitrators",
            "Analyzes case documents and generates summarized reports",
            "Assesses case strengths and predicts potential outcomes for strategic planning"
        ]
    }
]

const InputField = ({ label, placeholder, value, onChange, type = "text" }) => (
    <div className="flex flex-col mt-6 w-full max-w-[444px]">
        <label className="text-2xl font-medium leading-none text-neutral-800">
            {label}
        </label>
        <div className="flex items-center p-3 mt-4 w-full rounded-lg bg-zinc-50 min-h-[54px] shadow-[0px_0px_2px_rgba(0,0,0,1)]">
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className="flex-1 self-stretch text-lg leading-loose text-stone-500 bg-transparent border-none outline-none"
                aria-label={label}
            />
        </div>
    </div>
);


const LoginPage = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const googleClientId = process.env.GOOGLE_CLIENT_ID

    const [animationClass, setAnimationClass] = useState("fade-enter");  
    const [uniqueIdentifier, setUniqueIdentifier] = useState(
        sessionStorage.getItem("uniqueIdentifier") || null
    );
    
    
    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);

        script.onload = () => {
            window.google.accounts.id.initialize({
                client_id: "664706411227-91of253116nviglgl7o8p07jgpvsei05.apps.googleusercontent.com", // Replace with your actual Google Client ID
                callback: handleCredentialResponse,
            });

            window.google.accounts.id.renderButton(
                document.getElementById("google-signin-button"),
                { theme: "outline", size: "large" }
            );
        };

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    // Clear session storage on page refresh
    useEffect(() => {
        const handleBeforeUnload = () => {
            sessionStorage.removeItem("uniqueIdentifier");
        };
        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, []);

    const handleCredentialResponse = async (response) => {
        try {
            setLoading(true); // Show loading spinner
    
            // Decode Google ID token to get user info
            const user = JSON.parse(atob(response.credential.split(".")[1]));
            console.log("User Info:", user);
    
            const uniqueIdentifier = user.sub;
            const folderName = 'users/' + uniqueIdentifier;
            setUniqueIdentifier(uniqueIdentifier);
            
            sessionStorage.setItem("uniqueIdentifier", uniqueIdentifier); // Save in session storage
    
            // Step 1: Check if the folder exists
            const checkFolderResponse = await fetch(
                `https://legalai-backend-1.onrender.com/api/check_folder?folder_name=${folderName}`,
                {
                    method: "GET",
                    credentials: "include", // Include session cookies
                }
            );
    
            if (checkFolderResponse.ok) {
                console.log("Folder exists. Skipping creation.");
                navigate("/home", { state: { uniqueIdentifier } });
                return;
            }
    
            // Step 2: Create the folder on the backend
            const createFolderResponse = await fetch(
                "https://legalai-backend-1.onrender.com/api/create_folder",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ folder_name: folderName }),
                    credentials: "include", // Include session cookies if needed
                }
            );
    
            if (!createFolderResponse.ok) {
                const errorData = await createFolderResponse.json();
                throw new Error(errorData.error || "Failed to create folder.");
            }
            console.log("Folder created successfully.");
    
            // Step 3: Upload the JSON file into the created folder
            const formData = new FormData();
            formData.append("folder_name", folderName); // Specify the folder name
            formData.append(
                "file",
                new Blob([JSON.stringify(user)], { type: "application/json" }),
                "user_data.json"
            );
    
            const uploadFileResponse = await fetch(
                "https://legalai-backend-1.onrender.com/api/upload_file",
                {
                    method: "POST",
                    body: formData,
                    credentials: "include", // Include session cookies if needed
                }
            );
    
            const uploadData = await uploadFileResponse.json();
            if (!uploadFileResponse.ok) {
                throw new Error(uploadData.error || "Failed to upload file.");
            }
    
            console.log(`File uploaded successfully: ${uploadData.message}`);
    
            // Step 4: Navigate to the next page with the unique identifier
            navigate("/home", { state: { uniqueIdentifier } });
        } catch (err) {
            console.error("Error:", err.message);
            setError(err.message || "An error occurred during login.");
        } finally {
            setLoading(false); // Hide loading spinner after completion
        }
    };
    


    useEffect(() => {
        const interval = setInterval(() => {
            setAnimationClass("fade-exit"); // Start the exit animation
            setTimeout(() => {
                setCurrentIndex((prevIndex) => (prevIndex === slides.length - 1 ? 0 : prevIndex + 1));
                setAnimationClass("fade-enter"); // Trigger the enter animation for the next slide
                }, 500); // Wait for exit animation to finish
            }, 4000); // Change slide every 5 seconds
            return () => clearInterval(interval);
    }, []);

    const handlePrev = () => {
        setCurrentIndex((prevIndex) => (prevIndex === 0 ? slides.length - 1 : prevIndex - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prevIndex) => (prevIndex === slides.length - 1 ? 0 : prevIndex + 1));
    };

    const handleLogin = async (e) => {
        e.preventDefault();
    
        try {
            const response = await axios.post(
                'https://legalai-backend-1.onrender.com/api/chat-login',
                { username, password },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    withCredentials: true, // Only if needed for cookies
                }
            );
    
            if (response.status !== 200) {
                throw new Error('Invalid credentials');
            }
    
            console.log('Login successful:', response.data);
            navigate('/chat');
        } catch (error) {
            console.error('Login error:', error);
            setError('Invalid username or password.');
        }
    };
    

    return (
        <main className="flex flex-col md:flex-row h-screen"
        style={{ backgroundImage: "url('assets/img/loginBg.png')" }}>
            {/* Left Side - Carousel */}
            
            <section className="flex flex-col justify-center items-center  p-8 w-full md:w-1/2 h-full text-white relative"
            >
                <div className="absolute top-4 text-center w-full m-auto md:top-8">
                    <h1
                        className="text-5xl font-bold mt-8 text-gray-900"
                        style={{ textShadow: "2px 2px 2px rgba(0, 0, 0, 0.2)" }}
                    >
                        Banthry AI
                    </h1>
                    <h1
                        className="text-3xl font-bold mt-4 text-gray-700"
                        style={{ textShadow: "1px 1px 1px rgba(0, 0, 0, 0.2)" }}
                    >
                        Your AI Legal Companion
                    </h1>
                    </div>


                {/* Content Section */}
                <div className="text-center p-8 bg-[#252525] rounded-lg shadow-lg max-w-md relative">
                    <h2 className="text-2xl font-semibold mb-4 text-white">{slides[currentIndex].title}</h2>
                    
                    {/* Label for "Live Now" or "Coming Soon" */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                        {currentIndex === 0 ? (
                            <span className="px-4 py-1 rounded-full bg-green-100 text-green-700 text-sm font-semibold opacity-80">Live Now</span>
                        ) : (
                            <span className="px-4 py-1 rounded-full bg-red-100 text-red-700 text-sm font-semibold opacity-80">Coming Soon</span>
                        )}
                    </div>

                    <ul className="list-disc pl-5 space-y-2 text-gray-300 text-sm">
                        {slides[currentIndex].content.map((item, index) => (
                            <li className="ml-4 text-left" key={index}>{item}</li>
                        ))}
                    </ul>
                </div>

                {/* Carousel Controls */}
                <button onClick={handlePrev} className="absolute left-4 text-gray-300 bg-[#252525] p-2 rounded-full shadow-md hover:bg-gray-500">
                    <ChevronLeftIcon className="w-8 h-8" />
                </button>
                <button onClick={handleNext} className="absolute right-4 text-gray-300 bg-[#252525] p-2 rounded-full shadow-md hover:bg-gray-500">
                    <ChevronRightIcon className="w-8 h-8" />
                </button>
            </section>

            {/* Right Side - Login Form */}
            
            <section className="flex flex-col w-full md:w-1/2 h-full p-4 items-center justify-center">
                <div className="flex flex-col justify-center items-center py-16 px-8 w-full bg-gradient-to-r from-gray-50 to-white rounded-3xl max-w-md">
                    <img
                                src="assets/img/logo.svg"
                                alt="Banthry AI Logo"
                                className="object-contain w-[200px] mb-8"
                            />
                    <div className='bg-gray-100 w-full p-8 rounded-lg shadow-lg'>
                        <h1 className="text-3xl font-semibold leading-none text-neutral-800 mb-6 text-center">
                            Login
                        </h1>

                        {/* Username Input */}
                        <InputField
                            label="Phone Number"
                            placeholder="Enter your Mobile Number"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />

                        {/* Error Message */}
                        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}

                        <div>
                            <div id="google-signin-button" className="w-full px-10 py-2 mt-6 text-xl font-medium rounded-3xl text-zinc-50 min-h-[60px] mx-0"></div>
                            {loading && <div className="relative loading-spinner m-auto">Loading...</div>}
                        </div>

                        
                                
                    </div>
                </div>
            </section>
        </main>

    );
};

export default LoginPage;
