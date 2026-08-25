'use strict';

// Shared helpers for the Vercel serverless admin API.
//
// Vercel's filesystem is read-only, so the editor cannot write HTML the way
// server.js does locally. Instead it commits the file back to GitHub through
// the Contents API; the push triggers a Vercel redeploy and the live page
// updates a minute or so later.
//
// Files prefixed with _ are not routed as endpoints.

const crypto = require('crypto');

// Trim every value: pasting into the Vercel dashboard very easily carries a
// trailing newline or space, which silently turns into a password nobody can
// type and a token GitHub rejects.
const env = (name, fallback) => (process.env[name] || fallback || '').trim();

const REPO = env('GITHUB_REPO', 'mktbwp328-arch/BSS-Solution');
const BRANCH = env('GITHUB_BRANCH', 'main');
const TOKEN = env('GITHUB_TOKEN');
const PASSWORD = env('BSS_ADMIN_PASSWORD');

// Only these may be rewritten. Without an allowlist the endpoint would let a
// caller commit anything at all into the repository.
const EDITABLE_PAGES = ['index.html', 'about.html', 'services.html', 'contact.html', 'articles.html'];

const IMAGE_TYPES = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif'
};

function isConfigured() {
    return Boolean(TOKEN && PASSWORD);
}

// Compare in constant time so response timing cannot reveal the password.
function passwordMatches(given) {
    if (!PASSWORD || typeof given !== 'string') return false;
    const a = Buffer.from(given, 'utf8');
    const b = Buffer.from(PASSWORD, 'utf8');
    if (a.length !== b.length) {
        // Still burn a comparison so length differences are not timeable.
        crypto.timingSafeEqual(b, b);
        return false;
    }
    return crypto.timingSafeEqual(a, b);
}

// Serverless instances are short-lived, so this only slows an attacker who
// happens to keep hitting the same warm instance. The real protection is a
// long password — see README.
const attempts = new Map();

function throttled(ip) {
    const rec = attempts.get(ip);
    if (!rec) return false;
    if (Date.now() - rec.first > 15 * 60 * 1000) { attempts.delete(ip); return false; }
    return rec.count >= 10;
}

function noteFailure(ip) {
    const rec = attempts.get(ip);
    if (!rec || Date.now() - rec.first > 15 * 60 * 1000) {
        attempts.set(ip, { count: 1, first: Date.now() });
    } else {
        rec.count += 1;
    }
}

function clientIp(req) {
    return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
}

/**
 * Gate an endpoint. Returns true when the caller may proceed; otherwise it has
 * already written the response.
 */
async function requireAdmin(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'ต้องเรียกด้วยวิธี POST' });
        return false;
    }
    if (!isConfigured()) {
        res.status(503).json({
            error: 'ยังไม่ได้ตั้งค่า GITHUB_TOKEN และ BSS_ADMIN_PASSWORD ใน Vercel',
            code: 'NOT_CONFIGURED'
        });
        return false;
    }

    const ip = clientIp(req);
    if (throttled(ip)) {
        res.status(429).json({ error: 'พยายามเข้าสู่ระบบผิดหลายครั้งเกินไป กรุณารอ 15 นาที' });
        return false;
    }

    const given = req.headers['x-admin-password'];
    if (!passwordMatches(given)) {
        noteFailure(ip);
        await new Promise(r => setTimeout(r, 400));
        res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
        return false;
    }

    attempts.delete(ip);
    return true;
}

function gh(path) {
    return `https://api.github.com/repos/${REPO}/contents/${path}`;
}

const GH_HEADERS = {
    'Authorization': `Bearer ${TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'bss-admin'
};

async function getSha(path) {
    const r = await fetch(`${gh(path)}?ref=${encodeURIComponent(BRANCH)}`, { headers: GH_HEADERS });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`อ่านไฟล์จาก GitHub ไม่สำเร็จ (${r.status}) ${await r.text()}`);
    const j = await r.json();
    return j.sha;
}

/**
 * Commit a file. Retries once on 409, which happens when the file changed
 * between reading its sha and writing.
 */
async function commitFile(path, base64, message) {
    for (let attempt = 0; attempt < 2; attempt++) {
        const sha = await getSha(path);
        const body = { message, content: base64, branch: BRANCH };
        if (sha) body.sha = sha;

        const r = await fetch(gh(path), {
            method: 'PUT',
            headers: { ...GH_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (r.ok) return (await r.json()).commit;
        if (r.status === 409 && attempt === 0) continue;
        throw new Error(`บันทึกลง GitHub ไม่สำเร็จ (${r.status}) ${await r.text()}`);
    }
}

module.exports = {
    EDITABLE_PAGES, IMAGE_TYPES, REPO, BRANCH,
    isConfigured, passwordMatches, requireAdmin, commitFile
};
