# routes/review.py

from fastapi import APIRouter, HTTPException
from .database import DatabaseService

router = APIRouter()

@router.get("/{review_id}")
async def get_review_details(review_id: str, user_id: str):
    """
    Get complete review details including analysis, metrics, and issues
    """
    try:
        # Use the available get_review_by_id method
        review_data = await DatabaseService.get_review_by_id(review_id, user_id)
        
        if not review_data:
            raise HTTPException(status_code=404, detail="Review not found")
        
        return review_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Review fetch error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch review: {str(e)}")
