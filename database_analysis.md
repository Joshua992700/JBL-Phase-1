# Supabase Database Schema Analysis

## Table Overview and Relationships

### 1. `reviews` - Main Review Table
**Purpose**: Primary table storing review metadata and status
**Key Fields**:
- `id` (UUID) - Primary key for reviews
- `user_id` (UUID) - Links to auth.users
- `status` - **IMPORTANT**: This is the authoritative status field
- `title`, `description` - Review metadata
- `language`, `review_type` - Classification
- `score`, `improvement_rate` - Evaluation metrics
- `lines_of_code`, `issues`, `suggestions` - Code metrics
- `github_repo`, `github_path` - Source tracking

**Issues Found**:
- ✅ **FIXED**: API was fetching from `code_reviews` first instead of `reviews`
- ✅ **FIXED**: Status should come from this table, not `code_reviews`

### 2. `code_reviews` - Code Storage Table
**Purpose**: Stores the actual code and processing results
**Key Fields**:
- `id` (UUID) - Primary key for code entries
- `review_id` (UUID) - **Foreign key** references `reviews(id)`
- `user_id` (UUID) - Duplicate reference for quick filtering
- `code` (TEXT) - The actual code being reviewed
- `results` (JSONB) - Processing results

**Relationship**: Many-to-one with `reviews` (multiple code submissions per review)

### 3. `ai_analysis` - AI Processing Results
**Purpose**: Stores AI-generated analysis of code
**Key Fields**:
- `review_id` (UUID) - References `reviews(id)`
- `summary` - Overall assessment
- `strengths[]` - Array of positive points
- `improvements[]` - Array of suggested improvements
- `categories` (JSONB) - Structured analysis (performance, security, etc.)

**Relationship**: One-to-one with `reviews`

### 4. `review_metrics` - Quantitative Analysis
**Purpose**: Stores numerical code quality metrics
**Key Fields**:
- `review_id` (UUID) - References `reviews(id)`
- `complexity`, `maintainability_index` - Quality metrics
- `cyclomatic_complexity`, `cognitive_complexity` - Complexity measures
- `duplicated_lines`, `test_coverage` - Code health indicators

**Relationship**: One-to-one with `reviews`

### 5. `review_issues` - Specific Code Issues
**Purpose**: Detailed list of code problems and suggestions
**Key Fields**:
- `review_id` (UUID) - References `reviews(id)`
- `type` - Category (performance, security, etc.)
- `severity` - Priority level (high, medium, low)
- `line`, `column_number` - Location in code
- `title`, `message` - Problem description
- `suggestion`, `fixed_code` - Remediation advice

**Relationship**: One-to-many with `reviews` (multiple issues per review)

## Data Flow Recommendations

### Correct Query Order:
1. **Primary**: Query `reviews` table for main data and status
2. **Secondary**: Join/query related tables for additional data
3. **Never**: Use `code_reviews` as the primary source for review metadata

### API Improvements Made:

#### `/review/{review_id}` endpoint:
- ✅ Now fetches from `reviews` table first (correct status)
- ✅ Joins with `code_reviews` for code content
- ✅ Maintains all existing functionality for related tables

#### `/history` endpoint:
- ✅ Now fetches from `reviews` table (correct status)
- ✅ Uses JOIN to get code content
- ✅ Returns proper review metadata with status

## Database Optimization Suggestions

### 1. Add Indexes
```sql
-- Performance indexes
CREATE INDEX idx_reviews_user_id_created_at ON reviews(user_id, created_at DESC);
CREATE INDEX idx_code_reviews_review_id ON code_reviews(review_id);
CREATE INDEX idx_review_issues_review_id_severity ON review_issues(review_id, severity);

-- Status filtering
CREATE INDEX idx_reviews_status ON reviews(status);
```

### 2. Add Constraints
```sql
-- Ensure valid status values
ALTER TABLE reviews ADD CONSTRAINT check_status 
CHECK (status IN ('pending', 'in_progress', 'completed', 'failed'));

-- Ensure valid severity values
ALTER TABLE review_issues ADD CONSTRAINT check_severity 
CHECK (severity IN ('high', 'medium', 'low'));
```

### 3. Add Triggers for Status Updates
```sql
-- Auto-update completed_at when status changes to 'completed'
CREATE OR REPLACE FUNCTION update_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    ELSIF NEW.status != 'completed' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_completed_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_completed_at();
```

## Security Considerations

### Row Level Security (RLS)
Ensure all tables have proper RLS policies:

```sql
-- Example for reviews table
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own reviews"
ON reviews FOR ALL
USING (auth.uid() = user_id);

-- Apply similar policies to all related tables
```

## Summary of Fixes Applied

1. ✅ **Fixed status inconsistency**: API now fetches from `reviews` table first
2. ✅ **Corrected data flow**: Primary data comes from `reviews`, secondary from related tables
3. ✅ **Maintained functionality**: All existing features preserved
4. ✅ **Improved data integrity**: Proper foreign key relationships respected

The status discrepancy between your page and table should now be resolved. The API will always show the authoritative status from the `reviews` table.
