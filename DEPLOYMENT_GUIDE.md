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

**🚨 CRITICAL ORDER OF OPERATIONS:**
1.  **FIRST**: Deploy the **AI Service** (to get its URL).
2.  **SECOND**: Deploy the **Backend API** (using the AI URL).
3.  **THIRD**: Deploy the **Frontend** (using the Backend URL).

---

#### 3.0 HOW TO GET THE AI_SERVICE_URL (READ THIS FIRST!)

If you don't have this URL yet, it's because **Render needs to create it for you**.

1.  **GO TO RENDER**: Click **"New +"** -> **"Web Service"**.
2.  **ROOT DIRECTORY**: Set this to `ai_service`.
3.  **CLICK CREATE**: Once you click the "Create Web Service" button at the bottom...
4.  **LOOK AT THE TOP LEFT**: Render will immediately show you a link under the service name.
    -   It looks like: `https://lost-found-ai-wxyz.onrender.com`
5.  **COPY THIS LINK**: This is your `AI_SERVICE_URL`. 

**Now you can go and create your Backend service and paste this link into the settings!**

---

#### 3.1 Backend API (Web Service) - [Detailed Step-by-Step]

Follow these exact steps to get your backend running:

1.  **Open Render Dashboard**: Go to [dashboard.render.com](https://dashboard.render.com) and log in.
2.  **Create New Service**:
    -   Click the blue **"New +"** button at the top right.
    -   Select **"Web Service"**.
3.  **Connect Repository**:
    -   Find your GitHub repository (e.g., `lost-and-found`) and click **"Connect"**.
4.  **Configure Basics**:
    -   **Name**: `lost-found-backend` (or your choice).
    -   **Region**: Select the one closest to you (e.g., `Singapore` or `Oregon`).
    -   **Branch**: `main`.
    -   **Root Directory**: ⚠️ **CRITICAL**: Set this to `server`.
    -   **Runtime**: `Node`.
5.  **Build & Start Commands**:
    -   **Build Command**: `npm install`
    -   **Start Command**: `npm start`
    -   **Instance Type**: `Free`.
6.  **Add Environment Variables**:
    -   Scroll down and click **"Advanced"** -> **"Add Environment Variable"**.
    -   Add these one by one:
        -   `PORT`: `3000`
        -   `SUPABASE_URL`: (Your URL from Supabase)
        -   `SUPABASE_ANON_KEY`: (Your Anon key from Supabase)
        -   `SUPABASE_SERVICE_ROLE_KEY`: (Your Service Role key from Supabase)
        -   `AI_SERVICE_URL`: (The URL of your AI Service, e.g., `https://lost-found-ai-z622.onrender.com`)
7.  **Finalize**:
    -   Click **"Create Web Service"** at the bottom.
    -   Wait for the logs to say `🚀 Lost & Found API running on port 3000`.

**⚠️ IMPORTANT: Copy your Backend URL**
Once the deploy is successful, look at the top left (under the name). You will see a link like `https://lost-found-backend.onrender.com`. 
**COPY THIS NOW** — you need it for the Frontend!

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

**Follow these steps to get your AI_SERVICE_URL:**

1.  **Create New Service**: In Render, click **"New +"** -> **"Web Service"**.
2.  **Connect Repository**: Select your same GitHub repo.
3.  **Configure Basics**:
    -   **Name**: `lost-found-ai-service`
    -   **Root Directory**: ⚠️ **Set to `ai_service`**
    -   **Runtime**: `Python`
    -   **Build Command**: `pip install -r requirements.txt`
    -   **Start Command**: `python main.py`
4.  **Finish**: Click **"Create Web Service"**.

**Where is the URL?**
As soon as the page loads, look right under the service name `lost-found-ai-service`. You will see a link like:
`https://lost-found-ai-service-abcd.onrender.com`

**THIS IS YOUR AI_SERVICE_URL!**
Copy it and paste it into your **Backend API's** environment variables.

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
