-- Add version history to marketing_assets, cold_call_emails, and sales_scripts tables
-- This enables chat-based editing with full version tracking

-- ===============================
-- MARKETING ASSETS
-- ===============================

-- Add version_history column to store all previous versions
ALTER TABLE public.marketing_assets 
ADD COLUMN IF NOT EXISTS version_history JSONB DEFAULT '[]'::jsonb;

-- Add current version number for easy tracking
ALTER TABLE public.marketing_assets 
ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1;

-- Create index for better performance when querying version history
CREATE INDEX IF NOT EXISTS idx_marketing_assets_version_history 
ON public.marketing_assets USING GIN (version_history);

-- ===============================
-- COLD CALL EMAILS
-- ===============================

-- Add version_history column to store all previous versions
ALTER TABLE public.cold_call_emails 
ADD COLUMN IF NOT EXISTS version_history JSONB DEFAULT '[]'::jsonb;

-- Add current version number for easy tracking
ALTER TABLE public.cold_call_emails 
ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1;

-- Create index for better performance when querying version history
CREATE INDEX IF NOT EXISTS idx_cold_call_emails_version_history 
ON public.cold_call_emails USING GIN (version_history);

-- ===============================
-- SALES SCRIPTS
-- ===============================

-- Add version_history column to store all previous versions
ALTER TABLE public.sales_scripts 
ADD COLUMN IF NOT EXISTS version_history JSONB DEFAULT '[]'::jsonb;

-- Add current version number for easy tracking
ALTER TABLE public.sales_scripts 
ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1;

-- Create index for better performance when querying version history
CREATE INDEX IF NOT EXISTS idx_sales_scripts_version_history 
ON public.sales_scripts USING GIN (version_history);

-- ===============================
-- VERIFICATION
-- ===============================

-- Check if columns were added successfully:
SELECT 
    table_name,
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name IN ('marketing_assets', 'cold_call_emails', 'sales_scripts')
AND column_name IN ('version_history', 'current_version')
ORDER BY table_name, column_name;
