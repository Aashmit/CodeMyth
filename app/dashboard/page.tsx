// app/dashboard/page.tsx
"use client";
import type React from "react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import type { Repository } from "@/types/github";
import {
  Loader2,
  LogOut,
  Github,
  BookOpen,
  Send,
  GitCommit,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import RepoSelector from "@/components/RepoSelector";
import DocumentationCard from "@/components/Documentation";

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
      const response = await axios.get(
        `http://localhost:8000/api/py/github/repos`,
        {
          params: { access_token: accessToken },
        }
      );

      setRepositories(response.data.repositories);
      setReposLoading(false);
    } catch (err) {
      console.error("Failed to fetch repositories:", err);
      setError("Failed to load repositories. Please try again later.");
      setReposLoading(false);
    }
  };

  const handleSelectRepo = (repo: Repository) => {
    setError("");
    setSelectedRepo(repo);
    setDocumentation(null); // Reset documentation when selecting a new repo
  };

  const handleGenerateDocumentation = async () => {
    if (!selectedRepo) return;

    try {
      setProcessingDoc(true);
      setDocumentation("");
      const accessToken = localStorage.getItem("accessToken");

      // Use server-sent events for streaming
      const eventSource = new EventSource(
        `http://localhost:8000/api/py/generate-docs-stream?repo_name=${selectedRepo.full_name}&access_token=${accessToken}`
      );

      eventSource.onmessage = (event) => {
        const newContent = event.data;
        setDocumentation((prevDoc) => prevDoc + newContent);
      };

      eventSource.onerror = () => {
        console.log("i am here");
        eventSource.close();
        setError("Failed to generate documentation. Please try again later.");
        setProcessingDoc(false);
      };

      eventSource.addEventListener("done", () => {
        eventSource.close();
        setProcessingDoc(false);
      });
    } catch (err) {
      console.error("Failed to generate documentation:", err);
      setError("Failed to generate documentation. Please try again later.");
      setProcessingDoc(false);
    }
  };
  console.log(error, "hey error");
  const handleSubmitFeedback = async () => {
    if (!userFeedback || !selectedRepo) return;

    try {
      setProcessingDoc(true);
      // TODO: Implement backend API for this
      const accessToken = localStorage.getItem("accessToken");
      const response = await axios.post(
        `http://localhost:8000/api/py/refine-docs`,
        {
          repo_name: selectedRepo.full_name,
          access_token: accessToken,
          feedback: userFeedback,
          previous_documentation: documentation,
        }
      );

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
        documentation: documentation,
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
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        No user data available
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-white" />
            <h1 className="text-3xl font-bold bg-clip-text text-white bg-gradient-to-r from-primary to-primary/60">
              CodeMyth Documentation
            </h1>
          </div>
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* User Profile */}
        <Card className="mb-8  backdrop-blur border-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <img
                  src={user?.avatar_url || "/placeholder.svg"}
                  alt="GitHub Avatar"
                  className="w-20 h-20 rounded-full ring-2 ring-primary/20"
                />
                <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1.5">
                  <Github className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold">
                  {user?.name || user?.login}
                </h2>
                <p className="text-muted-foreground">
                  {user?.bio || "No bio available"}
                </p>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{user?.public_repos} repositories</span>
                  <span>{user?.followers} followers</span>
                  <span>{user?.following} following</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Repository Selection */}
        {reposLoading ? (
          <Card className="mb-8">
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : (
          <div className="mb-8">
            <RepoSelector
              repositories={repositories}
              onSelectRepo={handleSelectRepo}
              selectedRepo={selectedRepo}
              onGenerateDocumentation={handleGenerateDocumentation}
            />
          </div>
        )}

        <DocumentationCard
          selectedRepo={selectedRepo!}
          error={error}
          processingDoc={processingDoc}
          documentation={documentation}
          userFeedback={userFeedback}
          handleGenerateDocumentation={handleGenerateDocumentation}
          setError={setError}
          setUserFeedback={setUserFeedback}
          handleSubmitFeedback={handleSubmitFeedback}
          handleCommitDocumentation={handleCommitDocumentation}
        />
      </div>
    </div>
  );
}
