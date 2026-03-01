module.exports = (req, res, next) => {
    if (req.session && req.session.adminId) {
        return next();
    }

    if (req.xhr || req.path.startsWith('/api/')) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    res.redirect('/admin/login.html');
};
