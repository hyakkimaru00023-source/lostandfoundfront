-- =====================================================
-- ADD ADMIN USER TO SUPABASE (Minimal)
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Create admin_users table (will fail if exists, that's OK)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Step 2: Insert admin user (updates if exists)
INSERT INTO admin_users (username, password, email, role)
VALUES ('admin', 'admin123', 'admin@lostfound.com', 'admin')
ON CONFLICT (username) DO UPDATE SET 
    password = EXCLUDED.password,
    email = EXCLUDED.email,
    role = EXCLUDED.role;

-- Step 3: Enable RLS (ignore if already enabled)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Step 4: Create policy (ignore if already exists)
DO $$
BEGIN
    CREATE POLICY "Service role can read admin_users" ON admin_users FOR SELECT USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END
$$;

-- Verify
SELECT 'Admin user:' as info, username, email, role FROM admin_users WHERE username = 'admin';
