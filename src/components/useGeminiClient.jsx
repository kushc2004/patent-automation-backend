import { useState } from "react";
const { GoogleGenerativeAI } = require("@google/generative-ai");

const useGeminiClient = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchResponse = async (prompt, history = []) => {
    setLoading(true);
    setError(null);

    try {
      const genAI = new GoogleGenerativeAI("AIzaSyBa2Boeqwb-nTZ_6IZxesRbawOBasBQr1E");
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash-8b",
      });

      const generationConfig = {
        temperature: 1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      };

      const chatSession = model.startChat({
        generationConfig,
        history: history
          .filter((msg) => msg.text.trim() !== "")
          .map((msg) => ({
            role: msg.sender === "user" ? "user" : "model",
            parts: msg.text
              .split("\n")
              .filter((part) => part.trim() !== "")
              .map((part) => ({ text: part })),
          })),
      });

      const result = await chatSession.sendMessage(prompt);
      const responseText = result.response.candidates[0].content.parts[0].text;

      setLoading(false);
      return responseText;
    } catch (err) {
      console.error("Error fetching response from Gemini:", err);
      setError("Failed to fetch response from Gemini.");
      setLoading(false);
      return null;
    }
  };

  return { fetchResponse, loading, error };
};

export default useGeminiClient;
