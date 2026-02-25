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
   -- Users table (extends Supabase auth)
   CREATE TABLE profiles (
     id UUID PRIMARY KEY REFERENCES auth.users(id),
     email TEXT,
     full_name TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- Items table
   CREATE TABLE items (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES profiles(id),
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

   -- Claims table
   CREATE TABLE claims (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     item_id UUID REFERENCES items(id),
     user_id UUID REFERENCES profiles(id),
     status TEXT DEFAULT 'pending',
     verification_details TEXT,
     admin_notes TEXT,
     created_at TIMESTAMP DEFAULT NOW(),
     processed_at TIMESTAMP
   );

   -- Feedback table
   CREATE TABLE feedback (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES profiles(id),
     type TEXT,
     content TEXT,
     item_id UUID REFERENCES items(id),
     rating INTEGER,
     status TEXT DEFAULT 'pending',
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- AI Feedback table
   CREATE TABLE ai_feedback (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     item_id UUID REFERENCES items(id),
     user_id UUID REFERENCES profiles(id),
     feedback_type TEXT,
     correct_category TEXT,
     notes TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- Notifications table
   CREATE TABLE notifications (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES profiles(id),
     title TEXT,
     message TEXT,
     read BOOLEAN DEFAULT false,
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- Enable Row Level Security
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE items ENABLE ROW LEVEL SECURITY;
   ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
   ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
   ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;
   ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

   -- Create policies
   CREATE POLICY "Anyone can view items" ON items FOR SELECT USING (true);
   CREATE POLICY "Anyone can create items" ON items FOR INSERT WITH CHECK (true);
   CREATE POLICY "Users can update their items" ON items FOR UPDATE USING (auth.uid() = user_id);
   CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT USING (true);
   CREATE POLICY "Users can insert profiles" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
   CREATE POLICY "Anyone can view claims" ON claims FOR SELECT USING (true);
   CREATE POLICY "Anyone can create claims" ON claims FOR INSERT WITH CHECK (true);
   CREATE POLICY "Anyone can view feedback" ON feedback FOR SELECT USING (true);
   CREATE POLICY "Anyone can create feedback" ON feedback FOR INSERT WITH CHECK (true);
   CREATE POLICY "Anyone can view notifications" ON notifications FOR SELECT USING (true);
   CREATE POLICY "Users can insert notifications" ON notifications FOR INSERT WITH CHECK (true);
   ```

---

### Phase 3: Render Setup

You need to deploy **3 services** on Render:

#### 3.1 Frontend (Static Site)

| Setting | Value |
|---------|-------|
| Type | **Static Site** |
| Build Command | `npm run build` |
| Publish Directory | `dist` |
| Environment Variables | `VITE_API_URL` = `https://your-backend.onrender.com/api` |

**🚨 IMPORTANT: Redirects/Rewrites (For SPA Routing)**
To prevent 404 errors when refreshing pages like `/admin`, you **must** add this rule in the Render Dashboard under **Redirects/Rewrites**:
- **Source**: `/*`
- **Destination**: `/index.html`
- **Action**: `Rewrite`

#### 3.2 Backend API (Web Service)

| Setting | Value |
|---------|-------|
| Type | **Web Service** |
| Runtime | **Node** |
| Build Command | `cd server && npm install` |
| Start Command | `cd server && npm start` |
| Environment | `Node` version 18+ |

**Environment Variables for Backend:**
```
PORT=3000
DB_HOST=db.xxxx.supabase.co
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=YOUR_SUPABASE_PASSWORD
DB_NAME=postgres
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
AI_SERVICE_URL=http://ai-service:5000
```

#### 3.3 AI Service (Background Worker)

| Setting | Value |
|---------|-------|
| Type | **Background Worker** |
| Runtime | **Python** |
| Build Command | `cd ai_service && pip install -r requirements.txt` |
| Start Command | `cd ai_service && python main.py` |
| Environment | **Python 3.9+** |

---

### Phase 4: Environment Variables Summary

#### Frontend (.env)
```
VITE_API_URL=https://your-backend.onrender.com/api
```

#### Backend (server/.env)
```
PORT=3000
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
AI_SERVICE_URL=https://your-ai-service.onrender.com
```

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
3. Deploy to Render

If you encounter any issues, check the Render logs for error messages.
