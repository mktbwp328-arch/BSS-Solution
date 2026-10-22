import { createRequire } from 'module'; const puppeteer = createRequire(import.meta.url)('../node_modules/puppeteer-core');
import path from 'path'; import url from 'url';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--allow-file-access-from-files', '--use-gl=angle'] });
const p = await b.newPage(); await p.setViewport({ width: 1400, height: 1100 });
await p.goto(url.pathToFileURL(path.resolve('out/preview.html')).href, { waitUntil: 'networkidle0' });
const views = { side: [-1300, -3300, 1700], front: [-3200, -1200, 1500], back: [3400, 1900, 1900] };
for (const [n, v] of Object.entries(views)) { await p.evaluate(v => window.view(...v), v); await p.screenshot({ path: `out/preview-${n}.png` }); }
await b.close(); console.log('ok');
