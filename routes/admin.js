const express = require('express');
const router = express.Router();
const { db, Settings, Posts, Pages } = require('../models/database');
const axios = require('axios');

// --- SETTINGS ---
router.get('/settings', (req, res) => {
    const settings = Settings.getAll();
    res.json({
        success: true,
        settings: {
            api_key: settings.api_key || '',
            api_host: settings.api_host || '',
            api_endpoint: settings.api_endpoint || '',
            site_name: settings.site_name || 'InstaGrab',
            contact_email: settings.contact_email || 'contact@infiniterankers.com',
            ads_header: settings.ads_header || ''
        }
    });
});

router.post('/settings', (req, res) => {
    const { api_key, api_host, api_endpoint, site_name, contact_email, ads_header } = req.body;
    if (api_key) Settings.set('api_key', api_key);
    if (api_host) Settings.set('api_host', api_host);
    if (api_endpoint) Settings.set('api_endpoint', api_endpoint);
    if (site_name) Settings.set('site_name', site_name);
    if (contact_email) Settings.set('contact_email', contact_email);
    if (ads_header !== undefined) Settings.set('ads_header', ads_header);
    res.json({ success: true, message: 'Infrastructure updated successfully' });
});

router.get('/settings/ads', (req, res) => {
    res.json({
        success: true,
        ads: {
            header: Settings.get('ads_header') || ''
        }
    });
});

router.post('/settings/api/test', async (req, res) => {
    const { key, host, endpoint } = req.body;
    const testKey = key || Settings.get('api_key');
    const testHost = host || Settings.get('api_host');
    const testEndpoint = endpoint || Settings.get('api_endpoint');

    const startTime = Date.now();
    try {
        const response = await axios.get(testEndpoint, {
            params: { url: 'https://www.instagram.com/p/C_test/' },
            headers: {
                'X-RapidAPI-Host': testHost,
                'X-RapidAPI-Key': testKey,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        const duration = Date.now() - startTime;
        res.json({
            success: true,
            status: response.status,
            time: duration,
            remaining: response.headers['x-ratelimit-requests-remaining'] || 'Unlimited'
        });
    } catch (err) {
        res.json({
            success: false,
            error: err.response ? `HTTP ${err.response.status}: ${err.response.data.message || 'Error'}` : err.message,
            time: Date.now() - startTime
        });
    }
});

// --- BLOG POSTS ---
router.get('/blog/posts', (req, res) => {
    try {
        const posts = Posts.getAll();
        res.json({ success: true, posts });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/blog/posts', (req, res) => {
    try {
        const result = Posts.create(req.body);
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.put('/blog/posts/:id', (req, res) => {
    try {
        Posts.update(req.params.id, req.body);
        res.json({ success: true, message: 'Post updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.delete('/blog/posts/:id', (req, res) => {
    try {
        Posts.delete(req.params.id);
        res.json({ success: true, message: 'Post deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- PAGES ---
router.get('/pages', (req, res) => {
    try {
        const pages = Pages.getAll();
        res.json({ success: true, pages });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/pages', (req, res) => {
    try {
        const result = Pages.create(req.body);
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.put('/pages/:id', (req, res) => {
    try {
        Pages.update(req.params.id, req.body);
        res.json({ success: true, message: 'Page updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.delete('/pages/:id', (req, res) => {
    try {
        Pages.delete(req.params.id);
        res.json({ success: true, message: 'Page deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- ANALYTICS ---
router.get('/stats', (req, res) => {
    try {
        const totalDownloads = db.prepare('SELECT COUNT(*) as count FROM download_logs').get().count;
        const activeUsers = db.prepare('SELECT COUNT(DISTINCT ip_address) as count FROM download_logs').get().count;
        const recentLogs = db.prepare('SELECT * FROM download_logs ORDER BY created_at DESC LIMIT 10').all().map(log => ({
            created_at: log.created_at,
            url: log.instagram_url,
            ip: log.ip_address,
            status: log.status
        }));

        res.json({
            success: true,
            totalDownloads,
            activeUsers,
            recentLogs
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/analytics/overview', (req, res) => {
    try {
        const total = db.prepare('SELECT COUNT(*) as count FROM download_logs').get().count;
        const success = db.prepare("SELECT COUNT(*) as count FROM download_logs WHERE status = 'success'").get().count;
        const recent = db.prepare('SELECT * FROM download_logs ORDER BY created_at DESC LIMIT 10').all();

        res.json({
            success: true,
            stats: {
                total,
                success,
                rate: total > 0 ? ((success / total) * 100).toFixed(1) : 0
            },
            recent
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- AD MANAGER (Ad Inserter) ---
router.get('/ads', (req, res) => {
    const ads = db.prepare('SELECT * FROM ad_blocks ORDER BY created_at DESC').all();
    res.json({ success: true, ads });
});

router.post('/ads', (req, res) => {
    const { id, name, code, position, status, paragraph_number } = req.body;
    if (id) {
        db.prepare('UPDATE ad_blocks SET name = ?, code = ?, position = ?, status = ?, paragraph_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(name, code, position, status, paragraph_number, id);
    } else {
        db.prepare('INSERT INTO ad_blocks (name, code, position, status, paragraph_number) VALUES (?, ?, ?, ?, ?)')
            .run(name, code, position, status, paragraph_number);
    }
    res.json({ success: true });
});

router.delete('/ads/:id', (req, res) => {
    db.prepare('DELETE FROM ad_blocks WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

module.exports = router;