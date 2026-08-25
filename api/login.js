'use strict';

// Verifies the admin password server-side. The password itself is never in
// any file the browser downloads — only in a Vercel environment variable.

const { requireAdmin, REPO, BRANCH } = require('./_lib');

module.exports = async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    res.status(200).json({ ok: true, repo: REPO, branch: BRANCH });
};
