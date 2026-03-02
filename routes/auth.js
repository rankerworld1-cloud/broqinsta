const express = require('express');
const router = express.Router();
const { Admin, Settings } = require('../models/database');
const { loginLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;

    // SECURITY: Removed insecure master password fallback
    if (!email || !password) {
        return res.json({ success: false, error: 'Email and password required' });
    }

    console.log(`[AUTH] Login attempt: ${email}`);
    try {
        const admin = Admin.findByEmail(email);
        if (!admin) {
            return res.json({ success: false, error: 'Invalid credentials' });
        }

        const isMatch = await Admin.verifyPassword(password, admin.password);
        if (!isMatch) {
            return res.json({ success: false, error: 'Invalid credentials' });
        }

        Admin.updateLastLogin(admin.id);
        req.session.adminId = admin.id;
        req.session.email = admin.email;

        res.json({ success: true, redirect: '/admin' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'System error' });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

router.get('/check', (req, res) => {
    if (req.session && req.session.adminId) {
        res.json({ authenticated: true, email: req.session.email });
    } else {
        res.json({ authenticated: false });
    }
});

module.exports = router;
