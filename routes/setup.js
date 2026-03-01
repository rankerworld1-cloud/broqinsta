const express = require('express');
const router = express.Router();
const { Settings, Admin, initSchema } = require('../models/database');
const axios = require('axios');

// SECURITY: Middleware to block setup routes if already completed
router.use((req, res, next) => {
    const setupComplete = Settings.get('setup_complete') === '1';

    // Allow only status check when setup is complete
    if (setupComplete && req.path !== '/status') {
        return res.status(403).json({
            success: false,
            error: 'Setup already completed. Access denied for security reasons.'
        });
    }

    next();
});

// Status endpoint (always accessible)
router.get('/status', (req, res) => {
    const setupComplete = Settings.get('setup_complete') === '1';
    res.json({
        success: true,
        setupComplete: setupComplete
    });
});

router.post('/init-db', (req, res) => {
    try {
        initSchema();
        res.json({ success: true, message: 'Database initialized' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/create-admin', async (req, res) => {
    const { email, password } = req.body;

    // Additional security check
    const setupComplete = Settings.get('setup_complete') === '1';
    if (setupComplete) {
        return res.status(403).json({
            success: false,
            error: 'Cannot create admin. Setup already completed.'
        });
    }

    try {
        const found = Admin.findByEmail(email);
        if (found) {
            return res.json({ success: true, message: 'Admin already exists' });
        }
        await Admin.create(email, password);
        res.json({ success: true, message: 'Admin account created' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/save-api', async (req, res) => {
    const { key } = req.body;
    try {
        Settings.set('api_key', key);
        res.json({ success: true, message: 'API key saved' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/test-api', async (req, res) => {
    const { key } = req.body;
    const host = Settings.get('api_host');
    const endpoint = Settings.get('api_endpoint');

    try {
        const response = await axios.get(endpoint, {
            params: { url: 'https://www.instagram.com/p/C_test/' },
            headers: {
                'X-RapidAPI-Host': host,
                'X-RapidAPI-Key': key
            },
            timeout: 10000
        });
        res.json({ success: true, status: response.status });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

router.post('/complete', (req, res) => {
    try {
        Settings.set('setup_complete', '1');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
