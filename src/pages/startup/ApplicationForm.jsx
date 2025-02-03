import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from "react-router-dom";
import TopBar from '../../components/TopBar';
import axios from "axios";
import { toast } from "react-toastify";

import {
  Upload,
  Search,
  FileText,
  Check,
  AlertCircle,
  User,
  Building,
  Mail,
  Phone,
  Linkedin,
  Send,
  Plus,
} from 'lucide-react';

const ApplicationForm = () => {
  const [currentStep, setCurrentStep] = useState('profile');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedPitch, setUploadedPitch] = useState(null);
  const [uploadedFounderVideo, setUploadedFounderVideo] = useState(null);
  const [uploadedProductDemo, setUploadedProductDemo] = useState(null);
  const [founders, setFounders] = useState([
    { name: '', phone: '', email: '', linkedin: '', education: '' },
  ]);
  const navigate = useNavigate();
  const [uniqueIdentifier] = useState(
      sessionStorage.getItem("uniqueIdentifier") || "defaultUser"
    );

  const [startupData, setStartupData] = useState({
    companyName: '',
    website: '',
    industry: '',
    stage: '',
    fundingNeeded: '',
    currentRevenue: '',
    teamSize: '',
    location: '',
    pitchDeck: '',
    founderVideo: '',
    productDemo: '',
    legalStatus: '',
    registeredCompanyName: '',
    incorporationState: '',
    dpiitNumber: '',
    gstNumber: '',
    sector: '',
    offering: '',
    workingMonths: '',
    currentStage: '',
    idea: '',
    targetCustomer: '',
    problemSolved: '',
    solution: '',
    project: '',
    expertise: '',
    pastWork: '',
    websiteLinks: '',
    // Questions Section
    oneLiner: '',
    coreTechnology: '',
    technologyWorking: '',
    problem: '',
    panNumber: '',
    aadharNumber: '',
    gender: '',
    dob: '',
    socialCategory: '',
    educationQualification: '',
    permanentAddress: '',
    correspondenceAddress: '',
    city: '',
    state: '',
    legalStatusQuestion: '',
    registeredCompanyNameQuestion: '',
    incorporationStateQuestion: '',
    dpiitNumberQuestion: '',
    gstNumberQuestion: '',
    sectorQuestion: '',
    offeringQuestion: '',
    workingMonthsQuestion: '',
    currentStageQuestion: '',
    ideaQuestion: '',
    targetCustomerQuestion: '',
    problemSolvedQuestion: '',
    solutionQuestion: '',
    projectQuestion: '',
    expertiseQuestion: '',
    pastWorkQuestion: '',
    websiteLinksQuestion: '',
  });

  const fetchFile = async (filePath) => {
    try {
      const response = await axios.post(
        "https://legalai-backend-1.onrender.com/api/get_file",
        { file_path: filePath },
        {
          headers: { "Content-Type": "application/json" },
          responseType: "json",
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching file:", error);
      return null;
    }
  };
  

  const uploadFileToBackend = async (file, folderPath) => {
    const formData = new FormData();
    formData.append("folder_name", folderPath);
    formData.append("file", file);
  
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
    return result;
  };
  

  useEffect(() => {
    const checkStartupData = async () => {
      const filePath = `/var/data/users/${uniqueIdentifier}/startup/startup_data.json`;
      const data = await fetchFile(filePath);
      if (data) {
        navigate("/startup-dashboard");
      }
    };
    checkStartupData();
  }, [navigate, uniqueIdentifier]);

  const addFounder = () => {
    setFounders([
      ...founders,
      { name: '', phone: '', email: '', linkedin: '', education: '' },
    ]);
  };

  const handleFounderChange = (index, field, value) => {
    const updatedFounders = [...founders];
    updatedFounders[index][field] = value;
    setFounders(updatedFounders);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStartupData({ ...startupData, [name]: value });
  };

  const handleQuestionsChange = (e) => {
    const { name, value } = e.target;
    setStartupData({
      ...startupData,
      [name]: value,
    });
  };

  const handleSubmit = async () => {
    setIsProcessing(true);
    
    try {
      const folderPath = `users/${uniqueIdentifier}/startup`;
      const filePath = `${folderPath}/startup_data.json`;
  
      // Prepare startup data
      const startupDataWithFiles = { ...startupData };
  
      // Upload Videos
      const uploadVideo = async (file, type) => {
        if (file) {
          const videoFolder = `${folderPath}/videos`;
          const videoUploadResponse = await uploadFileToBackend(file, videoFolder);
          startupDataWithFiles[type] = {
            path: videoUploadResponse.file_path,
            drive_link: startupData[type], // Preserve drive link
          };
        }
      };
  
      await uploadVideo(uploadedPitch, "pitchDeck");
      await uploadVideo(uploadedFounderVideo, "founderVideo");
      await uploadVideo(uploadedProductDemo, "productDemo");
  
      // Upload JSON file
      const jsonBlob = new Blob([JSON.stringify(startupDataWithFiles)], { type: "application/json" });
      const jsonFile = new File([jsonBlob], "startup_data.json", { type: "application/json" });
      await uploadFileToBackend(jsonFile, folderPath);
  
      toast.success("Startup data uploaded successfully!");
      navigate("/startup-dashboard");
    } catch (error) {
      toast.error("Failed to upload startup data. Please try again.");
      console.error("Upload error:", error);
    } finally {
      setIsProcessing(false);
    }
  };
  

  // Step Titles for Progress Indicator
  const steps = [
    'Profile',
    'Pitch & Video',
    'Details',
    'Additional Questions',
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <TopBar />
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">Startup Application Form</h1>
          {/* You can add a navigation or user menu here */}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Step Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between">
            {steps.map((step, index) => (
              <div key={index} className="flex-1 flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    currentStep === step.toLowerCase()
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-300 text-gray-700'
                  }`}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-1 bg-gray-300 mx-2"></div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            {steps.map((step, index) => (
              <span key={index} className="flex-1 text-center">
                {step}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          {/* Profile Step */}
          {currentStep === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Founder Details</h2>
              {founders.map((founder, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b pb-4"
                >
                  <div className="flex flex-col">
                    <label className="mb-1 text-sm font-medium text-gray-700">
                      Founder Name
                    </label>
                    <input
                      type="text"
                      placeholder="Founder Name"
                      className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={founder.name}
                      onChange={(e) =>
                        handleFounderChange(index, 'name', e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="mb-1 text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="Phone Number"
                      className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={founder.phone}
                      onChange={(e) =>
                        handleFounderChange(index, 'phone', e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="mb-1 text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="Email"
                      className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={founder.email}
                      onChange={(e) =>
                        handleFounderChange(index, 'email', e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="mb-1 text-sm font-medium text-gray-700">
                      LinkedIn Profile
                    </label>
                    <input
                      type="text"
                      placeholder="LinkedIn Profile"
                      className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={founder.linkedin}
                      onChange={(e) =>
                        handleFounderChange(index, 'linkedin', e.target.value)
                      }
                    />
                  </div>
                  <div className="flex flex-col md:col-span-2">
                    <label className="mb-1 text-sm font-medium text-gray-700">
                      Education
                    </label>
                    <input
                      type="text"
                      placeholder="Education"
                      className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={founder.education}
                      onChange={(e) =>
                        handleFounderChange(index, 'education', e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={addFounder}
                className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Another Founder
              </button>
            </div>
          )}

          {/* Pitch & Video Step */}
          {currentStep === 'pitch & video' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Pitch & Video</h2>
              {/* Pitch Deck Upload and Link */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Upload Pitch Deck
                  </label>
                  <input
                    type="file"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onChange={(e) => setUploadedPitch(e.target.files[0])}
                    accept=".pdf,.ppt,.pptx"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Pitch Deck Drive Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/your-pitch-deck-link"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.pitchDeck}
                    onChange={(e) =>
                      setStartupData({ ...startupData, pitchDeck: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Founder Video Upload and Link */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Upload Founder Video
                  </label>
                  <input
                    type="file"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onChange={(e) => setUploadedFounderVideo(e.target.files[0])}
                    accept="video/*"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Founder Video Drive Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/your-founder-video-link"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.founderVideo}
                    onChange={(e) =>
                      setStartupData({ ...startupData, founderVideo: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Product Demo Upload and Link */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Upload Product Demo
                  </label>
                  <input
                    type="file"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onChange={(e) => setUploadedProductDemo(e.target.files[0])}
                    accept="video/*,.pdf,.ppt,.pptx"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Product Demo Drive Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/your-product-demo-link"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.productDemo}
                    onChange={(e) =>
                      setStartupData({ ...startupData, productDemo: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Details Step */}
          {currentStep === 'details' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Startup Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Company Name */}
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    placeholder="Company Name"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.companyName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {/* Website */}
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    placeholder="https://yourwebsite.com"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.website}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Industry */}
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Industry
                  </label>
                  <input
                    type="text"
                    name="industry"
                    placeholder="Industry"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.industry}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Stage */}
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Stage
                  </label>
                  <input
                    type="text"
                    name="stage"
                    placeholder="Stage (e.g., Seed, Series A)"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.stage}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Funding Needed */}
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Funding Needed
                  </label>
                  <input
                    type="text"
                    name="fundingNeeded"
                    placeholder="Funding Needed (e.g., $500k)"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.fundingNeeded}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Current Revenue */}
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Current Revenue
                  </label>
                  <input
                    type="text"
                    name="currentRevenue"
                    placeholder="Current Revenue (e.g., $100k)"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.currentRevenue}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Team Size */}
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Team Size
                  </label>
                  <input
                    type="number"
                    name="teamSize"
                    placeholder="Team Size"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.teamSize}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Location */}
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    placeholder="Location (e.g., San Francisco, CA)"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.location}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Legal Status */}
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Legal Status of your Startup
                  </label>
                  <select
                    name="legalStatus"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.legalStatus}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Legal Status</option>
                    <option value="Incorporated">Incorporated</option>
                    <option value="Yet To Incorporate">Yet To Incorporate</option>
                    <option value="LLP">LLP</option>
                    <option value="Pet. Ltd.">Pet. Ltd.</option>
                    <option value="Proprietorship">Proprietorship</option>
                  </select>
                </div>

                {/* Registered Company Name */}
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Registered Company's Name
                  </label>
                  <input
                    type="text"
                    name="registeredCompanyName"
                    placeholder="Registered Company's Name"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.registeredCompanyName}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Incorporation State */}
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Incorporation State
                  </label>
                  <input
                    type="text"
                    name="incorporationState"
                    placeholder="Incorporation State"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.incorporationState}
                    onChange={handleInputChange}
                  />
                </div>

                {/* DPIIT Number */}
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    DPIIT Number
                  </label>
                  <input
                    type="text"
                    name="dpiitNumber"
                    placeholder="DPIIT Number"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.dpiitNumber}
                    onChange={handleInputChange}
                  />
                </div>

                {/* GST Number */}
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    GST Number
                  </label>
                  <input
                    type="text"
                    name="gstNumber"
                    placeholder="GST Number"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.gstNumber}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Sector */}
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Which sector does your startup belong to?
                  </label>
                  <input
                    type="text"
                    name="sector"
                    placeholder="Sector (e.g., FinTech, HealthTech)"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.sector}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Offering */}
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    What are you offering?
                  </label>
                  <input
                    type="text"
                    name="offering"
                    placeholder="Offering (e.g., SaaS, Platform)"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.offering}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Working Months */}
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    How long have you been working on this startup idea? (in Months)
                  </label>
                  <input
                    type="number"
                    name="workingMonths"
                    placeholder="e.g., 6, 7, 8"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.workingMonths}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Current Stage */}
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    What is the current stage of your Startup?
                  </label>
                  <input
                    type="text"
                    name="currentStage"
                    placeholder="Current Stage (e.g., MVP, Growth)"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.currentStage}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Additional Questions Step */}
          {currentStep === 'additional questions' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Additional Questions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* One Liner */}
                <div className="flex flex-col md:col-span-2">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    One liner about your Technology/Business idea
                  </label>
                  <textarea
                    name="oneLiner"
                    placeholder="One liner about your Technology/Business idea"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                    value={startupData.oneLiner}
                    onChange={handleQuestionsChange}
                  ></textarea>
                </div>

                {/* Core Technology */}
                <div className="flex flex-col md:col-span-2">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Please describe the core technology for which you are seeking the Funding.
                  </label>
                  <textarea
                    name="coreTechnology"
                    placeholder="Describe the core technology"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                    value={startupData.coreTechnology}
                    onChange={handleQuestionsChange}
                  ></textarea>
                </div>

                {/* Technology Working */}
                <div className="flex flex-col md:col-span-2">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    How does your technology work, and what makes it innovative or unique?
                  </label>
                  <textarea
                    name="technologyWorking"
                    placeholder="Explain how your technology works"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                    value={startupData.technologyWorking}
                    onChange={handleQuestionsChange}
                  ></textarea>
                </div>

                {/* Problem Solved */}
                <div className="flex flex-col md:col-span-2">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    What specific problem or challenge does your technology aim to solve?
                  </label>
                  <textarea
                    name="problemSolvedQuestion"
                    placeholder="Describe the problem you are solving"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                    value={startupData.problemSolvedQuestion}
                    onChange={handleQuestionsChange}
                  ></textarea>
                </div>

                {/* PAN Number */}
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    PAN Number of the applying founder
                  </label>
                  <input
                    type="text"
                    name="panNumber"
                    placeholder="PAN Number"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.panNumber}
                    onChange={handleQuestionsChange}
                  />
                </div>

                {/* Aadhar Number */}
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Aadhar Number of the applying founder
                  </label>
                  <input
                    type="text"
                    name="aadharNumber"
                    placeholder="Aadhar Number"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.aadharNumber}
                    onChange={handleQuestionsChange}
                  />
                </div>

                {/* Gender */}
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Gender
                  </label>
                  <select
                    name="gender"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.gender}
                    onChange={handleQuestionsChange}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Date of Birth */}
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dob"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.dob}
                    onChange={handleQuestionsChange}
                  />
                </div>

                {/* Social Category */}
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Please mention your social category
                  </label>
                  <select
                    name="socialCategory"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.socialCategory}
                    onChange={handleQuestionsChange}
                  >
                    <option value="">Select Category</option>
                    <option value="General">General</option>
                    <option value="OBC">OBC</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                  </select>
                </div>

                {/* Highest Educational Qualification */}
                <div className="flex flex-col md:col-span-2">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Highest Educational Qualification
                  </label>
                  <input
                    type="text"
                    name="educationQualification"
                    placeholder="Highest Educational Qualification"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.educationQualification}
                    onChange={handleQuestionsChange}
                  />
                </div>

                {/* Permanent Address */}
                <div className="flex flex-col md:col-span-2">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Please provide your permanent address
                  </label>
                  <textarea
                    name="permanentAddress"
                    placeholder="Permanent Address"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                    value={startupData.permanentAddress}
                    onChange={handleQuestionsChange}
                  ></textarea>
                </div>

                {/* Correspondence Address */}
                <div className="flex flex-col md:col-span-2">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Please provide your correspondence address
                  </label>
                  <textarea
                    name="correspondenceAddress"
                    placeholder="Correspondence Address"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                    value={startupData.correspondenceAddress}
                    onChange={handleQuestionsChange}
                  ></textarea>
                </div>

                {/* City */}
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    placeholder="City"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.city}
                    onChange={handleQuestionsChange}
                  />
                </div>

                {/* State */}
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    placeholder="State"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.state}
                    onChange={handleQuestionsChange}
                  />
                </div>

                {/* Offering */}
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    What are you offering?
                  </label>
                  <input
                    type="text"
                    name="offeringQuestion"
                    placeholder="Offering"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={startupData.offeringQuestion}
                    onChange={handleQuestionsChange}
                  />
                </div>

                {/* Idea */}
                <div className="flex flex-col md:col-span-2">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Elaborate about the Idea
                  </label>
                  <textarea
                    name="ideaQuestion"
                    placeholder="Describe your idea"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                    value={startupData.ideaQuestion}
                    onChange={handleQuestionsChange}
                  ></textarea>
                </div>

                {/* Target Customer */}
                <div className="flex flex-col md:col-span-2">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Identify the target customer for whom you are solving the problem
                  </label>
                  <textarea
                    name="targetCustomerQuestion"
                    placeholder="Target Customer"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                    value={startupData.targetCustomerQuestion}
                    onChange={handleQuestionsChange}
                  ></textarea>
                </div>

                {/* Problem */}
                <div className="flex flex-col md:col-span-2">
                  <label className="mb-1 text-sm font-medium text-gray-700">
                    Which problem are you trying to solve?
                  </label>
                  <textarea
                    name="problemQuestion"
                    placeholder="Describe the problem"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                    value={startupData.problemQuestion}
                    onChange={handleQuestionsChange}
                  ></textarea>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-between">
            {currentStep !== 'profile' && (
              <button
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center"
                onClick={() => {
                  const stepOrder = [
                    'profile',
                    'pitch & video',
                    'details',
                    'additional questions',
                  ];
                  const currentIndex = stepOrder.indexOf(currentStep);
                  setCurrentStep(stepOrder[currentIndex - 1]);
                }}
              >
                Back
              </button>
            )}
            {currentStep !== 'additional questions' ? (
              <button
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
                onClick={() => {
                  const stepOrder = [
                    'profile',
                    'pitch & video',
                    'details',
                    'additional questions',
                  ];
                  const currentIndex = stepOrder.indexOf(currentStep);
                  setCurrentStep(stepOrder[currentIndex + 1]);
                }}
              >
                Next
              </button>
            ) : (
              <button
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center"
                onClick={handleSubmit}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Submit'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ApplicationForm;
