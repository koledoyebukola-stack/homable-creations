-- Add country column to boards table for Nigeria-specific features
ALTER TABLE boards ADD COLUMN IF NOT EXISTS country VARCHAR(2);

-- Create index for faster country-based queries
CREATE INDEX IF NOT EXISTS idx_boards_country ON boards(country);

-- Add comment
COMMENT ON COLUMN boards.country IS 'ISO 3166-1 alpha-2 country code detected from user IP (e.g., NG for Nigeria)';