/**
 * Renders video/scene.html to an MP4.
 *
 *   node video/render.js                      full render -> video/bss-motion.mp4
 *   node video/render.js --preview 40,160,300 still frames -> video/preview/
 *
 * How it works: scene.html never animates on its own — every value is a
 * function of the frame number, exposed as window.__seek(f). This script seeks
 * to each frame, screenshots it, and pipes the JPEG straight into ffmpeg's
 * stdin. Capture speed therefore cannot affect timing: a frame that takes
 * 400ms to grab still lands exactly 1/30s after the previous one in the video.
 *
 * Uses the Chrome already installed on this machine (puppeteer-core) instead of
 * downloading a bundled Chromium, and ffmpeg-static for encoding.
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const ffmpeg = require('ffmpeg-static');

const ROOT = __dirname;
const SCENE = 'file:///' + path.join(ROOT, 'scene.html').replace(/\\/g, '/');
const OUT = path.join(ROOT, 'bss-motion.mp4');

const BROWSERS = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome'
];

function findBrowser() {
    const hit = BROWSERS.find(p => fs.existsSync(p));
    if (!hit) throw new Error('No Chrome or Edge found. Install Chrome, or add its path to BROWSERS.');
    return hit;
}

async function openScene() {
    const browser = await puppeteer.launch({
        executablePath: findBrowser(),
        headless: 'new',
        args: ['--allow-file-access-from-files', '--hide-scrollbars', '--force-color-profile=srgb']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.goto(SCENE, { waitUntil: 'networkidle0', timeout: 60000 });

    // Background images are invisible to the load event and to fonts.ready.
    // Decode every one up front, or the first frames of a scene render blank.
    const report = await page.evaluate(async () => {
        await document.fonts.ready;
        const urls = new Set();
        document.querySelectorAll('*').forEach(el => {
            const bg = getComputedStyle(el).backgroundImage;
            const m = bg && bg.match(/url\(["']?([^"')]+)["']?\)/);
            if (m) urls.add(m[1]);
        });
        document.querySelectorAll('img').forEach(i => urls.add(i.src));
        const failed = [];
        await Promise.all([...urls].map(u => new Promise(res => {
            const im = new Image();
            im.onload = () => im.decode().then(res, res);
            im.onerror = () => { failed.push(u); res(); };
            im.src = u;
        })));
        return {
            images: urls.size,
            failed,
            promptLoaded: document.fonts.check('700 40px Prompt'),
            barlowLoaded: document.fonts.check('800 40px "Barlow Condensed"'),
            total: window.__TOTAL,
            fps: window.__FPS
        };
    });

    if (report.failed.length) {
        await browser.close();
        throw new Error('Images failed to load:\n  ' + report.failed.join('\n  '));
    }
    console.log(`scene ready: ${report.images} images, ${report.total} frames @ ${report.fps}fps`);
    console.log(`fonts: Prompt ${report.promptLoaded ? 'ok' : 'FALLBACK'}, Barlow Condensed ${report.barlowLoaded ? 'ok' : 'FALLBACK'}`);
    return { browser, page, total: report.total, fps: report.fps };
}

async function grab(page, f, type) {
    await page.evaluate(n => window.__seek(n), f);
    return page.screenshot({ type, quality: type === 'jpeg' ? 94 : undefined, omitBackground: false });
}

async function preview(frames) {
    const dir = path.join(ROOT, 'preview');
    fs.mkdirSync(dir, { recursive: true });
    const { browser, page } = await openScene();
    for (const f of frames) {
        const file = path.join(dir, `f${String(f).padStart(4, '0')}.png`);
        fs.writeFileSync(file, await grab(page, f, 'png'));
        console.log('wrote', file);
    }
    await browser.close();
}

async function full() {
    const { browser, page, total, fps } = await openScene();

    const enc = spawn(ffmpeg, [
        '-y',
        '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
        '-pix_fmt', 'yuv420p',          // the only pixel format every phone and Facebook play
        '-movflags', '+faststart',      // moov atom first, so playback starts before download ends
        OUT
    ], { stdio: ['pipe', 'ignore', 'pipe'] });

    let encErr = '';
    enc.stderr.on('data', d => { encErr += d; if (encErr.length > 20000) encErr = encErr.slice(-10000); });
    const done = new Promise((res, rej) => enc.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exited ' + c + '\n' + encErr.slice(-2000)))));

    const t0 = Date.now();
    for (let f = 0; f < total; f++) {
        const jpg = await grab(page, f, 'jpeg');
        if (!enc.stdin.write(jpg)) await new Promise(r => enc.stdin.once('drain', r));
        if (f % 30 === 0 || f === total - 1) {
            const pct = ((f + 1) / total * 100).toFixed(0).padStart(3);
            const el = (Date.now() - t0) / 1000;
            process.stdout.write(`\r${pct}%  frame ${f + 1}/${total}  ${el.toFixed(0)}s`);
        }
    }
    enc.stdin.end();
    await done;
    await browser.close();

    const mb = (fs.statSync(OUT).size / 1048576).toFixed(1);
    console.log(`\n\ndone: ${OUT}  (${mb} MB, ${(total / fps).toFixed(1)}s, ${((Date.now() - t0) / 1000).toFixed(0)}s to render)`);
}

const i = process.argv.indexOf('--preview');
(i > -1
    ? preview(process.argv[i + 1].split(',').map(Number))
    : full()
).catch(e => { console.error('\n' + e.message); process.exit(1); });
