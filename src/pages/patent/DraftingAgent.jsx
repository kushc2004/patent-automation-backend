import React, { useState, useRef, useEffect } from 'react';
const { GoogleGenerativeAI } = require("@google/generative-ai");

const client = async (prompt, history=[]) => {
    const apiKey = "AIzaSyBa2Boeqwb-nTZ_6IZxesRbawOBasBQr1E";
    if (!apiKey) {
        throw new Error("Gemini API key is not set.");
    }

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

    const chatSession = model.startChat({
        generationConfig,
        history: history
            .filter(msg => msg.text.trim() !== "")
            .map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: msg.text
                    .split('\n')
                    .filter(part => part.trim() !== "") 
                    .map(part => ({ text: part }))
            }))
    });

    console.log(history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: msg.text.split('\n').map(part => ({ text: part }))
    })));

    // console.log("prompt: ", prompt);

    const result = await chatSession.sendMessage(prompt);

    console.log(result);
    return result.response.candidates[0].content.parts[0].text;
};

export default client;