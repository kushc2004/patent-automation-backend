import React, { useState, useEffect } from "react";
import {
  Loader2,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import usePerplexityClient from "../../components/usePerplexityClient";
import useGeminiClient from "../../components/useGeminiClient";
import useUploadFile from "../../components/useUploadFile";
import useGetFile from "../../components/useGetFile";

const ProgramSearch = () => {
  const { getFile } = useGetFile();
  const { uploadFile } = useUploadFile();
  const { fetchResponse: fetchPerplexityResponse, loading: perplexityLoading } =
    usePerplexityClient();
  const { fetchResponse: fetchGeminiResponse, loading: geminiLoading } =
    useGeminiClient();

  const [uniqueIdentifier] = useState(
    sessionStorage.getItem("uniqueIdentifier") || "defaultUser"
  );
  const [startupData] = useState(() => {
    const storedData = sessionStorage.getItem("startupData");
    return storedData ? JSON.parse(storedData) : null;
  });

  const [programList, setProgramList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load existing programs from the backend
  useEffect(() => {
    const loadProgramData = async () => {
      const filePath = `/var/data/users/${uniqueIdentifier}/startup/programs.json`;

      try {
        const storedData = await getFile(filePath);

        if (!storedData) {
          console.log("⚠ No stored program data found.");
          return;
        }

        let parsedData;
        if (typeof storedData === "string") {
          parsedData = JSON.parse(storedData.trim());
        } else if (Array.isArray(storedData)) {
          parsedData = storedData;
        } else {
          console.error("❌ Unexpected data format:", storedData);
          return;
        }

        if (Array.isArray(parsedData)) {
          setProgramList(parsedData);
          console.log("✅ Loaded Program Data:", parsedData);
        } else {
          console.error("❌ Parsed data is not an array:", parsedData);
        }
      } catch (error) {
        console.error("❌ Error fetching stored program data:", error);
      }
    };

    loadProgramData();
  }, [uniqueIdentifier]);

  // Fetch accelerator programs using AI APIs
  const fetchProgramSearch = async () => {
    setLoading(true);

    // Prompt for Perplexity AI
    const perplexityPrompt = `
      Find **startup accelerator programs** that are a good fit for **"${startupData.companyName}"**.
      - The startup operates in **${startupData.industry}**.
      - The startup is at the **${startupData.stage}** stage.
      - The startup is currently looking for **${startupData.fundingNeeded}** in funding.
      - About startup: **${startupData.oneLiner}**.
      - Startup technology: **${startupData.coreTechnology}**.

      Return the **top 10 accelerator programs** that the startup should apply to.  
      Each program should include:
      - Name of the accelerator
      - Official website link
      - A short description
    `;

    const perplexityResponse = await fetchPerplexityResponse(perplexityPrompt);
    if (!perplexityResponse) {
      setLoading(false);
      return;
    }

    // Format response using Gemini AI
    const geminiPrompt = `
      Format the following startup accelerator programs into a structured JSON format:

      **Expected JSON format:**
      [
        {
          "name": "Y Combinator",
          "website": "https://www.ycombinator.com/",
          "description": "Y Combinator provides seed funding and mentorship to early-stage startups."
        },
        {
          "name": "Techstars",
          "website": "https://www.techstars.com/",
          "description": "Techstars is a global accelerator that provides mentorship and investment to startups."
        }
      ]

      **Raw Data:**
      ${perplexityResponse}
    `;

    const structuredPrograms = await fetchGeminiResponse(geminiPrompt);
    try {
      const programData = JSON.parse(structuredPrograms);
      setProgramList(programData);

      // Convert the program list into a JSON file
      const programBlob = new Blob([JSON.stringify(programData, null, 2)], { type: "application/json" });
      const programFile = new File([programBlob], "programs.json", { type: "application/json" });

      // Upload the JSON file to the backend
      const folderPath = `users/${uniqueIdentifier}/startup`;
      const uploadResult = await uploadFile(programFile, folderPath);

      if (uploadResult) {
        console.log("✅ Program data uploaded successfully.");
      } else {
        console.error("❌ Failed to upload program data.");
      }
    } catch (error) {
      console.error("❌ Error parsing Gemini response:", error);
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">


      {/* Display Programs */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <ExternalLink className="mr-2" />
          Suggested Startup Programs
        </h3>

        <div className="flex justify-center my-4">
                <button
                  className="flex items-center px-2 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                  onClick={fetchProgramSearch}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : <RefreshCw size={20} className="mr-2" />}
                  Get Latest VC Outreach
                </button>
              </div>

        {loading || perplexityLoading || geminiLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-blue-600" size={40} />
          </div>
        ) : programList.length > 0 ? (
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left">Program Name</th>
                <th className="px-4 py-3 text-left">Website</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {programList.map((program, index) => (
                <tr key={index} className="border-b">
                  <td className="px-4 py-3">{program.name}</td>
                  <td className="px-4 py-3">
                    <a
                      href={program.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Visit
                    </a>
                  </td>
                  <td className="px-4 py-3">{program.description}</td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-2">
                      <button className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg">
                        <ExternalLink size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500 text-center">No program data available. Click the button above to find programs.</p>
        )}
      </div>
    </div>
  );
};

export default ProgramSearch;
