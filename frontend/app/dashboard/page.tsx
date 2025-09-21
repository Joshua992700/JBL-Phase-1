"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Session, User } from "@supabase/supabase-js"
import {
  Bot, LogOut, Upload, History, Code, CheckCircle,
  Clock, AlertCircle, TrendingUp, Star
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { supabase } from "@/lib/supabase"

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>({
    totalReviews: 0,
    pendingReviews: 0,
    completedReviews: 0,
    averageScore: 0,
    improvementRate: 0,
  })
  const [recentReviews, setRecentReviews] = useState<any[]>([])

  useEffect(() => {
    const getUserData = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error || !session?.user) {
        router.push("/login")
        return
      }

      setSession(session)
      setUser(session.user)
    }

    getUserData()
  }, [])

  useEffect(() => {
    if (!user) return

    const fetchStats = async () => {
      setLoading(true)

      const { data: reviews, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching reviews:", error)
        setLoading(false)
        return
      }

      const totalReviews = reviews.length
      const completedReviews = reviews.filter(r => r.status === "completed").length
      const pendingReviews = reviews.filter(r => r.status === "pending").length
      const averageScore = Number(
        (
          reviews
            .filter(r => typeof r.score === "number")
            .reduce((sum, r) => sum + r.score, 0) / (completedReviews || 1)
        ).toFixed(1)
      )

      // Placeholder: improvementRate could be calculated over time using timestamps and comparing scores
      const improvementRate = 12

      setStats({
        totalReviews,
        completedReviews,
        pendingReviews,
        averageScore,
        improvementRate,
      })

      setRecentReviews(reviews.slice(0, 3))
      setLoading(false)
    }

    fetchStats()
  }, [user])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-slate-400" />
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

  if (loading || !user) {
    return <div className="p-6 text-lg">Loading dashboard...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-purple-50 to-purple-100 dark:from-slate-900 dark:via-slate-800 dark:to-black">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Bot className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
              JBL Nexus Dashboard
            </h1>
          </div>
          <Button variant="outline" size="sm" onClick={async () => {
            await supabase.auth.signOut()
            router.push("/login")
          }}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Welcome */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Welcome to JBL Nexus</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Hello {user.user_metadata?.full_name?.split(" ")[0] || user.email || "there"}! Ready to improve your code with AI-powered reviews?
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          <CardStat title="Total Reviews" value={stats.totalReviews} icon={<Code className="w-4 h-4 text-purple-600 dark:text-purple-400" />} />
          <CardStat title="Pending Reviews" value={stats.pendingReviews} icon={<Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />} />
          <CardStat title="Average Score" value={`${stats.averageScore}/10`} icon={<Star className="w-4 h-4 text-blue-600 dark:text-blue-400" />} progress={stats.averageScore * 10} />
          <CardStat title="Improvement" value={`+${stats.improvementRate}%`} icon={<TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />} />
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <ActionCard
            title="Submit New Code for Review"
            description="Upload your code and get AI-powered feedback and suggestions"
            icon={<Upload className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
            buttonText="Start New Review"
            onClick={() => router.push("/dashboard/submit")}
          />
          <ActionCard
            title="View Review History"
            description="Browse your past code reviews and track your progress"
            icon={<History className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
            buttonText="Browse History"
            variant="outline"
            onClick={() => router.push("/dashboard/history")}
          />
        </div>

        {/* Recent Reviews */}
        <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-0 shadow-lg mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Recent Reviews</CardTitle>
                <CardDescription>Your latest code review submissions</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/history")}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentReviews.map((review) => (
                <div
                  key={review.id}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/review/${review.id}`)}
                >
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(review.status)}
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100">{review.title}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="secondary" className="text-xs">{review.language}</Badge>
                        <Badge className={`text-xs ${getStatusColor(review.status)}`}>{review.status}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {review.score && (
                      <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{review.score}/10</div>
                    )}
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {new Date(review.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// === Helper Components ===

const CardStat = ({ title, value, icon, progress }: any) => (
  <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-0 shadow-lg hover:shadow-xl transition-all duration-200">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {progress !== undefined && <Progress value={progress} className="mt-2" />}
    </CardContent>
  </Card>
)

const ActionCard = ({ title, description, icon, buttonText, onClick, variant = "default" }: any) => (
  <Card
    className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-0 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group"
    onClick={onClick}
  >
    <CardHeader>
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-800 transition-colors">
          {icon}
        </div>
        <div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <Button className="w-full" variant={variant}>{buttonText}</Button>
    </CardContent>
  </Card>
)
