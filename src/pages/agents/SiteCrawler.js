// SiteCrawlerApp.js
import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import useGeminiClient from '../../components/useGeminiClient';
import { useNavigate } from 'react-router-dom';

// Replace <YOUR_VM_IP> with your backend's public IP address
const socket = io('http://0.0.0.0:5001');

function SiteCrawlerApp() {
  const [startUrl, setStartUrl] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [crawlResults, setCrawlResults] = useState(null);
  const [candidateLinks, setCandidateLinks] = useState([]);
  const [startupFormUrl, setStartupFormUrl] = useState('');
  const [formData, setFormData] = useState({});
  const [formFields, setFormFields] = useState([]);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formResponse, setFormResponse] = useState(null);
  const [screenshotUrl, setScreenshotUrl] = useState(null);

  // Refs for screenshot playback
  const screenshotQueue = useRef([]);
  const [currentScreenshot, setCurrentScreenshot] = useState(null);
  const playbackInterval = useRef(null);
  const { fetchResponse } = useGeminiClient();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Submit the crawl request to your backend API
      const response = await fetch(`http://0.0.0.0:5001/api/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startUrl })
      });
      const data = await response.json();
      setSessionId(data.session_id);
      console.log('Joined session with ID:', data.session_id);
      socket.emit('join', { session_id: data.session_id });
    } catch (error) {
      console.error('Error submitting crawl request:', error);
    }
  };

  useEffect(() => {
    if (sessionId) {
      socket.on('process-log', (data) => {
        setLogs((prevLogs) => [...prevLogs, data.message]);
      });

      socket.on('process-screenshot', (data) => {
        screenshotQueue.current.push(data.screenshot);
      });

      socket.on('crawl-results', (data) => {
        setCrawlResults(data);
        setCandidateLinks(data.candidate_links)
      });

      if (!playbackInterval.current) {
        playbackInterval.current = setInterval(() => {
          if (screenshotQueue.current.length > 0) {
            const nextScreenshot = screenshotQueue.current.shift();
            setCurrentScreenshot(nextScreenshot);
          }
        }, 1000 / 30);
      }
    }
    return () => {
      socket.off('process-log');
      socket.off('process-screenshot');
      socket.off('crawl-results');
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
        playbackInterval.current = null;
      }
    };
  }, [sessionId]);

  useEffect(() => {
    if (candidateLinks.length > 0 && !startupFormUrl) {
      const prompt = `Given the following forms found on the website:\n
        Candidate Link: ${JSON.stringify(candidateLinks, null, 2) || 'None'}\n
        Please choose the startup form link that is most suitable for a startup submission.
        Your output should be in this JSON format only:
        {
          "url": "the chosen url form the list of urls provided"
        }
        If there is no suitable form, return an empty JSON object
        `;
      fetchResponse(prompt).then((responseText) => {
        if (responseText) {
          const response = JSON.parse(responseText);
          console.log("prompt: ", prompt);
          console.log("respons url: ", response);
          setStartupFormUrl(response?.url);
          console.log("startupFormUrl: ", response?.url);
        }
      });
    }
  }, [candidateLinks]);

  useEffect(() => {
    if (startupFormUrl) {
      console.log("Navigating to:", `/startup-auto-form?formURL=${encodeURIComponent(startupFormUrl)}`);
      navigate(`/startup-auto-form?formURL=${encodeURIComponent(startupFormUrl)}`);
    }
  }, [startupFormUrl]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold text-blue-700 mt-8">Site Crawler Automation</h1>
      
      {!sessionId && (
        <form onSubmit={handleSubmit} className="mt-8 bg-white p-6 rounded-lg shadow-md w-full max-w-xl">
          <div className="mb-4">
            <label htmlFor="startUrl" className="block text-gray-700 mb-2 font-semibold">
              Homepage URL:
            </label>
            <input
              type="url"
              name="startUrl"
              id="startUrl"
              value={startUrl}
              onChange={(e) => setStartUrl(e.target.value)}
              required
              placeholder="https://example.com"
              className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200">
            Start Crawl
          </button>
        </form>
      )}

      {sessionId && (
        <div className="mt-8 w-full max-w-4xl">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Live Crawling Process</h2>

          {/* Browser view */}
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

          {/* Crawl Results */}
          {crawlResults && (
  <div className="bg-white p-4 rounded-md shadow mb-8">
    <h3 className="text-xl font-medium mb-2 text-gray-700">Crawl Results:</h3>
    <div>
      <p><strong>Pages Crawled:</strong> {crawlResults.pages_crawled}</p>
      <p><strong>Emails Found:</strong> {crawlResults.emails.length > 0 ? crawlResults.emails.join(', ') : 'None'}</p>

      <p><strong>Contact Links:</strong> {crawlResults.contact_links.length > 0 ? crawlResults.contact_links.join(', ') : 'None'}</p>

      {/* Display Candidate Links with Descriptions */}
      <div>
        <p className="font-semibold">Extracted Links:</p>
        {crawlResults.candidate_links && crawlResults.candidate_links.length > 0 ? (
          <ul className="list-disc ml-5">
            {crawlResults.candidate_links.map((link, index) => (
              <li key={index}>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {link.text || link.url}
                </a>
                {link.description && (
                  <p className="text-sm text-gray-600">{link.description}</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>None</p>
        )}
      </div>
    </div>
  </div>
)}

        </div>
      )}
    </div>
  );
}

export default SiteCrawlerApp;
