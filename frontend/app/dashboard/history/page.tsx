"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import {
  Search, Download, Eye, Calendar, Code, MoreHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

export default function HistoryPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [languageFilter, setLanguageFilter] = useState("all")
  const [sortBy, setSortBy] = useState("newest")

  const router = useRouter()

  // ✅ 00 user ID from Supabase
  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) console.error("Error fetching user:", error)
      if (data?.user?.id) setUserId(data.user.id)
    }
    getUser()
  }, [])

  // ✅ Fetch history from backend
  useEffect(() => {
    if (!userId) return

    setLoading(true)
    // Using hardcoded localhost URL as fallback if env var is not set
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    fetch(`${backendUrl}/dashboard/history?user_id=${userId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        console.log("📦 Backend response:", data)
        if (!data || !Array.isArray(data)) {
          console.warn("Unexpected response format:", data)
          setHistory([])
          return
        }
        setHistory(data)
      })
      .catch((err) => {
        console.error("Failed to fetch history:", err)
        setHistory([])
      })
      .finally(() => setLoading(false))
  }, [userId])

  const filtered = history
    .filter(item => {
      const matchesSearch = searchQuery === "" ||
        item.language?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesLanguage = languageFilter === "all" || item.language?.toLowerCase() === languageFilter.toLowerCase()
      return matchesSearch && matchesLanguage
    })
    .sort((a, b) => {
      const aDate = new Date(a.created_at).getTime()
      const bDate = new Date(b.created_at).getTime()
      return sortBy === "newest" ? bDate - aDate : aDate - bDate
    })

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading review history…</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Review History</h1>
        <p className="text-slate-600 dark:text-slate-400">Browse your past code reviews and track your progress</p>
      </div>

      {/* Filters */}
      <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Filter & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      <div className="space-y-4">
        {filtered.map((item, idx) => (
          <Card
            key={item.id || idx}
            className="p-4 hover:shadow-xl transition cursor-pointer"
            onClick={() => router.push(`/dashboard/review/${item.id}`)}
          >
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <div className="flex items-center space-x-2">
                  <Code className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-semibold">{item.title || `${item.language} Code Review`}</h3>
                  <Badge variant="outline" className={`
                    ${item.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                    ${item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${item.status === 'failed' ? 'bg-red-100 text-red-800' : ''}
                  `}>
                    {item.status || 'Unknown'}
                  </Badge>
                  {item.language && (
                    <Badge variant="secondary">{item.language}</Badge>
                  )}
                </div>
                
                <p className="text-sm text-slate-500">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  {new Date(item.created_at).toLocaleString()}
                </p>
                
                {item.code && (
                  <div className="mt-2">
                    <p className="text-xs text-slate-400 mb-1">Code Preview:</p>
                    <pre className="bg-slate-100 dark:bg-slate-800 p-2 rounded text-sm overflow-x-auto max-h-32 overflow-y-auto">
                      {item.code.length > 200 ? `${item.code.substring(0, 200)}...` : item.code}
                    </pre>
                  </div>
                )}
                
                {item.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {item.description}
                  </p>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/dashboard/review/${item.id}`)
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Card>
        ))}

        {!loading && filtered.length === 0 && (
          <Card className="p-6 text-center text-gray-500">
            <Search className="w-10 h-10 mx-auto mb-2" />
            <p>No matching reviews found.</p>
          </Card>
        )}
      </div>
    </div>
  )
}
