# Jus Breathe - Calm Breathing & Meditation App (Monorepo)

Jus Breathe is a small, modern, and beautiful breathing exercise web application designed to help users perform Box Breathing, Wim Hof, 4-7-8, and Transcendental Meditation cycles. 

Built using **Clean Architecture** principles inside an **npm workspaces monorepo**, it features organic visual guides, custom Web Audio synthesis, separate/combined streak tracking, progress calendar logging, custom preset editors, and zero-login cloud syncing.

---

## 📁 Monorepo Structure

* **`packages/core`**: Contributes all pure business rules. Includes domain type interfaces (`entities.ts`), preset rules (`presets.ts`), database interfaces (`repositories.ts`), timer states (`timerStateMachine.ts`), and streak algorithms (`streakCalculator.ts`). Completely framework-free.
* **`packages/web`**: Web presentation layer and database adapters. Contains React UI components, CSS variables, Web Audio synthesizers, Supabase configurations, and PWA configurations.

---

## 🚀 Getting Started

### 1. Prerequisite Installations
* Ensure you have [Node.js](https://nodejs.org) (v18+) installed.

### 2. Install Project Dependencies
Run the install command at the root directory to automatically link workspaces and download assets:
```bash
npm install
```

### 3. Run Development Server
Start the local preview server:
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser.

### 4. Run Test Suites
Run unit tests for domain and state-machine engines:
```bash
npm run test
```

---

## ☁️ Setting Up Cloud Synchronization (Supabase)

The app defaults to **local storage** for save persistence. If you want to enable cross-device sync:

1. Create a free project on [Supabase](https://supabase.com).
2. Run the following SQL schema inside your Supabase SQL Editor:
   ```sql
   CREATE TABLE public.users (
     sync_key TEXT PRIMARY KEY,
     data JSONB NOT NULL,
     last_synced TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );

   -- Enable Row Level Security
   ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

   -- Allow anonymous reads and writes based on key matches
   CREATE POLICY "Enable public access by key" ON public.users 
     FOR ALL TO public USING (true) WITH CHECK (true);
   ```
3. Create a `.env.local` file inside `packages/web/` and add your keys:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_public_key
   ```
4. Restart your development server (`npm run dev`). The app will automatically switch from local-only to real-time cloud sync!

---

## 📱 Progressive Web App (PWA) Install
* **Android / Chrome**: Open the page, click the three dots, and select **Add to Home screen**.
* **Desktop / Edge**: Click the install icon in the address bar.
* Once installed, the app runs in standalone window mode (no browser bar) and works **offline** via cached service worker.
