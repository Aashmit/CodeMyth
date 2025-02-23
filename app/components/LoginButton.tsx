// components/LoginButton.tsx
"use client";
import { useEffect, useState } from "react";
import axios from "axios";

export default function LoginButton(): React.ReactElement {
  const [authUrl, setAuthUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get("https://code-myth.vercel.app/api/py/auth/github")
      .then((response) => {
        if (response.data.auth_url) {
          setAuthUrl(response.data.auth_url);
          setLoading(false);
        } else {
          setError("Invalid response from server");
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Error fetching auth URL:", error);

        // Extract the most useful error message
        let errorMessage = "Failed to connect to authentication server";
        if (error.response) {
          // The server responded with a status code outside of 2xx range
          const serverError =
            error.response.data?.detail || error.response.statusText;
          errorMessage = `Server error: ${serverError}`;
        } else if (error.request) {
          // The request was made but no response was received
          errorMessage =
            "No response from server. Please check if the API is running.";
        }

        setError(errorMessage);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center space-x-2">
        <div className="w-4 h-4 rounded-full bg-gray-900 animate-pulse"></div>
        <div className="w-4 h-4 rounded-full bg-gray-700 animate-pulse delay-75"></div>
        <div className="w-4 h-4 rounded-full bg-gray-500 animate-pulse delay-150"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <a
      href={authUrl}
      className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-700 transition-colors"
    >
      Login with GitHub
    </a>
  );
}
