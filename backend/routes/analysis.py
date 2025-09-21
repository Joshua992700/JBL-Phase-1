# analysis.py
# AI Code Analysis Service

from groq import AsyncGroq
import os
import json
from fastapi import HTTPException

client = AsyncGroq(api_key=os.getenv("GROQ_API"))

async def analyze_code_with_ai(code: str, language: str = "python") -> dict:
    """
    Analyze code using AI and return structured analysis data
    
    Args:
        code: The source code to analyze
        language: Programming language of the code
        
    Returns:
        dict: Structured analysis with analysis, metrics, and issues
    """
    try:
        prompt = f"""
        Analyze the following {language} code and provide a structured analysis. 
        
        CODE TO ANALYZE:
        ```{language}
        {code}
        ```

        INSTRUCTIONS:
        - Return ONLY a valid JSON object with NO explanatory text
        - Do NOT include markdown formatting around the JSON
        - Do NOT include ```json or ``` markers around your response
        - Ensure the JSON is properly formed with no syntax errors
        
        REQUIRED JSON STRUCTURE:
        {{
          "analysis": {{
            "summary": "Brief summary of what this code does and overall quality assessment",
            "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
            "improvements": ["specific improvement 1", "specific improvement 2", "specific improvement 3"],
            "categories": {{
              "performance": {{
                "score": 7,
                "issues": 1,
                "suggestions": 2
              }},
              "security": {{
                "score": 8,
                "issues": 0,
                "suggestions": 1
              }},
              "maintainability": {{
                "score": 6,
                "issues": 2,
                "suggestions": 2
              }},
              "style": {{
                "score": 9,
                "issues": 0,
                "suggestions": 1
              }}
            }}
          }},
          "metrics": {{
            "score": 85,
            "complexity": 3.2,
            "maintainability_index": 75.5,
            "cyclomatic_complexity": 5,
            "cognitive_complexity": 8,
            "duplicated_lines": 0,
            "test_coverage": 0.0
          }},
          "issues": [
            {{
              "type": "performance",
              "severity": "medium",
              "line": 10,
              "column": 5,
              "title": "Inefficient algorithm detected",
              "message": "The current implementation uses a nested loop which results in O(n²) complexity. This could cause performance issues with larger datasets.",
              "suggestion": "Consider using a hash map or set for O(1) lookups instead of nested iteration",
              "code_snippet": "for i in items:\\n    for j in other_items:\\n        if i == j:",
              "fixed_code": "item_set = set(items)\\nfor j in other_items:\\n    if j in item_set:"
            }},
            {{
              "type": "style",
              "severity": "low", 
              "line": 5,
              "column": 1,
              "title": "Missing docstring",
              "message": "Function lacks documentation which makes it harder for other developers to understand its purpose and usage.",
              "suggestion": "Add a comprehensive docstring explaining the function's purpose, parameters, and return value",
              "code_snippet": "def process_data(data):",
              "fixed_code": "def process_data(data):\\n    '''Process the input data and return formatted results.\\n    \\n    Args:\\n        data: Input data to process\\n    \\n    Returns:\\n        Processed and formatted data\\n    '''"
            }}
          ]
        }}

        IMPORTANT REQUIREMENTS:
        - Always provide at least 2-3 specific, actionable issues in the "issues" array
        - Make issues realistic and related to actual code problems you can identify
        - Include actual code snippets and suggested fixes when possible
        - Provide meaningful line numbers based on the actual code structure
        - Make suggestions specific and implementable

        Guidelines:
        - Score should be 0-100 based on overall code quality
        - Complexity should be 1-10 (1=simple, 10=very complex)
        - Maintainability index should be 0-100 (higher is better)
        - Provide realistic complexity metrics based on actual code analysis
        - Issues should be specific and actionable
        - Severity can be: "high", "medium", "low"
        - Type can be: "performance", "security", "maintainability", "style", "bug", "logic"
        """

        response = await client.chat.completions.create(
            model="deepseek-r1-distill-llama-70b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,  # Slightly higher temperature for more creative analysis
            max_tokens=6000   # Increased token limit for more detailed analysis
        )

        content = response.choices[0].message.content.strip()
        print(f"Raw AI response: {content[:200]}...")  # Print the beginning of the response for debugging
        
        # Clean up the response - remove any markdown formatting
        if content.startswith("```json"):
            content = content[7:].strip()
            if content.endswith("```"):
                content = content[:-3].strip()
        elif content.startswith("```"):
            content = content[3:].strip()
            if content.endswith("```"):
                content = content[:-3].strip()
        
        # Extra validation to ensure we have content
        if not content:
            print("Empty content after cleanup")
            return {
                "analysis": {
                    "summary": "Analysis could not be completed due to empty response.",
                    "strengths": ["Code structure is readable"],
                    "improvements": ["Try resubmitting with a different prompt"],
                    "categories": {
                        "performance": {"score": 5, "issues": 0, "suggestions": 1},
                        "security": {"score": 5, "issues": 0, "suggestions": 1},
                        "maintainability": {"score": 5, "issues": 0, "suggestions": 1},
                        "style": {"score": 5, "issues": 0, "suggestions": 1}
                    }
                },
                "metrics": {"score": 50, "complexity": 2.0, "maintainability_index": 60.0},
                "issues": [{
                    "id": 1,
                    "type": "system",
                    "severity": "low",
                    "line": 1,
                    "column": 1,
                    "column_number": 1,
                    "title": "Analysis Unavailable",
                    "message": "The AI could not analyze this code properly.",
                    "suggestion": "Try resubmitting or breaking down the code into smaller segments.",
                    "code_snippet": "",
                    "fixed_code": ""
                }, {
                    "id": 2,
                    "type": "general",
                    "severity": "medium",
                    "line": 1,
                    "column": 1,
                    "column_number": 1,
                    "title": "Code Review Recommended",
                    "message": "While automated analysis is unavailable, manual code review is recommended.",
                    "suggestion": "Have a senior developer review this code for potential improvements.",
                    "code_snippet": "",
                    "fixed_code": ""
                }]
            }
            
        try:
            # Parse JSON
            result = json.loads(content)
            
            # Validate and ensure required structure
            result = _validate_analysis_result(result, code)
            
            return result
        except json.JSONDecodeError as e:
            print(f"JSON parsing error in direct handling: {e}")
            print(f"Content that failed parsing: {content[:200]}...")
            
            # Try to extract JSON if it's embedded in text
            try:
                # Look for JSON-like structure with braces
                json_start = content.find('{')
                json_end = content.rfind('}') + 1
                
                if json_start >= 0 and json_end > json_start:
                    potential_json = content[json_start:json_end]
                    print(f"Attempting to parse extracted JSON: {potential_json[:200]}...")
                    result = json.loads(potential_json)
                    result = _validate_analysis_result(result, code)
                    return result
            except Exception as nested_error:
                print(f"Failed to extract JSON: {nested_error}")
            
            # If all parsing attempts fail, return a structured result
            return {
                "analysis": {
                    "summary": "Analysis encountered JSON parsing issues.",
                    "strengths": ["Code structure is present"],
                    "improvements": ["Try simplifying the code for better analysis"],
                    "categories": {
                        "performance": {"score": 5, "issues": 0, "suggestions": 1},
                        "security": {"score": 5, "issues": 0, "suggestions": 1},
                        "maintainability": {"score": 5, "issues": 0, "suggestions": 1},
                        "style": {"score": 5, "issues": 0, "suggestions": 1}
                    }
                },
                "metrics": {"score": 50, "complexity": 2.0, "maintainability_index": 60.0},
                "issues": [{
                    "id": 1,
                    "type": "system",
                    "severity": "low",
                    "line": 1, 
                    "column": 1,
                    "column_number": 1,
                    "title": "Analysis Error",
                    "message": f"JSON parsing failed: {str(e)}",
                    "suggestion": "Try resubmitting with simpler code",
                    "code_snippet": "",
                    "fixed_code": ""
                }, {
                    "id": 2,
                    "type": "general",
                    "severity": "medium",
                    "line": 1,
                    "column": 1,
                    "column_number": 1,
                    "title": "Manual Review Needed",
                    "message": "Automated analysis encountered issues, but manual review can still provide value.",
                    "suggestion": "Consider having a peer review this code for potential improvements.",
                    "code_snippet": "",
                    "fixed_code": ""
                }]
            }
        
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        print(f"Raw AI response: {content}")
        
        # Direct error handling without using _get_fallback_analysis
        return {
            "analysis": {
                "summary": f"Analysis couldn't be completed for {len(code.split('\\n'))} lines of code.",
                "strengths": ["Code structure is readable"],
                "improvements": ["Try resubmitting with clearer formatting"],
                "categories": {
                    "performance": {"score": 6, "issues": 0, "suggestions": 1},
                    "security": {"score": 6, "issues": 0, "suggestions": 1},
                    "maintainability": {"score": 6, "issues": 0, "suggestions": 1},
                    "style": {"score": 6, "issues": 0, "suggestions": 1}
                }
            },
            "metrics": {
                "score": 60,
                "complexity": max(1, min(5, len(code.split('\\n')) / 20)),
                "maintainability_index": 60.0,
                "cyclomatic_complexity": max(1, len(code.split('\\n')) // 10),
                "cognitive_complexity": max(1, len(code.split('\\n')) // 8),
                "duplicated_lines": 0,
                "test_coverage": 0.0
            },
            "issues": [
                {
                    "id": 1,
                    "type": "system",
                    "severity": "medium",
                    "line": 1,
                    "column": 1,
                    "column_number": 1,
                    "title": "JSON Processing Error",
                    "message": "We encountered an issue processing this code. The analysis may be incomplete.",
                    "suggestion": "Try breaking down your code into smaller components for better analysis.",
                    "code_snippet": "",
                    "fixed_code": ""
                },
                {
                    "id": 2,
                    "type": "general",
                    "severity": "low",
                    "line": 1,
                    "column": 1,
                    "column_number": 1,
                    "title": "General Code Review",
                    "message": "While detailed analysis is unavailable, we recommend reviewing code for:",
                    "suggestion": "Check for proper error handling, variable naming, and function documentation.",
                    "code_snippet": "",
                    "fixed_code": ""
                }
            ]
        }
        
    except Exception as e:
        print(f"Analysis error: {e}")
        
        # Direct error handling without using _get_fallback_analysis
        return {
            "analysis": {
                "summary": f"Analysis failed for {len(code.split('\\n'))} lines of code. Error: {str(e)}",
                "strengths": ["Code submitted for review"],
                "improvements": ["Try resubmitting with a different format"],
                "categories": {
                    "performance": {"score": 5, "issues": 1, "suggestions": 1},
                    "security": {"score": 5, "issues": 0, "suggestions": 1},
                    "maintainability": {"score": 5, "issues": 1, "suggestions": 1},
                    "style": {"score": 5, "issues": 0, "suggestions": 1}
                }
            },
            "metrics": {
                "score": 50,
                "complexity": 3.0,
                "maintainability_index": 60.0,
                "cyclomatic_complexity": 3,
                "cognitive_complexity": 5,
                "duplicated_lines": 0,
                "test_coverage": 0.0
            },
            "issues": [
                {
                    "id": 1,
                    "type": "system",
                    "severity": "medium",
                    "line": 1,
                    "column": 1,
                    "column_number": 1,
                    "title": "Analysis Processing Error",
                    "message": f"Error: {str(e)}",
                    "suggestion": "Try resubmitting your code or simplifying complex sections.",
                    "code_snippet": "",
                    "fixed_code": ""
                }
            ]
        }


def _validate_analysis_result(result: dict, code: str) -> dict:
    """Validate and fix the analysis result structure"""
    
    # Ensure top-level keys exist
    if "analysis" not in result:
        result["analysis"] = {}
    if "metrics" not in result:
        result["metrics"] = {}
    if "issues" not in result:
        result["issues"] = []
    
    # Validate analysis section
    analysis = result["analysis"]
    analysis.setdefault("summary", "Code analysis completed")
    analysis.setdefault("strengths", ["Code structure is present"])
    analysis.setdefault("improvements", ["Consider adding more comments"])
    analysis.setdefault("categories", {})
    
    # Ensure categories have all required fields
    categories = analysis["categories"]
    
    # Convert plain text categories to structured format if needed
    for key in ["performance", "security", "maintainability", "style"]:
        if key not in categories:
            categories[key] = {
                "score": 6,
                "issues": 0,
                "suggestions": 0
            }
        elif isinstance(categories[key], str):
            # Convert string format to object format
            assessment = categories[key]
            if assessment.startswith("Good"):
                score = 8
            elif assessment.startswith("Fair"):
                score = 6
            else:  # Poor
                score = 4
            
            categories[key] = {
                "score": score,
                "issues": 1,
                "suggestions": 1
            }
    
    # Validate metrics section
    metrics = result["metrics"]
    metrics.setdefault("score", 70)
    metrics.setdefault("complexity", 2.0)
    metrics.setdefault("maintainability_index", 70.0)
    metrics.setdefault("cyclomatic_complexity", 2)
    metrics.setdefault("cognitive_complexity", 3)
    metrics.setdefault("duplicated_lines", 0)
    metrics.setdefault("test_coverage", 0.0)
    
    # Ensure numeric values are in valid ranges
    metrics["score"] = max(0, min(100, float(metrics["score"])))
    metrics["complexity"] = max(1, min(10, float(metrics["complexity"])))
    metrics["maintainability_index"] = max(0, min(100, float(metrics["maintainability_index"])))
    
    # Validate issues array
    valid_issues = []
    
    # Process provided issues first
    for i, issue in enumerate(result["issues"]):
        if isinstance(issue, dict):
            # Assign a unique ID for the issue
            issue["id"] = i + 1
            
            # Ensure required fields
            issue.setdefault("type", "general")
            issue.setdefault("severity", "medium")
            issue.setdefault("line", 1)
            
            # Handle both column and column_number for compatibility
            if "column" in issue and "column_number" not in issue:
                issue["column_number"] = issue["column"]
            elif "column_number" in issue and "column" not in issue:
                issue["column"] = issue["column_number"]
            else:
                issue.setdefault("column", 1)
                issue.setdefault("column_number", 1)
                
            issue.setdefault("title", "Code Issue")
            issue.setdefault("message", "Issue detected")
            issue.setdefault("suggestion", "Review this code")
            issue.setdefault("code_snippet", "")
            issue.setdefault("fixed_code", "")
            
            # Validate severity
            if issue["severity"] not in ["high", "medium", "low"]:
                issue["severity"] = "medium"
                
            valid_issues.append(issue)
    
    # Only add generic issues if no real issues were provided and categories indicate issues exist
    if not valid_issues and result.get("analysis", {}).get("categories"):
        categories = result["analysis"]["categories"]
        for category_name, category_data in categories.items():
            if isinstance(category_data, dict) and category_data.get("issues", 0) > 0:
                valid_issues.append({
                    "id": len(valid_issues) + 1,
                    "type": category_name,
                    "severity": "medium",
                    "line": 1,
                    "column": 1,
                    "column_number": 1,
                    "title": f"{category_name.capitalize()} area needs attention",
                    "message": f"The {category_name} aspect of this code could be improved based on analysis.",
                    "suggestion": f"Review the code for {category_name} best practices and optimization opportunities.",
                    "code_snippet": "",
                    "fixed_code": ""
                })
    
    result["issues"] = valid_issues
    
    return result


# def _get_fallback_analysis(code: str, error_msg: str) -> dict:
#     """Return a fallback analysis when AI analysis fails"""
#     lines_of_code = len(code.split('\n'))
    
#     return {
#         "analysis": {
#             "summary": f"Fallback analysis for {lines_of_code} lines of code. {error_msg}",
#             "strengths": [
#                 "Code structure is readable",
#                 "Basic functionality is present"
#             ],
#             "improvements": [
#                 "AI analysis encountered issues - manual review recommended",
#                 "Consider resubmitting for detailed analysis"
#             ],
#             "categories": {
#                 "performance": {
#                     "score": 6,
#                     "issues": 1,
#                     "suggestions": 1
#                 },
#                 "security": {
#                     "score": 5,
#                     "issues": 1,
#                     "suggestions": 1
#                 },
#                 "maintainability": {
#                     "score": 6,
#                     "issues": 1,
#                     "suggestions": 1
#                 },
#                 "style": {
#                     "score": 6,
#                     "issues": 1,
#                     "suggestions": 2
#                 }
#             }
#         },
#         "metrics": {
#             "score": 60,
#             "complexity": max(1, min(5, lines_of_code / 20)),  # Rough estimate
#             "maintainability_index": 60.0,
#             "cyclomatic_complexity": max(1, lines_of_code // 10),
#             "cognitive_complexity": max(1, lines_of_code // 8),
#             "duplicated_lines": 0,
#             "test_coverage": 0.0
#         },
#         "issues": [
#             {
#                 "type": "system",
#                 "severity": "low",
#                 "line": 1,
#                 "column": 1,
#                 "title": "Analysis Incomplete",
#                 "message": f"AI analysis encountered an error: {error_msg}",
#                 "suggestion": "Try resubmitting the code for analysis",
#                 "code_snippet": "",
#                 "fixed_code": ""
#             },
#             {
#                 "type": "style",
#                 "severity": "medium",
#                 "line": 1,
#                 "column": 1,
#                 "title": "Code Structure Review",
#                 "message": "Based on the code length and structure, here are some general recommendations:",
#                 "suggestion": "Consider breaking down complex functions and adding appropriate documentation",
#                 "code_snippet": "",
#                 "fixed_code": ""
#             },
#             {
#                 "type": "maintainability",
#                 "severity": "medium",
#                 "line": 1,
#                 "column": 1,
#                 "title": "Maintainability Considerations",
#                 "message": "Even without detailed analysis, here are some maintainability tips:",
#                 "suggestion": "Ensure consistent naming conventions and add comprehensive comments for future developers",
#                 "code_snippet": "",
#                 "fixed_code": ""
#             }
#         ]
#     }

def calculate_derived_metrics(analysis_result: dict, code: str) -> dict:
    """Calculate additional metrics based on analysis and code"""
    lines_of_code = len(code.split('\n'))
    non_empty_lines = len([line for line in code.split('\n') if line.strip()])
    
    issues = analysis_result.get("issues", [])
    high_severity_issues = len([i for i in issues if i.get("severity") == "high"])
    medium_severity_issues = len([i for i in issues if i.get("severity") == "medium"])
    
    return {
        "lines_of_code": lines_of_code,
        "non_empty_lines": non_empty_lines,
        "total_issues": len(issues),
        "high_severity_issues": high_severity_issues,
        "medium_severity_issues": medium_severity_issues,
        "improvement_rate": max(0, min(100, analysis_result.get("metrics", {}).get("score", 60)))
    }
