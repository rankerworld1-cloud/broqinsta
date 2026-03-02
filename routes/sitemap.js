const express = require('express');
const router = express.Router();
const { Posts, Pages, Settings } = require('../models/database');

router.get('/sitemap.xml', (req, res) => {
    try {
        const siteUrl = Settings.get('site_url') || `${req.protocol}://${req.get('host')}`;
        const posts = Posts.getPublished();
        const pages = Pages.getPublished();

        const staticUrls = [
            { loc: '/', priority: '1.0', changefreq: 'daily' },
            { loc: '/blog', priority: '0.9', changefreq: 'daily' },
            { loc: '/how-it-works', priority: '0.8', changefreq: 'weekly' },
            { loc: '/faq', priority: '0.8', changefreq: 'weekly' },
            { loc: '/contact', priority: '0.7', changefreq: 'monthly' },
            { loc: '/privacy', priority: '0.5', changefreq: 'monthly' },
            { loc: '/terms', priority: '0.5', changefreq: 'monthly' },
            { loc: '/about', priority: '0.8', changefreq: 'monthly' },
            { loc: '/services', priority: '0.8', changefreq: 'weekly' },
            { loc: '/case-studies', priority: '0.7', changefreq: 'monthly' },
            { loc: '/all-pages', priority: '0.6', changefreq: 'weekly' }
        ];

        let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
        sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        staticUrls.forEach(u => {
            sitemap += `  <url>\n`;
            sitemap += `    <loc>${siteUrl}${u.loc}</loc>\n`;
            sitemap += `    <changefreq>${u.changefreq}</changefreq>\n`;
            sitemap += `    <priority>${u.priority}</priority>\n`;
            sitemap += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
            sitemap += `  </url>\n`;
        });

        posts.forEach(post => {
            sitemap += `  <url>\n`;
            sitemap += `    <loc>${siteUrl}/${post.slug}</loc>\n`;
            sitemap += `    <changefreq>weekly</changefreq>\n`;
            sitemap += `    <priority>0.9</priority>\n`;
            sitemap += `    <lastmod>${new Date(post.updated_at).toISOString()}</lastmod>\n`;
            sitemap += `  </url>\n`;
        });

        pages.forEach(page => {
            sitemap += `  <url>\n`;
            sitemap += `    <loc>${siteUrl}/${page.slug}</loc>\n`;
            sitemap += `    <changefreq>monthly</changefreq>\n`;
            sitemap += `    <priority>0.8</priority>\n`;
            sitemap += `    <lastmod>${new Date(page.updated_at).toISOString()}</lastmod>\n`;
            sitemap += `  </url>\n`;
        });

        sitemap += '</urlset>';

        res.header('Content-Type', 'application/xml');
        res.header('Cache-Control', 'public, max-age=3600');
        res.status(200).send(sitemap);

    } catch (err) {
        console.error('Sitemap generation error:', err);
        res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
    }
});

router.get('/sitemap.txt', (req, res) => {
    try {
        const siteUrl = Settings.get('site_url') || `${req.protocol}://${req.get('host')}`;
        const posts = Posts.getPublished();
        const pages = Pages.getPublished();

        const staticUrls = ['/', '/blog', '/how-it-works', '/faq', '/contact', '/privacy', '/terms', '/about', '/services', '/case-studies', '/all-pages'];

        let sitemap = '';
        staticUrls.forEach(url => { sitemap += `${siteUrl}${url}\n`; });
        posts.forEach(post => { sitemap += `${siteUrl}/${post.slug}\n`; });
        pages.forEach(page => { sitemap += `${siteUrl}/${page.slug}\n`; });

        res.header('Content-Type', 'text/plain');
        res.status(200).send(sitemap);
    } catch (err) {
        console.error('Sitemap.txt generation error:', err);
        res.status(500).send(`${req.protocol}://${req.get('host')}/\n`);
    }
});

router.get('/robots.txt', (req, res) => {
    const siteUrl = Settings.get('site_url') || `${req.protocol}://${req.get('host')}`;
    const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;
    res.header('Content-Type', 'text/plain');
    res.status(200).send(robots);
});

router.get('/rss.xml', (req, res) => {
    try {
        const siteUrl = Settings.get('site_url') || `${req.protocol}://${req.get('host')}`;
        const siteName = Settings.get('site_name') || 'BroqInsta';
        const posts = Posts.getPublished().slice(0, 20);

        let rss = '<?xml version="1.0" encoding="UTF-8"?>\n';
        rss += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n';
        rss += '<channel>\n';
        rss += `  <title>${siteName} Blog</title>\n`;
        rss += `  <link>${siteUrl}</link>\n`;
        rss += `  <description>Latest posts from ${siteName}</description>\n`;
        rss += `  <language>en-us</language>\n`;
        rss += `  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n`;
        rss += `  <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>\n`;

        posts.forEach(post => {
            rss += `  <item>\n`;
            rss += `    <title><![CDATA[${post.title}]]></title>\n`;
            rss += `    <link>${siteUrl}/${post.slug}</link>\n`;
            rss += `    <guid>${siteUrl}/${post.slug}</guid>\n`;
            rss += `    <description><![CDATA[${post.excerpt || post.meta_description || ''}]]></description>\n`;
            rss += `    <pubDate>${new Date(post.created_at).toUTCString()}</pubDate>\n`;
            if (post.category) rss += `    <category>${post.category}</category>\n`;
            rss += `  </item>\n`;
        });

        rss += '</channel>\n';
        rss += '</rss>';

        res.header('Content-Type', 'application/rss+xml');
        res.header('Cache-Control', 'public, max-age=3600');
        res.status(200).send(rss);
    } catch (err) {
        console.error('RSS generation error:', err);
        res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel></channel></rss>');
    }
});

router.get('/feed', (req, res) => {
    res.redirect(301, '/rss.xml');
});

module.exports = router;
