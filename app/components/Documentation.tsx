import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BookOpen, Send, GitCommit, Eye, EyeOff } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "./ui/scroll-area";
import axios from "axios";
import MarkdownPreview from "./MarkdownPreview";

// Update the prop type to allow functional updates
interface DocumentationCardProps {
  selectedRepo: { full_name: string; name: string };
  error: string | null;
  setError: (error: string | null) => void;
  documentation?: string | null;
  setDocumentation: React.Dispatch<React.SetStateAction<string | null>>; // Updated type
  warning: any;
  setWarning: any;
  success: any;
  setSuccess: any;
}

const DocumentationCard: React.FC<DocumentationCardProps> = ({
  selectedRepo,
  error,
  setError,
  documentation,
  setDocumentation,
  warning,
  setWarning,
  success,
  setSuccess,
}) => {
  const [processingDoc, setProcessingDoc] = useState(false);
  const [generatingDocs, setGeneratingDocs] = useState(false);
  const [docId, setDocId] = useState<string | false>(false);
  const [userFeedback, setUserFeedbackLocal] = useState("");
  const [groqApiKey, setGroqApiKey] = useState("");
  const [showGroqModal, setShowGroqModal] = useState(false);

  const handleGenerateDocumentation = async () => {
    if (!selectedRepo) return;

    try {
      setProcessingDoc(true);
      setDocumentation("");
      setSuccess(null);

      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        setError("Access token not found.");
        return;
      }

      const response = await fetch(
        `https://code-myth.vercel.app/api/py/github/repo/${selectedRepo.full_name}/files?branch=main&access_token=${accessToken}`
      );
      const filesData = await response.json();

      if (!response.ok) {
        throw new Error("Failed to fetch files");
      }

      setSuccess("Read the GitHub files successfully!");
      setGeneratingDocs(true);

      const postResponse = await fetch(
        "https://code-myth.vercel.app/api/py/generate-docs",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: filesData?.files || [] }),
        }
      );

      if (!postResponse.ok) {
        throw new Error(`HTTP error! Status: ${postResponse.status}`);
      }

      const responseData = await postResponse.json();
      setSuccess("Generated the documentation successfully!");
      setDocumentation(responseData.documentation);
      setDocId(responseData.documentation_id);
    } catch (error) {
      setError("Failed to generate documentation. Please try again later.");
      console.error("Error during documentation generation:", error);
    } finally {
      setProcessingDoc(false);
      setGeneratingDocs(false);
    }
  };

  const handleGenerateWithGroq = () => {
    if (!groqApiKey) {
      setShowGroqModal(true);
      return;
    }
    generateWithGroq();
  };

  const generateWithGroq = async () => {
    if (!selectedRepo) return;

    try {
      setProcessingDoc(true);
      setDocumentation("");
      setSuccess(null);

      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        setError("Access token not found.");
        return;
      }

      const filesResponse = await fetch(
        `https://code-myth.vercel.app/api/py/github/repo/${selectedRepo.full_name}/files?branch=main&access_token=${accessToken}`
      );
      const filesData = await filesResponse.json();

      if (!filesResponse.ok) {
        throw new Error("Failed to fetch files");
      }

      setSuccess("Read the GitHub files successfully!");
      setGeneratingDocs(true);

      const response = await fetch(
        "https://code-myth.vercel.app/api/py/generate-with-groq",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            files: filesData?.files || [],
            groq_api_key: groqApiKey,
            model_name: "mixtral-8x7b-32768",
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get response stream reader");
      }

      const decoder = new TextDecoder();
      let accumulatedDoc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(5);
            try {
              const parsed = JSON.parse(data);
              if (parsed.status === "completed") {
                setSuccess("Generated documentation with Groq successfully!");
                setDocId(parsed.documentation_id);
                setGeneratingDocs(false);
                setProcessingDoc(false);
              } else if (parsed.status === "error") {
                setError(parsed.message);
                setGeneratingDocs(false);
                setProcessingDoc(false);
              } else if (parsed.status === "rate_limit") {
                setWarning(
                  `${parsed.message} Retrying in ${parsed.retry_after}s...`
                );
              }
            } catch (e) {
              // If not JSON, treat as content
              accumulatedDoc += data;
              setDocumentation(accumulatedDoc);
            }
          }
        }
      }
    } catch (error) {
      setError("Failed to generate documentation with Groq. Please try again.");
      console.error("Error during Groq generation:", error);
      setProcessingDoc(false);
      setGeneratingDocs(false);
    }
  };

  const handleSubmitGroqKey = () => {
    setShowGroqModal(false);
    generateWithGroq();
  };

  const handleSubmitFeedback = async () => {
    if (!userFeedback || !selectedRepo || !docId) return;

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
        feedbackResponse.data.response?.includes(
          "I couldn’t process your feedback due to an internal error"
        )
      ) {
        setWarning(null);
        setSuccess("Feedback processed successfully!");
        setUserFeedbackLocal("");
        return;
      }

      if (feedbackResponse.data.response) {
        setSuccess(feedbackResponse.data.response);
        setUserFeedbackLocal("");
        setDocumentation(feedbackResponse.data.updated_docs);
      }
    } catch (err) {
      setError("Failed to process feedback. Please try again later.");
      console.error("Failed to refine documentation:", err);
    } finally {
      setProcessingDoc(false);
      setUserFeedbackLocal("");
    }
  };

  const handleCommitDocumentation = async () => {
    if (!documentation || !selectedRepo || !docId) return;

    try {
      const accessToken = localStorage.getItem("accessToken");
      const username = selectedRepo.full_name.split("/")[0];
      await axios.post(
        `https://code-myth.vercel.app/api/py/docs/accept-changes`,
        {
          documentation_id: docId,
          repo_owner: username,
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

      setSuccess("Documentation successfully committed to repository!");
    } catch (err) {
      setError("Failed to commit documentation. Please try again later.");
      console.error("Failed to commit documentation:", err);
    }
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
            {success && (
              <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-green-500">
                <div className="flex justify-between items-center">
                  <p>{success}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSuccess(null)}
                    className="h-auto p-1 hover:bg-green-500/20"
                  >
                    ×
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
                <div className="flex justify-between items-center">
                  <p>{error}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setError(null)}
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

            {!documentation && (
              <div className="flex gap-4">
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={handleGenerateDocumentation}
                  disabled={processingDoc}
                >
                  {processingDoc && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {generatingDocs
                    ? "Generating Documentation"
                    : processingDoc
                    ? "Processing..."
                    : "Generate Documentation"}
                </Button>
                <Button
                  className="w-full gap-2"
                  size="lg"
                  variant="outline"
                  onClick={handleGenerateWithGroq}
                  disabled={processingDoc}
                >
                  {processingDoc && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {generatingDocs
                    ? "Generating with Groq"
                    : processingDoc
                    ? "Processing..."
                    : "Generate with Groq"}
                </Button>
              </div>
            )}

            {showGroqModal && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                <Card className="w-96">
                  <CardHeader>
                    <CardTitle>Enter Groq API Key</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      type="password"
                      value={groqApiKey}
                      onChange={(e) => setGroqApiKey(e.target.value)}
                      placeholder="Your Groq API key"
                      className="w-full"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSubmitGroqKey}
                        disabled={!groqApiKey}
                        className="w-full"
                      >
                        Submit
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowGroqModal(false)}
                        className="w-full"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {documentation && (
        <div className="space-y-6">
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
                disabled={!userFeedback || processingDoc || !docId}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Submit Feedback
              </Button>
              <Button
                onClick={handleCommitDocumentation}
                variant="secondary"
                disabled={!docId}
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