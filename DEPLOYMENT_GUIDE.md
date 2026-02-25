# Lost & Found Web Application - Deployment Guide

## Deployment to GitHub + Render + Supabase

---

## 🚨 CRITICAL: Missing Components

Your frontend is complete but requires **backend services** that don't exist yet:

| Component | Status | Required For |
|-----------|--------|--------------|
| Frontend (React/Vite) | ✅ Exists | User Interface |
| Backend API (Node.js) | ❌ Missing | Item CRUD, Auth, Admin |
| AI Service (Python) | ❌ Missing | Image Detection, Classification |
| Database | ❌ Missing | PostgreSQL |

---

## 📦 Files Created for You

I've created the missing backend components for you:

### Backend API (`server/`)
```
server/
├── package.json        # Node.js dependencies
├── index.js            # Express API server
├── .env.example        # Environment template
└── Dockerfile          # Docker configuration
```

### AI Service (`ai_service/`)
```
ai_service/
├── main.py             # Flask API with YOLO
└── requirements.txt    # Python dependencies
```

---

## 📋 COMPLETE DEPLOYMENT CHECKLIST

### Phase 1: GitHub Setup

1. **Create GitHub Repository**
   - Go to https://github.com/new
   - Name: `lost-and-found`
   - Make it **Public** (for free private repos, use GitLab)

2. **Initialize Git & Push Code**
   ```bash
   git init
   git add .
   git commit -m "Initial commit with backend"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/lost-and-found.git
   git push -u origin main
   ```

---

### Phase 2: Supabase Setup (Database & Auth)

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Click "New Project"
   - Name: `lost-and-found`
   - Generate password and save it

2. **Get Configuration Values**
   After creation, go to **Settings → API**
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_ANON_KEY` (anon public key)
   - `SUPABASE_SERVICE_ROLE_KEY` (secret - keep safe!)

3. **Create Database Tables**
   Run this in Supabase SQL Editor:
   ```sql
   -- 1. PROFILES TABLE
   CREATE TABLE IF NOT EXISTS profiles (
     id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
     email TEXT,
     full_name TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- 2. ITEMS TABLE
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

   -- 3. CLAIMS TABLE
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

   -- 4. ADMIN_USERS TABLE
   CREATE TABLE IF NOT EXISTS admin_users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     username TEXT UNIQUE NOT NULL,
     password TEXT NOT NULL,
     email TEXT,
     role TEXT DEFAULT 'admin',
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- 5. INSERT DEFAULT ADMIN (Username: admin, Password: admin123)
   INSERT INTO admin_users (username, password, email, role)
   VALUES ('admin', 'admin123', 'admin@lostfound.com', 'admin')
   ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password;

   -- 6. ENABLE RLS
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE items ENABLE ROW LEVEL SECURITY;
   ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
   ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

   -- 7. CREATE POLICIES (Simplified)
   CREATE POLICY "Anyone can view items" ON items FOR SELECT USING (true);
   CREATE POLICY "Authenticated users can insert items" ON items FOR INSERT WITH CHECK (true);
   CREATE POLICY "Anyone can view claims" ON claims FOR SELECT USING (true);
   CREATE POLICY "Service role can read admin_users" ON admin_users FOR SELECT USING (true);
   ```

---

### Phase 3: Render Setup

**IMPORTANT: Deploy Backend FIRST, then Frontend!**

---

#### 3.1 Backend API (Web Service) - DEPLOY THIS FIRST!

| Setting | Value |
|---------|-------|
| Type | **Web Service** |
| Runtime | **Node** |
| Build Command | `cd server && npm install` |
| Start Command | `cd server && npm start` |
| Environment | **Node** version 18+ |

**Environment Variables for Backend (REQUIRED):**
```
PORT=3000
SUPABASE_URL=YOUR_SUPABASE_URL_HERE
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE
AI_SERVICE_URL=YOUR_AI_SERVICE_URL_HERE
```

**Example with real URLs:**
- AI Service: `https://lost-found-ai-z622.onrender.com`
- AI_SERVICE_URL: `https://lost-found-ai-z622.onrender.com`

**⚠️ IMPORTANT: After deploying, copy your backend URL**
- Example: `https://lost-found-api.onrender.com`
- You'll need this for the Frontend!

---

#### 3.2 Frontend (Static Site) - DEPLOY AFTER BACKEND

| Setting | Value |
|---------|-------|
| Type | **Static Site** |
| Build Command | `npm run build` |
| Publish Directory | `dist` |

**Environment Variables for Frontend (CRITICAL!):**
```
VITE_API_URL=https://YOUR-BACKEND-NAME.onrender.com/api
```

**Example with real URLs:**
- Backend: `https://lost-found-backend-i3rw.onrender.com`
- Frontend VITE_API_URL: `https://lost-found-backend-i3rw.onrender.com/api`

**⚠️⚠️⚠️ CRITICAL: You MUST add `/api` at the end!**

Example:
- If your backend URL is: `https://lost-found-api.onrender.com`
- Then VITE_API_URL must be: `https://lost-found-api.onrender.com/api`

If you forget `/api`, admin login will fail with "API endpoint not found" error!

---

#### 3.3 AI Service (Optional - for Image Detection)

| Setting | Value |
|---------|-------|
| Type | **Web Service** |
| Runtime | **Python** |
| Build Command | `cd ai_service && pip install -r requirements.txt` |
| Start Command | `cd ai_service && python main.py` |
| Environment | **Python 3.9+** |

---

### Phase 4: Verify Admin Login Works

1. Go to your Frontend URL
2. Navigate to `/admin`
3. Login with:
   - Username: `admin`
   - Password: `admin123`

If login fails, check:
1. Browser Console (F12) for error messages
2. Backend logs in Render
3. Make sure VITE_API_URL includes `/api`

---

## 🚀 Quick Start Commands

### Local Development
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install

# Start frontend
npm run dev

# Start backend (in separate terminal)
cd server && npm start

# Start AI service (in separate terminal)
cd ai_service
pip install -r requirements.txt
python main.py
```

### Production Build
```bash
npm run build
# Output: dist/ folder
```

---

## 📞 Need Help?

The backend code is now complete and ready for deployment! Follow the steps above to:
1. Push to GitHub
2. Set up Supabase
3. Deploy Backend FIRST
4. Deploy Frontend SECOND (with correct VITE_API_URL!)

If you encounter any issues, check the Render logs for error messages.
