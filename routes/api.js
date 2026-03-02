const express = require('express');
const axios = require('axios');
const router = express.Router();
const { Settings, Logs } = require('../models/database');

axios.defaults.timeout = 15000;

function validateInstagramUrl(url) {
    const instagramRegex = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv|stories)\/([A-Za-z0-9_-]+)/;
    return url ? url.match(instagramRegex) : null;
}

function extractVideoUrl(data) {
    return data.video_url ||
        data.download_url ||
        data.url ||
        data.media_url ||
        (data.data && (data.data.video_url || data.data.download_url)) ||
        (data.result && (data.result.url || data.result.video_url || data.result.download_url)) ||
        (data.video && data.video.url) ||
        (Array.isArray(data.result) && data.result[0] && (data.result[0].url || data.result[0].download_url)) ||
        (Array.isArray(data.links) && data.links[0] && (data.links[0].video || data.links[0].url));
}

function scrapeUrlFromResponse(rawResponse) {
    const raw = typeof rawResponse === 'string' ? rawResponse : JSON.stringify(rawResponse);
    const patterns = [
        /https:\/\/[^"]+?\.cdninstagram\.com\/[^"]+?\.mp4[^"]*/,
        /https:\/\/[^"]+?\.fbcdn\.net\/[^"]+?\.mp4[^"]*/,
        /https:\/\/[^"]+?\/video[^"]+?\.mp4[^"]*/
    ];

    for (const pattern of patterns) {
        const match = raw.match(pattern);
        if (match) {
            return match[0].replace(/\\/g, '');
        }
    }
    return null;
}

router.post('/download', async (req, res) => {
    const { url } = req.body;
    const ip = req.ip;
    const startTime = Date.now();

    try {
        const match = validateInstagramUrl(url);
        if (!url || !match) {
            return res.status(400).json({
                success: false,
                error: 'Please enter a valid Instagram URL (post, reel, or story)'
            });
        }

        const apiKey = Settings.get('api_key') || process.env.RAPIDAPI_KEY;
        const apiHost = Settings.get('api_host') || process.env.RAPIDAPI_HOST;
        const apiEndpoint = Settings.get('api_endpoint') || process.env.API_ENDPOINT;

        if (!apiKey || !apiHost || !apiEndpoint) {
            throw new Error('API configuration missing. Please check admin settings.');
        }

        console.log(`[API] Processing: ${url}`);

        const response = await axios({
            method: 'GET',
            url: apiEndpoint,
            params: { url: url },
            headers: {
                'X-RapidAPI-Key': apiKey,
                'X-RapidAPI-Host': apiHost,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 30000
        });

        const data = response.data;
        console.log(`[API] Data received: ${JSON.stringify(data).substring(0, 500)}...`);

        let videoUrl = extractVideoUrl(data);

        if (!videoUrl) {
            videoUrl = scrapeUrlFromResponse(data);
            if (videoUrl) {
                console.log('[API] URL scraped from raw response');
            }
        }

        if (!videoUrl) {
            console.error('Extraction failed. Full Response:', JSON.stringify(data));
            throw new Error('Could not extract video URL. This content might be private or unsupported.');
        }

        const thumbnail = data.thumbnail ||
            data.thumbnail_url ||
            data.image ||
            data.cover_url ||
            data.thumb ||
            (data.result && data.result.thumbnail) ||
            '';

        Logs.addDownload({
            url,
            ip,
            status: 'success',
            time: Date.now() - startTime
        });

        console.log('Video URL extracted successfully');

        res.json({
            success: true,
            videoUrl: videoUrl,
            thumbnail: thumbnail,
            title: data.title || 'Instagram Media'
        });

    } catch (err) {
        let errorMsg = 'Unable to download video. Please try again or report this issue.';

        if (err.response) {
            console.error(`[API] Provider Error: ${err.response.status}`, err.response.data);
            if (err.response.status === 401 || err.response.status === 403) {
                errorMsg = 'API configuration issue. Please check API credentials in admin settings.';
            } else if (err.response.status === 429) {
                errorMsg = 'API rate limit exceeded. Please try again in a few minutes.';
            } else if (err.response.status === 404) {
                errorMsg = 'Content not found. Please verify the Instagram link is public and valid.';
            } else {
                errorMsg = `API Error: ${err.response.status} - ${err.response.data?.message || 'Unknown error'}`;
            }
        } else if (err.code === 'ECONNABORTED') {
            errorMsg = 'Request timeout. The Instagram content might be too large or the API is slow.';
        } else {
            console.error(`[API] Error: ${err.message}`);
            if (err.message.includes('timeout')) {
                errorMsg = 'The request timed out. Please try again.';
            }
        }

        Logs.addDownload({
            url,
            ip,
            status: 'failed',
            error: errorMsg,
            time: Date.now() - startTime
        });

        res.status(500).json({ success: false, error: errorMsg });
    }
});

router.post('/contact', async (req, res) => {
    const { firstName, lastName, email, message } = req.body;
    res.json({ success: true, message: 'Message received! We will get back to you soon.' });
});

router.get('/download-video', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).send('URL required');

    try {
        console.log(`[Proxy] Extracting stream: ${videoUrl.substring(0, 50)}...`);

        const response = await axios({
            method: 'GET',
            url: videoUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 20000
        });

        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="broqinsta_${Date.now()}.mp4"`);

        if (response.headers['content-length']) {
            res.setHeader('Content-Length', response.headers['content-length']);
        }

        response.data.pipe(res);

        response.data.on('error', (err) => {
            console.error('[Proxy] Stream Error:', err.message);
            if (!res.headersSent) res.status(500).send('Stream relay failed');
        });

    } catch (error) {
        console.error('[Proxy] Failed to fetch stream:', error.message);
        if (!res.headersSent) res.redirect(videoUrl);
    }
});

router.get('/ads', (req, res) => {
    try {
        const header = Settings.get('ads_header') || '';
        const footer = Settings.get('ads_footer') || '';
        res.json({ success: true, ads: [], header, footer });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch ads' });
    }
});

module.exports = router;
