import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Papa from 'papaparse';
import TopBar from '../../components/TopBar';


const categoryOptions = ["Criminal", "Civil", "Family", "Corporate", "Others"];
const caseStateOptions = ["Pending", "Pre-final", "Not started yet", "Other"];



function GetOpinionForm() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [state, setState] = useState('');
    const [city, setCity] = useState('');
    const [customCity, setCustomCity] = useState('');
    const [category, setCategory] = useState('');
    const [customCategory, setCustomCategory] = useState('');
    const [caseState, setCaseState] = useState('');
    const [customCaseState, setCustomCaseState] = useState('');
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [facts, setFacts] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [subscribe, setSubscribe] = useState(false);
    const [statesWithCities, setStatesWithCities] = useState({});

    useEffect(() => {
        const fetchCityStateData = async () => {
            const response = await fetch('./india_database.csv');
            const text = await response.text();
    
            Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                complete: (result) => {
                    const data = result.data;
                    const stateCityMap = {};
    
                    data.forEach(({ State, City }) => {
                        if (!stateCityMap[State]) {
                            stateCityMap[State] = [];
                        }
                        stateCityMap[State].push(City);
                    });
    
                    setStatesWithCities(stateCityMap);
                },
            });
        };
    
        fetchCityStateData();
    }, []);

    const handleFileUpload = async (event) => {
        const files = Array.from(event.target.files);
        const fileData = await Promise.all(files.map(file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve({ name: file.name, type: file.type, size: file.size, data: reader.result.split(',')[1] });
            reader.onerror = reject;
            reader.readAsDataURL(file);
        })));
        setUploadedFiles(fileData);
        toast.success("Document(s) uploaded successfully.");
    };

    const handleSubmit = () => {
        const formData = {
            name,
            state: state === "Others" ? customCaseState : state,
            city: city === "Others" ? customCity : city,
            category: category === "Others" ? customCategory : category,
            caseState: caseState === "Other" ? customCaseState : caseState,
            facts,
            document: uploadedFiles,
            selectedOption: "getOpinion",
        };

        // if (!name || !formData.state || !formData.city || !formData.category || !formData.caseState || !facts || !acceptedTerms) {
        //     toast.error("Please fill out all fields and accept the terms.");
        //     return;
        // }
        if (!name || !formData.state || !formData.city || !formData.category || !formData.caseState || !facts) {
            toast.error("Please fill out all fields and accept the terms.");
            return;
        }

        sessionStorage.setItem("caseFormData", JSON.stringify(formData));
        navigate('/get-opinion');
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* TopBar outside the centered section */}
            <TopBar />
    
            <section className="flex justify-center items-center min-h-[calc(100vh-56px)] p-4">
            <div className="bg-gray-50 shadow-lg rounded-2xl w-full max-w-3xl p-8 space-y-6">
            <button
            type="button"
            onClick={() => navigate(-1)} // Navigate to the previous page
            className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 mb-4 focus:outline-none"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-5 h-5"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5L8.25 12l7.5-7.5"
                />
            </svg>
            <span>Back</span>
        </button>
                <h1 className="text-2xl font-bold text-center text-gray-800">
                    Welcome to Banthry: Your AI Legal Companion
                </h1>
                <form className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Name Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter your name"
                            />
                        </div>

                        {/* State Dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">State</label>
                            <select
                                value={state}
                                onChange={(e) => {
                                    setState(e.target.value);
                                    setCity(''); // Reset city when state changes
                                }}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select State</option>
                                {Object.keys(statesWithCities).map((stateOption, index) => (
                                    <option key={index} value={stateOption}>{stateOption}</option>
                                ))}
                                <option value="Others">Others</option>
                            </select>
                            {state === "Others" && (
                                <input
                                    type="text"
                                    value={customCaseState}
                                    onChange={(e) => setCustomCaseState(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter state name"
                                />
                            )}
                        </div>

                        {/* City Dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">City</label>
                            <select
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={!state || state === "Others"}
                            >
                                <option value="">Select City</option>
                                {state && statesWithCities[state]?.map((cityOption, index) => (
                                    <option key={index} value={cityOption}>{cityOption}</option>
                                ))}
                                <option value="Others">Others</option>
                            </select>
                            {city === "Others" && (
                                <input
                                    type="text"
                                    value={customCity}
                                    onChange={(e) => setCustomCity(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter city name"
                                />
                            )}
                        </div>

                        {/* Category Dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select Category</option>
                                {categoryOptions.map((option, index) => (
                                    <option key={index} value={option}>{option}</option>
                                ))}
                            </select>
                            {category === "Others" && (
                                <input
                                    type="text"
                                    value={customCategory}
                                    onChange={(e) => setCustomCategory(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter custom category"
                                />
                            )}
                        </div>

                        {/* Case State Dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Current Case State</label>
                            <select
                                value={caseState}
                                onChange={(e) => setCaseState(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select State</option>
                                {caseStateOptions.map((option, index) => (
                                    <option key={index} value={option}>{option}</option>
                                ))}
                            </select>
                            {caseState === "Other" && (
                                <input
                                    type="text"
                                    value={customCaseState}
                                    onChange={(e) => setCustomCaseState(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter custom state"
                                />
                            )}
                        </div>

                        {/* Upload Document */}
                        <div className="flex flex-col">
                            <label className="block text-sm font-medium text-gray-700">Upload Document</label>
                            <label className="flex items-center justify-center p-3 border border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-100 hover:bg-gray-200 transition duration-200">
                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                                <span className="text-gray-500 font-medium">
                                    {uploadedFiles.length > 0 ? `${uploadedFiles.length} file(s) selected` : "Click to upload"}
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Facts about Case */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Enter Facts about Case</label>
                        <textarea
                            value={facts}
                            onChange={(e) => setFacts(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Provide details"
                        />
                    </div>

                    {/* Terms and Subscribe Checkboxes */}
                    {/* <div className="flex items-start space-x-4">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={acceptedTerms}
                                onChange={(e) => setAcceptedTerms(e.target.checked)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label className="ml-2 text-sm text-gray-600">
                                I accept the <a href="#" className="text-blue-500 underline">Terms of use</a> & <a href="#" className="text-blue-500 underline">Privacy policy</a>
                            </label>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={subscribe}
                                onChange={(e) => setSubscribe(e.target.checked)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label className="ml-2 text-sm text-gray-600">
                                Subscribe to our email notifications to stay up to date
                            </label>
                        </div>
                    </div> */}

                    {/* Analyse Button */}
                    <div className="text-center">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="w-full bg-gray-800 text-white text-lg font-semibold py-3 rounded-lg hover:bg-gray-900 transition duration-300"
                        >
                            Analyse
                        </button>
                    </div>
                </form>
            </div>
            <ToastContainer />
        </section>
        </div>
    );
}

export default GetOpinionForm;
