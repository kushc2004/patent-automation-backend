import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate for navigation
import TopBar from "../../components/TopBar";
import LeftContent from "./LeftContent";
import RightContent from "./RightContent";

const PatentPage = () => {
  const [selectedOption, setSelectedOption] = useState("Data");
  const [formData, setFormData] = useState({
    Data: { inventors: "", organization: "", format: "" },
    "Upload Figure(s)": { uploadedFile: null, additionalDetails: "" },
    "Q1: Problem description": "",
    "Q2: Solution description": "",
    "Q3: Novel features or aspects": "",
    "Q4: Invention title": "",
    "Q5: Patent search": "",
    "Q6: Claims type": "",
    "Q7: Advantages over prior arts": "",
    "Q8: Functionality": "",
  });

  const navigate = useNavigate(); // Initialize useNavigate for navigation
  const [uniqueIdentifier] = useState(
    sessionStorage.getItem("uniqueIdentifier") || "defaultUser"
  );

  const updateData = (section, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: value,
    }));
  };

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      updateData("Upload Figure(s)", {
        uploadedFile: {
          base64: event.target.result.split(",")[1],
          mimeType: file.type,
          name: file.name,
        },
        additionalDetails: formData["Upload Figure(s)"].additionalDetails,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAdditionalDetailsChange = (details) => {
    updateData("Upload Figure(s)", {
      ...formData["Upload Figure(s)"],
      additionalDetails: details,
    });
  };

  const handleNext = () => {
    const options = Object.keys(formData);
    const currentIndex = options.indexOf(selectedOption);
    if (currentIndex < options.length - 1) {
      setSelectedOption(options[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const options = Object.keys(formData);
    const currentIndex = options.indexOf(selectedOption);
    if (currentIndex > 0) {
      setSelectedOption(options[currentIndex - 1]);
    }
  };

  const uploadFileToBackend = async (file) => {
    const formData = new FormData();
    formData.append("folder_name", `users/${uniqueIdentifier}`);
    formData.append("file", file);

    const response = await fetch(
      "https://legalai-backend-1.onrender.com/api/upload_file",
      {
        method: "POST",
        body: formData,
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to upload file");
    }

    const result = await response.json();
    return result.file_url; // Assuming the backend returns the uploaded file URL
  };

  const handleGenerateDraft = async () => {
    try {
      const { uploadedFile } = formData["Upload Figure(s)"];
      let fileUrl = null;

      if (uploadedFile) {
        const file = new Blob([Uint8Array.from(atob(uploadedFile.base64), (c) => c.charCodeAt(0))], {
          type: uploadedFile.mimeType,
        });

        // Upload the file to the backend
        fileUrl = await uploadFileToBackend(file);
      }

      // Navigate to the DraftPage with the form data and file URL
      navigate("/draft", {
        state: { formData, figures: { ...formData["Upload Figure(s)"], fileUrl } },
      });
    } catch (error) {
      console.error("Error generating draft:", error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <TopBar />
      <div className="flex flex-1 w-full mx-auto mt-6">
        <LeftContent
          options={Object.keys(formData)}
          onOptionClick={setSelectedOption}
          selectedOption={selectedOption}
        />
        <div className="flex flex-col w-3/4 m-6">
          <RightContent
            selectedOption={selectedOption}
            formData={formData}
            updateData={updateData}
            handleFileUpload={handleFileUpload}
            handleAdditionalDetailsChange={handleAdditionalDetailsChange}
          />
          <div className="flex justify-between mt-4">
            <button
              onClick={handleBack}
              disabled={Object.keys(formData).indexOf(selectedOption) === 0}
              className={`px-6 py-2 rounded-md font-semibold ${
                Object.keys(formData).indexOf(selectedOption) === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-gray-700 text-white hover:bg-gray-600"
              }`}
            >
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={
                Object.keys(formData).indexOf(selectedOption) ===
                Object.keys(formData).length - 1
              }
              className={`px-6 py-2 rounded-md font-semibold ${
                Object.keys(formData).indexOf(selectedOption) ===
                Object.keys(formData).length - 1
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-gray-700 text-white hover:bg-gray-600"
              }`}
            >
              Next Step
            </button>
            {/* Generate Draft Button */}
            <button
              onClick={handleGenerateDraft}
              className="px-6 py-2 rounded-md font-semibold bg-red-600 text-white hover:bg-red-700"
            >
              Generate Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatentPage;
