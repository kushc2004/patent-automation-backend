import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const RightContent = ({
    selectedOption,
    formData,
    updateData,
    handleFileUpload,
    handleAdditionalDetailsChange,
    handleGenerateFigureDescription,
  }) => {
    const [isModalOpen, setModalOpen] = useState(false);
    const navigate = useNavigate();
  
    const uploadFiguresContent = (
      <div>
        <h2 className="text-2xl font-bold mb-4">Upload Figure(s)</h2>
        <button
          className="bg-gray-700 text-white px-4 py-2 rounded-md shadow hover:bg-gray-600"
          onClick={() => setModalOpen(true)}
        >
          Upload an Image
        </button>
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center">
            <div className="bg-white w-2/4 h-2/4 rounded-lg shadow-lg p-6 relative">
              <button
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                onClick={() => setModalOpen(false)}
              >
                &times;
              </button>
              <h3 className="text-xl font-bold mb-4">Upload an Image</h3>
              <p className="text-sm text-gray-500 mb-4">You can upload only one image</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) handleFileUpload(file);
                }}
                className="mb-4"
              />
              {formData["Upload Figure(s)"].uploadedFile && (
                <div className="flex flex-col items-center">
                  <img
                    src={`data:${formData["Upload Figure(s)"].uploadedFile.mimeType};base64,${formData["Upload Figure(s)"].uploadedFile.base64}`}

                    alt="Uploaded"
                    className="w-full h-auto mb-2 rounded border"
                  />
                  <p className="text-sm text-gray-600">
                    {formData["Upload Figure(s)"].uploadedFile.name}
                  </p>
                </div>
              )}
              <label className="block text-gray-700 font-semibold mb-2">
                Additional Details
              </label>
              <textarea
                value={formData["Upload Figure(s)"].additionalDetails}
                onChange={(e) => handleAdditionalDetailsChange(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:outline-none"
                placeholder="Describe key features or components shown in the image..."
                rows="3"
                maxLength="300"
              />
              <button
                onClick={() => {
                    setModalOpen(false);
                    handleGenerateFigureDescription();}}
                className="mt-4 w-full bg-gray-700 text-white px-4 py-2 rounded-md shadow hover:bg-green-700"
              >
                Generate Description of the Figure
              </button>
            </div>
          </div>
        )}
      </div>
    );
  
    const content = {
        Data: (
          <div>
            <h2 className="text-2xl font-bold mb-4">Data</h2>
            <form className="bg-white shadow-lg rounded-lg p-6 space-y-6">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Name of Inventor(s)</label>
                <input
                  type="text"
                  value={formData.Data.inventors}
                  onChange={(e) => updateData("Data", { ...formData.Data, inventors: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Name of Organization</label>
                <input
                  type="text"
                  value={formData.Data.organization}
                  onChange={(e) =>
                    updateData("Data", { ...formData.Data, organization: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Select the Format</label>
                <div className="flex items-center space-x-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="format"
                      value="US"
                      checked={formData.Data.format === "US"}
                      onChange={(e) =>
                        updateData("Data", { ...formData.Data, format: e.target.value })
                      }
                      className="mr-2"
                    />
                    United States (US)
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="format"
                      value="JP"
                      checked={formData.Data.format === "JP"}
                      onChange={(e) =>
                        updateData("Data", { ...formData.Data, format: e.target.value })
                      }
                      className="mr-2"
                    />
                    Japan (JP)
                  </label>
                </div>
              </div>
            </form>
          </div>
        ),

        "Upload Figure(s)": uploadFiguresContent,
        "Q1: Problem description": (
          <div>
            <h2 className="text-2xl font-bold mb-4">Problem Description</h2>
            <textarea
              rows="6"
              value={formData["Q1: Problem description"]}
              onChange={(e) => updateData("Q1: Problem description", e.target.value)}
              className="w-full p-4 bg-white shadow-lg rounded-lg focus:ring-2 focus:ring-gray-500 focus:outline-none"
              placeholder="Describe the problem in detail..."
            />
          </div>
        ),
        "Q2: Solution description": (
          <div>
            <h2 className="text-2xl font-bold mb-4">Solution Description</h2>
            <textarea
              rows="6"
              value={formData["Q2: Solution description"]}
              onChange={(e) => updateData("Q2: Solution description", e.target.value)}
              className="w-full p-4 bg-white shadow-lg rounded-lg focus:ring-2 focus:ring-gray-500 focus:outline-none"
              placeholder="Describe the solution in detail..."
            />
          </div>
        ),
        "Q3: Novel features or aspects": (
          <div>
            <h2 className="text-2xl font-bold mb-4">Novel Features or Aspects</h2>
            <textarea
              rows="6"
              value={formData["Q3: Novel features or aspects"]}
              onChange={(e) => updateData("Q3: Novel features or aspects", e.target.value)}
              className="w-full p-4 bg-white shadow-lg rounded-lg focus:ring-2 focus:ring-gray-500 focus:outline-none"
              placeholder="Describe the novel features..."
            />
          </div>
        ),
        "Q4: Invention title": (
          <div>
            <h2 className="text-2xl font-bold mb-4">Invention Title</h2>
            <input
              type="text"
              value={formData["Q4: Invention title"]}
              onChange={(e) => updateData("Q4: Invention title", e.target.value)}
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:outline-none"
              placeholder="Enter the title of the invention"
            />
          </div>
        ),
        "Q5: Patent search": (
          <div>
            <h2 className="text-2xl font-bold mb-4">Patent Search</h2>
            <input
              type="text"
              value={formData["Q5: Patent search"]}
              onChange={(e) => updateData("Q5: Patent search", e.target.value)}
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:outline-none"
              placeholder="Enter keywords for patent search"
            />
          </div>
        ),
        "Q6: Claims type": (
          <div>
            <h2 className="text-2xl font-bold mb-4">Claims Type</h2>
            <select
              value={formData["Q6: Claims type"]}
              onChange={(e) => updateData("Q6: Claims type", e.target.value)}
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:outline-none"
            >
              <option value="">Select a claims type</option>
              <option value="Independent">Independent</option>
              <option value="Dependent">Dependent</option>
            </select>
          </div>
        ),
        "Q7: Advantages over prior arts": (
          <div>
            <h2 className="text-2xl font-bold mb-4">Advantages Over Prior Arts</h2>
            <textarea
              rows="6"
              value={formData["Q7: Advantages over prior arts"]}
              onChange={(e) => updateData("Q7: Advantages over prior arts", e.target.value)}
              className="w-full p-4 bg-white shadow-lg rounded-lg focus:ring-2 focus:ring-gray-500 focus:outline-none"
              placeholder="List advantages over prior arts..."
            />
          </div>
        ),
        "Q8: Functionality": (
          <div>
            <h2 className="text-2xl font-bold mb-4">Functionality</h2>
            <textarea
              rows="6"
              value={formData["Q8: Functionality"]}
              onChange={(e) => updateData("Q8: Functionality", e.target.value)}
              className="w-full p-4 bg-white shadow-lg rounded-lg focus:ring-2 focus:ring-gray-500 focus:outline-none"
              placeholder="Describe the functionality..."
            />
          </div>
        ),
      };
  
    return (
      <div className="bg-gray-50 rounded-lg shadow-lg p-6 overflow-y-auto">
        {content[selectedOption] || (
          <h2 className="text-lg font-bold">Select an Option</h2>
        )}
      </div>
    );
  };
  
  export default RightContent;
  