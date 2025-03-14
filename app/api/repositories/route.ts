import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    // In a real implementation, you would:
    // 1. Extract the GitHub token from the request
    // 2. Use it to fetch repositories from GitHub API

    // For demo purposes, we'll return mock data
    const mockRepositories = [
      {
        id: 1,
        name: "react-project",
        description: "A React.js project with TypeScript",
        owner: { login: "user" },
      },
      {
        id: 2,
        name: "python-api",
        description: "Python FastAPI backend service",
        owner: { login: "user" },
      },
      {
        id: 3,
        name: "documentation-tool",
        description: "Tool for generating documentation",
        owner: { login: "user" },
      },
      {
        id: 4,
        name: "ml-experiments",
        description: "Machine learning experiments and models",
        owner: { login: "user" },
      },
      {
        id: 5,
        name: "personal-website",
        description: "My personal portfolio website",
        owner: { login: "user" },
      },
    ]

    return NextResponse.json({ repositories: mockRepositories })
  } catch (error) {
    console.error("Error fetching repositories:", error)
    return NextResponse.json({ error: "Failed to fetch repositories" }, { status: 500 })
  }
}

