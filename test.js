const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
  } = require("@google/generative-ai");
  
  const apiKey = "AIzaSyBa2Boeqwb-nTZ_6IZxesRbawOBasBQr1E";
  const genAI = new GoogleGenerativeAI(apiKey);
  
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
  
  async function run() {
    const chatSession = model.startChat({
      generationConfig,
      history: [
        {
          role: "user",
          parts: [
            {text: "hello"},
          ],
        },
        {
          role: "model",
          parts: [
            {text: "Hello! How can I help you today?\n"},
          ],
        },
      ],
    });
  
    const result = await chatSession.sendMessage("Hello how are you");
    console.log(result.response.text());
  }
  
  run();