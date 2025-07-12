-- Row Level Security (RLS) Policies for Pallet App
-- These policies should be applied to your Supabase database

-- Enable RLS on pallet_sessions table
ALTER TABLE pallet_sessions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on pallet_photos table
ALTER TABLE pallet_photos ENABLE ROW LEVEL SECURITY;

-- Policy for pallet_sessions: Users can only access sessions with their device_id
CREATE POLICY "Users can only access their own sessions" ON pallet_sessions
    FOR ALL
    USING (device_id = current_setting('request.jwt.claims', true)::json->>'device_id');

-- Policy for pallet_photos: Users can only access photos through their sessions
CREATE POLICY "Users can only access photos from their sessions" ON pallet_photos
    FOR ALL
    USING (
        session_id IN (
            SELECT id FROM pallet_sessions 
            WHERE device_id = current_setting('request.jwt.claims', true)::json->>'device_id'
        )
    );

-- Create indexes for better performance with RLS
CREATE INDEX IF NOT EXISTS idx_pallet_sessions_device_id ON pallet_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_pallet_photos_session_id ON pallet_photos(session_id);

-- Storage bucket security
-- These policies should be applied to the pallet_photos storage bucket

-- Policy for storage: Users can only upload to folders with their device_id
CREATE POLICY "Users can only upload to their device folder" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'pallet_photos' AND 
                (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'device_id');

-- Policy for storage: Users can only access files from their device folder
CREATE POLICY "Users can only access their device files" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'pallet_photos' AND 
           (storage.foldername(name))[1] = current_setting('request.jwt.claims', true)::json->>'device_id');

-- Note: To implement device_id based authentication, you'll need to:
-- 1. Create a custom authentication system that includes device_id in JWT claims
-- 2. Or modify the existing queries to filter by device_id directly in the application
-- 3. For now, the application filters by device_id in queries, but RLS provides an extra security layer