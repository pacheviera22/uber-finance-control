-- Create weekly_records table for storing weekly goals
CREATE TABLE IF NOT EXISTS weekly_records (
    week_start_date DATE PRIMARY KEY,
    weekly_goal NUMERIC NOT NULL DEFAULT 1000,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default record for current week
INSERT INTO weekly_records (week_start_date, weekly_goal)
VALUES (
    DATE_TRUNC('week', CURRENT_DATE)::DATE,
    1000
)
ON CONFLICT (week_start_date) DO NOTHING;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_weekly_records_date ON weekly_records(week_start_date);
