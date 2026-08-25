'use strict';

// Commits an edited page back to GitHub. The push makes Vercel redeploy, which
// is what actually updates the live site — expect roughly a minute.

const { requireAdmin, commitFile, EDITABLE_PAGES } = require('./_lib');

module.exports = async (req, res) => {
    if (!(await requireAdmin(req, res))) return;

    const { filename, content } = req.body || {};

    if (typeof filename !== 'string' || typeof content !== 'string') {
        return res.status(400).json({ error: 'ต้องส่ง filename และ content' });
    }
    // Reject any path component so a caller cannot escape the repo root.
    const safe = filename.replace(/^\/+/, '');
    if (safe !== filename || safe.includes('/') || safe.includes('\\') || safe.includes('..')) {
        return res.status(400).json({ error: 'ชื่อไฟล์ไม่ถูกต้อง' });
    }
    if (!EDITABLE_PAGES.includes(safe)) {
        return res.status(403).json({ error: `แก้ไขไฟล์ ${safe} ไม่ได้` });
    }
    // A truncated or empty document would wipe a real page. Every page here is
    // tens of kilobytes, so anything this small is a bug, not an edit.
    if (content.length < 1000) {
        return res.status(400).json({ error: 'เนื้อหาสั้นผิดปกติ — ยกเลิกเพื่อกันหน้าเว็บหาย' });
    }
    if (!/^\s*<!DOCTYPE html>/i.test(content)) {
        return res.status(400).json({ error: 'เนื้อหาไม่ใช่เอกสาร HTML ที่สมบูรณ์' });
    }

    try {
        const commit = await commitFile(
            safe,
            Buffer.from(content, 'utf8').toString('base64'),
            `Edit ${safe} from the admin editor`
        );
        res.status(200).json({
            ok: true,
            commit: commit && commit.sha ? commit.sha.slice(0, 7) : null,
            note: 'Vercel กำลัง deploy — หน้าเว็บจริงจะอัปเดตในราว 1 นาที'
        });
    } catch (err) {
        console.error('publish failed:', err.message);
        res.status(502).json({ error: err.message });
    }
};
