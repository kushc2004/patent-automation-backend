import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function CaseForm() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [state, setState] = useState('');
    const [city, setCity] = useState('');
    const [category, setCategory] = useState('');
    const [caseState, setCaseState] = useState('');
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [facts, setFacts] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [subscribe, setSubscribe] = useState(false);

    const categoryOptions = ["Criminal", "Civil", "Family", "Corporate"];
    const caseStateOptions = ["Pending", "Pre-final", "Not started yet", "Other"];

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
        if (!name || !state || !city || !category || !caseState || !facts || !acceptedTerms) {
            toast.error("Please fill out all fields and accept the terms.");
            return;
        }

        const formData = {
            name,
            state,
            city,
            category,
            caseState,
            facts,
            document: uploadedFiles,
        };

        sessionStorage.setItem("caseFormData", JSON.stringify(formData));
        navigate('/chat');
    };

    return (
        <section className="flex justify-center items-center min-h-screen bg-gray-100 p-5">
            <div className="bg-gray-50 shadow-lg rounded-2xl w-full max-w-3xl p-8 space-y-6">
                <h1 className="text-2xl font-bold text-center text-gray-800">
                    Welcome to Ajung : AI Legal Companion
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

                        {/* State Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">State</label>
                            <input
                                type="text"
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter your state"
                            />
                        </div>

                        {/* City Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">City</label>
                            <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter your city"
                            />
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
                        </div>

                        {/* Case State Dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Current Case State</label>
                            <select
                                value={caseState}
                                onChange={(e) => setCaseState(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select state</option>
                                {caseStateOptions.map((option, index) => (
                                    <option key={index} value={option}>{option}</option>
                                ))}
                            </select>
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
                    <div className="flex items-start space-x-4">
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
                    </div>

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
    );
}

export default CaseForm;
