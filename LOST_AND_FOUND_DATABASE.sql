-- =====================================================
-- LOST & FOUND DATABASE - COMPLETE SQL
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. PROFILES TABLE (extends Supabase auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 2. ITEMS TABLE (lost and found items)
-- =====================================================
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    status TEXT DEFAULT 'open',
    type TEXT CHECK (type IN ('lost', 'found')),
    location TEXT,
    image_url TEXT,
    contact_email TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 3. CLAIMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    claimer_email TEXT,
    status TEXT DEFAULT 'pending',
    match_score FLOAT DEFAULT 0,
    verification_notes TEXT,
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

-- =====================================================
-- 4. FEEDBACK TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    type TEXT,
    content TEXT,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    rating INTEGER,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 5. AI_FEEDBACK TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    feedback_type TEXT,
    correct_category TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 6. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT,
    message TEXT,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 7. ADMIN_USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES (using DO blocks to ignore duplicates)
-- =====================================================

-- Profiles policies
DO $$ BEGIN
CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN END $$;

DO $$ BEGIN
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN END $$;

DO $$ BEGIN
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN END $$;

-- Items policies
DO $$ BEGIN
CREATE POLICY "Anyone can view items" ON items FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN END $$;

DO $$ BEGIN
CREATE POLICY "Authenticated users can insert items" ON items FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
EXCEPTION WHEN duplicate_object THEN END $$;

DO $$ BEGIN
CREATE POLICY "Users can update own items" ON items FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN END $$;

DO $$ BEGIN
CREATE POLICY "Users can delete own items" ON items FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN END $$;

-- Claims policies
DO $$ BEGIN
CREATE POLICY "Anyone can view claims" ON claims FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN END $$;

DO $$ BEGIN
CREATE POLICY "Anyone can insert claims" ON claims FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN END $$;

-- Feedback policies
DO $$ BEGIN
CREATE POLICY "Anyone can view feedback" ON feedback FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN END $$;

DO $$ BEGIN
CREATE POLICY "Anyone can insert feedback" ON feedback FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN END $$;

-- AI Feedback policies
DO $$ BEGIN
CREATE POLICY "Anyone can view ai_feedback" ON ai_feedback FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN END $$;

DO $$ BEGIN
CREATE POLICY "Anyone can insert ai_feedback" ON ai_feedback FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN END $$;

-- Notifications policies
DO $$ BEGIN
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN END $$;

DO $$ BEGIN
CREATE POLICY "Users can insert notifications" ON notifications FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN END $$;

-- Admin Users policies
DO $$ BEGIN
CREATE POLICY "Service role can read admin_users" ON admin_users FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN END $$;

-- =====================================================
-- INSERT DEFAULT ADMIN USER
-- =====================================================
INSERT INTO admin_users (username, password, email, role)
VALUES ('admin', 'admin123', 'admin@lostfound.com', 'admin')
ON CONFLICT (username) DO UPDATE SET 
    password = EXCLUDED.password,
    email = EXCLUDED.email,
    role = EXCLUDED.role;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT '✅ Database setup complete! Admin user: admin / admin123' as message;
