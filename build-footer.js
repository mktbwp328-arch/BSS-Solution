/**
 * Stamps the shared footer (footer.html) into every public page.
 *
 * The footer is written as real HTML into each file rather than injected by
 * JavaScript, so its links stay visible to crawlers that do not run JS —
 * including the AI answer engines allowed in robots.txt.
 *
 * Usage:  node build-footer.js
 */
const fs = require('fs');
const path = require('path');

const PAGES = ['index.html', 'about.html', 'services.html', 'contact.html', 'articles.html'];
const START = '<!-- BSS:FOOTER:START';
const END = '<!-- BSS:FOOTER:END -->';

const template = fs.readFileSync(path.join(__dirname, 'footer.html'), 'utf8').trim();

let changed = 0;
for (const page of PAGES) {
    const file = path.join(__dirname, page);
    let html = fs.readFileSync(file, 'utf8');
    const before = html;

    const startIdx = html.indexOf(START);
    if (startIdx > -1) {
        // Already stamped — replace between the markers
        const endIdx = html.indexOf(END, startIdx);
        if (endIdx === -1) {
            console.error(`${page}: found START marker without END — skipped`);
            continue;
        }
        html = html.slice(0, startIdx) + template + html.slice(endIdx + END.length);
    } else {
        // First run — swap out whatever <footer> the page currently has
        const fStart = html.indexOf('<footer');
        const fEnd = html.indexOf('</footer>');
        if (fStart === -1 || fEnd === -1) {
            console.error(`${page}: no <footer> to replace — skipped`);
            continue;
        }
        html = html.slice(0, fStart) + template.trimStart() + html.slice(fEnd + '</footer>'.length);
    }

    if (html !== before) {
        fs.writeFileSync(file, html, 'utf8');
        changed++;
        console.log(`${page}: footer updated`);
    } else {
        console.log(`${page}: already up to date`);
    }
}
console.log(`\n${changed} of ${PAGES.length} page(s) written`);
