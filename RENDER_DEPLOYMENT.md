# TV B11 Portal — Render Deployment Guide

**Target Hosting Platform:** Render (Web Service)  
**Database:** Supabase (PostgreSQL with RLS)  
**Node.js Version:** 20+ / 24+  
**Display Timezone:** `Asia/Colombo`  

---

## 1. Quick Deployment Checklist

1. **Create GitHub / GitLab Repository:**
   - Initialize git in `D:\TV-B11`.
   - Ensure `.env.local` and `data/` runtime exports are ignored by `.gitignore`.
   - Push repository to your version control provider.

2. **Create New Web Service on Render:**
   - Go to [dashboard.render.com](https://dashboard.render.com).
   - Click **New +** -> **Web Service**.
   - Connect your TV B11 repository.

3. **Configure Build & Start Settings:**
   - **Environment:** `Node`
   - **Branch:** `main`
   - **Root Directory:** (leave blank for repository root)
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free or Starter

4. **Set Environment Variables on Render:**
   Under **Environment Variables**, add the following keys:

| Key | Example / Description |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `TZ` | `Asia/Colombo` (Crucial for Sri Lanka timetable accuracy) |
| `NEXT_PUBLIC_APP_URL` | `https://your-service-name.onrender.com` |
| `JWT_SECRET` | 64-character random string (e.g. `openssl rand -base64 32`) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-new-project-ref.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your_supabase_anon_public_key` |
| `SUPABASE_SERVICE_ROLE_KEY` | `your_supabase_service_role_private_key` |

5. **Health Check Path:**
   - Set health check to: `/api/timetable/live`

---

## 2. Supabase Production Database Setup

1. Create a brand-new project on [supabase.com](https://supabase.com).
2. Go to **SQL Editor** in the Supabase Dashboard.
3. Run the migrations in order:
   - Step 1: Run `supabase/migrations/001_initial_schema.sql` (Tables, Foreign Keys, Indexes).
   - Step 2: Run `supabase/migrations/002_rls_policies.sql` (Row-Level Security Policies).
   - Step 3: Run `supabase/migrations/003_seed_data.sql` (Official 48-Student Cohort Roster & Modules).
4. Verify table row counts in the Table Editor:
   - `courses`: 3 rows (`TPOPT`, `TPRPT`, `COMMON`)
   - `students`: 48 rows (26 TPOPT + 22 TPRPT)
   - `academic_modules`: 15 rows
   - `timetable_entries`: 140 entries

---

## 3. Resilient Local & Offline Fallback Engine

If Supabase credentials are not provided (such as in local offline testing), the portal's dual-mode engine automatically routes queries to `data/db.json`. This guarantees 100% operational functionality for local demonstrations, automated end-to-end tests, and network partition resiliency.

