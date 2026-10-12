/**
 * Renders the line-art 9:16 cut. Shares narration, music and timing with
 * the doodle cartoon (../cartoon/audio.wav and timeline.js) — run
 * video/cartoon/build-audio.js first whenever the script changes.
 *
 *   node video/lineart/render.js                  full render -> bss-lineart-vertical.mp4
 *   node video/lineart/render.js --preview 90,700 stills -> video/lineart/preview/
 */
const path = require('path');
const fs = require('fs');
const url = require('url');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const ffmpeg = require('ffmpeg-static');

const ROOT = __dirname;
const PAGE = url.pathToFileURL(path.join(ROOT, 'lineart.html')).href;
const OUT = path.join(ROOT, 'bss-lineart-vertical.mp4');
const AUDIO = path.join(ROOT, '..', 'cartoon', 'audio.wav');
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
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
    await page.goto(PAGE, { waitUntil: 'networkidle0', timeout: 60000 });
    const info = await page.evaluate(async () => {
        await document.fonts.ready;
        const imgs = [...new Set([...document.querySelectorAll('image')].map(i => i.getAttribute('href')))];
        const failed = [];
        await Promise.all(imgs.map(u => new Promise(res => { const im = new Image(); im.onload = res; im.onerror = () => { failed.push(u); res(); }; im.src = new URL(u, location.href).href; })));
        return { total: window.__TOTAL, fps: window.__FPS, failed, font: document.fonts.check('italic 900 40px Kanit') };
    });
    if (info.failed.length) throw new Error('images failed:\n  ' + info.failed.join('\n  '));
    console.log(`ready: ${info.total} frames @ ${info.fps}fps · Kanit ${info.font ? 'ok' : 'FALLBACK'}`);
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
    if (!fs.existsSync(AUDIO)) throw new Error('missing ' + AUDIO + ' — run video/cartoon/build-audio.js');
    let { browser, page, total, fps } = await open();
    const enc = spawn(ffmpeg, ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-i', AUDIO,
        '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
        // -1.5 dB keeps the AAC true peak under 0 dBFS
        '-af', 'volume=-1.5dB', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', OUT],
        { stdio: ['pipe', 'ignore', 'pipe'] });
    let err = '';
    enc.stderr.on('data', d => { err = (err + d).slice(-4000); });
    const done = new Promise((res, rej) => enc.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c + '\n' + err))));
    const t0 = Date.now();
    for (let f = 0; f < total; f++) {
        // Chrome's memory climbs with every frame of DOM churn and fell over
        // around frame 1,500. A fresh browser every 600 frames keeps it well
        // clear; frames are pure functions of f, so the seam is invisible.
        if (f > 0 && f % 600 === 0) { try { await browser.close(); } catch (_) {} ({ browser, page } = await open()); }
        // Headless Chrome occasionally dies mid-run ("Target closed"). Because
        // every frame is a pure function of f, relaunching and re-grabbing the
        // same frame continues the video seamlessly instead of failing it.
        let jpg;
        for (let attempt = 0; ; attempt++) {
            try { jpg = await grab(page, f, 'jpeg'); break; }
            catch (e) {
                if (attempt >= 3) throw e;
                console.log(`frame ${f}: ${String(e.message).split(String.fromCharCode(10))[0]} — relaunching browser (${attempt + 1}/3)`);
                try { await browser.close(); } catch (_) {}
                ({ browser, page } = await open());
            }
        }
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
