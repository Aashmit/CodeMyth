"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
  bio: string | null;
  followers: number;
  following: number;
  public_repos: number;
  [key: string]: any;
}

interface AuthResponse {
  access_token: string;
  user: GitHubUser;
}

export default function CallbackPage(): React.ReactElement | null {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Ensure code runs only on the client side
    if (typeof window === "undefined") return;

    const code = searchParams.get("code");

    if (!code) {
      setError("No authorization code provided");
      setLoading(false);
      return;
    }

    // Exchange code for access token
    axios
      .get<AuthResponse>(
        `https://code-myth.vercel.app/api/py/auth/github/callback?code=${code}`
      )
      .then((response) => {
        // Store user data in localStorage or a state management solution
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "githubUser",
            JSON.stringify(response.data.user)
          );
          localStorage.setItem("accessToken", response.data.access_token);
        }

        // Redirect to dashboard or profile page
        router.push("/dashboard");
      })
      .catch((err) => {
        console.error("Authentication failed:", err);
        setError("Authentication failed. Please try again.");
        setLoading(false);
      });
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
        <p className="mt-4 text-lg">Authenticating with GitHub...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="mt-4 px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-700 transition-colors"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return null;
}
