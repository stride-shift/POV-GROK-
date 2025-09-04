-- Add column to store gathered context data
ALTER TABLE pov_reports ADD COLUMN context_data JSONB;

-- Add index for better performance on context queries
CREATE INDEX IF NOT EXISTS idx_pov_reports_context ON pov_reports USING GIN (context_data); 