-- Add version history to whitepapers table
-- This stores previous versions of whitepapers when edited

-- Add version_history column to store all previous versions
ALTER TABLE public.whitepapers 
ADD COLUMN IF NOT EXISTS version_history JSONB DEFAULT '[]'::jsonb;

-- Add current version number for easy tracking
ALTER TABLE public.whitepapers 
ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1;

-- Create index for better performance when querying version history
CREATE INDEX IF NOT EXISTS idx_whitepapers_version_history 
ON public.whitepapers USING GIN (version_history);

-- Example of version_history structure:
-- [
--   {
--     "version": 1,
--     "content": "Original whitepaper content...",
--     "title": "Original Title", 
--     "edited_at": "2024-01-15T10:00:00Z",
--     "edit_message": "Initial generation",
--     "edited_by": "user_id_here"
--   },
--   {
--     "version": 2,
--     "content": "Updated content...",
--     "title": "Updated Title",
--     "edited_at": "2024-01-15T11:30:00Z",
--     "edit_message": "Made introduction more compelling",
--     "edited_by": "user_id_here"
--   }
-- ]

-- To check if columns were added successfully:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'whitepapers' 
AND column_name IN ('version_history', 'current_version');
