import { useState } from "react";
import axios from "axios";

const useUploadFile = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const uploadFile = async (file, folderPath) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append("folder_name", folderPath);
      formData.append("file", file);

      console.log("Uploading file:", file);

      const response = await axios.post(
        "https://legalai-backend-1.onrender.com/api/upload_file",
        formData,
        { withCredentials: true }
      );

      if (response.status !== 200) {
        throw new Error("Failed to upload file");
      }

      setSuccessMessage(response.data.message);
      return response.data.message;
    } catch (err) {
      console.error("Error uploading file:", err);
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { uploadFile, loading, error, successMessage };
};

export default useUploadFile;
