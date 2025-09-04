-- POV Analysis Database Schema
-- Complete table creation script for fresh database setup

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret-here';

-- Create the main reports table
CREATE TABLE IF NOT EXISTS pov_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    vendor_name TEXT NOT NULL,
    vendor_url TEXT,
    vendor_services TEXT NOT NULL,
    target_customer_name TEXT NOT NULL,
    target_customer_url TEXT,
    role_names TEXT,
    linkedin_urls TEXT,
    role_context TEXT,
    additional_context TEXT,
    model_name TEXT DEFAULT 'o3-mini',
    status TEXT NOT NULL DEFAULT 'processing',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    context_data JSONB
);

-- Add status constraint
ALTER TABLE pov_reports ADD CONSTRAINT pov_reports_status_check 
CHECK (status IN ('processing', 'completed', 'failed', 'titles_generated'));

-- Create outcome titles table
CREATE TABLE IF NOT EXISTS pov_outcome_titles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES pov_reports(id) ON DELETE CASCADE,
    title_index INTEGER NOT NULL,
    title TEXT NOT NULL,
    selected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create outcomes table
CREATE TABLE IF NOT EXISTS pov_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES pov_reports(id) ON DELETE CASCADE,
    outcome_index INTEGER NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create summary table
CREATE TABLE IF NOT EXISTS pov_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES pov_reports(id) ON DELETE CASCADE,
    summary_content TEXT,
    takeaways_content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pov_reports_user_id ON pov_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_pov_reports_status ON pov_reports(status);
CREATE INDEX IF NOT EXISTS idx_pov_reports_created_at ON pov_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pov_reports_context ON pov_reports USING GIN (context_data);

CREATE INDEX IF NOT EXISTS idx_pov_outcome_titles_report_id ON pov_outcome_titles(report_id);
CREATE INDEX IF NOT EXISTS idx_pov_outcome_titles_title_index ON pov_outcome_titles(title_index);
CREATE INDEX IF NOT EXISTS idx_pov_outcome_titles_selected ON pov_outcome_titles(selected);

CREATE INDEX IF NOT EXISTS idx_pov_outcomes_report_id ON pov_outcomes(report_id);
CREATE INDEX IF NOT EXISTS idx_pov_outcomes_outcome_index ON pov_outcomes(outcome_index);

CREATE INDEX IF NOT EXISTS idx_pov_summary_report_id ON pov_summary(report_id);

-- Add unique constraints
ALTER TABLE pov_outcome_titles ADD CONSTRAINT unique_report_title_index 
UNIQUE (report_id, title_index);

ALTER TABLE pov_outcomes ADD CONSTRAINT unique_report_outcome_index 
UNIQUE (report_id, outcome_index);

ALTER TABLE pov_summary ADD CONSTRAINT unique_report_summary 
UNIQUE (report_id);

-- Enable Row Level Security on all tables
ALTER TABLE pov_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE pov_outcome_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pov_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pov_summary ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pov_reports
CREATE POLICY "Users can view their own reports" ON pov_reports
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reports" ON pov_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports" ON pov_reports
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports" ON pov_reports
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for pov_outcome_titles
CREATE POLICY "Users can view titles for their reports" ON pov_outcome_titles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pov_reports 
            WHERE pov_reports.id = pov_outcome_titles.report_id 
            AND pov_reports.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert titles for their reports" ON pov_outcome_titles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM pov_reports 
            WHERE pov_reports.id = pov_outcome_titles.report_id 
            AND pov_reports.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update titles for their reports" ON pov_outcome_titles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM pov_reports 
            WHERE pov_reports.id = pov_outcome_titles.report_id 
            AND pov_reports.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete titles for their reports" ON pov_outcome_titles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM pov_reports 
            WHERE pov_reports.id = pov_outcome_titles.report_id 
            AND pov_reports.user_id = auth.uid()
        )
    );

-- Create RLS policies for pov_outcomes
CREATE POLICY "Users can view outcomes for their reports" ON pov_outcomes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pov_reports 
            WHERE pov_reports.id = pov_outcomes.report_id 
            AND pov_reports.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert outcomes for their reports" ON pov_outcomes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM pov_reports 
            WHERE pov_reports.id = pov_outcomes.report_id 
            AND pov_reports.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update outcomes for their reports" ON pov_outcomes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM pov_reports 
            WHERE pov_reports.id = pov_outcomes.report_id 
            AND pov_reports.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete outcomes for their reports" ON pov_outcomes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM pov_reports 
            WHERE pov_reports.id = pov_outcomes.report_id 
            AND pov_reports.user_id = auth.uid()
        )
    );

-- Create RLS policies for pov_summary
CREATE POLICY "Users can view summary for their reports" ON pov_summary
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pov_reports 
            WHERE pov_reports.id = pov_summary.report_id 
            AND pov_reports.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert summary for their reports" ON pov_summary
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM pov_reports 
            WHERE pov_reports.id = pov_summary.report_id 
            AND pov_reports.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update summary for their reports" ON pov_summary
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM pov_reports 
            WHERE pov_reports.id = pov_summary.report_id 
            AND pov_reports.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete summary for their reports" ON pov_summary
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM pov_reports 
            WHERE pov_reports.id = pov_summary.report_id 
            AND pov_reports.user_id = auth.uid()
        )
    );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for pov_reports updated_at
CREATE TRIGGER update_pov_reports_updated_at 
    BEFORE UPDATE ON pov_reports 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT USAGE ON SCHEMA public TO authenticated;
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verify table creation
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE tablename LIKE 'pov_%'
ORDER BY tablename; 