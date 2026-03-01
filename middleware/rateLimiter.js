const rateLimit = require('express-rate-limit');
const Settings = require('../models/Settings');

// Dynamic limiter that checks settings
const limiter = rateLimit({
    windowMs: 3600000, // 1 hour
    max: 1000, // Increased significantly as requested
    message: {
        success: false,
        error: "System busy. Please try again in 5 minutes."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Wrapper to allow potential dynamic updates if needed
const dynamicRateLimiter = (req, res, next) => {
    // Basic protection with a high ceiling
    return limiter(req, res, next);
};

module.exports = dynamicRateLimiter;
