import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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

  const navigate = useNavigate();
  const [uniqueIdentifier] = useState(
    sessionStorage.getItem("uniqueIdentifier") || "defaultUser"
  );

  const allowedFileTypes = ["image/jpeg", "image/png", "image/gif", "application/pdf"]; // Allowed file types

  const updateData = (section, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: value,
    }));
  };

  const handleFileUpload = (file) => {
    if (!allowedFileTypes.includes(file.type)) {
      alert("Invalid file type. Only JPG, PNG, GIF, and PDF are allowed.");
      return;
    }

    // Store the original file object in formData
    updateData("Upload Figure(s)", {
      uploadedFile: file, // Store the raw file object
      additionalDetails: formData["Upload Figure(s)"].additionalDetails,
    });
  };

  const handleAdditionalDetailsChange = (details) => {
    updateData("Upload Figure(s)", {
      ...formData["Upload Figure(s)"],
      additionalDetails: details,
    });
  };

  const uploadFileToBackend = async (file) => {
    const formData = new FormData();
    formData.append("folder_name", `users/${uniqueIdentifier}/patent`);
    formData.append("file", file); // Directly append the file object

    console.log("Uploading file:", file);

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
    return result.message; // Return success message from the backend
  };

  const handleGenerateFigureDescription = async () => {
    const { uploadedFile } = formData["Upload Figure(s)"];

    if (!uploadedFile) {
      alert("Please upload a valid figure before generating the description.");
      return;
    }

    try {
      // Use the raw file object directly
      await uploadFileToBackend(uploadedFile);
      alert(`File '${uploadedFile.name}' uploaded successfully.`);
    } catch (error) {
      console.error("Error uploading figure:", error);
      alert("Failed to upload the figure. Please try again.");
    }
  };

  // const handleGenerateDraft = () => {
  //   navigate("/draft", {
  //     state: { formData, figures: formData["Upload Figure(s)"] },
  //   });
  // };

  const handleGenerateDraft = async () => {
    try {
        const { uploadedFile } = formData["Upload Figure(s)"];
        let filePath = null;

        if (uploadedFile) {
            filePath = `/var/data/users/${uniqueIdentifier}/patent/${uploadedFile.name}`;
        }

        // Navigate to DraftPage with formData and the constructed file path
        navigate("/draft", {
            state: { formData, figures: { ...formData["Upload Figure(s)"], filePath } },
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
            handleGenerateFigureDescription={handleGenerateFigureDescription}
          />
          <div className="flex justify-between mt-4">
            <button
              onClick={() => {
                const options = Object.keys(formData);
                const currentIndex = options.indexOf(selectedOption);
                if (currentIndex > 0) {
                  setSelectedOption(options[currentIndex - 1]);
                }
              }}
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
              onClick={() => {
                const options = Object.keys(formData);
                const currentIndex = options.indexOf(selectedOption);
                if (currentIndex < options.length - 1) {
                  setSelectedOption(options[currentIndex + 1]);
                }
              }}
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
