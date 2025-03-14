"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Loader2, Send, FileText, GitCommit, CheckCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import MarkdownPreview from "@/components/markdown-preview"

interface RepoInfo {
  owner: string
  name: string
}

export default function GeneratorPage() {
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null)
  const [generationMethod, setGenerationMethod] = useState<"ollama" | "groq">("ollama")
  const [groqApiKey, setGroqApiKey] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)
  const [documentation, setDocumentation] = useState("")
  const [documentationId, setDocumentationId] = useState("")
  const [feedback, setFeedback] = useState("")
  const [isSendingFeedback, setIsSendingFeedback] = useState(false)
  const [showGroqKeyDialog, setShowGroqKeyDialog] = useState(false)
  const [showCommitDialog, setShowCommitDialog] = useState(false)
  const [commitPath, setCommitPath] = useState("developer_documentation.md")
  const [isCommitting, setIsCommitting] = useState(false)
  const [commitSuccess, setCommitSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState("edit")

  const router = useRouter()
  const feedbackRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const token = localStorage.getItem("github_token")
    if (!token) {
      router.push("/")
      return
    }

    const repoData = localStorage.getItem("selected_repo")
    if (!repoData) {
      router.push("/repositories")
      return
    }

    setRepoInfo(JSON.parse(repoData))
  }, [router])

  const handleGenerate = async () => {
    if (generationMethod === "groq" && !groqApiKey) {
      setShowGroqKeyDialog(true)
      return
    }

    setIsGenerating(true)

    try {
      // Mock API call to your FastAPI backend
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Mock response
      const mockDocumentation = `# ${repoInfo?.name} Documentation

## Overview

This repository contains a ${generationMethod === "groq" ? "sophisticated" : "comprehensive"} application that demonstrates modern software development practices.

## Installation

\`\`\`bash
git clone https://github.com/${repoInfo?.owner}/${repoInfo?.name}.git
cd ${repoInfo?.name}
npm install # or pip install -r requirements.txt
\`\`\`

## Usage

The application provides several key features:

1. **Authentication** - Secure user authentication system
2. **Data Processing** - Efficient algorithms for data manipulation
3. **API Integration** - Seamless connection with external services

## Architecture

The system follows a modular architecture with the following components:

- Frontend: React.js with TypeScript
- Backend: FastAPI (Python)
- Database: PostgreSQL

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
`

      setDocumentation(mockDocumentation)
      setDocumentationId("doc_" + Math.random().toString(36).substring(2))
      setIsGenerated(true)
    } catch (error) {
      console.error("Error generating documentation:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGroqKeySubmit = () => {
    setShowGroqKeyDialog(false)
    handleGenerate()
  }

  const handleSendFeedback = async () => {
    if (!feedback.trim()) return

    setIsSendingFeedback(true)

    try {
      // Mock API call to your FastAPI backend
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Mock updated documentation based on feedback
      const updatedDoc = documentation + "\n\n## Additional Information\n\n" + feedback
      setDocumentation(updatedDoc)
      setFeedback("")

      // Focus back on the textarea for continuous feedback
      if (feedbackRef.current) {
        feedbackRef.current.focus()
      }
    } catch (error) {
      console.error("Error sending feedback:", error)
    } finally {
      setIsSendingFeedback(false)
    }
  }

  const handleCommit = async () => {
    setIsCommitting(true)

    try {
      // Mock API call to your FastAPI backend
      await new Promise((resolve) => setTimeout(resolve, 2000))

      setCommitSuccess(true)

      // Reset after showing success message
      setTimeout(() => {
        setShowCommitDialog(false)
        setCommitSuccess(false)
        router.push("/repositories")
      }, 2000)
    } catch (error) {
      console.error("Error committing to repository:", error)
    } finally {
      setIsCommitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b border-gray-200 bg-white p-4 flex justify-between items-center">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.push("/repositories")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-lg ml-2">
            {repoInfo ? `${repoInfo.owner}/${repoInfo.name}` : "Loading..."}
          </h1>
        </div>
        {isGenerated && (
          <Button variant="default" size="sm" onClick={() => setShowCommitDialog(true)}>
            <GitCommit className="h-4 w-4 mr-2" />
            Commit to Repository
          </Button>
        )}
      </header>

      <main className="flex-1 p-6 container max-w-5xl mx-auto">
        {!isGenerated ? (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Generate Documentation</h2>
            <p className="text-gray-500 mb-6">Choose a method to generate documentation for your repository.</p>

            <div className="space-y-6">
              <div className="flex flex-col space-y-4">
                <label className="font-medium">Generation Method</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant={generationMethod === "ollama" ? "default" : "outline"}
                    className="flex-1 justify-start"
                    onClick={() => setGenerationMethod("ollama")}
                  >
                    <div className="flex items-center">
                      <div className="w-5 h-5 mr-2 rounded-full bg-blue-500 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">O</span>
                      </div>
                      Generate with Ollama
                    </div>
                  </Button>

                  <Button
                    variant={generationMethod === "groq" ? "default" : "outline"}
                    className="flex-1 justify-start"
                    onClick={() => setGenerationMethod("groq")}
                  >
                    <div className="flex items-center">
                      <div className="w-5 h-5 mr-2 rounded-full bg-purple-500 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">G</span>
                      </div>
                      Generate with Groq
                    </div>
                  </Button>
                </div>
              </div>

              <Button className="w-full" onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Documentation...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Documentation
                  </>
                )}
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex justify-between items-center mb-4">
                <TabsList>
                  <TabsTrigger value="edit">Edit</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>

                <div className="text-sm text-gray-500">Documentation ID: {documentationId}</div>
              </div>

              <TabsContent value="edit" className="mt-0">
                <Card className="mb-6">
                  <div className="p-4 border-b bg-gray-50">
                    <h3 className="font-medium">Generated Documentation</h3>
                  </div>
                  <div className="p-4">
                    <Textarea
                      value={documentation}
                      onChange={(e) => setDocumentation(e.target.value)}
                      className="min-h-[400px] font-mono text-sm"
                    />
                  </div>
                </Card>

                <Card>
                  <div className="p-4 border-b bg-gray-50">
                    <h3 className="font-medium">Provide Feedback</h3>
                  </div>
                  <div className="p-4">
                    <Textarea
                      ref={feedbackRef}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Provide feedback or additional instructions to refine the documentation..."
                      className="min-h-[100px] mb-4"
                    />
                    <Button onClick={handleSendFeedback} disabled={isSendingFeedback || !feedback.trim()}>
                      {isSendingFeedback ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send Feedback
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="preview" className="mt-0">
                <Card className="p-6">
                  <MarkdownPreview content={documentation} />
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      {/* Groq API Key Dialog */}
      <Dialog open={showGroqKeyDialog} onOpenChange={setShowGroqKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Groq API Key</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-4">
              Please enter your Groq API key to generate documentation using Groq models.
            </p>
            <Input
              type="password"
              placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
              value={groqApiKey}
              onChange={(e) => setGroqApiKey(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGroqKeyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleGroqKeySubmit} disabled={!groqApiKey.trim()}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Commit Dialog */}
      <Dialog open={showCommitDialog} onOpenChange={setShowCommitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Commit to Repository</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {commitSuccess ? (
              <div className="flex flex-col items-center justify-center py-4">
                <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                <p className="text-center font-medium">Successfully committed to repository!</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  Specify where to save the documentation in your repository.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">File Path</label>
                    <Input
                      value={commitPath}
                      onChange={(e) => setCommitPath(e.target.value)}
                      placeholder="docs/README.md"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          {!commitSuccess && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCommitDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCommit} disabled={isCommitting}>
                {isCommitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Committing...
                  </>
                ) : (
                  <>
                    <GitCommit className="mr-2 h-4 w-4" />
                    Commit
                  </>
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

