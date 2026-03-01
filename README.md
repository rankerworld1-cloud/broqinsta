# InstaGrab - Instagram Video Downloader

Professional Instagram video, reel, and photo downloader with a premium SaaS design and integrated admin dashboard.

## 🚀 Features
- **One-Click Downloads**: High-quality Extraction for Reels, Videos, and Photos.
- **Admin Dashboard**: Real-time analytics, traffic tracking, and logs.
- **Dynamic Settings**: Update API keys and rate limits via the UI.
- **SEO Ready**: Optimized meta tags and blog integration.
- **Premium UI**: Modern SaaS aesthetics with Glassmorphism and Outfit fonts.

## 🛠️ Tech Stack
- **Backend**: Node.js, Express.js, SQLite (better-sqlite3)
- **Frontend**: Vanilla HTML/JS, Tailwind CSS
- **Security**: JWT Auth, Helmet, Rate Limiter, Bcrypt
- **Real-time**: Socket.IO

## 📦 Quick Start (Local)
1. `npm install`
2. `cp .env.example .env` (Add your RapidAPI key)
3. `node database/init.js` (Initialize admin)
4. `npm run dev`
Visit: `http://localhost:3000`

## 🛡️ Admin Access
Visit `/admin/login.html`
Default: `admin@instagrab.com` / `Admin@123456`

## 📝 License
MIT License
