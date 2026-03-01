# BroqInsta - Instagram Content Downloader

## Overview
BroqInsta is a professional Instagram video/content downloader SaaS application built with Node.js and Express.

## Architecture
- **Backend**: Node.js + Express server (`server.js`)
- **Database**: SQLite via `better-sqlite3` (stored in `database/` directory)
- **Frontend**: Static HTML/CSS/JS served from `public/` directory
- **Session Store**: SQLite-backed sessions via `connect-sqlite3`

## Project Structure
```
server.js           - Main Express server entry point
models/             - Database models (database.js, Settings.js, User.js)
routes/             - Express route handlers (admin, api, auth, setup, sitemap)
middleware/         - Express middleware (adminAuth, rateLimiter, securityFilter, setupCheck)
public/             - Static frontend files (HTML, CSS, JS, images)
database/           - SQLite database files and schema
```

## Environment Variables
- `PORT` - Server port (set to 5000 for Replit)
- `NODE_ENV` - Environment mode
- `ADMIN_EMAIL` - Admin login email
- `ADMIN_PASSWORD` - Admin login password (secret)
- `RAPIDAPI_KEY` - RapidAPI key for Instagram API (secret)
- `RAPIDAPI_HOST` - RapidAPI host endpoint
- `API_ENDPOINT` - Full API endpoint URL
- `RATE_LIMIT_WINDOW_MS` - Rate limiting window
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window

## Running
- Workflow: `node server.js` on port 5000
- Deployment: Autoscale target with `node server.js`

## Key Features
- Instagram content downloading via RapidAPI
- Admin panel with authentication
- Blog/pages CMS system
- Setup wizard for first-time configuration
- Rate limiting and security filtering
