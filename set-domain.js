/**
 * Point every absolute URL in the site at a given origin.
 *
 * canonical, og:url, JSON-LD @id/url, sitemap.xml and robots.txt all have to
 * agree on one origin — if they disagree, Google cannot tell which URL is the
 * real page. Run this whenever the live domain changes.
 *
 *   node set-domain.js https://bsssolution1978.vercel.app
 *   node set-domain.js https://www.bsssolution1978.com
 */
const fs = require('fs');

const FILES = [
    'index.html', 'about.html', 'services.html', 'contact.html', 'articles.html',
    'sitemap.xml', 'robots.txt', 'README.md'
];

// Any origin we may have used before, so the swap is idempotent either way.
const KNOWN = [
    'https://www.bsssolution1978.com',
    'https://bsssolution1978.com',
    'https://bsssolution1978.vercel.app'
];

const target = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https:\/\/[a-z0-9.-]+$/i.test(target)) {
    console.error('Usage: node set-domain.js https://your-domain.com');
    process.exit(1);
}

let total = 0;
for (const file of FILES) {
    if (!fs.existsSync(file)) continue;
    const before = fs.readFileSync(file, 'utf8');
    let after = before;
    for (const origin of KNOWN) {
        if (origin === target) continue;
        after = after.split(origin).join(target);
    }
    if (after !== before) {
        const n = before.split(/https:\/\/(?:www\.)?bsssolution1978\.(?:com|vercel\.app)/).length - 1;
        fs.writeFileSync(file, after, 'utf8');
        total += n;
        console.log(`${file.padEnd(16)} ${n} replaced`);
    } else {
        console.log(`${file.padEnd(16)} already correct`);
    }
}
console.log(`\n${total} URL(s) now point at ${target}`);
