-- Create daily_records table
CREATE TABLE IF NOT EXISTS public.daily_records (
    date DATE PRIMARY KEY,
    daily_goal NUMERIC DEFAULT 0,
    gas_price NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access (simplest for this app, or adjust as needed)
CREATE POLICY "Allow anonymous select" ON public.daily_records FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON public.daily_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON public.daily_records FOR UPDATE USING (true);
