import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BookOpen, Send, GitCommit } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "./ui/scroll-area";
import axios from "axios";

interface DocumentationCardProps {
  selectedRepo: { full_name: string };
  error: string | null;
  setError: (error: string | null) => void;
  setUserFeedback: (feedback: string) => void;
  documentation?: string | null;
  setDocumentation: (documentation: string) => void;
}

const DocumentationCard: React.FC<DocumentationCardProps> = ({
  selectedRepo,
  error,
  setError,
  setUserFeedback,
  documentation,
  setDocumentation,
}) => {
  const [processingDoc, setProcessingDoc] = useState(false);
  const [userFeedback, setUserFeedbackLocal] = useState("");
  // Helper function to format markdown chunks
  function formatMarkdownChunk(chunk: string) {
    console.log(chunk, "chunkchunkchunk");
    // Add double line breaks for proper markdown rendering
    return chunk
      .split("\n")
      .map((line) => {
        console.log(line, "linelineline");
        // Preserve existing markdown headers
        if (line.startsWith("#")) {
          return line;
        }
        // Add proper spacing around list items
        if (line.match(/^[-*]\s/)) {
          return `\n${line}\n`;
        }
        // Add proper spacing around code blocks
        if (line.match(/^```/)) {
          return `\n${line}`;
        }
        return line;
      })
      .join("\n");
  }

  const handleGenerateDocumentation = async () => {
    console.log("I am here");

    if (!selectedRepo) return;

    try {
      setProcessingDoc(true);
      setDocumentation("");

      const accessToken = localStorage.getItem("accessToken");

      if (!accessToken) {
        console.error("Access token not found.");
        return;
      }

      // First API call to fetch files from the GitHub repo
      const response = await fetch(
        `http://localhost:8000/api/py/github/repo/shreya-as/github-issue-page-frontend/files?branch=main&access_token=${accessToken}`
      );
      const filesData = (await response.json()) as any;

      if (!response.ok) {
        console.error("Failed to fetch files", filesData);
        return;
      }

      console.log("Files data:", filesData);

      // Second API call using POST to generate docs
      const postResponse = await fetch(
        `http://localhost:8000/api/py/generate-docs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            files: filesData?.files, // Ensure 'files' is the correct key here
          }),
        }
      );
      // Check if the POST request is successful
      if (postResponse.ok) {
        const reader = postResponse.body.getReader();
        const decoder = new TextDecoder();
        let docData = "";
        console.log(docData, "docDatadocData");
        // Read the stream in chunks and accumulate the data
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode the chunk and accumulate it
          const chunk = decoder.decode(value, { stream: true });
          docData += chunk;
          // Format the accumulated data so far
          let formattedDoc = formatMarkdownChunk(docData);
          console.log(formattedDoc, "formattedDocformattedDocformattedDoc");
          // Optionally, you can format it here to ensure proper markdown structure
          // console.log(formattedDocData, "formattedDocDataformattedDocData");
        }

        // setDocumentation(formattedDocData);
      } else {
        // Handle any error responses
        console.error("Failed to fetch documentation");
      }
    } catch (error) {
      console.error("Error during documentation generation:", error);
    } finally {
      setProcessingDoc(false);
    }
  };

  console.log(documentation, "hey error");

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

  // Function to simulate documentation generation
  const simulateGenerateDocumentation = () => {
    handleGenerateDocumentation();
  };

  return (
    selectedRepo && (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Generate Documentation for {selectedRepo.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
              <div className="flex justify-between items-center">
                <p>{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setError(null);
                  }}
                  className="h-auto p-1 hover:bg-destructive/20"
                >
                  ×
                </Button>
              </div>
            </div>
          )}

          {/* Button to Generate Documentation */}
          {!documentation && (
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={simulateGenerateDocumentation}
              disabled={processingDoc}
            >
              {processingDoc && <Loader2 className="h-4 w-4 animate-spin" />}
              {processingDoc ? "Processing..." : "Generate Documentation"}
            </Button>
          )}

          {/* Documentation Preview Section */}
          {documentation && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-3">
                  Documentation Preview
                </h3>
                <ScrollArea className="h-[300px] rounded-md border bg-muted/50 p-4">
                  <pre className="whitespace-pre-wrap font-mono text-sm">
                    {documentation}
                  </pre>
                </ScrollArea>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3">Provide Feedback</h3>
                <Textarea
                  placeholder="Suggest improvements or changes to the documentation..."
                  value={userFeedback}
                  onChange={(e) => setUserFeedbackLocal(e.target.value)}
                  className="min-h-[120px] mb-4"
                />
                <div className="flex gap-3">
                  <Button
                    onClick={handleSubmitFeedback}
                    disabled={!userFeedback || processingDoc}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Submit Feedback
                  </Button>
                  <Button
                    onClick={handleCommitDocumentation}
                    variant="secondary"
                    className="gap-2"
                  >
                    <GitCommit className="h-4 w-4" />
                    Commit to Repository
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  );
};

export default DocumentationCard;
