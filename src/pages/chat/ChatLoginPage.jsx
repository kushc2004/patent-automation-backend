import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/outline';
import axios from 'axios';
import './login.css';

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

const LoginButton = ({ onClick }) => (
    <button
        onClick={onClick}
        className="w-full px-10 py-2 mt-6 text-xl font-medium bg-gray-900 rounded-3xl text-zinc-50 min-h-[60px] mx-0"
        type="button"
    >
        Enter
    </button>
);


const ChatLoginPage = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const [animationClass, setAnimationClass] = useState("fade-enter");

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
        <main className="flex flex-col md:flex-row h-screen">
    {/* Left Side - Carousel */}
    <section className="flex flex-col justify-center items-center bg-[#1F1515] p-8 w-full md:w-1/2 h-full text-white relative">
        <div className="absolute top-4 text-center w-full m-auto md:top-8">
            <h1 className="text-4xl font-bold mt-8">Banthry AI</h1>
            <h1 className="text-2xl font-bold mt-4 text-gray-300">Your AI Legal Companion</h1>
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
    <section className="flex flex-col w-full md:w-1/2 h-full bg-gradient-to-r from-gray-50 to-white p-4 items-center justify-center">
        <div className="flex flex-col justify-center items-center py-7 w-full bg-[linear-gradient(104deg,#C2FEFE_0.01%,rgba(255,228,199,0.20_99.99%))] rounded-3xl max-w-md">
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
                    label="Username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />

                {/* Password Input */}
                <InputField
                    label="Password"
                    placeholder="Enter your password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                {/* Error Message */}
                {error && <p className="text-red-500 mt-4 text-center">{error}</p>}

                {/* Login Button */}
                <LoginButton onClick={handleLogin} />
            </div>
        </div>
    </section>
</main>

    );
};

export default ChatLoginPage;
