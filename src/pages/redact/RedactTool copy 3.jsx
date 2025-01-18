import { useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import TopBar from "../../components/TopBar";


const RedactTool = () => {
    const [files, setFiles] = useState([]);
    const [step, setStep] = useState(1); // Step state to handle steps in the process
    const [uniqueIdentifier] = useState(
        sessionStorage.getItem("uniqueIdentifier") || "defaultUser"
    ); // Replace with the real uniqueIdentifier logic if needed

    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(false);

    // const handleUpload = async () => {
    //     if (files.length === 0) {
    //         toast.error("No files selected for upload.");
    //         return;
    //     }

    //     try {
    //         for (const file of files) {
    //             const formData = new FormData();

    //             formData.append("folder_name", `users/${uniqueIdentifier}`); // Specify the folder name
    //             formData.append("file", file); // Add the file

    //             // Upload each file individually
    //             const uploadFileResponse = await fetch(
    //                 "https://legalai-backend-1.onrender.com/api/upload_file",
    //                 {
    //                     method: "POST",
    //                     body: formData,
    //                     credentials: "include", // Include session cookies if needed
    //                 }
    //             );

    //             if (!uploadFileResponse.ok) {
    //                 throw new Error(`Failed to upload ${file.name}`);
    //             }
    //         }

    //         toast.success("All files uploaded successfully.");
    //         setStep(2); // Move to the Add Redaction Tags step
    //     } catch (error) {
    //         console.error("Error uploading files:", error);
    //         toast.error("An error occurred while uploading files.");
    //     }
    // };

    const handleUpload = async () => {
        if (files.length === 0) {
            toast.error("No files selected for upload.");
            return;
        }
    
        try {
            for (const file of files) {
                const formData = new FormData();
    
                formData.append("folder_name", `users/${uniqueIdentifier}`); // Specify the folder name
                formData.append("file", file); // Add the file
    
                const uploadFileResponse = await fetch(
                    "https://legalai-backend-1.onrender.com/api/upload_file",
                    {
                        method: "POST",
                        body: formData,
                        credentials: "include", // Include session cookies if needed
                    }
                );
    
                if (!uploadFileResponse.ok) {
                    throw new Error(`Failed to upload ${file.name}`);
                }
            }
    
            toast.success("All files uploaded successfully.");
            setStep(2); // Move to the Add Redaction Tags step
        } catch (error) {
            console.error("Error uploading files:", error);
            toast.error("An error occurred while uploading files.");
        }
    };
    

    const handleAddTags = (event) => {
        event.preventDefault();
        const inputElement = event.target.previousElementSibling; // Input field
        const newTags = inputElement.value.split(",").map((tag) => tag.trim());
        setTags((prevTags) => [...prevTags, ...newTags.filter((tag) => tag && !prevTags.includes(tag))]);
        inputElement.value = ""; // Clear input
    };

    const handleRemoveTag = (tagToRemove) => {
        setTags((prevTags) => prevTags.filter((tag) => tag !== tagToRemove));
    };


    // const handleRedact = async () => {
    //     if (!uniqueIdentifier) {
    //         toast.error("Unique identifier not found. Please log in again.");
    //         return;
    //     }

    //     toast.info("Redacting documents, please wait...");
    //     setLoading(true); // Start loading
    //     try {
    //         const response = await fetch("https://legalai-backend-1.onrender.com/api/redact_pdfs", {
    //             method: "POST",
    //             headers: { "Content-Type": "application/json" },
    //             body: JSON.stringify({
    //                 unique_identifier: uniqueIdentifier,
    //                 file_paths: files.map((file) => file.path),
    //                 tags,
    //                 redaction_type: "blackout",
    //             }),
    //         });

    //         if (!response.ok) {
    //             throw new Error("Failed to redact documents.");
    //         }

    //         const data = await response.json();
    //         toast.success("Redaction completed successfully.");
    //         setFiles(data.files); // Update file list with redacted files
    //         setStep(3); // Move to Step 3
    //     } catch (error) {
    //         console.error("Error redacting documents:", error);
    //         toast.error("An error occurred during redaction.");
    //     } finally {
    //         setLoading(false); // Stop loading
    //     }
    // };
    
    const handleRedact = async () => {
        if (!uniqueIdentifier) {
            toast.error("Unique identifier not found. Please log in again.");
            return;
        }
    
        if (files.length === 0) {
            toast.error("No files available for redaction. Please upload files first.");
            return;
        }
    
        // Construct file paths based on the unique identifier and file names
        const filePaths = files.map((file) => `/var/data/users/${uniqueIdentifier}/${file.name}`);
        // const filePaths = filePaths0.map((file) => file.replace(/ /g, "_")); // Replace spaces with underscores
        // console.log("file paths: ", filePaths);
    
        toast.info("Redacting documents, please wait...");
        setLoading(true); // Start loading  
    
        try {
            const response = await fetch("https://legalai-backend-1.onrender.com/api/redact_pdfs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    unique_identifier: uniqueIdentifier,
                    file_paths: filePaths, // Use the constructed file paths
                    tags,
                    redaction_type: "strikethrough",
                }),
            });
    
            if (!response.ok) {
                throw new Error("Failed to redact documents.");
            }
    
            const data = await response.json();
            toast.success("Redaction completed successfully.");
            setFiles(
                data.files.map((file) => ({
                    name: file.redacted,
                    path: `/var/data/users/${uniqueIdentifier}/redact_output/${file.redacted}`,
                }))
            ); // Update file list with redacted files
            setStep(3); // Move to Step 3
        } catch (error) {
            console.error("Error redacting documents:", error);
            toast.error("An error occurred during redaction.");
        } finally {
            setLoading(false); // Stop loading
        }
    };
    

    const handleDownloadPDF = async () => {
        if (files.length === 0) {
            toast.error("No redacted files available for download.");
            return;
        }
    
        const file = files[0];
        console.log("file path: ", file.path);

        try {
            const response = await fetch(
                "https://legalai-backend-1.onrender.com/api/get_file",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ file_path: file.path }),
                }
            );
    
            if (!response.ok) {
                throw new Error("Failed to fetch the file.");
            }
    
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
    
            // Create a temporary anchor element to trigger download
            const a = document.createElement("a");
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            a.remove();
    
            window.URL.revokeObjectURL(url); // Clean up the URL object
            toast.success(`Downloaded: ${file.name}`);
        } catch (error) {
            console.error("Error downloading file:", error);
            toast.error("An error occurred while downloading the file.");
        }
    };

    

    return (
        <div className="bg-gray-100 flex flex-col items-center h-screen w-screen">
            <div className="w-full">
                <TopBar />
            </div>

            {loading && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="loader"></div> {/* Replace with a spinner component */}
                    <p className="text-white text-lg font-medium mt-4">Processing...</p>
                </div>
            )}

            {/* Conditional Rendering Based on Step */}
            {step === 1 && (
                <div className="flex flex-col items-center p-6 flex-1">
                    <h1 className="text-2xl font-bold text-gray-800 mb-6">
                        Redact: Secure Document Redaction Tool
                    </h1>
                    <div className="bg-white shadow-md rounded-lg w-full max-w-2xl p-6">
                        {/* Step Progress */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-2">
                                <span className="w-8 h-8 flex items-center justify-center bg-gray-800 text-white rounded-full">
                                    1
                                </span>
                                <span className="text-gray-800 font-semibold">Upload Files</span>
                            </div>
                            <div className="border-t border-gray-300 flex-1 mx-4"></div>
                            <div className="flex items-center space-x-2 text-gray-500">
                                <span className="w-8 h-8 flex items-center justify-center bg-gray-300 text-white rounded-full">
                                    2
                                </span>
                                <span>Add Redaction Tags</span>
                            </div>
                            <div className="border-t border-gray-300 flex-1 mx-4"></div>
                            <div className="flex items-center space-x-2 text-gray-500">
                                <span className="w-8 h-8 flex items-center justify-center bg-gray-300 text-white rounded-full">
                                    3
                                </span>
                                <span>Verify Files</span>
                            </div>
                        </div>

                        {/* File Upload Section */}
                        <h2 className="text-lg font-bold text-gray-800 mb-4">Upload Files</h2>
                        <div className="mb-4 flex items-center">
                            <label className="bg-gray-200 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 cursor-pointer">
                                Choose Files
                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={(e) =>
                                        setFiles((prevFiles) => [
                                            ...prevFiles,
                                            ...Array.from(e.target.files),
                                        ])
                                    }
                                />
                            </label>
                            <span className="mx-2 text-gray-500">OR</span>
                            <button className="bg-gray-200 px-4 py-2 rounded-lg border border-gray-300 text-gray-700">
                                Try sample file
                            </button>
                        </div>

                        <div
                            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500 cursor-pointer"
                            onDrop={(e) => {
                                e.preventDefault();
                                setFiles((prevFiles) => [
                                    ...prevFiles,
                                    ...Array.from(e.dataTransfer.files),
                                ]);
                            }}
                            onDragOver={(e) => e.preventDefault()}
                        >
                            Drag and drop files here, or click to select files
                        </div>

                        {/* File Preview */}
                        <ul className="mt-4 space-y-2">
                            {files.map((file, index) => (
                                <li
                                    key={index}
                                    className="flex justify-between items-center bg-gray-100 p-2 rounded-lg shadow"
                                >
                                    <span className="text-gray-700">{file.name}</span>
                                    <span className="text-sm text-gray-500">
                                        {(file.size / 1024).toFixed(2)} KB
                                    </span>
                                </li>
                            ))}
                        </ul>

                        <p className="text-sm text-blue-500 mt-4">
                            Upload up to 5 PDF or Word files. We don’t store your files.
                        </p>

                        <button
                            className="mt-6 w-full bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-900 transition"
                            onClick={handleUpload}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Add Redaction Tags */}
            {step === 2 && !loading && (
            <div className="flex flex-col items-center p-6 flex-1">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">
                    Add Redaction Tags
                </h1>
                <div className="bg-white shadow-md rounded-lg w-full max-w-2xl p-6">
                    {/* Step Progress */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-2 text-gray-500">
                            <span className="w-8 h-8 flex items-center justify-center bg-gray-300 text-white rounded-full">
                                ✓
                            </span>
                            <span className="text-gray-500">Upload Files</span>
                        </div>
                        <div className="border-t border-gray-300 flex-1 mx-4"></div>
                        <div className="flex items-center space-x-2">
                            <span className="w-8 h-8 flex items-center justify-center bg-gray-800 text-white rounded-full">
                                2
                            </span>
                            <span className="text-gray-800 font-semibold">
                                Add Redaction Tags
                            </span>
                        </div>
                        <div className="border-t border-gray-300 flex-1 mx-4"></div>
                        <div className="flex items-center space-x-2 text-gray-500">
                            <span className="w-8 h-8 flex items-center justify-center bg-gray-300 text-white rounded-full">
                                3
                            </span>
                            <span>Verify Files</span>
                        </div>
                    </div>

                    {/* Redaction Tags UI */}
                    <h2 className="text-lg font-bold text-gray-800 mb-4">
                        Add Redaction Tags
                    </h2>

                    {/* Display Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {tags.map((tag, index) => (
                            <span
                                key={index}
                                className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm font-medium"
                            >
                                {tag}
                                <button
                                    className="ml-2 text-blue-500 hover:text-blue-700"
                                    onClick={() => handleRemoveTag(tag)}
                                >
                                    ✕
                                </button>
                            </span>
                        ))}
                    </div>

                    {/* Tag Input */}
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Type tags separated by commas (e.g., 'names, dates, phone numbers')"
                            className="flex-1 p-2 border border-gray-300 rounded-lg"
                        />
                        <button
                            className="bg-gray-800 text-white py-2 px-4 rounded-lg hover:bg-gray-900 transition"
                            onClick={handleAddTags}
                        >
                            Add
                        </button>
                    </div>

                    {/* Suggested Tags */}
                    <div className="mt-6">
                        <h3 className="text-gray-700 font-semibold mb-2">
                            Suggested Tags:
                        </h3>
                        <div className="flex space-x-4">
                            {["Parties involved", "Dates", "Financial figures"].map(
                                (tag, index) => (
                                    <button
                                        key={index}
                                        className="bg-gray-200 px-4 py-1 rounded-lg text-gray-700 cursor-pointer hover:bg-gray-300"
                                        onClick={() =>
                                            setTags((prevTags) =>
                                                prevTags.includes(tag)
                                                    ? prevTags
                                                    : [...prevTags, tag]
                                            )
                                        }
                                    >
                                        {tag}
                                    </button>
                                )
                            )}
                        </div>
                    </div>

                    <p className="text-sm text-blue-500 mt-4">
                        Large files take more time, please don’t leave or reload the page.
                    </p>

                    {/* Back and Redact Buttons */}
                    <div className="flex justify-between mt-6">
                        <button
                            className="bg-gray-300 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-400 transition"
                            onClick={() => setStep(1)} // Go back to upload files step
                        >
                            Back
                        </button>
                        <button
                            className="bg-gray-800 text-white py-2 px-4 rounded-lg hover:bg-gray-900 transition"
                            onClick={handleRedact}
                            disabled={!tags.length}
                        >
                            Redact Documents
                        </button>
                    </div>
                </div>
            </div>
            )}

            {step === 3 && !loading && (
                <div className="flex flex-col items-center p-6 flex-1">
                    <h1 className="text-2xl font-bold text-gray-800 mb-6">
                        Verify Files
                    </h1>
                    <div className="bg-white shadow-md rounded-lg w-full max-w-2xl p-6">
                        {/* Step Progress */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-2 text-gray-500">
                                <span className="w-8 h-8 flex items-center justify-center bg-gray-300 text-white rounded-full">
                                    ✓
                                </span>
                                <span className="text-gray-500">Upload Files</span>
                            </div>
                            <div className="border-t border-gray-300 flex-1 mx-4"></div>
                            <div className="flex items-center space-x-2 text-gray-500">
                                <span className="w-8 h-8 flex items-center justify-center bg-gray-300 text-white rounded-full">
                                    ✓
                                </span>
                                <span className="text-gray-500">Add Redaction Tags</span>
                            </div>
                            <div className="border-t border-gray-300 flex-1 mx-4"></div>
                            <div className="flex items-center space-x-2">
                                <span className="w-8 h-8 flex items-center justify-center bg-gray-800 text-white rounded-full">
                                    3
                                </span>
                                <span className="text-gray-800 font-semibold">Verify Files</span>
                            </div>
                        </div>

                        {/* Redacted Files Section */}
                        <h2 className="text-lg font-bold text-gray-800 mb-4">Redacted Files:</h2>
                        <ul className="space-y-4">
                            {files.map((file, index) => (
                                <li
                                    key={index}
                                    className="flex items-center justify-between bg-gray-100 p-4 rounded-lg shadow"
                                >
                                    <div className="flex items-center space-x-4">
                                        <span className="text-gray-700 font-medium">
                                            {index + 1}. {file.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        {/* Edit Button */}
                                        <button
                                            className="text-blue-500 hover:text-blue-700"
                                            onClick={() => toast.info("Edit functionality coming soon!")}
                                        >
                                            ✏️ Edit
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        {/* Final Redaction and Download */}
                        <button
                            className="mt-6 w-full bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-900 transition"
                            onClick={() => {
                                toast.success("Downloading ZIP...");
                                handleDownloadPDF()}}
                        >
                            Download Redacted PDF
                        </button>

                        <p className="text-sm text-blue-500 mt-4">
                            *Please verify all redacted documents carefully before sharing or distributing.
                        </p>
                        <p className="text-sm text-blue-500">
                            Preview/edit redactions using the edit button. Download redacted documents.
                        </p>

                        {/* Reset and Back Buttons */}
                        <div className="flex justify-between mt-6">
                            <button
                                className="bg-gray-300 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-400 transition"
                                onClick={() => setStep(2)} // Go back to Add Redaction Tags
                            >
                                Back
                            </button>
                            <button
                                className="bg-gray-800 text-white py-2 px-4 rounded-lg hover:bg-gray-900 transition"
                                onClick={() => {
                                    setFiles([]); // Clear files
                                    setStep(1); // Reset to step 1
                                }}
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>
            )}



        </div>
    );
};


export default RedactTool;
