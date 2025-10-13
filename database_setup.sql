-- Create the projects table in Supabase
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.projects (
    id BIGSERIAL PRIMARY KEY,
    portal_name TEXT NOT NULL,
    sol_project_no TEXT NOT NULL UNIQUE,
    project_name TEXT NOT NULL,
    client TEXT NOT NULL,
    team_lead TEXT NOT NULL,
    expected_date DATE,
    percent_completed INTEGER DEFAULT 0 CHECK (percent_completed >= 0 AND percent_completed <= 100),
    status TEXT DEFAULT 'In Progress' CHECK (status IN ('In Progress', 'On Hold', 'Near Completion', 'Completed')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security (optional but recommended)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (you can make this more restrictive later)
CREATE POLICY "Allow all operations on projects" ON public.projects
    FOR ALL USING (true) WITH CHECK (true);

-- Insert some sample data
INSERT INTO public.projects (portal_name, sol_project_no, project_name, client, team_lead, expected_date, percent_completed, status, description) VALUES
('Noida', 'SOL-2024-001', 'Metro Station Complex', 'Delhi Metro Rail Corporation', 'John Smith', '2024-12-15', 75, 'In Progress', 'Construction of metro station complex with modern facilities'),
('Dehradun', 'SOL-2024-002', 'Shopping Mall Infrastructure', 'Retail Development Corp', 'Sarah Johnson', '2024-11-30', 45, 'In Progress', 'Development of large shopping mall with parking facilities'),
('Mysore', 'SOL-2024-003', 'Hospital Building', 'Healthcare Systems Ltd', 'Mike Chen', '2025-01-20', 90, 'Near Completion', 'Multi-story hospital building with emergency facilities'),
('Kannur', 'SOL-2024-004', 'Port Development', 'Maritime Authority', 'Emma Wilson', '2024-10-15', 25, 'On Hold', 'Port expansion project for increased cargo capacity');