const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '../database/instagrab.db');

// Ensure directory exists
if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new Database(dbPath);

// --- SCHEMA INITIALIZATION ---
function initSchema() {
    // Ensure all required tables exist
    db.prepare(`
        CREATE TABLE IF NOT EXISTS site_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            setting_key TEXT UNIQUE NOT NULL,
            setting_value TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT DEFAULT 'Admin',
            last_login DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS download_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            instagram_url TEXT,
            ip_address TEXT,
            status TEXT,
            error_message TEXT,
            download_time INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            excerpt TEXT,
            content TEXT,
            meta_description TEXT,
            featured_image TEXT,
            tags TEXT,
            status TEXT DEFAULT 'published',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            content TEXT,
            meta_description TEXT,
            featured_image TEXT,
            status TEXT DEFAULT 'published',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS ad_blocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT NOT NULL,
            position TEXT NOT NULL, -- header, before_content, middle_content, after_content, footer
            status TEXT DEFAULT 'active',
            paragraph_number INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

    // Default Settings
    const defaultSettings = [
        ['site_name', 'InstaGrab'],
        ['api_key', '607fd753e3mshf81b2c647e363f0p198126jsnddbd3f37d0d0'],
        ['api_host', 'instagram-downloader-download-instagram-stories-videos4.p.rapidapi.com'],
        ['api_endpoint', 'https://instagram-downloader-download-instagram-stories-videos4.p.rapidapi.com/convert'],
        ['session_secret', crypto.randomBytes(32).toString('hex')],
        ['contact_email', 'contact@infiniterankers.com'],
        ['ads_header', '<meta name="google-adsense-account" content="ca-pub-5905358857319449">'], // For AdSense scripts & meta tags
        ['ads_footer', ''],
        ['setup_complete', '0']
    ];

    const insertSetting = db.prepare('INSERT OR IGNORE INTO site_settings (setting_key, setting_value) VALUES (?, ?)');
    for (const [key, val] of defaultSettings) {
        insertSetting.run(key, val);
    }
}

// --- SETTINGS FUNCTIONS ---
const Settings = {
    get: (key) => {
        const row = db.prepare('SELECT setting_value FROM site_settings WHERE setting_key = ?').get(key);
        return row ? row.setting_value : null;
    },
    set: (key, value) => {
        db.prepare(`
            INSERT INTO site_settings (setting_key, setting_value) 
            VALUES (?, ?) 
            ON CONFLICT(setting_key) DO UPDATE SET 
            setting_value = excluded.setting_value,
            updated_at = CURRENT_TIMESTAMP
        `).run(key, value);
    },
    getAll: () => {
        const rows = db.prepare('SELECT setting_key, setting_value FROM site_settings').all();
        const settings = {};
        rows.forEach(r => settings[r.setting_key] = r.setting_value);
        return settings;
    }
};

// --- ADMIN FUNCTIONS ---
const Admin = {
    create: async (email, password, name = 'Admin') => {
        const hash = await bcrypt.hash(password, 10);
        return db.prepare('INSERT INTO admins (email, password, name) VALUES (?, ?, ?)').run(email, hash, name);
    },
    findByEmail: (email) => {
        return db.prepare('SELECT * FROM admins WHERE email = ?').get(email);
    },
    updateLastLogin: (id) => {
        db.prepare('UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    },
    verifyPassword: async (password, hash) => {
        return await bcrypt.compare(password, hash);
    }
};

// --- LOGGING ---
const Logs = {
    addDownload: (data) => {
        db.prepare(`
            INSERT INTO download_logs (instagram_url, ip_address, status, error_message, download_time) 
            VALUES (?, ?, ?, ?, ?)
        `).run(data.url, data.ip, data.status, data.error, data.time);
    }
};

// --- BLOG POSTS ---
const Posts = {
    create: (data) => {
        try {
            return db.prepare(`
                INSERT INTO posts (title, slug, excerpt, content, meta_description, featured_image, tags, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                data.title,
                data.slug,
                data.excerpt,
                data.content,
                data.meta_description || '',
                data.featured_image || '',
                data.tags || '',
                data.status || 'published'
            );
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                throw new Error('A post with this slug already exists. Please use a different slug.');
            }
            throw error;
        }
    },
    update: (id, data) => {
        return db.prepare(`
            UPDATE posts SET 
            title = ?, slug = ?, excerpt = ?, content = ?, meta_description = ?, 
            featured_image = ?, tags = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).run(
            data.title,
            data.slug,
            data.excerpt,
            data.content,
            data.meta_description,
            data.featured_image,
            data.tags,
            data.status,
            id
        );
    },
    delete: (id) => {
        return db.prepare('DELETE FROM posts WHERE id = ?').run(id);
    },
    getAll: () => {
        return db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all();
    },
    getBySlug: (slug) => {
        return db.prepare('SELECT * FROM posts WHERE slug = ?').get(slug);
    },
    getById: (id) => {
        return db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    }
};

// --- PAGES ---
const Pages = {
    create: (data) => {
        try {
            return db.prepare(`
                INSERT INTO pages (title, slug, content, meta_description, featured_image, status) 
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                data.title,
                data.slug,
                data.content,
                data.meta_description || '',
                data.featured_image || '',
                data.status || 'published'
            );
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                throw new Error('A page with this slug already exists.');
            }
            throw error;
        }
    },
    update: (id, data) => {
        return db.prepare(`
            UPDATE pages SET 
            title = ?, slug = ?, content = ?, meta_description = ?, 
            featured_image = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).run(
            data.title,
            data.slug,
            data.content,
            data.meta_description,
            data.featured_image,
            data.status,
            id
        );
    },
    delete: (id) => {
        return db.prepare('DELETE FROM pages WHERE id = ?').run(id);
    },
    getAll: () => {
        return db.prepare('SELECT * FROM pages ORDER BY created_at DESC').all();
    },
    getBySlug: (slug) => {
        return db.prepare('SELECT * FROM pages WHERE slug = ?').get(slug);
    },
    getById: (id) => {
        return db.prepare('SELECT * FROM pages WHERE id = ?').get(id);
    }
};

module.exports = { db, Settings, Admin, Logs, Posts, Pages, initSchema };