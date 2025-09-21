# deepseek_analysis.py
# Main endpoint for code analysis and review submission

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from .analysis import analyze_code_with_ai, calculate_derived_metrics
from .database import DatabaseService
import asyncio

router = APIRouter()

class CodeAnalysisRequest(BaseModel):
    code: str
    title: str
    description: str = ""
    language: str
    reviewType: str = "general"
    user_id: str
    github_repo: str = None
    github_path: str = None

@router.post("/")
async def submit_code_for_analysis(request: CodeAnalysisRequest, background_tasks: BackgroundTasks):
    """
    Submit code for analysis and return review_id immediately.
    Analysis is processed in the background.
    """
    try:
        # Step 1: Create review record immediately
        review_id = await DatabaseService.create_review_record(
            user_id=request.user_id,
            title=request.title,
            description=request.description,
            language=request.language,
            review_type=request.reviewType,
            github_repo=request.github_repo,
            github_path=request.github_path
        )
        
        # Step 2: Store the code
        code_review_id = await DatabaseService.store_code(
            review_id=review_id,
            user_id=request.user_id,
            language=request.language,
            code=request.code
        )
        
        # Step 3: Start background analysis
        background_tasks.add_task(
            process_code_analysis,
            review_id,
            request.code,
            request.language
        )
        
        # Step 4: Update status to in_progress
        await DatabaseService.update_review_status(
            review_id=review_id,
            status="in_progress",
            lines_of_code=len(request.code.split('\n'))
        )
        
        # Return immediately with the IDs the frontend expects
        return {
            "review_id": code_review_id,  # Frontend expects this for navigation
            "actual_review_id": review_id,  # For internal tracking
            "status": "in_progress",
            "message": "Code submitted successfully. Analysis in progress."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Submission error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to submit code: {str(e)}")


async def process_code_analysis(review_id: str, code: str, language: str):
    """
    Background task to process the AI analysis and store results
    """
    try:
        print(f"🔄 Starting analysis for review {review_id}")
        
        # Perform AI analysis
        analysis_result = await analyze_code_with_ai(code, language)
        print(f"📊 Analysis result received: {len(analysis_result.get('issues', []))} issues")
        print(f"📊 Analysis summary: {analysis_result.get('analysis', {}).get('summary', 'No summary')[:100]}...")
        
        # Calculate additional metrics
        derived_metrics = calculate_derived_metrics(analysis_result, code)
        
        # Store analysis results in parallel
        await asyncio.gather(
            DatabaseService.store_ai_analysis(review_id, analysis_result),
            DatabaseService.store_metrics(review_id, analysis_result),
            DatabaseService.store_issues(review_id, analysis_result.get("issues", [])),
            DatabaseService.update_code_review_results(review_id, analysis_result),
            return_exceptions=True  # Don't fail if one storage operation fails
        )
        
        # Update review with final status and metrics
        await DatabaseService.update_review_status(
            review_id=review_id,
            status="completed",
            score=analysis_result.get("metrics", {}).get("score", 0),
            lines_of_code=derived_metrics["lines_of_code"],
            issues_count=derived_metrics["total_issues"],
            suggestions_count=len(analysis_result.get("analysis", {}).get("improvements", [])),
            improvement_rate=derived_metrics["improvement_rate"]
        )
        
        print(f"✅ Analysis completed for review {review_id}")
        
    except Exception as e:
        print(f"❌ Analysis failed for review {review_id}: {e}")
        await DatabaseService.mark_review_failed(review_id, str(e))


@router.get("/status/{review_id}")
async def get_analysis_status(review_id: str, user_id: str):
    """
    Get the current status of an analysis
    """
    try:
        review_data = await DatabaseService.get_review_by_id(review_id, user_id)
        
        if not review_data:
            raise HTTPException(status_code=404, detail="Review not found")
        
        return {
            "review_id": review_id,
            "status": review_data.get("status", "unknown"),
            "progress": _get_progress_percentage(review_data.get("status", "unknown")),
            "created_at": review_data.get("created_at"),
            "completed_at": review_data.get("completed_at")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Status check error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")


def _get_progress_percentage(status: str) -> int:
    """Convert status to progress percentage"""
    status_map = {
        "pending": 10,
        "in_progress": 50,
        "completed": 100,
        "failed": 0
    }
    return status_map.get(status, 0)
