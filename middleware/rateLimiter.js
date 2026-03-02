const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
    windowMs: 3600000,
    max: 1000,
    message: {
        success: false,
        error: "Too many requests. Please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        error: "Too many login attempts. Please try again in 15 minutes."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: {
        success: false,
        error: "Rate limit exceeded. Please slow down."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { globalLimiter, loginLimiter, apiLimiter };
