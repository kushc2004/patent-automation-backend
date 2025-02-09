// SearchPanel.jsx

import React, { useState, useEffect } from "react";
import axios from "axios";

const SearchPanel = ({ openCaseOverlay, isCaseOverlayOpen, setIsCaseOverlayOpen, setSelectedSearchCases, overlayContent, setSelectedOption, setMessages }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCaseText, setActiveCaseText] = useState(null);
  const [isSplitView, setIsSplitView] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedCases, setSelectedCases] = useState([]);

  // Persist selected cases to parent
  useEffect(() => {
    setSelectedSearchCases(selectedCases);
  }, [selectedCases, setSelectedSearchCases]);

  console.log("setSelectedSearchCases: ", selectedCases);

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);

    const updatedFiles = files.map((file) => ({
      originalName: file.name,
      type: file.type,
      url: URL.createObjectURL(file), // Create Blob URL
    }));

    setUploadedFiles((prev) => [...prev, ...updatedFiles]);

    // Save to local storage
    const existingFiles = JSON.parse(localStorage.getItem("savedSearchFiles")) || [];
    localStorage.setItem("savedSearchFiles", JSON.stringify([...existingFiles, ...updatedFiles]));
  };

  const handleFileSelect = (file) => {
    setSelectedFiles((prevSelected) => {
      const isSelected = prevSelected.includes(file);

      const updatedSelectedFiles = isSelected
        ? prevSelected.filter((item) => item !== file)
        : [...prevSelected, file];

      saveToLocalStorage(updatedSelectedFiles);
      return updatedSelectedFiles;
    });
  };

  const handleSelectAllFiles = () => {
    if (selectedFiles.length === uploadedFiles.length) {
      setSelectedFiles([]);
      saveToLocalStorage([]);
    } else {
      setSelectedFiles([...uploadedFiles]);
      saveToLocalStorage([...uploadedFiles]);
    }
  };

  const saveToLocalStorage = (files) => {
    localStorage.setItem("savedSelectedFiles", JSON.stringify(files));
  };

  // Function to handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      // Send search query to the backend
      const formData = new URLSearchParams();
      formData.append("query", searchQuery);

      async function fetchAndFilterCases(formData) {
        try {
          const searchResponse = await axios.post(
            "https://legalai-backend-1.onrender.com/api/search-query",
            formData,
            {
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
            }
          );
      
          const similarCases = searchResponse.data.similar_cases;
      
          // Step 1: Sort cases by distance
          const sortedCases = similarCases.sort((a, b) => a.distance - b.distance);
      
          // Step 2: Find min and max distances
          const distances = sortedCases.map((caseItem) => caseItem.distance);
          const minDistance = Math.min(...distances);
          const maxDistance = Math.max(...distances);
      
          // Step 3: Normalize distances
          sortedCases.forEach((caseItem) => {
            caseItem.normalized_distance =
              (caseItem.distance - minDistance) / (maxDistance - minDistance);
          });
      
          // Step 4: Calculate the percentile threshold (e.g., top 50%)
          const normalizedDistances = sortedCases.map(
            (caseItem) => caseItem.normalized_distance
          );
          const percentileThreshold =
            normalizedDistances.sort((a, b) => a - b)[
              Math.floor(normalizedDistances.length * 0.5)
            ]; // 50th percentile
      
          // Step 5: Filter cases based on normalized distance
          const filteredCases = sortedCases.filter(
            (caseItem) => caseItem.normalized_distance <= percentileThreshold
          );
      
          return filteredCases;
        } catch (error) {
          console.error("Error fetching and filtering cases:", error);
        }
      }

      setMessages((prevMessages) => [
        ...prevMessages,
        { text: `Search query: "${searchQuery}"`, sender: 'user' }
    ]);


      const similarCases = await fetchAndFilterCases(formData);

      // Fetch detailed case JSON for each case_id
      const caseDetailsPromises = similarCases.map(async (caseObj) => {
        const caseId = caseObj.case_id;
        const caseJsonResponse = await axios.get(`https://legalai-backend-1.onrender.com/fetch-case-json/${caseId}`);
        return caseJsonResponse.data.case_json; // Return the detailed case JSON
      });

      // Wait for all case details to resolve
      const detailedCases = await Promise.all(caseDetailsPromises);

      // Update search results state
      setSearchResults(detailedCases);
    } catch (error) {
      console.error("Error fetching search results or case details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaseClick = async (caseId) => {
    try {
      const response = await axios.get(`https://legalai-backend-1.onrender.com/fetch-case-text/${caseId}`);
      setActiveCaseText({ ...response.data, case_id: caseId });
      openCaseOverlay(response.data.paragraphs)
    } catch (error) {
      console.error("Error fetching case text:", error);
    }
  };

  const handleSelectCase = (caseJson) => {
    setSelectedCases((prevSelected) => {
      if (prevSelected.includes(caseJson)) {
        return prevSelected.filter((item) => item !== caseJson);
      }
      return [...prevSelected, caseJson];
    });
  };
  
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedCases([]);
    } else {
      setSelectedCases(searchResults.map((result) => result));
    }
    setSelectAll(!selectAll);
  };

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  let parsedOverlayContent;
    try {
    // Ensure overlayContent is a valid JSON string
    parsedOverlayContent = JSON.parse(overlayContent);
    } catch (error) {
      parsedOverlayContent = overlayContent;
    }

  return (
    <div className="bg-[#EFF3F6] p-6 rounded-2xl my-4 overflow-y-auto flex-grow shadow-md">

      {/* Back Button */}
      <button
        onClick={() => setSelectedOption(null)} // Go back to the option selection screen
        className="bg-gray-700 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 focus:outline-none mb-4"
      >
        Back
      </button>

      {/* Search Box */}
      <div className="flex items-center bg-white py-1 px-2 my-4 rounded-xl shadow-sm border border-gray-300">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSelectedCases([]);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search cases..."
          className="flex-1 outline-none text-gray-700 font-medium placeholder-gray-400"
        />
        <button
          onClick={handleSearch}
          className="ml-2 bg-gray-700 text-white p-1 rounded-lg hover:bg-blue-600 transition duration-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1116.65 7.5a7.5 7.5 0 010 10.6z"
            />
          </svg>
        </button>
      </div>

      {/* Search Results */}
      <div className="mt-6">

        <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">Select All</label>
        </div>

        {isLoading ? (
            <p className="text-center text-gray-500">Loading...</p>
        ) : searchResults.length > 0 ? (
            !isCaseOverlayOpen ? (
            <ul className="space-y-4 max-h-[60vh] overflow-y-auto">
                {searchResults.map((result, index) => (
                <div className="flex items-start" key={index}>
                    <li
                        className="w-full p-3 bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out cursor-pointer"
                        onClick={() =>{ 
                          handleCaseClick(result.case_id);
                          handleSelectCase(result);
                        }}
                    >
                        <h3 className="text-lg font-semibold text-[#26262A] truncate">
                        {result.case_title}
                        </h3>
                        <p className="text-sm text-gray-500">{result.date}</p>
                        <p className="text-sm text-gray-500">{result.court_type}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {result.tags &&
                            result.tags.map((tag, idx) =>
                              idx <= 4 ? (
                                <span
                                  key={idx}
                                  className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-md"
                                >
                                  {tag}
                                </span>
                              ) : null
                            )}
                        </div>
                    </li>
                    <input
                      type="checkbox"
                      checked={selectedCases.includes(result)}
                      onChange={() => handleSelectCase(result)}
                      className="m-2 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
                    />
                </div>
                ))}
            </ul>
            ) : (
            <div className="h-full">
                <button
                    onClick={() => setIsCaseOverlayOpen(false)}
                    className="float-right w-6 h-6 bg-gray-300 rounded-full text-gray-500 text-lg font-semibold flex items-center justify-center shadow-md hover:bg-gray-400 hover:text-gray-900 transition duration-300"
                >
                    &times;
                </button>

                <h3 className="text-lg font-bold mb-4 flex justify-between items-center">
                  Case Details
                  {searchResults?.find((result) => result.case_id === activeCaseText?.case_id)?.doc_link ? (
                      <button
                          onClick={() =>
                              window.open(
                                  searchResults.find((result) => result.case_id === activeCaseText?.case_id)?.doc_link,
                                  "_blank"
                              )
                          }
                          className="bg-blue-600 text-white px-3 py-1 mr-4 rounded-md text-sm hover:bg-blue-700 transition duration-300 shadow-md"
                      >
                          Open Document
                      </button>
                  ) : (
                      <button
                          disabled
                          className="bg-gray-300 text-gray-600 px-3 py-1 mr-4 rounded-md text-sm cursor-not-allowed shadow-md"
                      >
                          Open Document
                      </button>
                  )}
              </h3>

                <div className="text-gray-800 overflow-auto h-full max-h-[60vh]">

                {typeof activeCaseText !== "string" ? (

                    <div className="mb-4 whitespace-pre-line">
                    {Array.isArray(parsedOverlayContent) ? (
                    parsedOverlayContent.length > 0 ? (
                        parsedOverlayContent.map((item, index) => (
                        <p key={index} className="mb-2" >
                            {item}
                        </p>
                        ))
                    ) : (
                        <p>No content available</p>
                    )
                    ) : (
                    <p dangerouslySetInnerHTML={{ __html: parsedOverlayContent || "No content available"}}></p>
                    )}
                    </div>

                    
                    ) : (
                    <p className="mb-4 whitespace-pre-line">{"No content available"}</p>
                )}

                </div>
            </div>
            )
        ) : (
            <p className="text-center text-gray-500">No results found. Try a different query.</p>
        )}
      </div>

    </div>
  );
};

export default SearchPanel;
