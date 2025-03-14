"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { Loader2, Github } from "lucide-react"

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    // Check if user is logged in by looking for token in localStorage
    const token = localStorage.getItem("accessToken")
    if (token) {
      setIsLoggedIn(true)
    }
  }, [])

  const handleLogin = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/py/auth/github')
      const data = await response.json()
      
      if (data.auth_url) {
        window.location.href = data.auth_url
      } else {
        throw new Error('Failed to get authorization URL')
      }
    } catch (error) {
      console.error('Login error:', error)
      setIsLoading(false)
    }
  }

  const handleContinue = () => {
    router.push("/repositories")
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-6">
            <Github className="h-16 w-16 text-gray-800" />
            <h1 className="text-2xl font-bold text-center">GitHub Documentation Generator</h1>
            <p className="text-center text-gray-500">
              Generate comprehensive documentation for your GitHub repositories using AI
            </p>

            {isLoggedIn ? (
              <Button className="w-full" onClick={handleContinue}>
                Continue to Repositories
              </Button>
            ) : (
              <Button className="w-full" onClick={handleLogin} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting to GitHub...
                  </>
                ) : (
                  <>
                    <Github className="mr-2 h-4 w-4" />
                    Login with GitHub
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

