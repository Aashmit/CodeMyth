"use client";
import type { Repository } from "@/types/github";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileIcon,
  FolderIcon,
  CheckCircleIcon,
  BookOpen,
  Loader2,
} from "lucide-react";

interface RepoSelectorProps {
  repositories: Repository[];
  onSelectRepo: (repo: Repository) => void;
  selectedRepo: Repository | null;
  onGenerateDocumentation: () => void;
}

export default function RepoSelector({
  repositories,
  onSelectRepo,
  selectedRepo,
  onGenerateDocumentation,
}: RepoSelectorProps) {
  const getFileIcon = (language: string | null) => {
    switch (language) {
      case "Python":
        return "🐍";
      case "JavaScript":
        return "📜";
      case "Jupyter Notebook":
        return "📓";
      default:
        return <FileIcon className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex w-full gap-4">
      <div className="flex-1">
        <h2 className="text-lg font-semibold mb-4 text-white">
          Select a Repository
        </h2>
        <ScrollArea className="h-[400px] rounded-lg border">
          {repositories.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No repositories found
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              {repositories.map((repo) => (
                <Card
                  key={repo.id}
                  className={`transition-all hover:shadow-md ${
                    selectedRepo?.id === repo.id ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <CardHeader className="pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <FolderIcon className="w-4 h-4" />
                      <h3 className="font-medium truncate">{repo.name}</h3>
                    </div>
                    {selectedRepo?.id === repo.id && (
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    )}
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {repo.description || "No description"}
                    </p>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {repo.language && (
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {getFileIcon(repo.language)}
                          {repo.language}
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={
                        selectedRepo?.id === repo.id ? "default" : "outline"
                      }
                      onClick={() => onSelectRepo(repo)}
                    >
                      {selectedRepo?.id === repo.id ? "Selected" : "Select"}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
      {/* <div className="w-64">
        <h2 className="text-lg font-semibold mb-4">Actions</h2>
        <Button
          className="w-full"
          onClick={onGenerateDocumentation}
          disabled={!selectedRepo}
        >
          Generate Documentation
        </Button>
      </div> */}
      <Card className="mb-8 w-64">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {/* Generate Documentation for {selectedRepo.name} */}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={onGenerateDocumentation}
              // disabled={processingDoc}
            >
              {/* {processingDoc && <Loader2 className="h-4 w-4 animate-spin" />}
              {processingDoc ? "Processing..." : "Generate Documentation"} */}
            </Button>
          }

          {/* {documentation && (
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
                  onChange={(e) => setUserFeedback(e.target.value)}
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
          )} */}
        </CardContent>
      </Card>
    </div>
  );
}
