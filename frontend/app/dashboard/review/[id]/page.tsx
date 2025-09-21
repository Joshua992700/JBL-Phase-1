"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  Code,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Download,
  Share,
  Github,
  Eye,
  ThumbsUp,
  MessageSquare,
  TrendingUp,
  Shield,
  Zap,
  Palette,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import dynamic from "next/dynamic"
import { supabase } from "@/lib/supabase"
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

// Database schema interface matching your Supabase table
interface Review {
  id: string
  user_id: string
  title: string
  description: string | null
  language: string
  review_type: string
  status: string
  score: number | null
  created_at: string
  completed_at: string | null
  improvement_rate: number | null
  lines_of_code: number | null
  issues: number | null
  suggestions: number | null
  github_repo: string | null
  github_path: string | null
}

// Extended interface for detailed review data (would come from additional tables/analysis)
interface DetailedReview extends Review {
  code: string
  ai_analysis?: {
    summary: string
    strengths: string[]
    improvements: string[]
    categories: {
      performance: { score: number; issues: number; suggestions: number }
      security: { score: number; issues: number; suggestions: number }
      maintainability: { score: number; issues: number; suggestions: number }
      style: { score: number; issues: number; suggestions: number }
    }
  }
  detailed_issues?: Array<{
    id: number
    type: string
    severity: string
    line: number
    column_number: number  // Changed from 'column' to 'column_number'
    title: string
    message: string
    suggestion: string
    code_snippet: string
    fixed_code?: string
  }>
  metrics?: {
    complexity: number
    maintainability_index: number
    cyclomatic_complexity: number
    cognitive_complexity: number
    duplicated_lines: number
    test_coverage: number | null
  }
}


const useReviewDetail = (id: string) => {
  const [review, setReview] = useState<DetailedReview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const fetchReview = async () => {
      try {
        setLoading(true)

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) throw userError || new Error("User not found")

        // Use the backend API to fetch the complete review
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/dashboard/review/${id}?user_id=${user.id}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch review: ${response.statusText}`);
        }
        
        const reviewData = await response.json();
        if (!reviewData) {
          throw new Error("Review not found");
        }
        
        // Format the data to match our DetailedReview interface
        // Parse results if it's a string
        let parsedResults = undefined;
        if (reviewData.code_data?.results) {
          try {
            parsedResults = typeof reviewData.code_data.results === 'string'
              ? JSON.parse(reviewData.code_data.results)
              : reviewData.code_data.results;
          } catch (parseErr) {
            console.error("Failed to parse results:", parseErr);
          }
        }
        
        console.log("📊 Raw review data from backend:", reviewData);
        console.log("📊 AI Analysis data:", reviewData.ai_analysis);
        console.log("📊 Detailed Issues data:", reviewData.detailed_issues);
        console.log("📊 Code data results:", reviewData.code_data?.results);
        
        const detailedReview: DetailedReview = {
          ...reviewData,
          code: reviewData.code_data?.code || "",
          // Try to get AI analysis from different possible sources
          ai_analysis: reviewData.ai_analysis || 
                       parsedResults?.analysis ||
                       undefined,
          // Try to get metrics from different possible sources
          metrics: reviewData.metrics || 
                   parsedResults?.metrics ||
                   undefined,
          // Try to get detailed issues from different possible sources  
          detailed_issues: reviewData.detailed_issues || 
                           parsedResults?.issues ||
                           [],
        }

        console.log("📊 Formatted review data:", detailedReview);
        
        // Log any potential JSON parsing issues
        if (reviewData.code_data?.results) {
          try {
            // Validate if results is properly parsed JSON
            const resultsString = typeof reviewData.code_data.results === 'string' 
              ? reviewData.code_data.results 
              : JSON.stringify(reviewData.code_data.results);
            
            const parsedResults = typeof reviewData.code_data.results === 'string'
              ? JSON.parse(reviewData.code_data.results)
              : reviewData.code_data.results;
              
            console.log("✅ Results parsed successfully:", parsedResults);
          } catch (parseErr) {
            console.error("❌ JSON parsing error:", parseErr);
            console.log("Raw results:", reviewData.code_data.results);
          }
        }
        
        setReview(detailedReview)
      } catch (err) {
        console.error("Review fetch error:", err);
        setError("Failed to fetch review details")
      } finally {
        setLoading(false)
      }
    }

    fetchReview()
  }, [id])

  return { review, loading, error }
}

export default function ReviewDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { review, loading, error } = useReviewDetail(id as string)
  const [selectedIssue, setSelectedIssue] = useState<number | null>(null)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-600" />
      case "failed":
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <Clock className="w-5 h-5 text-slate-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "low":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "performance":
        return <Zap className="w-4 h-4" />
      case "security":
        return <Shield className="w-4 h-4" />
      case "maintainability":
        return <Settings className="w-4 h-4" />
      case "style":
        return <Palette className="w-4 h-4" />
      default:
        return <Code className="w-4 h-4" />
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 9) return "text-green-600 dark:text-green-400"
    if (score >= 7) return "text-blue-600 dark:text-blue-400"
    if (score >= 5) return "text-yellow-600 dark:text-yellow-400"
    return "text-red-600 dark:text-red-400"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const calculateProcessingTime = (createdAt: string, completedAt: string | null) => {
    if (!completedAt) return null
    const start = new Date(createdAt)
    const end = new Date(completedAt)
    const diffMs = end.getTime() - start.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffSecs = Math.floor((diffMs % 60000) / 1000)
    return `${diffMins}m ${diffSecs}s`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 animate-pulse">
            <div className="h-96 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
          </div>
          <div className="animate-pulse">
            <div className="h-96 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !review) {
    return (
      <div className="space-y-6">
        <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700 dark:text-red-400">{error || "Review not found"}</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to History
        </Button>
      </div>
    )
  }

  const processingTime = calculateProcessingTime(review.created_at, review.completed_at)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            {getStatusIcon(review.status)}
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{review.title}</h1>
            <Badge className={getStatusColor(review.status)}>{review.status}</Badge>
          </div>
          {review.description && <p className="text-slate-600 dark:text-slate-400">{review.description}</p>}
          <div className="flex items-center space-x-4 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>Submitted {formatDate(review.created_at)}</span>
            </div>
            {review.completed_at && processingTime && (
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>Completed in {processingTime}</span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Code className="w-4 h-4" />
              <span>{review.language}</span>
            </div>
            {review.lines_of_code && (
              <div className="flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>{review.lines_of_code} lines</span>
              </div>
            )}
          </div>
          {review.github_repo && (
            <div className="flex items-center space-x-2">
              <Github className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {review.github_repo}
                {review.github_path && `/${review.github_path}`}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Share className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      {/* Score Overview - Only show for completed reviews */}
      {review.status === "completed" && review.score && review.ai_analysis && (
        <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Overall Score</span>
              <div className={`text-3xl font-bold ${getScoreColor(review.score)}`}>{review.score}/10</div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(review.ai_analysis.categories).map(([category, data]: [string, any]) => (
                <div key={category} className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    {getTypeIcon(category)}
                    <span className="ml-2 text-sm font-medium capitalize">{category}</span>
                  </div>
                  <div className={`text-xl font-bold ${getScoreColor(data.score)}`}>{data.score}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {data.issues} issues, {data.suggestions} suggestions
                  </div>
                </div>
              ))}
            </div>
            {review.improvement_rate && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Improvement Rate</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    +{review.improvement_rate}% from previous reviews
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Code Display */}
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Submitted Code</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">{review.language}</Badge>
                  {review.lines_of_code && <Badge variant="outline">{review.lines_of_code} lines</Badge>}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <MonacoEditor
                  height="400px"
                  defaultLanguage={review.language?.toLowerCase() || "javascript"}
                  value={review.code}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 14,
                    scrollBeyondLastLine: false,
                    lineNumbers: "on",
                    theme: "vs-dark",
                    wordWrap: "on",
                    automaticLayout: true,
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis - Only show for completed reviews */}
          {review.status === "completed" && review.ai_analysis && review.detailed_issues && (
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-0 shadow-lg">
              <CardHeader>
                <CardTitle>AI Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="summary" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="issues">Issues ({review.detailed_issues.length})</TabsTrigger>
                    <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                    <TabsTrigger value="metrics">Metrics</TabsTrigger>
                  </TabsList>

                  <TabsContent value="summary" className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Overview</h4>
                      <p className="text-slate-600 dark:text-slate-400">{review.ai_analysis.summary}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center">
                        <ThumbsUp className="w-4 h-4 mr-2 text-green-600" />
                        Strengths
                      </h4>
                      <ul className="space-y-1">
                        {review.ai_analysis.strengths.map((strength: string, index: number) => (
                          <li key={index} className="text-sm text-slate-600 dark:text-slate-400 flex items-start">
                            <CheckCircle className="w-4 h-4 mr-2 text-green-600 mt-0.5 flex-shrink-0" />
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2 text-blue-600" />
                        Areas for Improvement
                      </h4>
                      <ul className="space-y-1">
                        {review.ai_analysis.improvements.map((improvement: string, index: number) => (
                          <li key={index} className="text-sm text-slate-600 dark:text-slate-400 flex items-start">
                            <AlertTriangle className="w-4 h-4 mr-2 text-yellow-600 mt-0.5 flex-shrink-0" />
                            {improvement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </TabsContent>

                  <TabsContent value="issues" className="space-y-4">
                    {review.detailed_issues.map((issue: any, index: number) => (
                      <div
                        key={issue.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedIssue === issue.id
                            ? "border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/20"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                        onClick={() => setSelectedIssue(selectedIssue === issue.id ? null : issue.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {getTypeIcon(issue.type)}
                              <span className="font-medium text-slate-900 dark:text-slate-100">{issue.title}</span>
                              <Badge className={getSeverityColor(issue.severity)}>{issue.severity}</Badge>
                              <Badge variant="outline" className="text-xs">
                                Line {issue.line}:{issue.column_number}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{issue.message}</p>
                            {issue.suggestion && (
                              <p className="text-sm text-blue-600 dark:text-blue-400">💡 {issue.suggestion}</p>
                            )}
                          </div>
                        </div>

                        {selectedIssue === issue.id && (
                          <div className="mt-4 space-y-3">
                            <Separator />
                            <div>
                              <h5 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Current Code:</h5>
                              <pre className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-sm overflow-x-auto">
                                <code>{issue.code_snippet}</code>
                              </pre>
                            </div>
                            {issue.fixed_code && (
                              <div>
                                <h5 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Suggested Fix:</h5>
                                <pre className="bg-green-50 dark:bg-green-900/20 p-3 rounded text-sm overflow-x-auto">
                                  <code>{issue.fixed_code}</code>
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="suggestions" className="space-y-4">
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600 dark:text-slate-400">
                        Detailed suggestions are integrated with the issues above.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="metrics" className="space-y-4">
                    {review.metrics && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {review.metrics.complexity}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">Complexity</div>
                        </div>
                        <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {review.metrics.maintainability_index}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">Maintainability</div>
                        </div>
                        <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {review.metrics.cyclomatic_complexity}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">Cyclomatic</div>
                        </div>
                        <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {review.metrics.cognitive_complexity}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">Cognitive</div>
                        </div>
                        <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {review.metrics.duplicated_lines}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">Duplicated Lines</div>
                        </div>
                        <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {review.metrics.test_coverage || "N/A"}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">Test Coverage</div>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Pending State */}
          {review.status === "pending" && (
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <Clock className="w-16 h-16 text-yellow-600 mx-auto mb-4 animate-spin" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Review in Progress</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Our AI is analyzing your code. This usually takes 1-3 minutes.
                </p>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div className="bg-yellow-600 h-2 rounded-full animate-pulse" style={{ width: "60%" }} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Failed State */}
          {review.status === "failed" && (
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Review Failed</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  We encountered an error while analyzing your code. This could be due to syntax errors or unsupported
                  language features.
                </p>
                <Button onClick={() => router.push("/dashboard/submit")}>Submit New Review</Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {review.status === "completed" && review.score && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Overall Score</span>
                    <span className={`font-bold ${getScoreColor(review.score)}`}>{review.score}/10</span>
                  </div>
                  <Progress value={review.score * 10} className="h-2" />

                  <Separator />

                  <div className="space-y-2">
                    {review.issues !== null && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Total Issues</span>
                        <span className="font-medium">{review.issues}</span>
                      </div>
                    )}
                    {review.suggestions !== null && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Suggestions</span>
                        <span className="font-medium">{review.suggestions}</span>
                      </div>
                    )}
                    {review.detailed_issues && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 dark:text-slate-400">High Priority</span>
                          <span className="font-medium text-red-600">
                            {review.detailed_issues.filter((i: any) => i.severity === "high").length}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Medium Priority</span>
                          <span className="font-medium text-yellow-600">
                            {review.detailed_issues.filter((i: any) => i.severity === "medium").length}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Low Priority</span>
                          <span className="font-medium text-blue-600">
                            {review.detailed_issues.filter((i: any) => i.severity === "low").length}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {review.status === "pending" && (
                <div className="text-center py-4">
                  <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Review in progress...</p>
                </div>
              )}

              {review.status === "failed" && (
                <div className="text-center py-4">
                  <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Review failed. Please try again.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {review.status === "completed" && (
                <>
                  <Button className="w-full bg-transparent" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download Report
                  </Button>
                  <Button className="w-full bg-transparent" variant="outline">
                    <Share className="w-4 h-4 mr-2" />
                    Share Review
                  </Button>
                </>
              )}
              {review.github_repo && (
                <Button className="w-full bg-transparent" variant="outline">
                  <Github className="w-4 h-4 mr-2" />
                  View on GitHub
                </Button>
              )}
              <Separator />
              <Button className="w-full" onClick={() => router.push("/dashboard/submit")}>
                <Code className="w-4 h-4 mr-2" />
                Submit New Review
              </Button>
            </CardContent>
          </Card>

          {/* Review Details */}
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Review Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Review Type</span>
                <Badge variant="secondary" className="capitalize">
                  {review.review_type}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Language</span>
                <span className="font-medium">{review.language}</span>
              </div>
              {review.lines_of_code && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Lines of Code</span>
                  <span className="font-medium">{review.lines_of_code}</span>
                </div>
              )}
              {processingTime && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Processing Time</span>
                  <span className="font-medium">{processingTime}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Submitted</span>
                <span className="font-medium">{new Date(review.created_at).toLocaleDateString()}</span>
              </div>
              {review.completed_at && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Completed</span>
                  <span className="font-medium">{new Date(review.completed_at).toLocaleDateString()}</span>
                </div>
              )}
              {review.improvement_rate && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Improvement</span>
                  <span className="font-medium text-green-600">+{review.improvement_rate}%</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}