import { useState, useEffect, useRef } from "react";
import TopBar from "../../components/TopBar";
import { useLocation } from "react-router-dom";
import client from "./DraftingAgent";
import { FaSpinner } from "react-icons/fa";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css"; // Import the Quill editor styles
import client1 from "./FigureAgent";



const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
  } = require("@google/generative-ai");
  
  const apiKey = "AIzaSyBa2Boeqwb-nTZ_6IZxesRbawOBasBQr1E";
  const genAI = new GoogleGenerativeAI(apiKey);

const DraftPage = () => {
    const tabs = [
        // "Description of Figure(s)",
        "Technical Field",
        "Description of Figure(s)",
        "Abstract",
        "Background",
        "Summary of invention",
        "Detailed description",
        
    ];
    const location = useLocation();
    const { formData, figures } = location.state || {};
    // const { figures } = location.state || {};
    // const formData = {
    //     "Q1: Problem description": "Traditional energy management systems in smart homes are unable to dynamically optimize energy usage across various devices and appliances. They often lack the intelligence to adapt to changes in user behavior, weather conditions, and fluctuating energy prices, leading to increased energy waste and higher costs. Existing solutions are also highly device-specific, making integration across different platforms and ecosystems a challenge.",
    //     "Q2: Solution description": "The proposed system leverages artificial intelligence to provide real-time energy optimization for smart homes. Using predictive analytics, the system monitors user behavior, device usage patterns, and external factors like weather and energy prices to dynamically adjust the energy allocation across connected devices. The system also integrates seamlessly with various smart home ecosystems, enabling centralized control and energy-saving recommendations for users.",
    //     "Q3: Novel features or aspects": "1. Adaptive AI algorithm that learns user preferences over time for personalized energy optimization.\n2. Integration with smart meters for real-time energy price analysis and cost-saving recommendations.\n3. Cross-platform compatibility, allowing integration with multiple smart home ecosystems such as Google Home, Amazon Alexa, and Apple HomeKit.\n4. Predictive energy usage scheduling based on weather forecasts and historical data.\n5. Automated load balancing to prevent overloading circuits and ensure efficient energy distribution.",
    //     "Q4: Invention title": "AI-Driven Energy Optimization System for Smart Homes",
    //     "Q5: Patent search": "Similar patents in the field include energy management systems utilizing IoT devices, such as Patent US10234567B1 (Smart energy management for IoT) and Patent EP3189765A1 (System and method for energy monitoring and optimization). However, none of the existing patents provide the combination of predictive AI, real-time energy price integration, and cross-platform compatibility featured in the proposed invention.",
    //     "Q6: Claims type": "Utility patent. The claims will focus on the novel aspects of the adaptive AI algorithm, real-time energy price integration, predictive scheduling, and cross-platform compatibility.",
    //     "Q7: Advantages over prior arts": "1. Unlike existing systems, our solution offers real-time integration with energy prices for cost optimization.\n2. The AI-driven approach ensures continuous learning and adaptability to user behavior, which is missing in traditional energy management systems.\n3. Cross-platform compatibility eliminates the need for device-specific solutions, making it a versatile and scalable option for consumers.\n4. Predictive scheduling and load balancing improve energy efficiency and reduce operational costs.\n5. Enhanced user engagement through personalized recommendations and an intuitive interface.",
    //     "Q8: Functionality": "The system functions by continuously collecting data from connected devices, smart meters, and external sources like weather APIs. This data is processed by a central AI engine, which uses machine learning models to predict energy usage and identify optimization opportunities. The system communicates with devices through a unified control hub, automatically adjusting energy consumption patterns and providing real-time feedback to users via a mobile app or web dashboard. Additionally, the system supports user-configurable settings for priority devices and energy-saving goals."
    // }
    

    const [selectedTab, setSelectedTab] = useState("Technical Field");
    const [loadingTabIndex, setLoadingTabIndex] = useState(0);
    const [generatedContent, setGeneratedContent] = useState(
        tabs.reduce((acc, tab) => ({ ...acc, [tab]: "Generating content..." }), {})
    );
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
    const hasGenerated = useRef(false);
    const [figureResponse, setFigureResponse] = useState(null);

    const fetchFigureResponseFromBackend = async () => {
        const figures_prompt = `
            You are an expert in drafting patents and are tasked with preparing a patent draft for filing in India. Below is the data provided about the patent:

            ${JSON.stringify(formData, null, 2)}
            About Figure: Figures: ${JSON.stringify(figures, null, 2)}

            Based on this data, draft the **Description of Figure(s)** section of a patent document in compliance with the Indian patent format:

            About **Description of Figure(s)**: This section must provide an overview of all the figures included in the patent application. It should:
            1. List each figure included in the application and provide a concise, one-sentence description of what the figure illustrates.
            2. Ensure the descriptions are clear, accurate, and specific to the corresponding figure.
            3. Use consistent language and numbering for all figures (e.g., "Figure 1 illustrates...").
            4. Avoid including excessive details about the figures; focus on brief summaries.
            5. Write in paragraph format, ensuring proper grammar, punctuation, and clarity. Number each paragraph starting from 1.

            **Instructions**:
            - Use the provided data to draft only the **Description of Figure(s)** section of the patent.
            - Begin each figure description with "Figure X" where X is the figure number, followed by a colon and the description.
            - Use proper grammar, punctuation, and clarity.
            - The length of this total description should be ateast 300 words.

            Provide the output in the following JSON format enclosed in {}:
            {"response": "Description of Figure(s) text here"}

            Now analyze the provided data carefully and draft the **Description of Figure(s)** section of the patent.
        `;
        // ("figures_prompt: ", figures_prompt);

        if (figures?.filePath) {
            try {
                const response = await fetch("https://legalai-backend-1.onrender.com/api/gemini-pro", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        prompt: figures_prompt, 
                        file_paths: [figures.filePath],
                    }),
                });

                if (!response.ok) {
                    throw new Error("Failed to process the figures using the backend.");
                }

                const result = await response.json();

                if (result.error) {
                    throw new Error(`Backend error: ${result.error}`);
                }

                console.log("Backend response:", result);

                const response0 = JSON.parse(result.response);

                setFigureResponse(response0.response.replace(". ", "\n"));

            } catch (error) {
                console.error("Error processing the figures:", error);
            }
        } else {
            console.warn("No valid file path provided for figures.");
        }
    };
    

    useEffect(() => {
        if (hasGenerated.current) return;
        hasGenerated.current = true;
          
          const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash-8b",
          });
          
          const generationConfig = {
            temperature: 1,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            responseMimeType: "text/plain",
          };
          
          

        const generatePrompt = (tab) => {
            switch (tab) {
                case "Technical Field":
                    return `

                    You are an expert in drafting patents and are tasked with preparing a patent draft for filing in India. Below is the data provided about the patent:

                    ${JSON.stringify(formData, null, 2)}

                    Based on this data, draft a ${tab} section of a patent document in compliance with the Indian patent format:

                    About **${tab}**: This section must concisely and accurately state the specific technical domain to which the claimed invention belongs. It should be neither overly broad (e.g., "technology," "engineering") nor too narrow (e.g., the exact title of the invention). Aim for a scope that meaningfully categorizes the invention for searching and classification purposes. If applicable, specify the area of application within the broader domain (e.g., "Medical Devices (specifically, cardiac stents)"). If the invention bridges multiple disciplines, list all relevant fields (e.g., "Biochemistry and Molecular Biology"). The chosen terminology should align with the International Patent Classification (IPC) or Cooperative Patent Classification (CPC) codes used in the application. Prioritize clarity, accuracy, relevance, and conciseness, using only a sentence or two. Provide only the "Field of the Invention" text, nothing else.
                    
                    **Instructions**:
                    - Use the provided data only to draft the "${tab}" section of the patent.
                    - Use paragraph format for the response and number each paragraph starting from 1.
                    - Ensure that proper grammar, punctuation, and spelling are used.
                    - The length of the response should be minimum of 500 words.

                    Provide the output in the following format:
                    ${tab}. do not give any other information.

                    Now understand the provided data carefully and draft the "${tab}" section of the patent.
                    `;

                case "Abstract":
                    return `
                        You are an expert in drafting patents and are tasked with preparing a patent draft for filing in India. Below is the data provided about the patent:

                        ${JSON.stringify(formData, null, 2)}

                        Based on this data, draft the **Abstract** section of a patent document in compliance with the Indian patent format:

                        About **Abstract**: This section should provide a concise summary of the invention described in the patent application. The abstract should:
                        1. Clearly and briefly state the technical problem addressed by the invention.
                        2. Outline the essential features and innovative aspects of the solution provided by the invention.
                        3. Highlight the application and potential benefits of the invention.
                        4. Avoid including excessive details, specific examples, or claims. Focus only on providing an overview of the invention's core aspects.

                        **Instructions**:
                        - Use the provided data to draft only the **Abstract** section of the patent.
                        - Keep the abstract concise (maximum 500 words).
                        - Write in paragraph format, ensuring proper grammar, punctuation, and clarity. Number each paragraph starting from 1.
                        - Ensure that the abstract captures the technical problem, the novel solution, and its primary advantages or applications.

                        Provide the output in the following format:
                        ${tab}. do not give any other information.

                        Now analyze the provided data carefully and draft the **Abstract** section of the patent.
`;
                case "Background":
                    return `
                        You are an expert in drafting patents and are tasked with preparing a patent draft for filing in India. Below is the data provided about the patent:

                        ${JSON.stringify(formData, null, 2)}

                        Based on this data, draft the **Background** section of a patent document in compliance with the Indian patent format:

                        About **Background**: This section must provide the technical field and context of the invention. It should:
                        1. Begin with a broad overview of the current state of the art, technologies, or methods in the relevant field.
                        2. Highlight any specific technical problems, inefficiencies, or limitations in existing solutions or practices.
                        3. Include references to prior art, patents, publications, or technologies that are related to the invention.
                        4. Clearly state the technical challenge or gap that the invention aims to address.
                        5. Write in paragraph format, ensuring proper grammar, punctuation, and clarity. Number each paragraph starting from 1.

                        **Instructions**:
                        - Use the provided data to draft only the **Background** section of the patent.
                        - Structure the response into paragraphs and number them sequentially, starting with 1.
                        - Use formal language with proper grammar, punctuation, and clarity.
                        - Avoid discussing the solution in this section; focus solely on the problem and prior art.
                        - Aim for a minimum of 500 words to ensure sufficient detail.

                        Provide the output in the following format:
                        ${tab}. do not give any other information.

                        Now analyze the provided data carefully and draft the **Background** section of the patent.

                    `;
                case "Summary of invention":
                    return `
                    You are an expert in drafting patents and are tasked with preparing a patent draft for filing in India. Below is the data provided about the patent:

                    ${JSON.stringify(formData, null, 2)}

                    Based on this data, draft the **Summary of Invention** section of a patent document in compliance with the Indian patent format:

                    About **Summary of Invention**: This section should provide a concise and clear description of the invention. It should:
                    1. State the technical problem identified in the background section that the invention aims to solve.
                    2. Clearly describe the core idea, structure, or process of the invention in a manner that distinguishes it from prior art.
                    3. Highlight the novelty, innovation, and key technical features of the invention.
                    4. Explain how the invention solves the identified problem and its potential applications.
                    5. Use non-restrictive language, avoiding overly specific examples or claim language.
                    6. Write in paragraph format, ensuring proper grammar, punctuation, and clarity. Number each paragraph starting from 1.

                    **Instructions**:
                    - Use the provided data to draft only the **Summary of Invention** section of the patent.
                    - Structure the response into paragraphs and number them sequentially, starting with 1.
                    - Ensure proper grammar, punctuation, and spelling throughout.
                    - Aim for a minimum of 500 words to ensure thoroughness and clarity.

                    Provide the output in the following format:
                    ${tab}. do not give any other information.

                    Now analyze the provided data carefully and draft the **Summary of Invention** section of the patent.

                    `;
                case "Detailed description":
                    return `
                    You are an expert in drafting patents and are tasked with preparing a patent draft for filing in India. Below is the data provided about the patent:

                    ${JSON.stringify(formData, null, 2)}

                    Based on this data, draft the **Detailed Description** section of a patent document in compliance with the Indian patent format:

                    About **Detailed Description**: This section must provide a comprehensive explanation of the invention, including how it works, its structure, and its functionality. It should:
                    1. Describe the invention in detail with references to the figures where applicable (e.g., "As shown in Figure X...").
                    2. Explain each component, step, or feature of the invention in a logical sequence.
                    3. Include examples, variations, or embodiments of the invention, highlighting its versatility.
                    4. Ensure the description is detailed enough for a person skilled in the art to understand and replicate the invention.
                    5. Avoid including claim-specific language but ensure the technical details are clear and exhaustive.
                    6. Write in paragraph format, ensuring proper grammar, punctuation, and clarity. Number each paragraph starting from 1.

                    **Instructions**:
                    - Use the provided data to draft only the **Detailed Description** section of the patent.
                    - Structure the response into paragraphs and number them sequentially, starting with 1.
                    - Ensure proper grammar, punctuation, and spelling throughout.
                    - Provide references to figures or components where applicable.
                    - Aim for a minimum of 800 words to ensure thoroughness and clarity.

                    Provide the output in the following JSON format:
                    ${tab}. do not give any other information.

                    Now analyze the provided data carefully and draft the **Detailed Description** section of the patent.

                    `;
                case "Description of Figure(s)":
                        return `
                          You are an expert in drafting patents and are tasked with preparing a patent draft for filing in India. Below is the data provided about the patent:

                            ${JSON.stringify(formData, null, 2)}
                            About Figure: Figures: ${JSON.stringify(figures, null, 2)}

                            Based on this data, draft the **Description of Figure(s)** section of a patent document in compliance with the Indian patent format:

                            About **Description of Figure(s)**: This section must provide an overview of all the figures included in the patent application. It should:
                            1. List each figure included in the application and provide a concise, one-sentence description of what the figure illustrates.
                            2. Ensure the descriptions are clear, accurate, and specific to the corresponding figure.
                            3. Use consistent language and numbering for all figures (e.g., "Figure 1 illustrates...").
                            4. Avoid including excessive details about the figures; focus on brief summaries.

                            **Instructions**:
                            - Use the provided data to draft only the **Description of Figure(s)** section of the patent.
                            - Begin each figure description with "Figure X" where X is the figure number, followed by a colon and the description.
                            - Use proper grammar, punctuation, and clarity.
                            - Aim for a minimum of one sentence per figure and list all figures provided in the data.

                            Provide the output in the following format:
                            ${tab}. do not give any other information.

                            Now analyze the provided data carefully and draft the **Description of Figure(s)** section of the patent.

                        `;

                default:
                    return "";
            }
        };

        const generateContentForAllTabs = async () => {
            for (let i = 0; i < tabs.length; i++) {
                const tab = tabs[i];
                setLoadingTabIndex(i);

                try {
                    let response;
                    const prompt = generatePrompt(tab);
                    // ("prompt", prompt);
                
                    if (tab === "Description of Figure(s)") {

                    } else {
                        console.log(tab);
                        const response0 = await client(prompt, []);
                        // console.log("abstract: ", response0);
                        // const response1 = JSON.parse(response0);
                        // console.log("abstract response1: ", response1);
                        response = response0.replace(". ", "\n");
                        console.log("abstract response: ", response);

                    }
                
                    // Validate response before using it
                    const sanitizedResponse = response ? response.replace(/\\n/g, "<br>") : "Error generating content. Please try again.";
                
                    setGeneratedContent((prev) => ({
                        ...prev,
                        [tab]: sanitizedResponse,
                    }));
                } catch (error) {
                    console.error(`Error generating content for ${tab}:`, error);
                    setGeneratedContent((prev) => ({
                        ...prev,
                        [tab]: "Error generating content. Please try again.",
                    }));
                }
                
            }
            setLoadingTabIndex(-1);
        };

        fetchFigureResponseFromBackend();
        generateContentForAllTabs();
    }, [formData, tabs, figures]);

    useEffect(() => {
        if (figureResponse) {
            setGeneratedContent((prev) => ({
                ...prev,
                "Description of Figure(s)": figureResponse.replace(/\\n/g, "<br>"),
            }));
        }
    }, [figureResponse]);
    

    return (
        <div className="min-h-screen bg-gray-100">
            <TopBar />

            <main className="p-4">
                <div className="text-lg font-bold mb-4">
                    {formData?.["Q4: Invention title"] || "Patent Drafting"}
                </div>

                {/* Tabs */}
                <div className="border-b mb-4 flex">
                    {tabs.map((tab, index) => (
                        <button
                            key={tab}
                            className={`px-4 py-2 flex items-center space-x-2 ${
                                selectedTab === tab
                                    ? "border-b-2 border-gray-700 text-gray-700"
                                    : "text-gray-500"
                            }`}
                            onClick={() => setSelectedTab(tab)}
                            disabled={loadingTabIndex !== -1 && loadingTabIndex < index}
                        >
                            <span>{tab}</span>
                            {loadingTabIndex === index && (
                                <FaSpinner className="animate-spin text-gray-700" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Editor */}
                <div className="bg-white rounded-lg shadow p-4">
                    {loadingTabIndex !== -1 && selectedTab === tabs[loadingTabIndex] ? (
                        <p className="text-gray-500">Generating content for {selectedTab}...</p>
                    ) : (
                        <ReactQuill
                            value={generatedContent[selectedTab] || "<p>No data available.</p>"}
                            onChange={(content) =>
                                setGeneratedContent((prev) => ({
                                    ...prev,
                                    [selectedTab]: content,
                                }))
                            }
                            modules={{
                                toolbar: [
                                    [{ size: ["small", false, "large", "huge"] }],
                                    ["bold", "italic", "underline", "strike"],
                                    [{ list: "ordered" }, { list: "bullet" }],
                                    [{ align: [] }],
                                    ["link", "image"],
                                ],
                            }}
                            formats={[
                                "size",
                                "bold",
                                "italic",
                                "underline",
                                "strike",
                                "list",
                                "bullet",
                                "align",
                                "link",
                                "image",
                            ]}
                            theme="snow"
                        />
                    )}
                </div>
            </main>
        </div>
    );
};

export default DraftPage;
