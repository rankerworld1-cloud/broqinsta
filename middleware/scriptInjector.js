const fs = require('fs');
const path = require('path');
const db = require('../database/db');

const scriptInjector = (req, res, next) => {
    // Only inject for HTML pages
    const isHtml = req.accepts('html');
    if (!isHtml) return next();

    const originalSend = res.send;

    res.send = function (body) {
        if (typeof body === 'string' && body.includes('</body>')) {
            try {
                const scripts = db.prepare('SELECT * FROM injected_scripts WHERE is_active = 1').all();

                let headScripts = '';
                let bodyStartScripts = '';
                let bodyEndScripts = '';

                scripts.forEach(s => {
                    if (s.position === 'head') headScripts += s.script_code + '\n';
                    else if (s.position === 'body_start') bodyStartScripts += s.script_code + '\n';
                    else if (s.position === 'body_end') bodyEndScripts += s.script_code + '\n';
                });

                // Inject Head
                if (headScripts) body = body.replace('</head>', headScripts + '</head>');
                // Inject Body Start
                if (bodyStartScripts) body = body.replace('<body', '<body' + bodyStartScripts);
                // Inject Body End
                if (bodyEndScripts) body = body.replace('</body>', bodyEndScripts + '</body>');

            } catch (err) {
                console.error('[ERROR] Script injection failed:', err);
            }
        }
        return originalSend.call(this, body);
    };

    next();
};

module.exports = scriptInjector;
