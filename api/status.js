'use strict';

// Public, unauthenticated: tells admin.html whether remote editing is wired up
// so it can say what is missing instead of failing mysteriously at save time.
// Reveals only booleans — never the token, the password, or their values.

const { isConfigured, REPO, BRANCH } = require('./_lib');

module.exports = (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.status(200).json({
        remoteEditing: isConfigured(),
        hasToken: Boolean(process.env.GITHUB_TOKEN),
        hasPassword: Boolean(process.env.BSS_ADMIN_PASSWORD),
        repo: REPO,
        branch: BRANCH
    });
};
