const express = require('express');
const router = express.Router();
const { Posts, Pages } = require('../models/database');

// Generate dynamic sitemap.xml
router.get('/sitemap.xml', (req, res) => {
    try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        
        // Get all posts and pages
        const posts = Posts.getAll();
        const pages = Pages.getAll();
        
        // Base URLs
        const staticUrls = [
            '/',
            '/blog',
            '/how-it-works',
            '/faq',
            '/contact',
            '/privacy',
            '/terms',
            '/about'
        ];

        // Generate sitemap XML
        let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
        sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        // Add static URLs
        staticUrls.forEach(url => {
            sitemap += `  <url>\n`;
            sitemap += `    <loc>${baseUrl}${url}</loc>\n`;
            sitemap += `    <changefreq>daily</changefreq>\n`;
            sitemap += `    <priority>${url === '/' ? '1.0' : '0.8'}</priority>\n`;
            sitemap += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
            sitemap += `  </url>\n`;
        });

        // Add blog posts
        posts.forEach(post => {
            if (post.status === 'published') {
                sitemap += `  <url>\n`;
                sitemap += `    <loc>${baseUrl}/blog/${post.slug}</loc>\n`;
                sitemap += `    <changefreq>monthly</changefreq>\n`;
                sitemap += `    <priority>0.9</priority>\n`;
                sitemap += `    <lastmod>${new Date(post.updated_at).toISOString()}</lastmod>\n`;
                sitemap += `  </url>\n`;
            }
        });

        // Add pages
        pages.forEach(page => {
            if (page.status === 'published') {
                sitemap += `  <url>\n`;
                sitemap += `    <loc>${baseUrl}/${page.slug}</loc>\n`;
                sitemap += `    <changefreq>monthly</changefreq>\n`;
                sitemap += `    <priority>0.8</priority>\n`;
                sitemap += `    <lastmod>${new Date(page.updated_at).toISOString()}</lastmod>\n`;
                sitemap += `  </url>\n`;
            }
        });

        sitemap += '</urlset>';

        res.header('Content-Type', 'application/xml');
        res.status(200).send(sitemap);

    } catch (err) {
        console.error('Sitemap generation error:', err);
        res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
    }
});

// Generate sitemap.txt for easier submission to search engines
router.get('/sitemap.txt', (req, res) => {
    try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        
        // Get all posts and pages
        const posts = Posts.getAll();
        const pages = Pages.getAll();
        
        // Base URLs
        const staticUrls = [
            '/',
            '/blog',
            '/how-it-works',
            '/faq',
            '/contact',
            '/privacy',
            '/terms',
            '/about'
        ];

        let sitemap = '';

        // Add static URLs
        staticUrls.forEach(url => {
            sitemap += `${baseUrl}${url}\n`;
        });

        // Add blog posts
        posts.forEach(post => {
            if (post.status === 'published') {
                sitemap += `${baseUrl}/blog/${post.slug}\n`;
            }
        });

        // Add pages
        pages.forEach(page => {
            if (page.status === 'published') {
                sitemap += `${baseUrl}/${page.slug}\n`;
            }
        });

        res.header('Content-Type', 'text/plain');
        res.status(200).send(sitemap);

    } catch (err) {
        console.error('Sitemap.txt generation error:', err);
        res.status(500).send(`${req.protocol}://${req.get('host')}/\n`);
    }
});

module.exports = router;