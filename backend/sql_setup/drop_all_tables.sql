-- Drop all POV tables (for clean recreation)
-- WARNING: This will delete ALL data in POV tables!

-- Drop tables in correct order (child tables first due to foreign key constraints)
DROP TABLE IF EXISTS pov_summary CASCADE;
DROP TABLE IF EXISTS pov_outcomes CASCADE;
DROP TABLE IF EXISTS pov_outcome_titles CASCADE;
DROP TABLE IF EXISTS pov_reports CASCADE;

-- Drop the trigger function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Verify tables are dropped
SELECT 
    schemaname,
    tablename
FROM pg_tables 
WHERE tablename LIKE 'pov_%'
ORDER BY tablename; 