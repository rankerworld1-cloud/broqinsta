const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '../database/broqinsta.db');

if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

let db = null;
let SQL = null;

function getDb() {
    if (db) return db;
    throw new Error('Database not initialized. Call initDatabase() first.');
}

function saveDb() {
    try {
        const data = getDb().export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    } catch (e) {
        console.error('DB save error:', e.message);
    }
}

function run(sql, ...params) {
    const d = getDb();
    d.run(sql, params);
    const changes = d.getRowsModified();
    saveDb();
    const stmtId = d.exec("SELECT last_insert_rowid() as id");
    const lastInsertRowid = (stmtId.length > 0 && stmtId[0].values.length > 0) ? stmtId[0].values[0][0] : null;
    return { changes, lastInsertRowid };
}

function get(sql, ...params) {
    const stmt = getDb().prepare(sql);
    if (params.length > 0) stmt.bind(params);
    if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
    }
    stmt.free();
    return undefined;
}

function all(sql, ...params) {
    const stmt = getDb().prepare(sql);
    if (params.length > 0) stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

async function initDatabase() {
    SQL = await initSqlJs();

    if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }

    return db;
}

function initSchema() {
    const d = getDb();

    d.run(`
        CREATE TABLE IF NOT EXISTS site_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            setting_key TEXT UNIQUE NOT NULL,
            setting_value TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    d.run(`
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT DEFAULT 'Admin',
            last_login DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    d.run(`
        CREATE TABLE IF NOT EXISTS download_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            instagram_url TEXT,
            ip_address TEXT,
            status TEXT,
            error_message TEXT,
            download_time INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    d.run(`
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            excerpt TEXT,
            content TEXT,
            meta_title TEXT,
            meta_description TEXT,
            featured_image TEXT,
            category TEXT DEFAULT 'General',
            tags TEXT,
            status TEXT DEFAULT 'published',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    d.run(`
        CREATE TABLE IF NOT EXISTS pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            content TEXT,
            meta_title TEXT,
            meta_description TEXT,
            featured_image TEXT,
            status TEXT DEFAULT 'published',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    d.run(`
        CREATE TABLE IF NOT EXISTS ad_blocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT NOT NULL,
            position TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            paragraph_number INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    try { d.run('ALTER TABLE posts ADD COLUMN meta_title TEXT'); } catch(e) {}
    try { d.run('ALTER TABLE posts ADD COLUMN category TEXT DEFAULT "General"'); } catch(e) {}
    try { d.run('ALTER TABLE pages ADD COLUMN meta_title TEXT'); } catch(e) {}

    const defaultSettings = [
        ['site_name', 'BroqInsta'],
        ['site_url', ''],
        ['api_key', '607fd753e3mshf81b2c647e363f0p198126jsnddbd3f37d0d0'],
        ['api_host', 'instagram-downloader-download-instagram-stories-videos4.p.rapidapi.com'],
        ['api_endpoint', 'https://instagram-downloader-download-instagram-stories-videos4.p.rapidapi.com/convert'],
        ['session_secret', crypto.randomBytes(32).toString('hex')],
        ['contact_email', 'contact@infiniterankers.com'],
        ['ads_header', '<meta name="google-adsense-account" content="ca-pub-5905358857319449">'],
        ['ads_footer', ''],
        ['setup_complete', '0']
    ];

    for (const [key, val] of defaultSettings) {
        run('INSERT OR IGNORE INTO site_settings (setting_key, setting_value) VALUES (?, ?)', key, val);
    }

    saveDb();
}

const Settings = {
    get: (key) => {
        const row = get('SELECT setting_value FROM site_settings WHERE setting_key = ?', key);
        return row ? row.setting_value : null;
    },
    set: (key, value) => {
        run(`
            INSERT INTO site_settings (setting_key, setting_value) 
            VALUES (?, ?) 
            ON CONFLICT(setting_key) DO UPDATE SET 
            setting_value = excluded.setting_value,
            updated_at = CURRENT_TIMESTAMP
        `, key, value);
    },
    getAll: () => {
        const rows = all('SELECT setting_key, setting_value FROM site_settings');
        const settings = {};
        rows.forEach(r => settings[r.setting_key] = r.setting_value);
        return settings;
    }
};

const Admin = {
    create: async (email, password, name = 'Admin') => {
        const hash = await bcrypt.hash(password, 10);
        return run('INSERT INTO admins (email, password, name) VALUES (?, ?, ?)', email, hash, name);
    },
    findByEmail: (email) => {
        return get('SELECT * FROM admins WHERE email = ?', email);
    },
    updateLastLogin: (id) => {
        run('UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?', id);
    },
    verifyPassword: async (password, hash) => {
        return await bcrypt.compare(password, hash);
    }
};

const Logs = {
    addDownload: (data) => {
        run(`
            INSERT INTO download_logs (instagram_url, ip_address, status, error_message, download_time) 
            VALUES (?, ?, ?, ?, ?)
        `, data.url, data.ip, data.status, data.error, data.time);
    }
};

const Posts = {
    create: (data) => {
        try {
            return run(`
                INSERT INTO posts (title, slug, excerpt, content, meta_title, meta_description, featured_image, category, tags, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
                data.title,
                data.slug,
                data.excerpt,
                data.content,
                data.meta_title || '',
                data.meta_description || '',
                data.featured_image || '',
                data.category || 'General',
                data.tags || '',
                data.status || 'published'
            );
        } catch (error) {
            if (error.message && error.message.includes('UNIQUE')) {
                throw new Error('A post with this slug already exists. Please use a different slug.');
            }
            throw error;
        }
    },
    update: (id, data) => {
        return run(`
            UPDATE posts SET 
            title = ?, slug = ?, excerpt = ?, content = ?, meta_title = ?, meta_description = ?, 
            featured_image = ?, category = ?, tags = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `,
            data.title,
            data.slug,
            data.excerpt,
            data.content,
            data.meta_title || '',
            data.meta_description,
            data.featured_image,
            data.category || 'General',
            data.tags,
            data.status,
            id
        );
    },
    delete: (id) => {
        return run('DELETE FROM posts WHERE id = ?', id);
    },
    getAll: () => {
        return all('SELECT * FROM posts ORDER BY created_at DESC');
    },
    getPublished: () => {
        return all("SELECT * FROM posts WHERE status = 'published' ORDER BY created_at DESC");
    },
    getBySlug: (slug) => {
        return get('SELECT * FROM posts WHERE slug = ?', slug);
    },
    getById: (id) => {
        return get('SELECT * FROM posts WHERE id = ?', id);
    },
    getByCategory: (category) => {
        return all("SELECT * FROM posts WHERE category = ? AND status = 'published' ORDER BY created_at DESC", category);
    },
    getRelated: (postId, category, limit = 3) => {
        return all("SELECT * FROM posts WHERE id != ? AND category = ? AND status = 'published' ORDER BY created_at DESC LIMIT ?", postId, category, limit);
    },
    count: () => {
        const row = get('SELECT COUNT(*) as count FROM posts');
        return row ? row.count : 0;
    },
    countPublished: () => {
        const row = get("SELECT COUNT(*) as count FROM posts WHERE status = 'published'");
        return row ? row.count : 0;
    }
};

const Pages = {
    create: (data) => {
        try {
            return run(`
                INSERT INTO pages (title, slug, content, meta_title, meta_description, featured_image, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
                data.title,
                data.slug,
                data.content,
                data.meta_title || '',
                data.meta_description || '',
                data.featured_image || '',
                data.status || 'published'
            );
        } catch (error) {
            if (error.message && error.message.includes('UNIQUE')) {
                throw new Error('A page with this slug already exists.');
            }
            throw error;
        }
    },
    update: (id, data) => {
        return run(`
            UPDATE pages SET 
            title = ?, slug = ?, content = ?, meta_title = ?, meta_description = ?, 
            featured_image = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `,
            data.title,
            data.slug,
            data.content,
            data.meta_title || '',
            data.meta_description,
            data.featured_image,
            data.status,
            id
        );
    },
    delete: (id) => {
        return run('DELETE FROM pages WHERE id = ?', id);
    },
    getAll: () => {
        return all('SELECT * FROM pages ORDER BY created_at DESC');
    },
    getPublished: () => {
        return all("SELECT * FROM pages WHERE status = 'published' ORDER BY created_at DESC");
    },
    getBySlug: (slug) => {
        return get('SELECT * FROM pages WHERE slug = ?', slug);
    },
    getById: (id) => {
        return get('SELECT * FROM pages WHERE id = ?', id);
    },
    count: () => {
        const row = get('SELECT COUNT(*) as count FROM pages');
        return row ? row.count : 0;
    },
    countPublished: () => {
        const row = get("SELECT COUNT(*) as count FROM pages WHERE status = 'published'");
        return row ? row.count : 0;
    }
};

module.exports = { Settings, Admin, Logs, Posts, Pages, initSchema, initDatabase };
