-- 1. Fix the status constraint to include 'titles_generated'
ALTER TABLE pov_reports DROP CONSTRAINT IF EXISTS pov_reports_status_check;
ALTER TABLE pov_reports ADD CONSTRAINT pov_reports_status_check 
CHECK (status IN ('processing', 'completed', 'failed', 'titles_generated'));

-- 2. Add the selected column to pov_outcome_titles
ALTER TABLE pov_outcome_titles ADD COLUMN IF NOT EXISTS selected BOOLEAN DEFAULT FALSE;

-- 3. Add context storage to avoid duplication
ALTER TABLE pov_reports ADD COLUMN IF NOT EXISTS context_data JSONB;

-- 4. Add index for better performance on context queries
CREATE INDEX IF NOT EXISTS idx_pov_reports_context ON pov_reports USING GIN (context_data); 