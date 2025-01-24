import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyDOBEZZFMzbWpIF-pfWDiJuajo5E-cBJhI");

// Converts file data to a GoogleGenerativeAI.Part object
function fileToGenerativePart(file) {
  return {
    inlineData: {
      data: file.base64, // Pass the base64-encoded file content
      mimeType: file.mimeType,
    },
  };
}

// Client function for generating content with files
async function client1(prompt, files = []) {
  // Choose the Gemini model
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  // Convert files to generative parts
  const imageParts = files.map((file) => fileToGenerativePart(file));

  // Combine prompt and file parts
  const generatedContent = await model.generateContent([prompt, ...imageParts]);

  // Return the generated text
  return generatedContent.response.text();
}

export default client1;
