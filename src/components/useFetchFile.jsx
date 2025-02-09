import { useState } from "react";
import axios from "axios";

const useFetchFile = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFile = async (filePath) => {
    setLoading(true);
    setError(null);
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
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { fetchFile, loading, error };
};

export default useFetchFile;
