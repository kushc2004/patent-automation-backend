import { useState } from "react";
import axios from "axios";

const useGetFile = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getFile = async (filePath) => {
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
    } catch (err) {
      console.error("Error getting file:", err);
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { getFile, loading, error };
};

export default useGetFile;
