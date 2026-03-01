const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const fs = require('fs');

// Internal Imports
const { initSchema, Settings, Posts, Pages } = require('./models/database');
const securityFilter = require('./middleware/securityFilter');

// --- AUTO INITIALIZE ---
console.log('🚀 Starting BroqInsta Server...');
console.log('📦 Checking database...');
try {
    initSchema();
    console.log('✅ Database initialized');

    // SECURITY: Auto-create admin from environment variables
    initializeDefaultAdmin();
} catch (err) {
    console.error('❌ Database initialization failed:', err.message);
}

// SECURITY: Auto-create admin if none exists
async function initializeDefaultAdmin() {
    try {
        const { Admin } = require('./models/database');
        const existingAdmin = Admin.findByEmail(process.env.ADMIN_EMAIL || 'admin@broqinsta.com');

        if (!existingAdmin) {
            const email = process.env.ADMIN_EMAIL || 'admin@broqinsta.com';
            const password = process.env.ADMIN_PASSWORD || 'ChangeMe@123456';

            await Admin.create(email, password, 'Administrator');

            console.log('');
            console.log('⚠️  ═══════════════════════════════════════════');
            console.log('⚠️  DEFAULT ADMIN ACCOUNT CREATED');
            console.log('⚠️  ═══════════════════════════════════════════');
            console.log('📧 Email:', email);
            console.log('🔑 Password: [SET FROM ENVIRONMENT]');
            console.log('⚠️  ═══════════════════════════════════════════');
            console.log('⚠️  CHANGE PASSWORD IMMEDIATELY AFTER LOGIN!');
            console.log('⚠️  Login at: https://yourdomain.com/admin/login.html');
            console.log('⚠️  ═══════════════════════════════════════════');
            console.log('');
        } else {
            console.log('✅ Admin account exists');
        }
    } catch (err) {
        console.error('❌ Admin initialization failed:', err.message);
    }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Proper proxy trust for Hostinger/Shared Hosting
app.set('trust proxy', 1);

// --- MIDDLEWARE ---
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Store (Fixed Login Loop for Hostinger)
const sessionStore = new SQLiteStore({
    db: 'sessions.db',
    dir: './database'
});

app.use(session({
    store: sessionStore,
    secret: Settings.get('session_secret') || 'broqinsta_production_secret',
    resave: false,
    saveUninitialized: false,
    name: 'broqinsta.sid', // Custom cookie name
    cookie: {
        secure: false, // Set to true only if using HTTPS + trust proxy
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
}));

// --- ROUTES ---
const setupRoutes = require('./routes/setup');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const sitemapRoutes = require('./routes/sitemap');
const adminAuth = require('./middleware/adminAuth');
const setupCheck = require('./middleware/setupCheck');

// --- PUBLIC BLOG API ---
app.get('/api/blog/posts', (req, res) => {
    try {
        const posts = Posts.getAll();
        res.json({ success: true, posts });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/blog/posts/:slug', (req, res) => {
    try {
        const post = Posts.getBySlug(req.params.slug);
        if (post) {
            const related = Posts.getRelated(post.id, post.category || 'General', 3);
            res.json({ success: true, post, related });
        }
        else res.status(404).json({ success: false, error: 'Post not found' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- PUBLIC PAGES API ---
app.get('/api/pages', (req, res) => {
    try {
        const pages = Pages.getAll();
        res.json({ success: true, pages });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/pages/:slug', (req, res) => {
    try {
        const page = Pages.getBySlug(req.params.slug);
        if (page) res.json({ success: true, page });
        else res.status(404).json({ success: false, error: 'Page not found' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- PUBLIC BLOG ROUTES (SEO) ---
app.get('/blog/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'blog-post.html'));
});

// --- PUBLIC PAGES ROUTES (SEO) ---
app.get('/page/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'page.html'));
});

// 1. Setup Wizard (Public)
app.use('/api/setup', setupRoutes);
app.get('/setup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'setup.html'));
});

// 2. Setup Check Middleware
app.use(setupCheck);

// 3. Admin Login (Public - No Auth Required)
app.get('/admin/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

// 3b. Admin Files Protection
app.use('/admin', adminAuth, express.static(path.join(__dirname, 'public', 'admin')));

// 4. SECURITY FILTER - Block access to sensitive files
app.use(securityFilter);

// 5. General Static Files with Caching (ONLY public folder)
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: true
}));

// 5. API & AUTH
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);
app.use('/', sitemapRoutes); // Sitemap routes

// 6. Public Pages (Clean URLs)
const pages = ['how-it-works', 'blog', 'faq', 'contact', 'privacy', 'terms', 'about'];
pages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', `${page}.html`));
    });
});

// 7. Admin Panel API (Protected)
app.use('/api/admin', adminAuth, adminRoutes);

// Admin Redirect
app.get('/admin', adminAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

// WordPress-Style Dynamic Routing (Catch-all)
app.get('/:slug', (req, res, next) => {
    const { slug } = req.params;

    // Skip if it looks like a file (has dot) or is a reserved route
    if (slug.includes('.') || pages.includes(slug) || slug === 'admin' || slug === 'setup') {
        return next();
    }

    try {
        // First check if it's a blog post
        const post = Posts.getBySlug(slug);
        if (post) {
            return res.sendFile(path.join(__dirname, 'public', 'blog-post.html'));
        }

        // Then check if it's a page
        const page = Pages.getBySlug(slug);
        if (page) {
            return res.sendFile(path.join(__dirname, 'public', 'page.html'));
        }

        next(); // Not found in DB, move to default
    } catch (err) {
        next();
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- START ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Server running on port ${PORT}`);
    const completed = Settings.get('setup_complete') === '1';
    if (!completed) {
        console.log('📝 First time? Visit: https://your-domain.com/setup');
    }
});