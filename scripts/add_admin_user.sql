-- =====================================================
-- ADD ADMIN USER TO SUPABASE
-- Run this in Supabase SQL Editor to create admin user
-- =====================================================

-- Create admin_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Allow server to read admin_users (service role bypasses RLS)
CREATE POLICY "Service role can read admin_users" ON admin_users FOR SELECT USING (true);

-- Insert the admin user (username: admin, password: admin123)
-- Note: In production, passwords should be hashed
INSERT INTO admin_users (username, password, email, role)
VALUES ('admin', 'admin123', 'admin@lostfound.com', 'admin')
ON CONFLICT (username) DO UPDATE SET 
    password = EXCLUDED.password,
    email = EXCLUDED.email,
    role = EXCLUDED.role;

-- Verify the admin user was created/updated
SELECT id, username, email, role, created_at 
FROM admin_users 
WHERE username = 'admin';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT '✅ Admin user created successfully!' as message;
