import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BookOpen, Send, GitCommit, Eye, EyeOff } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "./ui/scroll-area";
import axios from "axios";
import MarkdownPreview from "./MarkdownPreview";

interface DocumentationCardProps {
  selectedRepo: { full_name: string; name: string };
  error: string | null;
  setError: (error: string | null) => void;
  // setUserFeedback: (feedback: string) => void;
  documentation?: string | null;
  setDocumentation: (documentation: string) => void;
}

const DocumentationCard: React.FC<DocumentationCardProps> = ({
  selectedRepo,
  error,
  setError,
  // setUserFeedback,
  documentation,
  setDocumentation,
}) => {
  const [processingDoc, setProcessingDoc] = useState(false);
  const [userFeedback, setUserFeedbackLocal] = useState("");
  console.log(documentation, "documentationdocumentation");
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
        `http://localhost:8000/api/py/github/repo/${selectedRepo.full_name}/files?branch=main&access_token=${accessToken}`
      );
      const filesData = (await response.json()) as any;

      if (!response.ok) {
        console.error("Failed to fetch files", filesData);
        return;
      }

      console.log("Files data:", filesData);

      const postResponse = await fetch(
        "http://localhost:8000/api/py/generate-docs",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            files: filesData?.files || [], // Ensure filesData.files is always an array
          }),
        }
      );

      if (!postResponse.ok) {
        throw new Error(`HTTP error! Status: ${postResponse.status}`);
      }

      const responseData = await postResponse.json(); // Assuming the response is JSON
      setDocumentation(responseData.documentation);
      console.log("Response Data:", responseData);
    } catch (error) {
      setError("Failed to generate documentation. Please try again later.");
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

      const accessToken = localStorage.getItem("accessToken");
      const response = await axios.post(
        `http://localhost:8000/api/py/docs/feedback`,
        {
          filename: selectedRepo.full_name, // Assuming full_name represents the file's identifier
          feedback: userFeedback,
          original_content: documentation, // Renamed to match API requirement
          chunk_id: 0, // Default value (update if necessary)
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      setDocumentation(response.data.documentation);
      // setUserFeedback(""); // Clear feedback
    } catch (err) {
      console.error("Failed to refine documentation:", err);
      setError("Failed to process feedback. Please try again later.");
    } finally {
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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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
              {/* Documentation Preview with Toggle */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium">Documentation Preview</h3>
                  <Button
                    onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {isPreviewOpen ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    {isPreviewOpen ? "Hide Preview" : "Show Preview"}
                  </Button>
                </div>

                {isPreviewOpen ? (
                  <MarkdownPreview markdownContent={documentation} />
                ) : (
                  <ScrollArea className="h-[300px] rounded-md border bg-muted/50 p-4">
                    <pre className="whitespace-pre-wrap font-mono text-sm">
                      {documentation}
                    </pre>
                  </ScrollArea>
                )}
              </div>

              {/* Feedback Section */}
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
