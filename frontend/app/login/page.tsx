"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Github, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"

export default function LoginPage() {
  const [mounted, setMounted] = useState(false)
  const { user, loading, signInWithGitHub } = useAuth()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  const handleGitHubLogin = async () => {
    try {
      await signInWithGitHub()
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  // If user is already logged in, don't show login form
  if (user) {
    return null
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-purple-50 to-purple-100 dark:from-slate-900 dark:via-slate-800 dark:to-black transition-colors duration-500" />

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300/20 dark:bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300/20 dark:bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md animate-fade-in">
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-0 shadow-2xl">
            <CardContent className="p-8">
              {/* Logo and Branding */}
              <div className="text-center mb-8 animate-slide-up">
                <div className="flex items-center justify-center mb-4">
                  <div className="relative">
                    <Bot className="w-12 h-12 text-purple-600 dark:text-purple-400" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
                  AliBot
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">Your AI-powered assistant</p>
              </div>

              {/* Login Form */}
              <div className="space-y-6 animate-slide-up delay-200">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">Welcome back</h2>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">Sign in to continue to your dashboard</p>
                </div>

                <Button
                  onClick={handleGitHubLogin}
                  className="w-full h-12 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white transition-all duration-200 transform hover:scale-105 active:scale-95"
                  size="lg"
                >
                  <Github className="w-5 h-5 mr-3" />
                  Continue with GitHub
                </Button>

                <div className="text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    By signing in, you agree to our{" "}
                    <a href="#" className="text-purple-600 dark:text-purple-400 hover:underline">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-purple-600 dark:text-purple-400 hover:underline">
                      Privacy Policy
                    </a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8 animate-fade-in delay-500">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Need help?{" "}
              <a href="#" className="text-purple-600 dark:text-purple-400 hover:underline">
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
