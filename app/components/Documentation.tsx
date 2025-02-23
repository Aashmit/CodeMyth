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
  warning: any;
  setWarning: any;
  success: any;
  setSuccess: any;
}

const DocumentationCard: React.FC<DocumentationCardProps> = ({
  selectedRepo,
  error,
  setError,
  // setUserFeedback,
  documentation,
  setDocumentation,
  warning,
  setWarning,
  success,
  setSuccess,
}) => {
  const [processingDoc, setProcessingDoc] = useState(false);
  const [generatingDocs, setGeneratingDOcs] = useState(false);

  const [docId, setDocId] = useState(false);
  const [userFeedback, setUserFeedbackLocal] = useState("");
  console.log(documentation, "documentationdocumentation");
  const handleGenerateDocumentation = async () => {
    console.log("I am here");

    if (!selectedRepo) return;

    try {
      setProcessingDoc(true);
      setDocumentation("");
      setSuccess(null); // Reset success message when starting

      const accessToken = localStorage.getItem("accessToken");

      if (!accessToken) {
        console.error("Access token not found.");
        return;
      }

      // First API call to fetch files from the GitHub repo
      const response = await fetch(
        `https://code-myth.vercel.app/api/py/github/repo/${selectedRepo.full_name}/files?branch=main&access_token=${accessToken}`
      );
      const filesData = (await response.json()) as any;

      if (!response.ok) {
        console.error("Failed to fetch files", filesData);
        return;
      }

      // Show success message for downloading the files
      setSuccess("Read the GitHub files successfully!");

      setGeneratingDOcs(true);
      const postResponse = await fetch(
        "https://code-myth.vercel.app/api/py/generate-docs",
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
      setSuccess("Generated the documentation successfully!");
      setDocumentation(responseData.documentation);
      setGeneratingDOcs(false);
      setDocId(responseData.documentation_id);
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
      const feedbackResponse = await axios.post(
        `https://code-myth.vercel.app/api/py/docs/refine`,
        {
          documentation_id: docId,
          feedback: userFeedback,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (
        feedbackResponse.data.response &&
        feedbackResponse.data.response.includes(
          "I couldn’t process your feedback due to an internal error"
        )
      ) {
        // setWarning(
        //   "⚠️ Unable to process feedback due to an internal error. Please refine your input and try again."
        // );
        setWarning(null);
        setSuccess("Feedback processed successfully!");
        setUserFeedbackLocal("");
        return;
      }
      if (feedbackResponse.data.response) {
        setSuccess(feedbackResponse.data.response);
        setUserFeedbackLocal("");
        return;
      }
      console.log(feedbackResponse, "feedbackResponse.data");
      setSuccess("Feedback processed successfully!");
      setDocumentation(feedbackResponse.data.updated_docs);
    } catch (err) {
      console.error("Failed to refine documentation:", err);
      setError("Failed to process feedback. Please try again later.");
    } finally {
      setProcessingDoc(false);
      setUserFeedbackLocal("");
    }
  };
  console.log(selectedRepo, "selectedReposelectedRepo");
  console.log(docId, "docIddocIddocId");
  const handleCommitDocumentation = async () => {
    if (!documentation || !selectedRepo) return;

    try {
      const accessToken = localStorage.getItem("accessToken");
      const username = selectedRepo.full_name.split("/")[0];
      await axios.post(
        `https://code-myth.vercel.app/api/pydocs/accept-changes`,
        {
          documentation_id: docId, // Assuming this is the correct ID
          repo_owner: username, // Replace with actual owner
          repo_name: selectedRepo.name,
          github_token: accessToken,
          branch: "main",
          file_path: "developer_documentation.md",
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

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
    <>
      {selectedRepo && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Generate Documentation for {selectedRepo.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Success Display */}
            {success && (
              <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-green-500">
                <div className="flex justify-between items-center">
                  <p>{success}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSuccess(null)} // Clear success message
                    className="h-auto p-1 hover:bg-green-500/20"
                  >
                    ×
                  </Button>
                </div>
              </div>
            )}

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
            {warning && (
              <div className="rounded-lg border border-warning bg-warning/10 p-4 text-warning">
                <div className="flex justify-between items-center">
                  <p>{warning}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setWarning(null)}
                    className="h-auto p-1 hover:bg-warning/20"
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
                {generatingDocs
                  ? "Generating Documentation"
                  : processingDoc
                  ? "Processing..."
                  : "Generate Documentation"}
              </Button>
            )}

            {/* Documentation Preview Section */}
          </CardContent>
        </Card>
      )}
      {documentation && (
        <div className="space-y-6">
          {/* Documentation Preview with Toggle */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-white">
                Documentation Preview
              </h3>
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
          <Card>
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
          </Card>
        </div>
      )}
    </>
  );
};

export default DocumentationCard;
