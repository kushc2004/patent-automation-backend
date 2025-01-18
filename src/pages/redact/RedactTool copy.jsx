import { useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import TopBar from "../../components/TopBar";
import Modal from "react-modal";
import axios from "axios";
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';

// Updated renderStrikethroughs to handle coordinate conversion and scaling
const renderStrikethroughs = (rectangles, pageNumber, pageWidth, pageHeight, scale) => {
    return rectangles
        .filter(rect => rect.page === pageNumber) // Ensure rectangles are for the current page
        .map((rect, index) => {
            // Flip the y-axis and apply scaling
            const left = rect.rect.x0 * scale;
            const top = (pageHeight - rect.rect.y1) * scale;
            const width = (rect.rect.x1 - rect.rect.x0) * scale;
            const height = (rect.rect.y1 - rect.rect.y0) * scale;

            return (
                <div
                    key={index}
                    className="strikethrough"
                    style={{
                        position: 'absolute',
                        left: `${left}px`,
                        top: `${top}px`,
                        width: `${width}px`,
                        height: `${height}px`,
                        backgroundColor: 'rgba(255, 0, 0, 0.3)',
                        pointerEvents: 'none',
                        border: '1px solid red', // Optional: Add border for better visibility
                        boxSizing: 'border-box',
                        zIndex: 10, // Ensure it's on top of the PDF content
                    }}
                />
            );
        });
};

const ModalPreview = ({ selectedFile }) => (
    <div className="relative w-full h-full bg-gray-200">
        {selectedFile?.fileURL && selectedFile.fileType === 'application/pdf' ? (
            <>
                <Worker workerUrl={`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`}>
                    <Viewer
                        fileUrl={selectedFile.fileURL}
                        defaultScale={1.0}
                        renderPageLayer={(props) => (
                            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                {renderStrikethroughs(
                                    selectedFile.rectangles || [],
                                    props.page.index, // Current page number (0-based)
                                    props.page.width,
                                    props.page.height,
                                    props.scale
                                )}
                            </div>
                        )}
                        theme={{
                            // Optional: Adjust z-index of the Viewer to ensure annotations overlay correctly
                            Viewer: { zIndex: 1 },
                        }}
                    />
                </Worker>
            </>
        ) : selectedFile?.fileType?.startsWith('image/') ? (
            <img
                src={selectedFile.fileURL}
                alt="File Preview"
                className="max-h-full max-w-full"
            />
        ) : (
            <p className="text-gray-500">Preview not available for this file type.</p>
        )}
    </div>
);

const RedactTool = () => {
    const [files, setFiles] = useState([]);
    const [step, setStep] = useState(1); // Step state to handle steps in the process
    const [uniqueIdentifier] = useState(
        sessionStorage.getItem("uniqueIdentifier") || "defaultUser"
    ); // Replace with the real uniqueIdentifier logic if needed

    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [redactedStrings, setRedactedStrings] = useState([]);

    // Handle file uploads
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

    // Handle adding tags
    const handleAddTags = (event) => {
        event.preventDefault();
        const inputElement = event.target.previousElementSibling; // Input field
        const newTags = inputElement.value.split(",").map((tag) => tag.trim());
        setTags((prevTags) => [...prevTags, ...newTags.filter((tag) => tag && !prevTags.includes(tag))]);
        inputElement.value = ""; // Clear input
    };

    // Handle removing a tag
    const handleRemoveTag = (tagToRemove) => {
        setTags((prevTags) => prevTags.filter((tag) => tag !== tagToRemove));
    };

    // Handle redaction
    const handleRedact = async () => {
        if (!uniqueIdentifier) {
            toast.error("Unique identifier not found. Please log in again.");
            return;
        }

        if (files.length === 0) {
            toast.error("No files available for redaction. Please upload files first.");
            return;
        }

        const filePaths = files.map((file) => `/var/data/users/${uniqueIdentifier}/${file.name}`);

        toast.info("Fetching redaction rectangles, please wait...");
        setLoading(true);

        try {
            const response = await fetch("https://legalai-backend-1.onrender.com/api/redact_pdfs1", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    unique_identifier: uniqueIdentifier,
                    file_paths: filePaths,
                    tags,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch redaction rectangles.");
            }

            const data = await response.json();

            if (!data.data || data.data.length === 0) {
                toast.error("No redaction data returned from the server.");
                return;
            }

            toast.success("Redaction rectangles retrieved successfully.");
            setFiles(
                data.data.map((file) => ({
                    name: file.file,
                    rectangles: file.rectangles,
                    redactedStrings: file.rectangles.map((rect) => rect.keyword), // Extract keywords
                }))
            );

            setStep(3);
        } catch (error) {
            console.error("Error fetching redaction rectangles:", error);
            toast.error("An error occurred while fetching redaction data.");
        } finally {
            setLoading(false);
        }
    };

    // Handle downloading PDF
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

    // Fetch file from backend
    const fetchFile = async (filePath) => {
        try {
            const response = await axios.post(
                "https://legalai-backend-1.onrender.com/api/get_file",
                { file_path: filePath },
                {
                    headers: { "Content-Type": "application/json" },
                    responseType: "blob", // Fetch file as binary blob
                }
            );

            // Infer file type based on the response's blob
            const fileType = response.data.type || "application/octet-stream";
            const fileURL = URL.createObjectURL(response.data); // Create a URL to render or download the file

            return { fileURL, fileType }; // Return the file URL and type
        } catch (error) {
            console.error("Error fetching file:", error);
            return null;
        }
    };

    // Open edit modal
    const openEditModal = async (file) => {
        const filePath = `/var/data/users/${uniqueIdentifier}/${file.name}`;
        const fetchedFile = await fetchFile(filePath);

        if (fetchedFile) {
            setSelectedFile({ ...file, ...fetchedFile });
            setRedactedStrings(file.rectangles.map((rect) => rect.keyword)); // Assuming `rectangles` contain keywords
            setEditModalOpen(true);
        } else {
            toast.error("Failed to load the file for editing.");
        }
    };

    // Close the modal
    const closeEditModal = () => {
        setEditModalOpen(false);
        setSelectedFile(null);
        setRedactedStrings([]);
    };

    // Add a new string to the redacted strings list
    const handleAddText = () => {
        setRedactedStrings([...redactedStrings, ""]);
    };

    // Update a specific redacted string
    const handleUpdateText = (index, value) => {
        const updatedStrings = [...redactedStrings];
        updatedStrings[index] = value;
        setRedactedStrings(updatedStrings);
    };

    // Remove a specific redacted string
    const handleRemoveText = (index) => {
        const updatedStrings = redactedStrings.filter((_, i) => i !== index);
        setRedactedStrings(updatedStrings);
    };

    // Save the updated redacted strings
    const handleUpdateRedaction = () => {
        // Save logic (e.g., API call to update redactions)
        console.log("Updated redacted strings:", redactedStrings);
        closeEditModal();
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

            {/* Step 3: Verify Files */}
            {step === 3 && !loading && (
                <div className="flex flex-col items-center p-6 flex-1">
                    <h1 className="text-2xl font-bold text-gray-800 mb-6">Verify Files</h1>
                    <div className="bg-white shadow-md rounded-lg w-full max-w-4xl p-6">
                        {/* Step Progress */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-2 text-gray-500">
                                <span className="w-8 h-8 flex items-center justify-center bg-gray-300 text-white rounded-full">✓</span>
                                <span className="text-gray-500">Upload Files</span>
                            </div>
                            <div className="border-t border-gray-300 flex-1 mx-4"></div>
                            <div className="flex items-center space-x-2 text-gray-500">
                                <span className="w-8 h-8 flex items-center justify-center bg-gray-300 text-white rounded-full">✓</span>
                                <span className="text-gray-500">Add Redaction Tags</span>
                            </div>
                            <div className="border-t border-gray-300 flex-1 mx-4"></div>
                            <div className="flex items-center space-x-2">
                                <span className="w-8 h-8 flex items-center justify-center bg-gray-800 text-white rounded-full">3</span>
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
                                        <span className="text-gray-700 font-medium">{index + 1}. {file.name}</span>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        {/* Edit Button */}
                                        <button
                                            className="text-blue-500 hover:text-blue-700"
                                            onClick={() => openEditModal(file)}
                                        >
                                            ✏️ Edit
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        {/* Edit Modal */}
                        <Modal
                            isOpen={isEditModalOpen}
                            onRequestClose={closeEditModal}
                            className="w-4/5 h-4/5 bg-white rounded-lg shadow-xl p-6 mx-auto mt-12 flex"
                            overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-50"
                        >
                            {/* PDF Preview */}
                            <div className="w-3/5 h-full border-r-2 overflow-y-scroll p-4 relative">
                                <h2 className="text-lg font-bold mb-4">Preview: {selectedFile?.name}</h2>
                                <ModalPreview selectedFile={selectedFile} />

                                {/* Optional: Show total pages or current page info */}
                                {/* <div className="absolute bottom-4 right-4 text-sm text-gray-500">
                                    Page X of Y
                                </div> */}
                            </div>

                            {/* Redacted Strings */}
                            <div className="w-2/5 h-full flex flex-col p-4">
                                <h2 className="text-lg font-bold mb-4">Redacted Strings</h2>
                                <div className="flex-1 overflow-y-scroll">
                                    {redactedStrings.map((string, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between bg-gray-100 p-2 rounded-lg mb-2"
                                        >
                                            <input
                                                type="text"
                                                value={string}
                                                onChange={(e) =>
                                                    handleUpdateText(index, e.target.value)
                                                }
                                                className="flex-1 p-2 border rounded-lg"
                                            />
                                            <button
                                                className="ml-2 text-red-500 hover:text-red-700"
                                                onClick={() => handleRemoveText(index)}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    className="mt-4 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
                                    onClick={handleAddText}
                                >
                                    + Add New Text
                                </button>
                                <button
                                    className="mt-4 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition"
                                    onClick={handleUpdateRedaction}
                                >
                                    Update Redaction
                                </button>
                            </div>
                        </Modal>

                        {/* Final Redaction and Download */}
                        <button
                            className="mt-6 w-full bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-900 transition"
                            onClick={() => {
                                toast.success("Downloading ZIP...");
                                handleDownloadPDF();
                            }}
                        >
                            Download Redacted PDF
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RedactTool;
