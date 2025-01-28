# utils/gemini_client.py

import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

def gemini_client(prompt, file_paths=[]):
    gemini_api_key = "AIzaSyDzl9Xc6JWi0maEyGXiSy-K22-4GBw5w2c"
    genai.configure(api_key=gemini_api_key)
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash-002",
        generation_config={
            "temperature": 0.2,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 8192,
            "response_mime_type": "application/json",
        }
    )
    if file_paths:
        uploaded_files = [genai.upload_file(file) for file in file_paths]
        response = model.generate_content([prompt] + uploaded_files)
    else:
        response = model.generate_content(prompt)
    return response.text
