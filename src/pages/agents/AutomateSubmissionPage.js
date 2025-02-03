// App.js
import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useLocation } from 'react-router-dom';

import useUploadFile from '../../components/useUploadFile';

const socket = io('http://34.68.45.14:5000'); // Replace with your backend's IP

function AutomateSubmissionPage() {

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialFormURL = queryParams.get('formURL') || '';
  const [formData, setFormData] = useState({
    inputData: '',
    formURL: initialFormURL,
  });
  const [sessionId, setSessionId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [suggestedFields, setSuggestedFields] = useState([]);
  const [confirmationStrategies, setConfirmationStrategies] = useState([]);
  const { uploadFile } = useUploadFile();

  // Refs for screenshot queue and playback
  const screenshotQueue = useRef([]);
  const [currentScreenshot, setCurrentScreenshot] = useState(null);
  const playbackInterval = useRef(null);

  // State for user prompts
  const [userPrompt, setUserPrompt] = useState(null); // { prompt: string, type: string }
  const [userInput, setUserInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [confirmationPrompt, setConfirmationPrompt] = useState(null);
  const [pdfData, setPdfData] = useState(null);
  const [uniqueIdentifier] = useState(
      sessionStorage.getItem("uniqueIdentifier") || "defaultUser"
      ); 
  const [startupData, setStartupData] = useState(() => {
          const storedData = sessionStorage.getItem("startupData");
          
          return storedData ? JSON.parse(storedData) : null;
        });


  useEffect(() => {
    if (startupData && formData.inputData === '') {
      setFormData((prevFormData) => ({
        ...prevFormData,
        inputData: JSON.stringify(startupData),
      }));
    }
  }, [startupData]);

  useEffect(() => {
    if (formData.formURL && formData.inputData) {
      console.log("Auto-starting submission...");
      handleSubmit();
    }
  }, [formData.formURL, formData.inputData]);



  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedFile(reader.result.split(',')[1]); // Remove the data URL part
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    //e.preventDefault();
    try {
      const response = await fetch('http://34.68.45.14:5000/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      setSessionId(data.session_id);
      console.log('Joining WebSocket room with session ID:', data.session_id);

      socket.emit('join', { session_id: data.session_id });
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  useEffect(() => {
    if (sessionId) {
      // Handle process logs
      socket.on('process-log', (data) => {
        console.log('Received log:', data);
        setLogs((prevLogs) => [...prevLogs, data.message]);
      });

      // Handle suggested fields and confirmation strategies
      socket.on('suggested-fields', (data) => {
        console.log('Received suggested fields and confirmation strategies:', data);
        setSuggestedFields(data.fields || []);
        setConfirmationStrategies(data.confirmation_strategies || []);
      });

      // Handle incoming screenshots
      socket.on('process-screenshot', (data) => {
        console.log('Received screenshot:', data);
        // Add screenshot to the queue
        screenshotQueue.current.push(data.screenshot);
      });

      // Handle user input requests
      socket.on('request-user-input', (data) => {
        console.log('Received user input request:', data);
        setUserPrompt({ prompt: data.prompt, type: data.type || 'text' }); // Default to 'text' if type is not provided
      });

      // Handle file upload requests
      socket.on('request-file-upload', (data) => {
        console.log('Received file upload request:', data);
        setUserPrompt({ prompt: data.prompt, type: 'file' });
      });

      socket.on("confirm-form-submission", (data) => {
        console.log("Received confirmation request:", data);
        setConfirmationPrompt(data); // Show confirmation modal
      });

      socket.on("download-pdf", (data) => {
        setPdfData(data); // Store PDF data
      });      

      // Start playback
      if (!playbackInterval.current) {
        playbackInterval.current = setInterval(() => {
          if (screenshotQueue.current.length > 0) {
            const nextScreenshot = screenshotQueue.current.shift();
            setCurrentScreenshot(nextScreenshot);
          }
        }, 1000 / 30); // 30fps => ~33ms per frame
      }
    }

    // Cleanup on component unmount or session change
    return () => {
      socket.off('process-log');
      socket.off('process-screenshot');
      socket.off('suggested-fields');
      socket.off('request-user-input');
      socket.off('request-file-upload');
      socket.off('confirm-form-submission');
      socket.off("download-pdf");
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
        playbackInterval.current = null;
      }
    };
  }, [sessionId]);

  const handleUserInputSubmit = () => {
    if (userPrompt.type === 'text') {
      socket.emit('user-input', {
        session_id: sessionId,
        input: { value: userInput },
      });
    } else if (userPrompt.type === 'file') {
      socket.emit('user-input', {
        session_id: sessionId,
        input: { file: uploadedFile },
      });
    }
    // Reset the prompt and inputs
    setUserPrompt(null);
    setUserInput('');
    setUploadedFile(null);
  };

  const handleConfirmSubmission = (response) => {
    socket.emit("user-input", {
      session_id: sessionId,
      input: { value: response },
    });
    setConfirmationPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold text-blue-700 mt-8">Patent Submission Automation</h1>
      
      {!sessionId && (
        <form onSubmit={handleSubmit} className="mt-8 bg-white p-6 rounded-lg shadow-md w-full max-w-xl">
          <div className="mb-4">
            <label htmlFor="inputData" className="block text-gray-700 mb-2 font-semibold">Input Data:</label>
            <textarea
              name="inputData"
              id="inputData"
              value={formData.inputData}
              onChange={handleChange}
              required
              placeholder='e.g., {"name": "John Doe", "email": "john@example.com"}'
              rows={6}
              className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="formURL" className="block text-gray-700 mb-2 font-semibold">Form URL:</label>
            <input
              type="text"
              name="formURL"
              id="formURL"
              value={formData.formURL}
              onChange={handleChange}
              required
              placeholder="Link of Form to fill"
              className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          {/* <div className="mb-4">
            <label htmlFor="formType" className="block text-gray-700 mb-2 font-semibold">Type of Form:</label>
            <input
              type="text"
              name="formType"
              id="formType"
              value={formData.formType}
              onChange={handleChange}
              required
              placeholder="Type of Form to fill (Eg. Seeking funding, Enquiry, etc.)"
              className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div> */}
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200">
            Submit
          </button>
        </form>
      )}

      {sessionId && (
        <div className="mt-8 w-full max-w-4xl">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Live Automation Process</h2>

          {/* Browser View as Video */}
          <div className="mb-8">
            <h3 className="text-xl font-medium mb-2 text-gray-700">Browser View:</h3>
            {currentScreenshot ? (
              <div className="border rounded-lg shadow overflow-hidden">
                <img 
                  src={`data:image/png;base64,${currentScreenshot}`} 
                  alt="Automation Process" 
                  className="w-full h-auto"
                />
              </div>
            ) : (
              <p className="text-gray-500">No screenshots available yet.</p>
            )}
          </div>

          {/* Process Logs */}
          <div className="mb-8">
            <h3 className="text-xl font-medium mb-2 text-gray-700">Process Logs:</h3>
            <div className="bg-white p-4 rounded-md shadow max-h-64 overflow-y-auto">
              <ul className="list-disc list-inside">
                {logs.map((log, index) => (
                  <li key={index} className="text-gray-700">{log}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Suggested Form Fields */}
          {suggestedFields.length > 0 && (
            <div className="mb-8 bg-white p-4 rounded-md shadow">
              <h3 className="text-xl font-medium mb-2 text-gray-700">Suggested Form Fields:</h3>
              <ul className="list-disc list-inside">
                {suggestedFields.map((field, index) => (
                  <li key={index} className="text-gray-700">
                    <strong>{field.label}:</strong> {field.value || 'Not Provided'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Confirmation Detection Strategies */}
          {confirmationStrategies.length > 0 && (
            <div className="bg-white p-4 rounded-md shadow">
              <h3 className="text-xl font-medium mb-2 text-gray-700">Confirmation Detection Strategies:</h3>
              <ul className="list-disc list-inside">
                {confirmationStrategies.map((strategy, index) => (
                  <li key={index} className="text-gray-700">
                    <strong>{strategy.strategy}:</strong> {strategy.description}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* User Input Modal */}
      {userPrompt && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-11/12 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Input Required</h3>
            <p className="mb-4">{userPrompt.prompt}</p>
            {userPrompt.type === 'text' && (
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="w-full p-2 border rounded-md mb-4"
              />
            )}
            {userPrompt.type === 'file' && (
              <input
                type="file"
                onChange={handleFileChange}
                className="w-full p-2 border rounded-md mb-4"
              />
            )}
            <button
              onClick={handleUserInputSubmit}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200"
            >
              Submit
            </button>
          </div>
        </div>
      )}

      {confirmationPrompt && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-11/12 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Confirm Submission</h3>
            <p className="mb-4">{confirmationPrompt.message}</p>
            <ul className="list-disc list-inside text-gray-700 mb-4">
              {Object.entries(confirmationPrompt.responses).map(([key, value]) => (
                <li key={key}><strong>{key}:</strong> {value}</li>
              ))}
            </ul>
            <button 
              onClick={() => handleConfirmSubmission("yes")} 
              className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600">
              Submit
            </button>
            <button 
              onClick={() => handleConfirmSubmission("no")} 
              className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 ml-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      {pdfData && (
        <div className="mt-4">
          <button
            onClick={() => {
              const link = document.createElement("a");
              link.href = `data:application/pdf;base64,${pdfData.pdf_data}`;
              link.download = pdfData.filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
          >
            Download Submission PDF
          </button>
        </div>
      )}


    </div>
  );
}

export default AutomateSubmissionPage;
