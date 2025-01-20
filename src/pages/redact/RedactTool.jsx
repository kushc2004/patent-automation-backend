import { useState, useEffect } from "react";
import Modal from "react-modal"; // Ensure react-modal is installed: npm install react-modal
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import TopBar from "../../components/TopBar";

Modal.setAppElement("#root"); // Ensure this matches your app's root element

const RedactTool = () => {
    const [files, setFiles] = useState([]);
    const [redactedFiles, setRedactedFiles] = useState([]);
    const [step, setStep] = useState(1); // Step state to handle steps in the process
    const [uniqueIdentifier] = useState(
        sessionStorage.getItem("uniqueIdentifier") || "defaultUser"
    ); // Replace with the real uniqueIdentifier logic if needed

    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(false);

    // Edit Modal States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [redactedStrings, setRedactedStrings] = useState([]);
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null); // To store the blob URL for the PDF
    const [redactedWords, setRedactedWords] = useState([]);
    const [keywordsWithCoordinates, setKeywordsWithCoordinates] = useState([]);
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Cleanup the blob URL when the component unmounts or selectedFile changes
    useEffect(() => {
        return () => {
            if (pdfBlobUrl) {
                URL.revokeObjectURL(pdfBlobUrl);
            }
        };
    }, [pdfBlobUrl]);

    // Handlers for Edit Modal
    const openEditModal = async (file) => {
        setSelectedFile(file);
        setIsEditModalOpen(true);
        setRedactedStrings([]);

        console.log("file path: ", file.path);

        try {
            // Fetch the redacted PDF from the backend
            const response = await fetch("https://legalai-backend-1.onrender.com/api/get_file", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ file_path: file.path }),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch the redacted PDF.");
            }

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            setPdfBlobUrl(blobUrl);

            // Assuming the backend sends redacted texts
            const fileData = files.find((f) => f.name === file.name);
            setRedactedStrings(fileData?.redactedTexts || []);
        } catch (error) {
            console.error("Error fetching redacted PDF:", error);
            toast.error("Failed to load the redacted PDF.");
            closeEditModal();
        }
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setSelectedFile(null);
        setRedactedStrings([]);
        if (pdfBlobUrl) {
            URL.revokeObjectURL(pdfBlobUrl);
            setPdfBlobUrl(null);
        }
    };

    const handleAddText = () => {
        const newRedactedWords = [...redactedWords, ""]; // Add a placeholder for the new text
        setRedactedWords(newRedactedWords);

        // Update the tags array with the new redacted words, avoiding duplicates
        setTags((prevTags) => [...new Set([...prevTags, ...newRedactedWords])]);
    };

    const handleUpdateText = (index, newValue) => {
        const updatedStrings = [...redactedWords];
        updatedStrings[index] = newValue; // Update the specific redacted word
        setRedactedWords(updatedStrings);

        // Synchronize the tags with the updated redacted words
        setTags((prevTags) => {
            const updatedTags = new Set([...prevTags]);
            updatedTags.delete(redactedWords[index]); // Remove the old value
            updatedTags.add(newValue); // Add the new value
            return [...updatedTags];
        });
    };

    const handleRemoveText = (index) => {
        const removedWord = redactedWords[index];
        const updatedStrings = redactedWords.filter((_, i) => i !== index);
        setRedactedWords(updatedStrings);

        // Remove the corresponding word from tags
        setTags((prevTags) => prevTags.filter((tag) => tag !== removedWord));
    };

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
        setTags((prevTags) => [
            ...prevTags,
            ...newTags.filter((tag) => tag && !prevTags.includes(tag)),
        ]);
        inputElement.value = ""; // Clear input
    };

    const handleRemoveTag = (tagToRemove) => {
        setTags((prevTags) => prevTags.filter((tag) => tag !== tagToRemove));
    };

    const handleRedact = async () => {
        if (!uniqueIdentifier) {
            toast.error("Unique identifier not found. Please log in again.");
            return;
        }

        if (files.length === 0) {
            toast.error("No files available for redaction. Please upload files first.");
            return;
        }

        // Construct file paths
        const filePaths = files.map(
            (file) => `/var/data/users/${uniqueIdentifier}/${file.name}`
        );

        toast.info("Redacting documents, please wait...");
        setLoading(true);

        try {
            const response = await fetch("https://legalai-backend-1.onrender.com/api/redact_pdfs_new", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    unique_identifier: uniqueIdentifier,
                    file_paths: filePaths,
                    tags: tags,
                    redaction_type: "strikethrough",
                    keywords: redactedWords,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to redact documents.");
            }

            const data = await response.json();
            console.log("Redaction response:", data);
            toast.success("Redaction completed successfully.");
            setRedactedFiles(
                data.files.map((file) => ({
                    name: file.redacted,
                    path: `/var/data/users/${uniqueIdentifier}/redact_output/${file.redacted}`,
                }))
            );
            setRedactedWords(data.keywords);
            setKeywordsWithCoordinates(data.keyword_instances);
            setStep(3); // Proceed to Step 3

            console.log("isEditOpen: ", isEditOpen);

            if (isEditOpen) {
                openEditModal(redactedFiles[0]); // Reopen modal if it was previously open
            }
        } catch (error) {
            console.error("Error redacting documents:", error);
            toast.error("An error occurred during redaction.");
        } finally {
            setLoading(false); // Stop loading
        }
    };

    console.log("files: ", files);
    console.log("redacted files: ", redactedFiles);

    const handleDownloadPDF = async () => {
        try {
            // Step 1: Request blackout redaction
            const blackoutResponse = await fetch("https://legalai-backend-1.onrender.com/api/download_redacted_pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    file_path: `/var/data/users/${uniqueIdentifier}/${files[0].name}`,
                    keywords_instances: keywordsWithCoordinates,
                    unique_identifier: uniqueIdentifier,
                }),
            });

            if (!blackoutResponse.ok) {
                throw new Error("Failed to generate blackout redacted PDF");
            }

            const blackoutData = await blackoutResponse.json();
            const filePath = blackoutData.file_path;

            // Step 2: Fetch the blackout file
            const fileResponse = await fetch("https://legalai-backend-1.onrender.com/api/get_file", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ file_path: filePath }),
            });

            if (!fileResponse.ok) {
                throw new Error("Failed to fetch blackout file");
            }

            const blob = await fileResponse.blob();
            const url = window.URL.createObjectURL(blob);

            // Trigger file download
            const link = document.createElement("a");
            link.href = url;
            link.download = `Redacted_${files[0].name}`;
            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(url); // Clean up the URL object
        } catch (error) {
            console.error("Error downloading blackout file:", error);
            toast.error("An error occurred while downloading the file.");
        }
    };

    return (
        <div className="bg-gray-100 flex flex-col items-center min-h-screen w-screen">
            <ToastContainer />
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
                <div className="flex flex-col items-center p-4 sm:p-6 flex-1 w-full">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 text-center">
                        Redact: Secure Document Redaction Tool
                    </h1>
                    <div className="bg-white shadow-md rounded-lg w-full max-w-2xl p-4 sm:p-6">
                        {/* Step Progress */}
                        <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
                            <div className="flex items-center space-x-2 mb-4 sm:mb-0">
                                <span className="w-8 h-8 flex items-center justify-center bg-gray-800 text-white rounded-full">
                                    1
                                </span>
                                <span className="text-gray-800 font-semibold">Upload Files</span>
                            </div>
                            <div className="flex items-center space-x-2 mb-4 sm:mb-0">
                                <span className="w-8 h-8 flex items-center justify-center bg-gray-300 text-white rounded-full">
                                    2
                                </span>
                                <span className="text-gray-500">Add Redaction Tags</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="w-8 h-8 flex items-center justify-center bg-gray-300 text-white rounded-full">
                                    3
                                </span>
                                <span className="text-gray-500">Verify Files</span>
                            </div>
                        </div>

                        {/* File Upload Section */}
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 text-center">
                            Upload Files
                        </h2>
                        <div className="mb-4 flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-2">
                            <label className="bg-gray-200 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 cursor-pointer flex items-center justify-center">
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
                            <span className="text-gray-500">OR</span>
                            <button
                                className="bg-gray-200 px-4 py-2 rounded-lg border border-gray-300 text-gray-700"
                                onClick={() => {
                                    // Implement sample file upload functionality if needed
                                    toast.info("Sample file functionality not implemented.");
                                }}
                            >
                                Try Sample File
                            </button>
                        </div>

                        <div
                            className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center text-gray-500 cursor-pointer"
                            onDrop={(e) => {
                                e.preventDefault();
                                setFiles((prevFiles) => [
                                    ...prevFiles,
                                    ...Array.from(e.dataTransfer.files),
                                ]);
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onClick={() => {
                                // Trigger file input on click
                                document.getElementById("fileInput").click();
                            }}
                        >
                            Drag and drop files here, or click to select files
                            <input
                                type="file"
                                multiple
                                id="fileInput"
                                className="hidden"
                                onChange={(e) =>
                                    setFiles((prevFiles) => [
                                        ...prevFiles,
                                        ...Array.from(e.target.files),
                                    ])
                                }
                            />
                        </div>

                        {/* File Preview */}
                        <ul className="mt-4 space-y-2">
                            {files.map((file, index) => (
                                <li
                                    key={index}
                                    className="flex flex-col sm:flex-row justify-between items-center bg-gray-100 p-2 sm:p-4 rounded-lg shadow"
                                >
                                    <span className="text-gray-700">{file.name}</span>
                                    <span className="text-sm text-gray-500 mt-1 sm:mt-0">
                                        {(file.size / 1024).toFixed(2)} KB
                                    </span>
                                </li>
                            ))}
                        </ul>

                        <p className="text-sm sm:text-base text-blue-500 mt-4 text-center">
                            Upload up to 5 PDF or Word files. We don’t store your files.
                        </p>

                        <button
                            className="mt-6 w-full bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-900 transition text-center"
                            onClick={handleUpload}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Add Redaction Tags */}
            {step === 2 && !loading && (
                <div className="flex flex-col items-center p-4 sm:p-6 flex-1 w-full">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 text-center">
                        Add Redaction Tags
                    </h1>
                    <div className="bg-white shadow-md rounded-lg w-full max-w-2xl p-4 sm:p-6">
                        {/* Step Progress */}
                        <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
                            <div className="flex items-center space-x-2 mb-4 sm:mb-0">
                                <span className="w-8 h-8 flex items-center justify-center bg-gray-300 text-white rounded-full">
                                    ✓
                                </span>
                                <span className="text-gray-500">Upload Files</span>
                            </div>
                            <div className="flex items-center space-x-2 mb-4 sm:mb-0">
                                <span className="w-8 h-8 flex items-center justify-center bg-gray-800 text-white rounded-full">
                                    2
                                </span>
                                <span className="text-gray-800 font-semibold">
                                    Add Redaction Tags
                                </span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="w-8 h-8 flex items-center justify-center bg-gray-300 text-white rounded-full">
                                    3
                                </span>
                                <span className="text-gray-500">Verify Files</span>
                            </div>
                        </div>

                        {/* Redaction Tags UI */}
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 text-center">
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
                                        className="ml-2 text-blue-500 hover:text-blue-700 focus:outline-none"
                                        onClick={() => handleRemoveTag(tag)}
                                        aria-label={`Remove tag ${tag}`}
                                    >
                                        ✕
                                    </button>
                                </span>
                            ))}
                        </div>

                        {/* Tag Input */}
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                            <input
                                type="text"
                                placeholder="Type tags separated by commas (e.g., 'names, dates, phone numbers')"
                                className="flex-1 p-2 border border-gray-300 rounded-lg"
                            />
                            <button
                                className="w-full sm:w-auto bg-gray-800 text-white py-2 px-4 rounded-lg hover:bg-gray-900 transition"
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
                            <div className="flex flex-wrap sm:flex-nowrap space-x-0 sm:space-x-4 space-y-2 sm:space-y-0">
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

                        <p className="text-sm sm:text-base text-blue-500 mt-4 text-center">
                            Large files take more time, please don’t leave or reload the page.
                        </p>

                        {/* Back and Redact Buttons */}
                        <div className="flex flex-col sm:flex-row justify-between mt-6 w-full gap-2 sm:gap-0">
                            <button
                                className="w-full sm:w-auto bg-gray-300 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-400 transition"
                                onClick={() => setStep(1)} // Go back to upload files step
                            >
                                Back
                            </button>
                            <button
                                className="w-full sm:w-auto bg-gray-800 text-white py-2 px-4 rounded-lg hover:bg-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="flex flex-col items-center p-4 sm:p-6 flex-1 w-full">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 text-center">
                        Verify Files
                    </h1>
                    <div className="bg-white shadow-md rounded-lg w-full max-w-2xl p-4 sm:p-6">
                        {/* Step Progress */}
                        <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
                            <div className="flex items-center space-x-2 mb-4 sm:mb-0">
                                <span className="w-8 h-8 flex items-center justify-center bg-gray-300 text-white rounded-full">
                                    ✓
                                </span>
                                <span className="text-gray-500">Upload Files</span>
                            </div>
                            <div className="flex items-center space-x-2 mb-4 sm:mb-0">
                                <span className="w-8 h-8 flex items-center justify-center bg-gray-300 text-white rounded-full">
                                    ✓
                                </span>
                                <span className="text-gray-500">Add Redaction Tags</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="w-8 h-8 flex items-center justify-center bg-gray-800 text-white rounded-full">
                                    3
                                </span>
                                <span className="text-gray-800 font-semibold">Verify Files</span>
                            </div>
                        </div>

                        {/* Redacted Files Section */}
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 text-center">
                            Redacted Files:
                        </h2>
                        <ul className="space-y-4">
                            {redactedFiles.map((file, index) => (
                                <li
                                    key={index}
                                    className="flex flex-col sm:flex-row items-center justify-between bg-gray-100 p-4 rounded-lg shadow"
                                >
                                    <div className="flex items-center space-x-4">
                                        <span className="text-gray-700 font-medium">
                                            {index + 1}. {file.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                                        {/* Edit Button */}
                                        <button
                                            className="text-blue-500 hover:text-blue-700 flex items-center"
                                            onClick={() => openEditModal(file)}
                                        >
                                            ✏️ Edit
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        {/* Final Redaction and Download */}
                        <button
                            className="mt-6 w-full bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-900 transition text-center"
                            onClick={handleDownloadPDF}
                        >
                            Download Redacted PDF
                        </button>

                        <p className="text-sm sm:text-base text-blue-500 mt-4 text-center">
                            *Please verify all redacted documents carefully before sharing or distributing.
                        </p>
                        <p className="text-sm sm:text-base text-blue-500">
                            Preview/edit redactions using the edit button. Download redacted documents.
                        </p>

                        {/* Reset and Back Buttons */}
                        <div className="flex flex-col sm:flex-row justify-between mt-6 w-full gap-2 sm:gap-0">
                            <button
                                className="w-full sm:w-auto bg-gray-300 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-400 transition"
                                onClick={() => setStep(2)} // Go back to Add Redaction Tags
                            >
                                Back
                            </button>
                            <button
                                className="w-full sm:w-auto bg-gray-800 text-white py-2 px-4 rounded-lg hover:bg-gray-900 transition"
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

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onRequestClose={closeEditModal}
                className="bg-white rounded-lg shadow-xl p-4 mx-2 sm:mx-4 lg:mx-auto w-full max-w-4xl h-full sm:h-auto md:max-h-[90vh] flex flex-col sm:flex-row overflow-hidden"
                overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4"
            >
                <div className="flex-1 flex flex-col">
                    {/* Header with Back Button */}
                    <div className="flex justify-between items-center mb-4">
                        <button
                            className="text-gray-500 hover:text-gray-700 text-lg sm:text-xl focus:outline-none"
                            onClick={closeEditModal}
                            aria-label="Close Edit Modal"
                        >
                            ← Back
                        </button>
                        <h2 className="text-xl sm:text-2xl font-bold text-center">Edit Redactions</h2>
                        <div></div> {/* Placeholder for alignment */}
                    </div>

                    <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
                        {/* PDF Preview */}
                        {/* PDF Preview */}
<div className="w-full sm:w-3/5 h-64 sm:h-auto min-h-[50vh] sm:min-h-[30vh] border-r-2 overflow-y-auto p-2 sm:p-4">
    <h3 className="text-lg sm:text-xl font-semibold mb-2 text-center">
        Preview: {selectedFile?.name}
    </h3>
    {pdfBlobUrl ? (
        <iframe
            src={pdfBlobUrl}
            title={`Preview of ${selectedFile.name}`}
            className="w-full h-full min-h-[50vh] sm:min-h-[30vh] border rounded-lg"
            style={{
                height: 'calc(100% - 1rem)', // Dynamically adjusts to the parent container's height
                width: '100%',
            }}
            frameBorder="0"
        />
    ) : (
        <p className="text-gray-500 text-center">Loading PDF...</p>
    )}
</div>


                        {/* Redacted Strings */}
                        <div className="w-full sm:w-2/5 h-64 sm:h-auto flex flex-col p-2 sm:p-4 overflow-y-auto">
                            <h3 className="text-lg sm:text-xl font-semibold mb-2 text-center">
                                Redacted Strings
                            </h3>
                            <div className="flex-1 overflow-y-auto">
                                {redactedWords.length > 0 ? (
                                    redactedWords.map((string, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between bg-gray-100 p-2 rounded-lg mb-2"
                                        >
                                            <input
                                                type="text"
                                                value={string}
                                                onChange={(e) => handleUpdateText(index, e.target.value)}
                                                className="flex-1 p-2 border rounded-lg text-sm sm:text-base"
                                                placeholder="Enter redacted text"
                                            />
                                            <button
                                                className="ml-2 text-red-500 hover:text-red-700 text-lg sm:text-xl focus:outline-none"
                                                onClick={() => handleRemoveText(index)}
                                                aria-label={`Remove redacted text ${string}`}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-center">No redacted strings available.</p>
                                )}
                            </div>
                            <button
                                className="mt-4 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition text-sm sm:text-base"
                                onClick={handleAddText}
                            >
                                + Add New Text
                            </button>
                            <button
                                className={`mt-4 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition text-sm sm:text-base ${
                                    redactedWords.length === 0 || loading
                                        ? "opacity-50 cursor-not-allowed"
                                        : ""
                                }`}
                                onClick={() => {
                                    setTags(redactedWords); // Update tags with redacted words
                                    setIsEditOpen(isEditModalOpen); // Save modal open state
                                    closeEditModal(); // Close modal
                                    handleRedact(); // Perform redaction
                                    setLoading(true); // Show loading
                                }}
                                disabled={redactedWords.length === 0 || loading}
                            >
                                Update Redaction
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default RedactTool;
