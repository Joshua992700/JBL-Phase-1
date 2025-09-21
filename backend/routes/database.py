# database.py
# Database operations for code review system

from supa import supabase
from fastapi import HTTPException
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional


class DatabaseService:
    """Service class for handling all database operations"""

    @staticmethod
    async def create_review_record(
        user_id: str,
        title: str,
        description: str,
        language: str,
        review_type: str,
        github_repo: Optional[str] = None,
        github_path: Optional[str] = None
    ) -> str:
        """
        Create a new review record in the reviews table
        
        Returns:
            str: The created review_id
        """
        try:
            review_id = str(uuid.uuid4())
            
            review_data = {
                "id": review_id,
                "user_id": user_id,
                "title": title,
                "description": description or "",
                "language": language,
                "review_type": review_type,
                "status": "pending",
                "created_at": datetime.utcnow().isoformat(),
                "github_repo": github_repo,
                "github_path": github_path
            }
            
            response = supabase.table("reviews").insert(review_data).execute()
            
            if not response.data:
                raise HTTPException(status_code=500, detail="Failed to create review record")
            
            return review_id
            
        except Exception as e:
            print(f"Error creating review record: {e}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    @staticmethod
    async def store_code(
        review_id: str,
        user_id: str,
        language: str,
        code: str
    ) -> str:
        """
        Store code in the code_reviews table
        
        Returns:
            str: The created code_review_id
        """
        try:
            code_review_id = str(uuid.uuid4())
            
            code_data = {
                "id": code_review_id,
                "user_id": user_id,
                "review_id": review_id,
                "language": language,
                "code": code,
                "created_at": datetime.utcnow().isoformat()
            }
            
            response = supabase.table("code_reviews").insert(code_data).execute()
            
            if not response.data:
                raise HTTPException(status_code=500, detail="Failed to store code")
            
            return code_review_id
            
        except Exception as e:
            print(f"Error storing code: {e}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    @staticmethod
    async def store_ai_analysis(review_id: str, analysis_data: Dict[str, Any]) -> None:
        """Store AI analysis results in the ai_analysis table"""
        try:
            analysis = analysis_data.get("analysis", {})
            
            # Ensure categories are properly formatted
            categories = analysis.get("categories", {})
            for key in ["performance", "security", "maintainability", "style"]:
                if key not in categories:
                    categories[key] = {"score": 6, "issues": 1, "suggestions": 1}
                elif isinstance(categories[key], str):
                    # Convert string format to object format
                    categories[key] = {"score": 6, "issues": 1, "suggestions": 1}
            
            ai_analysis_data = {
                "review_id": review_id,
                "summary": analysis.get("summary", ""),
                "strengths": analysis.get("strengths", []),
                "improvements": analysis.get("improvements", []),
                "categories": categories,
                "created_at": datetime.utcnow().isoformat()
            }
            
            response = supabase.table("ai_analysis").insert(ai_analysis_data).execute()
            
            if not response.data:
                print(f"Warning: Failed to store AI analysis for review {review_id}")
            else:
                print(f"✅ Stored AI analysis for review {review_id}: {len(analysis.get('strengths', []))} strengths, {len(analysis.get('improvements', []))} improvements")
                
        except Exception as e:
            print(f"Error storing AI analysis: {e}")
            # Don't raise exception here - analysis storage failure shouldn't break the whole process

    @staticmethod
    async def store_metrics(review_id: str, metrics_data: Dict[str, Any]) -> None:
        """Store code metrics in the review_metrics table"""
        try:
            metrics = metrics_data.get("metrics", {})
            
            metrics_record = {
                "review_id": review_id,
                "complexity": float(metrics.get("complexity", 0)),
                "maintainability_index": float(metrics.get("maintainability_index", 0)),
                "cyclomatic_complexity": float(metrics.get("cyclomatic_complexity", 0)),
                "cognitive_complexity": float(metrics.get("cognitive_complexity", 0)),
                "duplicated_lines": int(metrics.get("duplicated_lines", 0)),
                "test_coverage": float(metrics.get("test_coverage", 0)),
                "created_at": datetime.utcnow().isoformat()
            }
            
            response = supabase.table("review_metrics").insert(metrics_record).execute()
            
            if not response.data:
                print(f"Warning: Failed to store metrics for review {review_id}")
                
        except Exception as e:
            print(f"Error storing metrics: {e}")

    @staticmethod
    async def store_issues(review_id: str, issues_data: List[Dict[str, Any]]) -> None:
        """Store code issues in the review_issues table"""
        try:
            if not issues_data:
                return
                
            issues_records = []
            
            # Process up to 20 issues to avoid overwhelming the database
            for i, issue in enumerate(issues_data[:20]):
                try:
                    # Handle the column field which might be 'column' or 'column_number'
                    # Handle both column formats and ensure it's an integer
                    column = issue.get("column_number", issue.get("column", 1))
                    try:
                        column = int(column)
                    except (ValueError, TypeError):
                        column = 1
                    
                    issue_record = {
                        "id": i + 1,  # Assign sequential IDs for consistent reference
                        "review_id": review_id,
                        "type": issue.get("type", "general"),
                        "severity": issue.get("severity", "medium"),
                        "line": int(issue.get("line", 1)),
                        "column_number": int(column),
                        "title": issue.get("title", "")[:255],  # Ensure we don't exceed text limits
                        "message": issue.get("message", ""),
                        "suggestion": issue.get("suggestion", ""),
                        "code_snippet": issue.get("code_snippet", ""),
                        "fixed_code": issue.get("fixed_code", ""),
                        "created_at": datetime.utcnow().isoformat()
                    }
                    issues_records.append(issue_record)
                except Exception as e:
                    print(f"Error processing issue: {e}")
                    continue
            
            # Insert all issues in batch
            if issues_records:
                response = supabase.table("review_issues").insert(issues_records).execute()
                
                if not response.data:
                    print(f"Warning: Failed to store issues for review {review_id}")
                else:
                    print(f"✅ Stored {len(issues_records)} issues for review {review_id}")
            else:
                print(f"ℹ️ No issues to store for review {review_id}")
                
        except Exception as e:
            print(f"Error storing issues: {e}")

    @staticmethod
    async def update_review_status(
        review_id: str,
        status: str,
        score: Optional[float] = None,
        lines_of_code: Optional[int] = None,
        issues_count: Optional[int] = None,
        suggestions_count: Optional[int] = None,
        improvement_rate: Optional[float] = None
    ) -> None:
        """Update review status and metrics"""
        try:
            update_data = {
                "status": status,
                "completed_at": datetime.utcnow().isoformat() if status == "completed" else None
            }
            
            # Add optional fields if provided
            if score is not None:
                update_data["score"] = float(score)
            if lines_of_code is not None:
                update_data["lines_of_code"] = int(lines_of_code)
            if issues_count is not None:
                update_data["issues"] = int(issues_count)
            if suggestions_count is not None:
                update_data["suggestions"] = int(suggestions_count)
            if improvement_rate is not None:
                update_data["improvement_rate"] = float(improvement_rate)
            
            response = supabase.table("reviews").update(update_data).eq("id", review_id).execute()
            
            if not response.data:
                print(f"Warning: Failed to update review status for {review_id}")
                
        except Exception as e:
            print(f"Error updating review status: {e}")
    
    @staticmethod
    async def update_code_review_results(review_id: str, analysis_result: dict) -> None:
        """Update code_reviews table with analysis results"""
        try:
            # First, get the code_review_id for this review
            response = (
                supabase
                .table("code_reviews")
                .select("id")
                .eq("review_id", review_id)
                .single()
                .execute()
            )
            
            if not response.data:
                print(f"Warning: No code_review found for review_id {review_id}")
                return
                
            code_review_id = response.data.get("id")
            
            # Ensure the analysis_result is properly formatted
            # Clone the analysis_result to avoid modifying the original
            formatted_result = {
                "analysis": analysis_result.get("analysis", {}),
                "metrics": analysis_result.get("metrics", {}),
                "issues": analysis_result.get("issues", [])
            }
            
            # Validate analysis section
            analysis = formatted_result["analysis"]
            if not isinstance(analysis, dict):
                analysis = {}
                
            # Set default values for missing fields
            analysis.setdefault("summary", "Code analysis completed")
            analysis.setdefault("strengths", ["Code structure is present"])
            analysis.setdefault("improvements", ["Consider adding more comments"])
            analysis.setdefault("categories", {})
            
            # Validate categories
            categories = analysis["categories"]
            for key in ["performance", "security", "maintainability", "style"]:
                if key not in categories or not isinstance(categories[key], dict):
                    categories[key] = {"score": 6, "issues": 0, "suggestions": 1}
                else:
                    categories[key].setdefault("score", 6)
                    categories[key].setdefault("issues", 0)
                    categories[key].setdefault("suggestions", 1)
                    
            # Validate metrics
            metrics = formatted_result["metrics"]
            if not isinstance(metrics, dict):
                metrics = {}
                
            metrics.setdefault("score", 70)
            metrics.setdefault("complexity", 2.0)
            
            # Process issues
            issues = formatted_result["issues"]
            if not isinstance(issues, list):
                issues = []
                
            valid_issues = []
            for i, issue in enumerate(issues):
                if isinstance(issue, dict):
                    # Ensure all required fields
                    issue_copy = {
                        "id": issue.get("id", i + 1),
                        "type": issue.get("type", "general"),
                        "severity": issue.get("severity", "medium"),
                        "line": issue.get("line", 1),
                        "column": issue.get("column", 1),
                        "column_number": issue.get("column_number", issue.get("column", 1)),
                        "title": issue.get("title", "Code Issue"),
                        "message": issue.get("message", "Issue detected"),
                        "suggestion": issue.get("suggestion", "Review this code"),
                        "code_snippet": issue.get("code_snippet", ""),
                        "fixed_code": issue.get("fixed_code", "")
                    }
                    valid_issues.append(issue_copy)
                    
            formatted_result["issues"] = valid_issues
            
            # Update the results field
            update_response = (
                supabase
                .table("code_reviews")
                .update({"results": formatted_result})
                .eq("id", code_review_id)
                .execute()
            )
            
            if not update_response.data:
                print(f"Warning: Failed to update results for code_review {code_review_id}")
                
        except Exception as e:
            print(f"Error updating code_review results: {e}")
            # Don't raise exception here - shouldn't break the whole process
    
    @staticmethod
    async def mark_review_failed(review_id: str, error_message: str) -> None:
        """Mark a review as failed"""
        try:
            await DatabaseService.update_review_status(
                review_id=review_id,
                status="failed",
                message=error_message
            )
        except Exception as e:
            print(f"Error marking review as failed: {e}")
            # Don't raise exception here

    @staticmethod
    async def get_review_by_id(review_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get complete review data by ID (handles both review_id and code_review_id)"""
        try:
            # First try to get by review_id directly
            review_response = (
                supabase
                .table("reviews")
                .select("*")
                .eq("id", review_id)
                .eq("user_id", user_id)
                .single()
                .execute()
            )
            
            actual_review_id = review_id
            review_data = None
            
            if review_response.data:
                review_data = review_response.data
            else:
                # If not found, try looking up by code_review_id
                code_response = (
                    supabase
                    .table("code_reviews")
                    .select("*")
                    .eq("id", review_id)
                    .eq("user_id", user_id)
                    .single()
                    .execute()
                )
                
                if not code_response.data:
                    return None
                
                # Get the actual review_id from code_reviews
                actual_review_id = code_response.data.get("review_id")
                
                if actual_review_id:
                    # Now get the main review data
                    review_response = (
                        supabase
                        .table("reviews")
                        .select("*")
                        .eq("id", actual_review_id)
                        .eq("user_id", user_id)
                        .single()
                        .execute()
                    )
                    
                    if review_response.data:
                        review_data = review_response.data
                        # Add code data to the review
                        review_data["code_data"] = code_response.data
                    else:
                        return None
                else:
                    return None
            
            # Get code data if we don't have it yet
            if review_data and "code_data" not in review_data:
                try:
                    code_response = (
                        supabase
                        .table("code_reviews")
                        .select("*")
                        .eq("review_id", actual_review_id)
                        .single()
                        .execute()
                    )
                    if code_response.data:
                        review_data["code_data"] = code_response.data
                except:
                    pass
            
            # Get AI analysis
            try:
                analysis_response = (
                    supabase
                    .table("ai_analysis")
                    .select("*")
                    .eq("review_id", actual_review_id)
                    .single()
                    .execute()
                )
                if analysis_response.data:
                    print(f"📊 Found AI analysis for review {actual_review_id}")
                    review_data["ai_analysis"] = analysis_response.data
                else:
                    print(f"⚠️ No AI analysis found for review {actual_review_id}")
            except Exception as e:
                print(f"❌ Error fetching AI analysis: {e}")
                pass
            
            # Get metrics
            try:
                metrics_response = (
                    supabase
                    .table("review_metrics")
                    .select("*")
                    .eq("review_id", actual_review_id)
                    .single()
                    .execute()
                )
                if metrics_response.data:
                    review_data["metrics"] = metrics_response.data
            except:
                pass
            
            # Get issues
            try:
                issues_response = (
                    supabase
                    .table("review_issues")
                    .select("*")
                    .eq("review_id", actual_review_id)
                    .order("severity", desc=True)
                    .execute()
                )
                if issues_response.data:
                    print(f"📊 Found {len(issues_response.data)} issues for review {actual_review_id}")
                    review_data["detailed_issues"] = issues_response.data
                else:
                    print(f"⚠️ No issues found for review {actual_review_id}")
            except Exception as e:
                print(f"❌ Error fetching issues: {e}")
                pass
            
            return review_data
            
        except Exception as e:
            print(f"Error getting review by ID: {e}")
            return None

    @staticmethod
    async def get_user_reviews(user_id: str) -> List[Dict[str, Any]]:
        """Get all reviews for a user"""
        try:
            response = (
                supabase
                .table("reviews")
                .select("*, code_reviews!inner(code)")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
            
            return response.data or []
            
        except Exception as e:
            print(f"Error getting user reviews: {e}")
            return []
