"use client";

import { useState, useEffect } from "react";
import type { Repository } from "@/types/github";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileIcon,
  FolderIcon,
  CheckCircleIcon,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface SidebarProps {
  repositories: Repository[];
  onSelectRepo: (repo: Repository) => void;
  selectedRepo: Repository | null;
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({
  repositories,
  onSelectRepo,
  selectedRepo,
  isOpen,
  onToggle,
}: SidebarProps) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted) return null;

  return (
    <>
      {/* Mobile Toggle Button - Only visible on mobile */}
      {isMobile && !isOpen && (
        <button
          onClick={onToggle}
          className="fixed top-4 left-4 z-50 bg-primary text-white p-2 rounded-full shadow-lg"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Sidebar */}
      <div
        className={`h-screen bg-gray-900/95 border-r border-gray-800 transition-all duration-300 flex flex-col ${isOpen ? "w-80" : "w-0"} ${isMobile ? "fixed z-40" : "relative"}`}
      >
        {isOpen && (
          <>
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Repositories</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="text-gray-400 hover:text-white"
                aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
              >
                {isMobile ? (
                  <ChevronLeft className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </Button>
            </div>

            <ScrollArea className="flex-1 p-4">
              {repositories.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No repositories found
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {repositories.map((repo) => (
                    <Card
                      key={repo.id}
                      className={`transition-all hover:shadow-md ${selectedRepo?.id === repo.id ? "ring-2 ring-primary" : ""}`}
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
                          variant={selectedRepo?.id === repo.id ? "default" : "outline"}
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
          </>
        )}

        {/* Collapsed sidebar toggle button */}
        {!isOpen && !isMobile && (
          <button
            onClick={onToggle}
            className="absolute top-4 -right-10 bg-primary text-white p-2 rounded-full shadow-lg"
            aria-label="Open sidebar"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}
    </>
  );
}