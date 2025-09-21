# routes/history.py

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from .database import DatabaseService

router = APIRouter()

@router.get("/")
async def get_user_history(
    user_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    language: Optional[str] = None,
    status: Optional[str] = None
):
    """
    Get paginated history of user's code reviews
    """
    try:
        # Using the available get_user_reviews method
        reviews = await DatabaseService.get_user_reviews(user_id=user_id)
        
        # Apply filters if provided
        if language:
            reviews = [r for r in reviews if r.get("language") == language]
        if status:
            reviews = [r for r in reviews if r.get("status") == status]
            
        # Calculate pagination
        total = len(reviews)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_reviews = reviews[start_idx:end_idx] if reviews else []
        
        return paginated_reviews
        
    except Exception as e:
        print(f"History fetch error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")