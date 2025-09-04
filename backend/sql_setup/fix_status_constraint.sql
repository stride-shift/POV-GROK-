-- Drop the existing constraint
ALTER TABLE pov_reports DROP CONSTRAINT IF EXISTS pov_reports_status_check;

-- Add the updated constraint with the new status
ALTER TABLE pov_reports ADD CONSTRAINT pov_reports_status_check 
CHECK (status IN ('processing', 'completed', 'failed', 'titles_generated')); 