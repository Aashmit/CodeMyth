import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  LogOut,
  Github,
  BookOpen,
  Send,
  GitCommit,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "./ui/scroll-area";

interface DocumentationCardProps {
  selectedRepo: { name: string };
  error: string | null;
  documentation: string | null;
  handleGenerateDocumentation: () => void;
  setError: (error: string | null) => void;
  setUserFeedback: (feedback: string) => void;
  handleSubmitFeedback: () => void;
  handleCommitDocumentation: () => void;
}

const DocumentationCard: React.FC<DocumentationCardProps> = ({
  selectedRepo,
  error,
  documentation,
  handleGenerateDocumentation,
  setError,
  setUserFeedback,
  handleSubmitFeedback,
  handleCommitDocumentation,
}) => {
  const [processingDoc, setProcessingDoc] = useState(false);
  const [userFeedback, setUserFeedbackLocal] = useState("");

  // Function to simulate documentation generation
  const simulateGenerateDocumentation = () => {
    setProcessingDoc(true);
    // Simulate async documentation generation
    setTimeout(() => {
      setProcessingDoc(false);
      setUserFeedbackLocal(""); // Reset feedback after doc is generated
    }, 3000); // Simulate a 3-second delay
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
                  onClick={() => setError(null)}
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
