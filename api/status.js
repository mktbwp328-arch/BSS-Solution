'use strict';

// Public, unauthenticated: tells admin.html whether remote editing is wired up
// so it can say what is missing instead of failing mysteriously at save time.
// Reveals only booleans — never the token, the password, or their values.

const { isConfigured, REPO, BRANCH } = require('./_lib');

module.exports = (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    // Whether a value arrived with stray whitespace is the single most common
    // setup mistake. Reporting it as a boolean gives no hint of the value.
    const padded = name => {
        const raw = process.env[name];
        return Boolean(raw) && raw !== raw.trim();
    };

    res.status(200).json({
        remoteEditing: isConfigured(),
        hasToken: Boolean(process.env.GITHUB_TOKEN),
        hasPassword: Boolean(process.env.BSS_ADMIN_PASSWORD),
        tokenHadWhitespace: padded('GITHUB_TOKEN'),
        passwordHadWhitespace: padded('BSS_ADMIN_PASSWORD'),
        repo: REPO,
        branch: BRANCH
    });
};
