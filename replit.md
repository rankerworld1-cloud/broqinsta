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
models/database.js  - Database models (Settings, Admin, Posts, Pages, Logs)
routes/admin.js     - Admin API routes (CRUD for posts/pages, stats, ads, settings)
routes/api.js       - Public API routes (download, contact, ads, proxy download)
routes/auth.js      - Authentication routes (login/logout)
routes/setup.js     - First-time setup wizard
routes/sitemap.js   - Sitemap XML, robots.txt, RSS feed
middleware/         - Express middleware (adminAuth, rateLimiter, securityFilter, setupCheck)
public/             - Static frontend files (HTML, CSS, JS, images)
public/admin/       - Admin panel (dashboard, blog-manager, pages-manager, etc.)
database/           - SQLite database files
```

## Environment Variables
- `PORT` - Server port (set to 5000 for Replit)
- `NODE_ENV` - Environment mode
- `ADMIN_EMAIL` - Admin login email (default: admin@broqinsta.com)
- `ADMIN_PASSWORD` - Admin login password (secret)
- `RAPIDAPI_KEY` - RapidAPI key for Instagram API (secret)
- `RAPIDAPI_HOST` - RapidAPI host endpoint
- `API_ENDPOINT` - Full API endpoint URL

## Running
- Workflow: `node server.js` on port 5000
- Deployment: Autoscale target with `node server.js`

## Key Features
- Instagram content downloading via RapidAPI
- Admin panel with session-based authentication
- Blog/pages CMS with category, meta_title, meta_description, tags, featured_image
- Related posts API (same category matching)
- Full SEO: sitemap.xml, robots.txt, RSS feed, auto Google/Bing ping on content changes
- Blog post pages with OG tags, Twitter cards, canonical URLs, breadcrumbs, related posts
- Ad management system (position-based: header, before/after/middle content, footer)
- Dashboard with 6-stat grid (downloads, users, posts, pages, sitemap, RSS)
- Setup wizard for first-time configuration
- Security filtering and rate limiting

## Admin Panel Pages
- `/admin` - Dashboard (requires login)
- `/admin/login.html` - Login page (public, no auth required)
- `/admin/blog-manager.html` - Create/edit/delete blog posts
- `/admin/pages-manager.html` - Create/edit/delete pages
- `/admin/api-settings.html` - API configuration
- `/admin/ads-manager.html` - Ad block management
- `/admin/settings.html` - Site settings
- `/admin/scripts-manager.html` - Advanced tools

## Database Schema
- `posts`: id, title, slug, excerpt, content, meta_title, meta_description, featured_image, category, tags, status, created_at, updated_at
- `pages`: id, title, slug, content, meta_title, meta_description, featured_image, status, created_at, updated_at
- `site_settings`: setting_key, setting_value
- `admins`: email, password (bcrypt), name
- `download_logs`: instagram_url, ip_address, status, error_message, download_time
- `ad_blocks`: name, code, position, status, paragraph_number

## SEO Routes
- `/sitemap.xml` - Dynamic XML sitemap
- `/robots.txt` - Robots.txt with sitemap reference
- `/rss.xml` - RSS 2.0 feed
- `/feed` - Redirect to RSS feed
- `/blog/:slug` - Clean blog post URLs with schema.org markup
- `/:slug` - WordPress-style catch-all routing (checks posts then pages)
