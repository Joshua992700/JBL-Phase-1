# main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import history, review, deepseek, analysis
import uvicorn

app = FastAPI(
    title="AliBot Backend",
    version="2.0.0",
    description="AI-enhanced code review service with comprehensive analysis"
)

# ✅ CORS config: allow both local & deployed frontend
origins = [
    "http://localhost:3000",  # Next.js dev server
    "http://127.0.0.1:3000",
    "https://*.vercel.app",   # Vercel deployments
    "https://*.netlify.app",  # Netlify deployments
    "*"  # Allow all for now - restrict in production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ✅ Register route handlers with appropriate prefixes
app.include_router(history.router, prefix="/dashboard/history", tags=["History"])
app.include_router(review.router, prefix="/dashboard/review", tags=["Review"])
app.include_router(deepseek.router, prefix="/api/analyze", tags=["Analysis"])

# 🩺 Health Check
@app.get("/", tags=["Root"])
def root():
    return {
        "message": "AliBot Backend is running! 🚀", 
        "version": "2.0.0",
        "status": "healthy",
        "endpoints": {
            "submit_code": "/api/analyze",
            "check_status": "/api/analyze/status/{review_id}",
            "get_review": "/dashboard/review/{review_id}",
            "get_history": "/dashboard/history"
        }
    }

# 📊 System Status Endpoint
@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "ok",
        "service": "alibot-backend",
        "version": "2.0.0"
    }

# Run the app
if __name__ == "__main__":
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )
