/**
 * Renders the doodle explainer.
 *
 *   node video/cartoon/render.js                 build audio + timeline, render MP4
 *   node video/cartoon/render.js --preview 90,700  stills only -> video/cartoon/preview/
 *   node video/cartoon/render.js --no-audio-build  reuse the existing audio.wav/timeline.js
 *
 * Same approach as video/render.js: cartoon.html is deterministic, so each
 * frame is seeked, screenshotted and piped straight into ffmpeg.
 */
const path = require('path');
const fs = require('fs');
const { spawn, execFileSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const ffmpeg = require('ffmpeg-static');

const ROOT = __dirname;
const PAGE = 'file:///' + path.join(ROOT, 'cartoon.html').replace(/\\/g, '/');
const OUT = path.join(ROOT, 'bss-cartoon.mp4');
const BROWSERS = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
];

async function open() {
    const browser = await puppeteer.launch({
        executablePath: BROWSERS.find(p => fs.existsSync(p)),
        headless: 'new',
        args: ['--allow-file-access-from-files', '--hide-scrollbars', '--force-color-profile=srgb']
    });
    const page = await browser.newPage();
    page.on('pageerror', e => console.error('page error:', e.message));
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.goto(PAGE, { waitUntil: 'networkidle0', timeout: 60000 });
    const info = await page.evaluate(async () => {
        await document.fonts.ready;
        const imgs = [...document.querySelectorAll('image')].map(i => i.getAttribute('href'));
        const failed = [];
        await Promise.all([...new Set(imgs)].map(u => new Promise(res => {
            const im = new Image(); im.onload = res; im.onerror = () => { failed.push(u); res(); }; im.src = new URL(u, location.href).href;
        })));
        return { total: window.__TOTAL, fps: window.__FPS, failed, font: document.fonts.check('700 40px Mali') };
    });
    if (info.failed.length) throw new Error('images failed:\n  ' + info.failed.join('\n  '));
    console.log(`ready: ${info.total} frames @ ${info.fps}fps · Mali font ${info.font ? 'ok' : 'FALLBACK'}`);
    return { browser, page, ...info };
}

async function grab(page, f, type) {
    await page.evaluate(n => window.__seek(n), f);
    return page.screenshot({ type, quality: type === 'jpeg' ? 92 : undefined });
}

async function preview(frames) {
    const dir = path.join(ROOT, 'preview');
    fs.mkdirSync(dir, { recursive: true });
    const { browser, page } = await open();
    for (const f of frames) fs.writeFileSync(path.join(dir, `f${String(f).padStart(4, '0')}.png`), await grab(page, f, 'png'));
    await browser.close();
    console.log('wrote', frames.length, 'stills');
}

async function full() {
    if (!process.argv.includes('--no-audio-build')) execFileSync(process.execPath, [path.join(ROOT, 'build-audio.js')], { stdio: 'inherit' });
    const { browser, page, total, fps } = await open();
    const enc = spawn(ffmpeg, ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
        '-i', path.join(ROOT, 'audio.wav'), '-map', '0:v', '-map', '1:a',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
        // -1.5 dB keeps the AAC true peak under 0 dBFS; at unity it touched 0.0
        '-af', 'volume=-1.5dB', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', OUT],
        { stdio: ['pipe', 'ignore', 'pipe'] });
    let err = '';
    enc.stderr.on('data', d => { err = (err + d).slice(-4000); });
    const done = new Promise((res, rej) => enc.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c + '\n' + err))));
    const t0 = Date.now();
    for (let f = 0; f < total; f++) {
        const jpg = await grab(page, f, 'jpeg');
        if (!enc.stdin.write(jpg)) await new Promise(r => enc.stdin.once('drain', r));
        if (f % 150 === 0) console.log(`${Math.round(f / total * 100)}%  frame ${f}/${total}  ${Math.round((Date.now() - t0) / 1000)}s`);
    }
    enc.stdin.end();
    await done;
    await browser.close();
    console.log(`done: ${OUT} (${(fs.statSync(OUT).size / 1048576).toFixed(1)} MB, ${Math.round((Date.now() - t0) / 1000)}s)`);
}

const i = process.argv.indexOf('--preview');
(i > -1 ? preview(process.argv[i + 1].split(',').map(Number)) : full()).catch(e => { console.error(e.message); process.exit(1); });
