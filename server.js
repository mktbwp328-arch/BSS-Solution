const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 8080;

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'images');
        fs.ensureDirSync(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Read .env if present. This repository is public, so the real password must
// never be committed — .env is gitignored and holds it instead. Written by
// hand rather than pulled from dotenv to keep the dependency list short.
(function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
        if (!m || line.trim().startsWith('#')) continue;
        const value = m[2].trim().replace(/^["']|["']$/g, '');
        if (!(m[1] in process.env)) process.env[m[1]] = value;
    }
})();

// Guards the local save/upload endpoints. Set it in .env (or inline:
// BSS_ADMIN_PASSWORD=yourpassword node server.js). The fallback exists only so
// a fresh clone starts up — it is not a password anyone should keep.
const ADMIN_PASSWORD = process.env.BSS_ADMIN_PASSWORD || '123456';

if (ADMIN_PASSWORD === '123456') {
    console.warn('⚠  BSS_ADMIN_PASSWORD ยังไม่ได้ตั้ง — ใช้รหัสเริ่มต้น 123456 อยู่');
}

const authenticate = (req, res, next) => {
    const password = req.headers['x-admin-password'];
    if (password === ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).send('Unauthorized');
    }
};

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, './')));

// Same shape as api/status.js on Vercel, so admin.html has one code path.
app.get('/api/status', (req, res) => {
    res.json({ remoteEditing: false, local: true, hasToken: true, hasPassword: true });
});

// Same shape as api/login.js on Vercel.
app.post('/api/login', authenticate, (req, res) => {
    res.json({ ok: true, local: true });
});

// API to upload image
app.post('/api/upload', authenticate, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded');
    const relativePath = 'images/' + req.file.filename;
    res.json({ url: relativePath });
});

// Only these pages may be published over. Anything else is rejected outright.
const EDITABLE_PAGES = ['index.html', 'about.html', 'services.html', 'contact.html', 'articles.html'];

// API to save updated HTML
app.post('/api/save', authenticate, async (req, res) => {
    const { filename, content } = req.body;

    if (!filename || !content) {
        return res.status(400).send('Filename and content are required');
    }

    // Security check: ensure filename is just a local file
    const safeFilename = path.basename(filename);

    if (!EDITABLE_PAGES.includes(safeFilename)) {
        console.warn(`Rejected save for non-editable file: ${safeFilename}`);
        return res.status(403).send(`File ${safeFilename} is not editable`);
    }

    // Refuse a suspiciously small payload — a truncated save would destroy the page
    if (content.length < 1000) {
        console.warn(`Rejected save for ${safeFilename}: content too short (${content.length} bytes)`);
        return res.status(400).send('Content looks truncated — save aborted');
    }

    const filePath = path.join(__dirname, safeFilename);

    try {
        // Keep a timestamped copy of the previous version before overwriting
        if (await fs.pathExists(filePath)) {
            const backupDir = path.join(__dirname, 'backups');
            await fs.ensureDir(backupDir);
            const stamp = new Date().toISOString().replace(/[:.]/g, '-');
            await fs.copy(filePath, path.join(backupDir, `${safeFilename}.${stamp}.bak`));
        }

        await fs.writeFile(filePath, content, 'utf8');
        console.log(`Successfully saved ${safeFilename} (${content.length} bytes)`);
        res.send(`File ${safeFilename} updated successfully`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error saving file');
    }
});

app.listen(PORT, () => {
    console.log(`Editor Server running at http://localhost:${PORT}`);
});
