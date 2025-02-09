import React, { useState } from "react";

const usePerplexityClient = () => {
  const [loading, setLoading] = useState(false);

  const fetchResponse = async (userQuery) => {
    setLoading(true);

    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer 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`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: "Be precise and concise." },
          { role: "user", content: userQuery },
        ],
        max_tokens: null,
        temperature: 0.2,
        top_p: 0.9,
        search_domain_filter: ["perplexity.ai"],
        return_images: false,
        return_related_questions: false,
        search_recency_filter: "month",
        top_k: 0,
        stream: false,
        presence_penalty: 0,
        frequency_penalty: 1,
        response_format: null,
      }),
    };

    try {
      const response = await fetch(
        "https://api.perplexity.ai/chat/completions",
        options
      );
      const data = await response.json();
      setLoading(false);

      if (data?.choices?.length > 0) {
        return data.choices[0].message.content;
      } else {
        return "No response received.";
      }
    } catch (error) {
      console.error("Error fetching response from Perplexity:", error);
      setLoading(false);
      return "Error occurred while fetching response.";
    }
  };

  return { fetchResponse, loading }; // Return as an object ✅
};

export default usePerplexityClient;
