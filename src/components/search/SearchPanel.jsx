// Import required libraries (React, TailwindCSS, etc.)
import React, { useState } from "react";
import axios from "axios";

const SearchPanel = ({openCaseOverlay, isCaseOverlayOpen, setIsCaseOverlayOpen, setSelectedSearchCases, overlayContent}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCaseText, setActiveCaseText] = useState(null);
  const [isSplitView, setIsSplitView] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedCases, setSelectedCases] = useState([]);

  setSelectedSearchCases(selectedCases);

  // Function to handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
  
    setIsLoading(true);
    try {
      // Send search query to the backend
      const formData = new URLSearchParams();
      formData.append("query", searchQuery);
  
      const searchResponse = await axios.post("https://legalai-backend-1.onrender.comapi/search-query", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
  
      const similarCases = searchResponse.data.similar_cases;
  
      // Fetch detailed case JSON for each case_id
      const caseDetailsPromises = similarCases.map(async (caseObj) => {
        const caseId = caseObj.case_id;
        const caseJsonResponse = await axios.get(`https://legalai-backend-1.onrender.comfetch-case-json/${caseId}`);
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
      const response = await axios.get(`https://legalai-backend-1.onrender.comfetch-case-text/${caseId}`);
      setActiveCaseText(response.data);
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
    console.error("Error parsing overlayContent:", error.message);
    // If parsing fails, fallback to plain text
    parsedOverlayContent = overlayContent;
    }

  return (
    <div className="bg-[#EFF3F6] p-6 rounded-2xl my-4 mx-1 overflow-y-auto flex-shrink-0 shadow-md">
      {/* Search Box */}
      <div className="flex items-center bg-white py-1 px-2 rounded-xl shadow-sm border border-gray-300">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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
            <ul className="space-y-4">
                {searchResults.map((result, index) => (
                <div className="flex flex-1">
                    <li
                        key={index}
                        className="w-full p-4 bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out"
                        onClick={() => handleCaseClick(result.case_id)}
                    >
                        <h3 className="text-lg font-semibold text-[#26262A] truncate">
                        {result.case_title}
                        </h3>
                        <p className="text-sm text-gray-500">{result.date}</p>
                        <p className="text-sm text-gray-500">{result.court_type}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                        {result.tags &&
                            result.tags.map((tag, idx) => (
                            <span
                                key={idx}
                                className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-md"
                            >
                                {tag}
                            </span>
                            ))}
                        </div>
                    </li>
                    <input
                      type="checkbox"
                      checked={selectedCases.includes(result)}
                      onChange={() => handleSelectCase(result)}
                      className="ml-1 w-6 h-6 text-blue-600 bg-gray-100 border-gray-300 rounded"
                    />
                </div>
                ))}
            </ul>
            ) : (
            <div className="h-full">
                <button
                onClick={() => setIsCaseOverlayOpen(false)}
                className="float-right text-gray-500 text-lg font-semibold"
                >
                &times;
                </button>
                <h3 className="text-lg font-bold mb-4">Case Details</h3>
                <div className="text-gray-800 overflow-auto h-full max-h-[76vh]">
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
                    {console.log(parsedOverlayContent)}
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
