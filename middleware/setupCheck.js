const { Settings } = require('../models/database');
const path = require('path');

// SECURITY: Setup check middleware is now simplified
// Admin is auto-created from environment variables, no public setup needed
module.exports = (req, res, next) => {
    // Just pass through - no setup check needed anymore
    next();
};
