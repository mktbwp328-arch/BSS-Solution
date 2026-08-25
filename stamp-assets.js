/**
 * Stamps ?v=<hash> onto every local CSS and JS reference in the site pages.
 *
 * Browsers cached style.css and editor.js for a week under the old headers, so
 * a visitor — or the admin — could keep running stale code long after a fix
 * shipped. Hashing the file contents means the URL changes exactly when the
 * file does: caches are bypassed on a real change and reused otherwise, with
 * no version number to remember to bump.
 *
 *   node stamp-assets.js
 *
 * Run it after editing style.css or any of the site scripts, before pushing.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PAGES = ['index.html', 'about.html', 'services.html', 'contact.html', 'articles.html', 'admin.html'];

function hash(file) {
    return crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
}

// href="style.css" / src="i18n.js", with or without an existing ?v=
const REF = /\b(href|src)="(?!https?:|\/\/|data:)([^"?#]+\.(?:css|js))(?:\?v=[0-9a-f]+)?"/g;

let changed = 0;
const stamped = new Set();
const missing = new Set();

for (const page of PAGES) {
    if (!fs.existsSync(page)) continue;
    const before = fs.readFileSync(page, 'utf8');

    const after = before.replace(REF, (whole, attr, file) => {
        const onDisk = path.join(__dirname, file);
        if (!fs.existsSync(onDisk)) { missing.add(file); return whole; }
        stamped.add(file);
        return `${attr}="${file}?v=${hash(onDisk)}"`;
    });

    if (after !== before) {
        fs.writeFileSync(page, after, 'utf8');
        changed++;
        console.log(`updated ${page}`);
    }
}

console.log(`\n${changed} page(s) rewritten`);
for (const f of [...stamped].sort()) console.log(`  ${f} -> ?v=${hash(path.join(__dirname, f))}`);
if (missing.size) console.log('\nreferenced but not on disk:\n  ' + [...missing].join('\n  '));
