const { Settings } = require('../models/database');

// SECURITY: Middleware to prevent access to sensitive files
module.exports = (req, res, next) => {
    const deniedPaths = [
        '/.env',
        '.env',
        '/database/',
        '.db',
        '/server.js',
        '/package.json',
        '/package-lock.json',
        '/.git',
        '/node_modules/',
        '/routes/',
        '/models/',
        '/middleware/'
    ];

    // Block access to sensitive files and directories
    for (const denied of deniedPaths) {
        if (req.path.includes(denied)) {
            console.warn(`[SECURITY] Blocked access attempt to: ${req.path}`);
            return res.status(403).send('Access Denied');
        }
    }

    next();
};
