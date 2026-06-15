-- Add video_urls array column (supports multiple videos per session)
-- video_url (old single-URL column) is kept for backward compat, new code uses video_urls
ALTER TABLE session_reports ADD COLUMN IF NOT EXISTS video_urls TEXT[] DEFAULT '{}';
