const db = require('../database/db');

class Settings {
    static get(key) {
        try {
            const row = db.prepare('SELECT setting_value FROM site_settings WHERE setting_key = ?').get(key);
            return row ? row.setting_value : (process.env[key.toUpperCase()] || null);
        } catch (e) {
            return process.env[key.toUpperCase()] || null;
        }
    }

    static getAll() {
        const rows = db.prepare('SELECT setting_key, setting_value FROM site_settings').all();
        const settings = {};
        rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        return settings;
    }

    static set(key, value, type = 'text') {
        const exists = db.prepare('SELECT id FROM site_settings WHERE setting_key = ?').get(key);
        if (exists) {
            db.prepare('UPDATE site_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?')
                .run(value, key);
        } else {
            db.prepare('INSERT INTO site_settings (setting_key, setting_value, setting_type) VALUES (?, ?, ?)')
                .run(key, value, type);
        }
    }

    static async initializeDefaults() {
        const defaults = [
            { key: 'site_name', value: 'InstaGrab' },
            { key: 'rapidapi_key', value: process.env.RAPIDAPI_KEY || '' },
            { key: 'rapidapi_host', value: process.env.RAPIDAPI_HOST || 'instagram-downloader-download-instagram-stories-videos4.p.rapidapi.com' },
            { key: 'api_endpoint', value: process.env.API_ENDPOINT || 'https://instagram-downloader-download-instagram-stories-videos4.p.rapidapi.com/convert' },
            { key: 'rate_limit_requests', value: '10' },
            { key: 'rate_limit_window', value: '3600000' }
        ];

        defaults.forEach(item => {
            if (!this.get(item.key)) {
                this.set(item.key, item.value);
            }
        });
    }
}

module.exports = Settings;
