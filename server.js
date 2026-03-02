const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const fs = require('fs');

const { initSchema, Settings, Posts, Pages } = require('./models/database');
const securityFilter = require('./middleware/securityFilter');

console.log('🚀 Starting BroqInsta Server...');
console.log('📦 Checking database...');
try {
    initSchema();
    console.log('✅ Database initialized');
    initializeDefaultAdmin();
} catch (err) {
    console.error('❌ Database initialization failed:', err.message);
}

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

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

function getSiteUrl(req) {
    return Settings.get('site_url') || `${req.protocol}://${req.get('host')}`;
}

function getLatestPosts() {
    try { return Posts.getPublished().slice(0, 5); } catch (e) { return []; }
}

app.use((req, res, next) => {
    if (req.path !== '/' && req.path.endsWith('/')) {
        const query = req.url.slice(req.path.length);
        res.redirect(301, req.path.slice(0, -1) + query);
    } else {
        next();
    }
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionStore = new SQLiteStore({ db: 'sessions.db', dir: './database' });

app.use(session({
    store: sessionStore,
    secret: Settings.get('session_secret') || 'broqinsta_production_secret',
    resave: false,
    saveUninitialized: false,
    name: 'broqinsta.sid',
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000
    }
}));

const setupRoutes = require('./routes/setup');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const sitemapRoutes = require('./routes/sitemap');
const adminAuth = require('./middleware/adminAuth');
const setupCheck = require('./middleware/setupCheck');

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

app.get('/api/pages', (req, res) => {
    try {
        const allPages = Pages.getAll();
        res.json({ success: true, pages: allPages });
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

app.get('/blog/:slug', (req, res) => {
    res.redirect(301, '/' + req.params.slug);
});

app.get('/page/:slug', (req, res) => {
    res.redirect(301, '/' + req.params.slug);
});

app.get('/blog', (req, res) => {
    try {
        const posts = Posts.getPublished();
        const siteUrl = getSiteUrl(req);
        const latestPosts = posts.slice(0, 5);
        res.render('blog', { posts, siteUrl, latestPosts });
    } catch (err) {
        res.sendFile(path.join(__dirname, 'public', 'blog.html'));
    }
});

app.use('/api/setup', setupRoutes);
app.get('/setup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'setup.html'));
});

app.use(setupCheck);

app.get('/admin/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

app.use('/admin', adminAuth, express.static(path.join(__dirname, 'public', 'admin')));

app.use(securityFilter);

app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: true
}));

app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);
app.use('/', sitemapRoutes);

const staticPages = ['how-it-works', 'faq', 'contact', 'privacy', 'terms', 'about'];
staticPages.forEach(pg => {
    app.get(`/${pg}`, (req, res) => {
        try {
            const siteUrl = getSiteUrl(req);
            const latestPosts = getLatestPosts();
            res.render(pg, { siteUrl, latestPosts });
        } catch (err) {
            res.sendFile(path.join(__dirname, 'public', `${pg}.html`));
        }
    });
});

app.get('/all-pages', (req, res) => {
    try {
        const siteUrl = getSiteUrl(req);
        const latestPosts = getLatestPosts();
        const posts = Posts.getPublished();
        const pages = Pages.getPublished();
        res.render('all-pages', { siteUrl, latestPosts, posts, pages });
    } catch (err) {
        res.status(500).send('Error loading page');
    }
});

app.use('/api/admin', adminAuth, adminRoutes);

app.get('/admin', adminAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

app.get('/:slug', (req, res, next) => {
    const { slug } = req.params;

    if (slug.includes('.') || staticPages.includes(slug) || slug === 'admin' || slug === 'setup' || slug === 'blog') {
        return next();
    }

    try {
        const post = Posts.getBySlug(slug);
        if (post) {
            if (post.status !== 'published') return next();
            const related = Posts.getRelated(post.id, post.category || 'General', 3);
            const siteUrl = getSiteUrl(req);
            const latestPosts = getLatestPosts();
            return res.render('blog-post', { post, related, siteUrl, latestPosts });
        }

        const page = Pages.getBySlug(slug);
        if (page) {
            if (page.status !== 'published') return next();
            const siteUrl = getSiteUrl(req);
            const latestPosts = getLatestPosts();
            return res.render('page', { page, siteUrl, latestPosts });
        }

        next();
    } catch (err) {
        next();
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Server running on port ${PORT}`);
    const completed = Settings.get('setup_complete') === '1';
    if (!completed) {
        console.log('📝 First time? Visit: https://your-domain.com/setup');
    }
});
