"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, Search, ArrowLeft, Book } from "lucide-react"

interface Repository {
  id: number
  name: string
  description: string
  owner: {
    login: string
  }
}

export default function RepositoriesPage() {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [filteredRepos, setFilteredRepos] = useState<Repository[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("accessToken")
    if (!token) {
      router.push("/")
      return
    }

    const fetchRepositories = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/py/github/repos?access_token=${token}`)
        if (!response.ok) {
          throw new Error("Failed to fetch repositories")
        }
        const data = await response.json()
        setRepositories(data.repositories)
        setFilteredRepos(data.repositories)
      } catch (error) {
        console.error("Error fetching repositories:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRepositories()
  }, [router])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredRepos(repositories)
    } else {
      const filtered = repositories.filter(
        (repo) =>
          repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase())),
      )
      setFilteredRepos(filtered)
    }
  }, [searchQuery, repositories])

  const handleRepoSelect = (repo: Repository) => {
    // Store selected repo info in localStorage
    localStorage.setItem(
      "selected_repo",
      JSON.stringify({
        owner: repo.owner.login,
        name: repo.name,
      }),
    )

    // Navigate to documentation generator page
    router.push("/generator")
  }

  const handleLogout = () => {
    localStorage.removeItem("github_token")
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b border-gray-200 bg-white p-4 flex justify-between items-center">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-lg ml-2">Your Repositories</h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      </header>

      <main className="flex-1 p-6 container max-w-4xl mx-auto">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Search repositories..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No repositories found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRepos.map((repo) => (
              <Card key={repo.id} className="hover:shadow-md transition-shadow h-full flex flex-col">
              <CardContent className="flex-1 pt-6">
                <div className="flex items-start gap-3">
                  <Book className="h-6 w-6 text-gray-400 mt-1" />
                  <div>
                    <h2 className="font-semibold text-lg">{repo.name}</h2>
                    <p className="text-gray-500 text-sm mt-1 line-clamp-2">{repo.description || "No description"}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t bg-gray-50 p-3 mt-auto">
                <Button variant="default" size="sm" className="w-full" onClick={() => handleRepoSelect(repo)}>
                  Generate Documentation
                </Button>
              </CardFooter>
            </Card>            
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

