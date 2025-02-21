// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Repository } from "@/types/github"; 

import RepoSelector from "@/components/RepoSelector";

// Add these types to /types/github.ts
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



export default function Dashboard(): React.ReactElement {
  const router = useRouter();
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [reposLoading, setReposLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [processingDoc, setProcessingDoc] = useState<boolean>(false);
  const [documentation, setDocumentation] = useState<string | null>(null);
  const [userFeedback, setUserFeedback] = useState<string>("");

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem("githubUser");
    const accessToken = localStorage.getItem("accessToken");
    
    if (!userData || !accessToken) {
      router.push("/");
      return;
    }
    
    setUser(JSON.parse(userData));
    setLoading(false);
    
    // Fetch repositories
    fetchRepositories(accessToken);
  }, [router]);
  
  const fetchRepositories = async (accessToken: string) => {
    try {
      setReposLoading(true);
      const response = await axios.get(`http://localhost:8000/api/py/github/repos`, {
        params: { access_token: accessToken }
      });
      
      setRepositories(response.data.repositories);
      setReposLoading(false);
    } catch (err) {
      console.error("Failed to fetch repositories:", err);
      setError("Failed to load repositories. Please try again later.");
      setReposLoading(false);
    }
  };
  const normalizedRepos = repositories.map((repo) => ({
    ...repo,
    description: repo.description ?? "No description",
  }));
  
  const handleSelectRepo = (repo: Repository) => {
    setSelectedRepo(repo);
    setDocumentation(null); // Reset documentation when selecting a new repo
  };

  const handleGenerateDocumentation = async () => {
    if (!selectedRepo) return;
    
    try {
      setProcessingDoc(true);
      // This would be the endpoint to fetch code files and process with IBM GraniteX
      // TODO: Implement backend API for this
      const accessToken = localStorage.getItem("accessToken");
      const response = await axios.post(`http://localhost:8000/api/py/generate-docs`, {
        repo_name: selectedRepo.full_name,
        access_token: accessToken
      });
      
      setDocumentation(response.data.documentation);
      setProcessingDoc(false);
    } catch (err) {
      console.error("Failed to generate documentation:", err);
      setError("Failed to generate documentation. Please try again later.");
      setProcessingDoc(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!userFeedback || !selectedRepo) return;
    
    try {
      setProcessingDoc(true);
      // TODO: Implement backend API for this
      const accessToken = localStorage.getItem("accessToken");
      const response = await axios.post(`http://localhost:8000/api/py/refine-docs`, {
        repo_name: selectedRepo.full_name,
        access_token: accessToken,
        feedback: userFeedback,
        previous_documentation: documentation
      });
      
      setDocumentation(response.data.documentation);
      setUserFeedback(""); // Clear feedback
      setProcessingDoc(false);
    } catch (err) {
      console.error("Failed to refine documentation:", err);
      setError("Failed to process feedback. Please try again later.");
      setProcessingDoc(false);
    }
  };

  const handleCommitDocumentation = async () => {
    if (!documentation || !selectedRepo) return;
    
    try {
      const accessToken = localStorage.getItem("accessToken");
      await axios.post(`http://localhost:8000/api/py/commit-docs`, {
        repo_name: selectedRepo.full_name,
        access_token: accessToken,
        documentation: documentation
      });
      
      alert("Documentation successfully committed to repository!");
    } catch (err) {
      console.error("Failed to commit documentation:", err);
      setError("Failed to commit documentation. Please try again later.");
    }
  };

  const handleLogout = (): void => {
    localStorage.removeItem("githubUser");
    localStorage.removeItem("accessToken");
    router.push("/");
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <div className="flex justify-center items-center h-screen">No user data available</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">CodeMyth Documentation</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* User Profile Card */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex items-center space-x-6">
          <img
            src={user.avatar_url}
            alt="GitHub Avatar"
            className="w-16 h-16 rounded-full"
          />
          <div>
            <h2 className="text-gray-900 font-semibold">{user.name || user.login}</h2>
            <p className="text-gray-600 text-sm">{user.bio || "No bio available"}</p>
          </div>
        </div>
      </div>
      
      {/* Repository Selection */}
      {reposLoading ? (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <RepoSelector 
          repositories={repositories} 
          onSelectRepo={handleSelectRepo} 
        />
      )}

      {/* Documentation Generation Section */}
      {selectedRepo && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-gray-500 font-semibold mb-4">Generate Documentation for {selectedRepo.name}:</h2>
          
          {!documentation && (
            <button
              onClick={handleGenerateDocumentation}
              disabled={processingDoc}
              className={`w-full py-3 rounded-md text-white font-medium ${
                processingDoc 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {processingDoc ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Generate Documentation'
              )}
            </button>
          )}

          {/* Documentation Preview */}
          {documentation && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Documentation Preview</h3>
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap">{documentation}</pre>
              </div>

              {/* Feedback Section */}
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Provide Feedback</h3>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-md"
                  rows={4}
                  placeholder="Suggest improvements or changes to the documentation..."
                  value={userFeedback}
                  onChange={(e) => setUserFeedback(e.target.value)}
                ></textarea>
                <div className="flex space-x-4 mt-4">
                  <button
                    onClick={handleSubmitFeedback}
                    disabled={!userFeedback || processingDoc}
                    className={`px-4 py-2 rounded-md text-white font-medium ${
                      !userFeedback || processingDoc
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    Submit Feedback
                  </button>
                  <button
                    onClick={handleCommitDocumentation}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                  >
                    Commit to Repository
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-700 font-bold"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}