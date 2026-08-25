/**
 * Push the current commit to GitHub through the Git Data API.
 *
 * `git push` keeps dying on this connection ("Connection was reset") because it
 * streams the whole pack in one request. This uploads one blob per request
 * instead, with retries, which survives a flaky link.
 *
 * Usage: node push-api.js <token-file>
 */
const fs = require('fs');
const { execSync } = require('child_process');

const OWNER = 'mktbwp328-arch';
const REPO = 'BSS-Solution';
const BRANCH = 'main';
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;

const token = fs.readFileSync(process.argv[2], 'utf8').trim();

const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'bss-push-script'
};

async function api(path, method = 'GET', body) {
    const url = path.startsWith('http') ? path : API + path;
    let lastErr;
    for (let attempt = 1; attempt <= 5; attempt++) {
        try {
            const res = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
                signal: AbortSignal.timeout(120000)
            });
            const text = await res.text();
            if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 200)}`);
            return text ? JSON.parse(text) : {};
        } catch (err) {
            lastErr = err;
            if (attempt < 5) await new Promise(r => setTimeout(r, attempt * 2000));
        }
    }
    throw new Error(`${method} ${path} failed after 5 tries: ${lastErr.message}`);
}

(async () => {
    const files = execSync('git ls-files', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    console.log(`uploading ${files.length} files as blobs...`);

    const tree = [];
    let done = 0;
    for (const file of files) {
        const content = fs.readFileSync(file).toString('base64');
        const blob = await api('/git/blobs', 'POST', { content, encoding: 'base64' });
        tree.push({ path: file, mode: '100644', type: 'blob', sha: blob.sha });
        done++;
        if (done % 10 === 0 || done === files.length) {
            console.log(`  ${done}/${files.length}`);
        }
    }

    console.log('creating tree...');
    const treeRes = await api('/git/trees', 'POST', { tree });

    console.log('creating commit...');
    const message = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
    const commit = await api('/git/commits', 'POST', { message, tree: treeRes.sha, parents: [] });

    console.log('pointing refs/heads/main at it...');
    try {
        await api(`/git/refs/heads/${BRANCH}`, 'PATCH', { sha: commit.sha, force: true });
    } catch {
        await api('/git/refs', 'POST', { ref: `refs/heads/${BRANCH}`, sha: commit.sha });
    }

    console.log(`\ndone — commit ${commit.sha.slice(0, 8)}`);
    console.log(`https://github.com/${OWNER}/${REPO}`);
})().catch(err => {
    console.error('FAILED:', err.message);
    process.exit(1);
});
