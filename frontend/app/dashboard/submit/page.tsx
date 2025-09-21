"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Upload, Code, Github, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import dynamic from "next/dynamic"
import { supabase } from "@/lib/supabase"

const SUPPORTED_LANGUAGES = [
	{ value: "javascript", label: "JavaScript", extension: ".js" },
	{ value: "typescript", label: "TypeScript", extension: ".ts" },
	{ value: "python", label: "Python", extension: ".py" },
	{ value: "java", label: "Java", extension: ".java" },
	{ value: "cpp", label: "C++", extension: ".cpp" },
	{ value: "csharp", label: "C#", extension: ".cs" },
	{ value: "go", label: "Go", extension: ".go" },
	{ value: "rust", label: "Rust", extension: ".rs" },
	{ value: "php", label: "PHP", extension: ".php" },
	{ value: "ruby", label: "Ruby", extension: ".rb" },
]

const REVIEW_TYPES = [
	{ value: "general", label: "General Review", description: "" },
	{ value: "performance", label: "Performance", description: "Focus on optimization and efficiency" },
	{ value: "security", label: "Security", description: "Security vulnerabilities and best practices" },
	{ value: "style", label: "Code Style", description: "Formatting and style consistency" },
	{ value: "architecture", label: "Architecture", description: "Design patterns and structure" },
]

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

export default function SubmitPage() {
	const [submissionMethod, setSubmissionMethod] = useState<"paste" | "file" | "github">("paste")
	const [code, setCode] = useState("")
	const [title, setTitle] = useState("")
	const [description, setDescription] = useState("")
	const [language, setLanguage] = useState("")
	const [reviewType, setReviewType] = useState("general")
	const [githubRepo, setGithubRepo] = useState("")
	const [githubPath, setGithubPath] = useState("")
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [uploadProgress, setUploadProgress] = useState(0)
	const [error, setError] = useState("")
	const [success, setSuccess] = useState(false)
	const [sessionChecked, setSessionChecked] = useState(false)
	const [user, setUser] = useState<any>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const router = useRouter()
	const searchParams = useSearchParams()

	useEffect(() => {
		const checkSession = async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession()
			if (session) {
				setUser(session.user)
				setSessionChecked(true)
				return
			}
			// Optionally: check for access_token in URL for SSO/OAuth
			const access_token = searchParams.get("access_token")
			if (access_token) {
				const { data, error } = await supabase.auth.setSession({
					access_token,
					refresh_token: searchParams.get("refresh_token") || "",
				})
				if (data?.session) {
					setUser(data.session.user)
					setSessionChecked(true)
					return
				}
			}
			router.replace("/login")
		}
		checkSession()
	}, [router, searchParams])

	const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return

		// Check file size (max 1MB)
		if (file.size > 1024 * 1024) {
			setError("File size must be less than 1MB")
			return
		}

		const reader = new FileReader()
		reader.onload = (e) => {
			const content = e.target?.result as string
			setCode(content)

			// Auto-detect language from file extension
			const extension = file.name.split(".").pop()?.toLowerCase()
			const detectedLang = SUPPORTED_LANGUAGES.find((lang) => lang.extension.slice(1) === extension)
			if (detectedLang) {
				setLanguage(detectedLang.value)
			}

			// Set title from filename if empty
			if (!title) {
				setTitle(file.name.replace(/\.[^/.]+$/, ""))
			}
		}
		reader.readAsText(file)
	}

	const handleGithubImport = async () => {
		if (!githubRepo || !githubPath) {
			setError("Please provide both repository and file path")
			return
		}

		setIsSubmitting(true)
		setError("")

		try {
			// TODO: Replace with actual GitHub API call
			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 2000))

			// Mock GitHub file content
			const mockContent = `// Imported from GitHub: ${githubRepo}/${githubPath}
				function exampleFunction() {
				console.log("This is example code from GitHub");
				return "Hello from GitHub!";
				}`

			setCode(mockContent)
			setTitle(
				githubPath
					.split("/")
					.pop()
					?.replace(/\.[^/.]+$/, "") || "GitHub Import",
			)
			setSubmissionMethod("paste")
		} catch (err) {
			setError("Failed to import from GitHub. Please check the repository and file path.")
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleSubmit = async (e) => {
		e.preventDefault();
		
		if (!user?.id) {
			setError("Please log in to submit code for review");
			return;
		}

		if (!code.trim() || !title.trim() || !language) {
			setError("Please fill in all required fields");
			return;
		}

		setIsSubmitting(true);
		setError("");
		setUploadProgress(0);

		try {
			setUploadProgress(30);

			// Use the API route
			const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
			const response = await fetch(`${backendUrl}/api/analyze`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					code,
					title,
					description,
					language,
					reviewType,
					user_id: user.id,  // Include user_id from auth
				}),
			});

			setUploadProgress(80);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.detail || "Failed to submit code");
			}

			const result = await response.json();
			console.log("📦 Submission result:", result);
			setSuccess(true);
			setUploadProgress(100);

			// Redirect to detailed review page
			setTimeout(() => {
				router.push(`/dashboard/review/${result.actual_review_id}`);
			}, 2000);
		} catch (err: any) {
			setError(err.message || "Failed to submit code for review. Please try again.");
			setUploadProgress(0);
		} finally {
			setIsSubmitting(false);
		}
	}

	if (success) {
		return (
			<div className="space-y-6">
				<Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-0 shadow-lg">
					<CardContent className="p-8 text-center">
						<CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
						<h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Code Submitted Successfully!</h2>
						<p className="text-slate-600 dark:text-slate-400 mb-6">
							Your code has been submitted for AI review. You'll be redirected to your history page shortly.
						</p>
						<Button onClick={() => router.push("/dashboard/history")}>View Review Status</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (!sessionChecked) return null

	return (
		<div className="space-y-6">
			<div className="text-center mb-6 animate-fade-in">
				<div className="flex items-center justify-center mb-4">
					
				</div>
				<h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent drop-shadow">
					Submit Code for Review
				</h1>
				<p className="text-slate-600 dark:text-slate-400 mt-2">
					Upload your code and get AI-powered feedback and suggestions
				</p>
			</div>

			{error && (
				<Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
					<AlertCircle className="h-4 w-4 text-red-600" />
					<AlertDescription className="text-red-700 dark:text-red-400">{error}</AlertDescription>
				</Alert>
			)}

			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Submission Method */}
				<Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-0 shadow-lg">
					<CardHeader>
						<CardTitle>How would you like to submit your code?</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<Button
								type="button"
								variant={submissionMethod === "paste" ? "default" : "outline"}
								className="h-20 flex-col space-y-2"
								onClick={() => setSubmissionMethod("paste")}
							>
								<Code className="w-6 h-6" />
								<span>Paste Code</span>
							</Button>
							<Button
								type="button"
								variant={submissionMethod === "file" ? "default" : "outline"}
								className="h-20 flex-col space-y-2"
								onClick={() => setSubmissionMethod("file")}
							>
								<Upload className="w-6 h-6" />
								<span>Upload File</span>
							</Button>
							<Button
								type="button"
								variant={submissionMethod === "github" ? "default" : "outline"}
								className="h-20 flex-col space-y-2"
								onClick={() => setSubmissionMethod("github")}
							>
								<Github className="w-6 h-6" />
								<span>From GitHub</span>
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* GitHub Import */}
				{submissionMethod === "github" && (
					<Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-0 shadow-lg">
						<CardHeader>
							<CardTitle className="flex items-center space-x-2">
								<Github className="w-5 h-5" />
								<span>Import from GitHub</span>
							</CardTitle>
							<CardDescription>Import code directly from your GitHub repositories</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<Label htmlFor="github-repo">Repository (username/repo-name)</Label>
								<Input
									id="github-repo"
									placeholder="octocat/Hello-World"
									value={githubRepo}
									onChange={(e) => setGithubRepo(e.target.value)}
								/>
							</div>
							<div>
								<Label htmlFor="github-path">File Path</Label>
								<Input
									id="github-path"
									placeholder="src/main.js"
									value={githubPath}
									onChange={(e) => setGithubPath(e.target.value)}
								/>
							</div>
							<Button
								type="button"
								onClick={handleGithubImport}
								disabled={isSubmitting || !githubRepo || !githubPath}
								className="w-full"
							>
								{isSubmitting ? (
									<>
										<Loader2 className="w-4 h-4 mr-2 animate-spin" />
										Importing...
									</>
								) : (
									<>
										<Github className="w-4 h-4 mr-2" />
										Import from GitHub
									</>
								)}
							</Button>
						</CardContent>
					</Card>
				)}

				{/* File Upload */}
				{submissionMethod === "file" && (
					<Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-0 shadow-lg">
						<CardHeader>
							<CardTitle>Upload Code File</CardTitle>
							<CardDescription>
								Supported formats: .js, .ts, .py, .java, .cpp, .cs, .go, .rs, .php, .rb (Max 1MB)
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div
								className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center hover:border-purple-400 transition-colors cursor-pointer"
								onClick={() => fileInputRef.current?.click()}
							>
								<Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
								<p className="text-slate-600 dark:text-slate-400 mb-2">
									Click to upload or drag and drop your code file
								</p>
								<p className="text-sm text-slate-500">Maximum file size: 1MB</p>
								<input
									ref={fileInputRef}
									type="file"
									accept=".js,.ts,.py,.java,.cpp,.cs,.go,.rs,.php,.rb"
									onChange={handleFileUpload}
									className="hidden"
								/>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Code Details */}
				<Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-0 shadow-lg">
					<CardHeader>
						<CardTitle>Code Details</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Label htmlFor="title">Title *</Label>
                                <br />
								<Input
									id="title"
									placeholder="e.g., React Component Optimization"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									required
								/>
							</div>
							<div>
								<Label htmlFor="language">Programming Language *</Label>
                                <br />
								<Select value={language} onValueChange={setLanguage} required>
									<SelectTrigger>
										<SelectValue placeholder="Select language" />
									</SelectTrigger>
									<SelectContent>
										{SUPPORTED_LANGUAGES.map((lang) => (
											<SelectItem key={lang.value} value={lang.value}>
												{lang.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div>
							<Label htmlFor="review-type">Review Type</Label>
                            <br />
							<Select value={reviewType} onValueChange={setReviewType}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{REVIEW_TYPES.map((type) => (
										<SelectItem key={type.value} value={type.value}>
											<div>
												<div className="font-medium">{type.label}</div>
												<div className="text-sm text-slate-500">{type.description}</div>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label htmlFor="description">Description (Optional)</Label>
                            <br />
							<Textarea
								id="description"
								placeholder="Describe what this code does or what specific feedback you're looking for..."
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={3}
							/>
						</div>
					</CardContent>
				</Card>

				{/* Code Input */}
				{(submissionMethod === "paste" || code) && (
					<Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-0 shadow-lg">
						<CardHeader>
							<CardTitle className="flex items-center justify-between">
								<span>Your Code</span>
								{code && <Badge variant="secondary">{code.split("\n").length} lines</Badge>}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="h-[400px]">
        <MonacoEditor
          height="100%"
          defaultLanguage={language || "javascript"}
          language={language || "javascript"}
          value={code}
          onChange={(value) => setCode(value || "")}
          theme="vs-dark"
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            wordWrap: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
						</CardContent>
					</Card>
				)}

				{/* Submit Progress */}
				{isSubmitting && (
					<Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-0 shadow-lg">
						<CardContent className="p-6">
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">Submitting your code...</span>
									<span className="text-sm text-slate-500">{uploadProgress}%</span>
								</div>
								<Progress value={uploadProgress} className="w-full" />
								<p className="text-sm text-slate-600 dark:text-slate-400">
									Please don't close this page while we process your submission.
								</p>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Submit Button */}
				<div className="flex justify-end space-x-4">
					<Button type="button" variant="outline" onClick={() => router.push("/dashboard")} disabled={isSubmitting}>
						Cancel
					</Button>
					<Button
						type="submit"
						disabled={isSubmitting || !code.trim() || !title.trim() || !language}
						className="min-w-32"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								Submitting...
							</>
						) : (
							<>
								<Upload className="w-4 h-4 mr-2" />
								Submit for Review
							</>
						)}
					</Button>
				</div>
			</form>
		</div>
	)
}
