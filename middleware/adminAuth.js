const path = require('path');

module.exports = (req, res, next) => {
    if (req.path === '/login.html' || req.path === '/login') {
        return next();
    }

    if (req.session && req.session.adminId) {
        return next();
    }

    if (req.xhr || req.path.startsWith('/api/') || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    res.status(200).sendFile(path.join(__dirname, '..', 'public', 'admin', 'login.html'));
};
