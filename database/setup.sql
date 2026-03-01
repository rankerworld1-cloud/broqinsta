-- InstaGrab Database Setup Script
-- Creating tables for Hostinger Shared Hosting

-- 1. Admins Table
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT 1
);

-- 2. Blog Posts Table
CREATE TABLE IF NOT EXISTS blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image VARCHAR(500),
  category VARCHAR(100),
  tags TEXT,
  meta_title VARCHAR(255),
  meta_description TEXT,
  meta_keywords TEXT,
  author_id INTEGER,
  status VARCHAR(50) DEFAULT 'draft',
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Analytics Table
CREATE TABLE IF NOT EXISTS analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  failed_downloads INTEGER DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  countries TEXT,
  devices TEXT,
  browsers TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Download Logs Table
CREATE TABLE IF NOT EXISTS download_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instagram_url TEXT NOT NULL,
  ip_address VARCHAR(50),
  user_agent TEXT,
  country VARCHAR(100),
  device VARCHAR(50),
  browser VARCHAR(50),
  status VARCHAR(50),
  error_message TEXT,
  download_time INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Site Settings Table
CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(50) DEFAULT 'text',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Payment Methods Table
CREATE TABLE IF NOT EXISTS payment_methods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider VARCHAR(100) NOT NULL,
  api_key TEXT,
  secret_key TEXT,
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT 0,
  settings TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Injected Scripts Table
CREATE TABLE IF NOT EXISTS injected_scripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  script_type VARCHAR(50),
  script_code TEXT NOT NULL,
  position VARCHAR(50),
  pages TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --- DEFAULT DATA ---

-- Store password hash for Admin@123456
-- Generated hash: $2b$10$iMvIs6sA.XNUn20b1KjCOuX/F8Oms7p8Kk.rV3S6h6QvC1xY1F5m2
INSERT OR IGNORE INTO admins (email, password, name, role) 
VALUES ('admin@instagrab.com', '$2b$10$iMvIs6sA.XNUn20b1KjCOuX/F8Oms7p8Kk.rV3S6h6QvC1xY1F5m2', 'InstaGrab Admin', 'admin');

-- Default Settings
INSERT OR IGNORE INTO site_settings (setting_key, setting_value, setting_type) VALUES 
('site_name', 'InstaGrab', 'text'),
('rapidapi_key', '607fd753e3mshf81b2c647e363f0p198126jsndbd3f37d0d0', 'text'),
('rapidapi_host', 'instagram-downloader-download-instagram-stories-videos4.p.rapidapi.com', 'text'),
('api_endpoint', 'https://instagram-downloader-download-instagram-stories-videos4.p.rapidapi.com/convert', 'text'),
('rate_limit_requests', '10', 'number'),
('rate_limit_window', '3600000', 'number');
