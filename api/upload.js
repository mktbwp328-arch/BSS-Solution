'use strict';

// Commits a new photo into images/works/. The browser downscales and
// re-encodes before sending, so the payload stays well inside Vercel's
// request-body limit and the site does not gain multi-megabyte images.

const { requireAdmin, commitFile, IMAGE_TYPES } = require('./_lib');

const MAX_BYTES = 3 * 1024 * 1024;

function slug(name) {
    return name
        .replace(/\.[^.]+$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'photo';
}

module.exports = async (req, res) => {
    if (!(await requireAdmin(req, res))) return;

    const { name, type, data } = req.body || {};

    if (typeof data !== 'string' || !data) {
        return res.status(400).json({ error: 'ไม่พบข้อมูลรูปภาพ' });
    }
    const ext = IMAGE_TYPES[type];
    if (!ext) {
        return res.status(415).json({ error: 'รองรับเฉพาะไฟล์ JPG, PNG, WebP และ GIF' });
    }

    const buf = Buffer.from(data, 'base64');
    if (!buf.length) return res.status(400).json({ error: 'ไฟล์รูปเสียหาย' });
    if (buf.length > MAX_BYTES) {
        return res.status(413).json({ error: 'ไฟล์ใหญ่เกิน 3 MB' });
    }

    // Timestamp keeps re-uploads of the same filename from clobbering the
    // previous photo, which other pages may still reference.
    const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const path = `images/works/${slug(String(name || 'photo'))}-${stamp}.${ext}`;

    try {
        await commitFile(path, buf.toString('base64'), `Upload ${path} from the admin editor`);
        res.status(200).json({ ok: true, url: '/' + path });
    } catch (err) {
        console.error('upload failed:', err.message);
        res.status(502).json({ error: err.message });
    }
};
