import React, { useState, useEffect } from 'react';
import {
  Search,
  Loader2,
  Mail,
  Send,
  Eye,
  Check,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import usePerplexityClient from '../../components/usePerplexityClient';
import useGeminiClient from '../../components/useGeminiClient';
import useUploadFile from '../../components/useUploadFile';
import useGetFile from '../../components/useGetFile';



const VCOutreach = () => {
const { getFile } = useGetFile();
const { uploadFile } = useUploadFile();
  const { fetchResponse: fetchPerplexityResponse, loading: perplexityLoading } =
    usePerplexityClient();
  const { fetchResponse: fetchGeminiResponse, loading: geminiLoading } =
    useGeminiClient();

    const [uniqueIdentifier] = useState(
    sessionStorage.getItem("uniqueIdentifier") || "defaultUser"
    ); 
    const [startupData, setStartupData] = useState(() => {
        const storedData = sessionStorage.getItem("startupData");
        return storedData ? JSON.parse(storedData) : null;
      });

    //console.log("startupData in vc oureach", startupData);
      

  const [vcList, setVcList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadVCOutreachData = async () => {
      const filePath = `/var/data/users/${uniqueIdentifier}/startup/vc_outreach.json`;
      
      try {
        const storedVCData = await getFile(filePath);
  
        if (!storedVCData) {
            console.log("⚠ No stored data found.");
            return;
          }
    
          let parsedData;
    
          // Ensure JSON is properly parsed (string vs. object check)
          if (typeof storedVCData === "string") {
            try {
              parsedData = JSON.parse(storedVCData.trim()); // ✅ Parse only if it's a string
            } catch (error) {
              console.error("❌ JSON Parsing Error:", error);
              return;
            }
          } else if (Array.isArray(storedVCData)) {
            parsedData = storedVCData; // ✅ Already an array, no need to parse
          } else {
            console.error("❌ Unexpected data format:", storedVCData);
            return;
          }
    
          
          if (Array.isArray(parsedData)) {
            setVcList(parsedData); // ✅ Ensure state updates correctly
            console.log("Loaded VC Outreach Data:", parsedData);
          } else {
            console.error("Invalid data format received:", parsedData);
          }
        
      } catch (error) {
        console.error("Error fetching stored VC outreach data:", error);
      }
    };
  
    loadVCOutreachData();
  }, [uniqueIdentifier]);

  const fetchVCOutreach = async () => {
    setLoading(true);

    // Define prompt for Perplexity AI
    const perplexityPrompt = `
      Find **Venture Capital (VC) firms** that are specifically interested in startups like **"${startupData.companyName}"**.
      - The startup operates in **${startupData.industry}**.
      - The startup is at the **${startupData.stage}** stage.
      - The startup is currently looking for **${startupData.fundingNeeded}** in funding.
      - About startup **${startupData.oneLiner}**.
      - About startup technoly **${startupData.coreTechnology}**.

      Return the **top 5 VCs** that have funded similar startups recently.  
      Each VC should include:
      - Name of VC Firm
      - Website
      - Contact Email (if available)
      - Investment Focus
    `;

    const perplexityResponse = await fetchPerplexityResponse(perplexityPrompt);
    if (!perplexityResponse) {
      setLoading(false);
      return;
    }

    // Define prompt for Gemini AI
    const geminiPrompt = `
      Format the following Venture Capital (VC) firms data into a structured JSON format:

      **Expected JSON format:**
      [
        {
          "name": "Sequoia Capital",
          "website": "https://www.sequoiacap.com",
          "email": "contact@sequoia.com",
          "focus": "Early-stage AI and tech startups"
        },
        {
          "name": "Andreessen Horowitz",
          "website": "https://www.a16z.com",
          "email": "info@a16z.com",
          "focus": "AI, blockchain, and Web3"
        }
      ]

      **Raw Data:**
      ${perplexityResponse}
    `;

    const structuredVCs = await fetchGeminiResponse(geminiPrompt);
    try {
      const vcData = JSON.parse(structuredVCs);
      setVcList(vcData);

      // Convert the VC List to a JSON file
    const vcOutreachBlob = new Blob([JSON.stringify(vcData, null, 2)], { type: "application/json" });
    const vcOutreachFile = new File([vcOutreachBlob], "vc_outreach.json", { type: "application/json" });

    // Upload the JSON file to the backend
    const folderPath = `users/${uniqueIdentifier}/startup`;
    const uploadResult = await uploadFile(vcOutreachFile, folderPath);

    if (uploadResult) {
      console.log("VC outreach data uploaded successfully.");
    } else {
      console.error("Failed to upload VC outreach data.");
    }
    } catch (error) {
      console.error("Error parsing Gemini response:", error);
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Fetch VC Button */}
      

      {/* Display VCs */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Mail className="mr-2" />
          Suggested VCs
        </h3>

        <div className="flex justify-center my-4">
        <button
          className="flex items-center px-2 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
          onClick={fetchVCOutreach}
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
        ) : vcList.length > 0 ? (
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left">VC Name</th>
                <th className="px-4 py-3 text-left">Website</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Investment Focus</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vcList.map((vc, index) => (
                <tr key={index} className="border-b">
                  <td className="px-4 py-3">{vc.name}</td>
                  <td className="px-4 py-3">
                    <a
                      href={vc.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Visit
                    </a>
                  </td>
                  <td className="px-4 py-3">{vc.email || "N/A"}</td>
                  <td className="px-4 py-3">{vc.focus}</td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Eye size={16} />
                      </button>
                      <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                        <Send size={16} />
                      </button>
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
          <p className="text-gray-500 text-center">No VC data available. Click the button above to fetch data.</p>
        )}
      </div>
    </div>
  );
};

export default VCOutreach;
