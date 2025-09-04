-- Create cold_call_emails table to store generated emails
CREATE TABLE IF NOT EXISTS public.cold_call_emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES public.pov_reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Email content
    subject TEXT NOT NULL,
    email_body TEXT NOT NULL,
    
    -- Recipient information
    recipient_name TEXT,
    recipient_email TEXT,
    recipient_company TEXT,
    
    -- Selected outcomes (stored as array of outcome IDs or indices)
    selected_outcomes JSONB NOT NULL DEFAULT '[]',
    
    -- Additional context used for generation
    custom_instructions TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Email status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'archived')),
    
    -- Optional: Track if email was actually sent
    sent_at TIMESTAMPTZ,
    
    -- Index for performance
    UNIQUE(id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cold_call_emails_report_id ON public.cold_call_emails(report_id);
CREATE INDEX IF NOT EXISTS idx_cold_call_emails_user_id ON public.cold_call_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_cold_call_emails_created_at ON public.cold_call_emails(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_cold_call_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cold_call_emails_updated_at
    BEFORE UPDATE ON public.cold_call_emails
    FOR EACH ROW
    EXECUTE FUNCTION public.update_cold_call_emails_updated_at();

-- Row Level Security (RLS)
ALTER TABLE public.cold_call_emails ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own emails
CREATE POLICY "Users can access own cold call emails" ON public.cold_call_emails
    FOR ALL USING (auth.uid() = user_id);

-- Policy: Admins can access emails from their organization users
CREATE POLICY "Admins can access organization cold call emails" ON public.cold_call_emails
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
            AND (
                profiles.role = 'super_admin' 
                OR profiles.organization = (
                    SELECT organization FROM public.profiles WHERE id = cold_call_emails.user_id
                )
            )
        )
    );

-- Grant permissions
GRANT ALL ON public.cold_call_emails TO authenticated;
GRANT USAGE ON SEQUENCE cold_call_emails_id_seq TO authenticated;