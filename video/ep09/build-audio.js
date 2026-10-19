/**
 * EP.09 copy of video/cartoon/build-audio.js — same voice-led layout, its own
 * lines, music mood and effects.
 *
 * Builds everything audio-side, and the timeline the picture follows:
 *
 *   node video/ep09/build-audio.js
 *     -> video/ep09/timeline.js   (scene/line timing + per-frame mouth)
 *     -> video/ep09/audio.wav     (voice + music + effects, mixed)
 *
 * Here the voice leads: each line is synthesised first, its real length
 * measured, and the scenes laid out around it. Mouth movement is the voice's
 * own loudness per frame, so the narrator's lips move with the actual words.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const LINES = require('./lines.js');

const DIR = __dirname;
const TMP = path.join(DIR, '.tmp');
const SR = 44100;
const FPS = 30;
// William Multilingual (en-AU): Microsoft's multilingual male voice, reads Thai
const VOICE = 'en-AU-WilliamMultilingualNeural';

const TITLE_SEC = 2.6;        // title card before the first line
const GAP_SEC = 0.22;         // breath between lines in one scene
const SCENE_GAP_SEC = 0.7;    // room for a transition between scenes
const TAIL_SEC = 4.0;         // end card after the last line


/* ---------------------------------------------------------------- voice */
// Each line is cached by its text, so a re-run (or a run that hit the
// service's rate limit part-way) only fetches what is new; failed calls back
// off and retry.
async function synth(text, i) {
    const key = require('crypto').createHash('sha1').update(VOICE + '|' + text).digest('hex').slice(0, 16);
    const dir = path.join(__dirname, '.tts-cache', key);
    const done = fs.existsSync(dir) && fs.readdirSync(dir).find(f => f.endsWith('.mp3'));
    if (done && fs.statSync(path.join(dir, done)).size > 1000) return path.join(dir, done);
    fs.mkdirSync(dir, { recursive: true });
    for (let attempt = 0; ; attempt++) {
        try {
            const tts = new MsEdgeTTS();
            await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
            // storytelling read: livelier than the promo voice-over
            const { audioFilePath } = await tts.toFile(dir, text, { rate: '+2%', pitch: '+0Hz' });
            tts.close && tts.close();
            return audioFilePath;
        } catch (e) {
            if (attempt >= 6) throw e;
            const wait = 5000 * 2 ** attempt;
            console.log(`\n  line ${i + 1}: ${String(e.message).slice(0, 60)} — retry in ${wait / 1000}s`);
            await new Promise(r => setTimeout(r, wait));
        }
    }
}

function decode(file) {
    const r = spawnSync(ffmpeg, ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'],
        { maxBuffer: 128 << 20 });
    if (r.status !== 0) throw new Error(String(r.stderr));
    return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4);
}

function trim(pcm) {
    let a = 0, b = pcm.length - 1;
    while (a < b && Math.abs(pcm[a]) < 0.01) a++;
    while (b > a && Math.abs(pcm[b]) < 0.01) b--;
    return pcm.slice(Math.max(0, a - 200), Math.min(pcm.length, b + 1500));
}

/* ------------------------------------------------------------ synth kit */
const TAU = Math.PI * 2;
let seed = 0x1234567;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) / 4294967296) * 2 - 1; };
const lp1 = fc => { const a = 1 - Math.exp(-TAU * fc / SR); let y = 0; return x => (y += a * (x - y)); };
const at = s => Math.round(s * SR);

function tone(len, fn) { const n = at(len), b = new Float32Array(n); for (let i = 0; i < n; i++) b[i] = fn(i / SR, i); return b; }

// marimba-ish pluck: sine + a little fourth harmonic, fast decay
const pluck = (f, len = 0.5, dec = 9) => tone(len, t => (Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * f * 4 * t) * Math.exp(-t * 30)) * Math.exp(-t * dec) * Math.min(1, t * 800));
const bassPluck = f => tone(0.4, t => Math.tanh(Math.sin(TAU * f * t) * 1.6) * Math.exp(-t * 7) * Math.min(1, t * 600));
const softKick = () => { let ph = 0; return tone(0.3, t => { ph += TAU * (50 + 90 * Math.exp(-t * 35)) / SR; return Math.sin(ph) * Math.exp(-t * 11); }); };
const shaker = () => { const l = lp1(9000); return tone(0.07, t => { const n = rnd(); return (n - l(n)) * Math.exp(-t * 70); }); };
const snap = () => { const h = lp1(1500), l = lp1(7000); return tone(0.18, t => { const n = rnd(); return (l(n) - h(n)) * Math.exp(-t * 32); }); };

// effects
const whoosh = () => { const l = lp1(2500); return tone(0.55, t => { const p = t / 0.55; return l(rnd()) * Math.sin(Math.PI * p) * 0.9; }); };
const pop = () => tone(0.12, t => Math.sin(TAU * (500 + 900 * t / 0.12) * t) * Math.exp(-t * 30) * 0.6);
const thud = () => { const l = lp1(500); let ph = 0; return tone(0.22, t => { ph += TAU * (90 + 60 * Math.exp(-t * 40)) / SR; return (Math.sin(ph) * 0.8 + l(rnd()) * 0.5) * Math.exp(-t * 18); }); };
const tick = hi => tone(0.05, t => Math.sin(TAU * (hi ? 2400 : 1800) * t) * Math.exp(-t * 90) * 0.5);
const buzzer = () => tone(0.9, t => Math.sign(Math.sin(TAU * 110 * t)) * 0.25 * (t < 0.85 ? 1 : 0) * Math.min(1, t * 200));
const sparkle = () => tone(0.6, t => (Math.sin(TAU * 1760 * t) + Math.sin(TAU * 2637 * t)) * 0.25 * Math.exp(-t * 6));

/* ---------------------------------------------------------------- build */
(async () => {
    fs.rmSync(TMP, { recursive: true, force: true });
    fs.mkdirSync(TMP, { recursive: true });

    // 1. voice lines, measured
    const clips = [];
    for (let i = 0; i < LINES.length; i++) {
        process.stdout.write(`\rvoice ${i + 1}/${LINES.length}`);
        // [2] is the spoken form when it differs from the subtitle text
        clips.push(trim(decode(await synth(LINES[i][2] || LINES[i][1], i))));
    }
    console.log();

    // 2. lay out lines and scenes around the measured lengths
    let t = TITLE_SEC;
    const lines = [];
    for (let i = 0; i < LINES.length; i++) {
        if (i > 0) t += LINES[i][0] !== LINES[i - 1][0] ? SCENE_GAP_SEC : GAP_SEC;
        const len = clips[i].length / SR;
        lines.push({ scene: LINES[i][0], text: LINES[i][1], start: t, end: t + len });
        t += len;
    }
    const DURATION = t + TAIL_SEC;
    const TOTAL = Math.ceil(DURATION * FPS);
    const N = Math.ceil(DURATION * SR);
    const F = s => Math.round(s * FPS);

    const scenes = [{ id: 's0', from: 0 }];
    lines.forEach((l, i) => {
        if (i === 0 || l.scene !== lines[i - 1].scene) {
            // cut a little before the line so the transition lands under the gap
            scenes.push({ id: l.scene, from: Math.max(0, F(l.start) - 14) });
        }
    });
    scenes.forEach((s, i) => { s.to = i + 1 < scenes.length ? scenes[i + 1].from : TOTAL; });

    // 3. voice bus + per-frame mouth openness
    const voice = new Float32Array(N);
    lines.forEach((l, i) => { const s0 = at(l.start); const c = clips[i]; for (let j = 0; j < c.length && s0 + j < N; j++) voice[s0 + j] += c[j]; });

    const mouth = new Array(TOTAL).fill(0);
    const spf = SR / FPS;
    let peak = 0;
    const raw = mouth.map((_, f) => { let a = 0; const s0 = Math.floor(f * spf); for (let i = s0; i < s0 + spf && i < N; i++) a += voice[i] * voice[i]; const r = Math.sqrt(a / spf); peak = Math.max(peak, r); return r; });
    let sm = 0;
    for (let f = 0; f < TOTAL; f++) {
        const v = Math.min(1, raw[f] / (peak * 0.55));
        sm = v > sm ? v : sm * 0.55 + v * 0.45;        // snap open, ease shut
        mouth[f] = Math.round(sm * 100) / 100;
    }

    // 4. music: mood follows the story
    const music = new Float32Array(N);
    const fx = new Float32Array(N);
    const put = (bus, buf, s, g = 1) => { const s0 = at(s); for (let i = 0; i < buf.length; i++) { const j = s0 + i; if (j >= 0 && j < N) bus[j] += buf[i] * g; } };

    const sceneAt = sec => { const f = F(sec); return (scenes.find(s => f >= s.from && f < s.to) || scenes[scenes.length - 1]).id; };
    const TENSE = new Set([]);              // an easy, helpful episode
    const BPM = 100, BEAT = 60 / BPM, BAR = BEAT * 4;
    const N_ = { C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196, A3: 220, B3: 246.94,
                 C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, E5: 659.25 };
    const HAPPY = [[N_.C3, [N_.C4, N_.E4, N_.G4, N_.C5]], [N_.G3, [N_.B3, N_.D4, N_.G4, N_.B4]],
                   [N_.A3, [N_.A3, N_.C4, N_.E4, N_.A4]], [N_.F3, [N_.A3, N_.C4, N_.F4, N_.A4]]];
    const TENSEP = [[N_.A3, [N_.A3, N_.C4, N_.E4, N_.A4]], [N_.F3, [N_.A3, N_.C4, N_.F4, N_.A4]],
                    [N_.D3, [N_.D4, N_.F4, N_.A4, N_.D4]], [N_.E3, [N_.E4, N_.G4, N_.B4, N_.E5]]];
    const K = softKick(), SH = shaker(), SN = snap();

    for (let b = 0; b * BAR < DURATION - 1; b++) {
        const t0 = b * BAR, mood = sceneAt(t0 + 0.01);
        const tense = TENSE.has(mood), end = mood === 's9' || mood === 's8';
        const [root, chord] = (tense ? TENSEP : HAPPY)[b % 4];
        for (let k = 0; k < 4; k++) {
            if (!tense || k % 2 === 0) put(music, K, t0 + k * BEAT, tense ? 0.55 : 0.7);
            if (k % 2 === 1) put(music, SN, t0 + k * BEAT, tense ? 0.25 : 0.4);
        }
        for (let e = 0; e < 8; e++) put(music, SH, t0 + e * BEAT / 2, e % 2 ? 0.12 : 0.2);
        put(music, bassPluck(root / 2), t0, 0.5);
        put(music, bassPluck(root / 2), t0 + BEAT * 2.5, 0.35);
        // bouncy arpeggio; in the tense scenes it slows and sits lower
        const steps = tense ? 4 : 8;
        for (let s = 0; s < steps; s++) {
            const note = chord[(s * (tense ? 1 : 3)) % 4] * (tense ? 1 : (s % 4 === 3 ? 2 : 1));
            put(music, pluck(note, 0.5, tense ? 6 : 10), t0 + s * BAR / steps, tense ? 0.22 : (end ? 0.3 : 0.24));
        }
    }

    // 5. effects, at the frames the picture uses
    scenes.slice(1).forEach(s => put(fx, whoosh(), s.from / FPS - 0.25, 0.5));
    scenes.forEach(s => put(fx, pop(), s.from / FPS + 0.35, 0.35));
    // (the whoosh above covers the strips sliding across) a soft blip
    // as each line starts, a warning tick into the problem scene, a chime on
    // the takeaway and the contact card
    const blip = () => tone(0.08, t => Math.sin(TAU * (t < 0.04 ? 1320 : 1760) * t) * Math.exp(-t * 40) * 0.5);
    lines.forEach(l => put(fx, blip(), l.start - 0.06, 0.18));
    const s4 = scenes.find(s => s.id === 's2');
    if (s4) { put(fx, tick(true), s4.from / FPS + 0.3, 0.6); put(fx, tick(false), s4.from / FPS + 0.45, 0.6); }
    ['s6', 's7'].forEach(id => { const s = scenes.find(x => x.id === id); if (s) put(fx, sparkle(), s.from / FPS + 0.4, 0.5); });

    // 6. mix: music ducks under the narrator
    const out = new Float32Array(N * 2);
    let env = 0, pk = 0;
    const att = Math.exp(-1 / (0.01 * SR)), rel = Math.exp(-1 / (0.35 * SR));
    for (let i = 0; i < N; i++) {
        const a = Math.abs(voice[i]);
        env = a > env ? att * env + (1 - att) * a : rel * env + (1 - rel) * a;
        const duck = 1 - Math.min(0.6, env * 6);
        const m = music[i] * 0.42 * duck;
        const v = voice[i] * 1.0;
        const e = fx[i] * 0.8;
        out[i * 2] = m + v + e;
        out[i * 2 + 1] = m * 0.96 + v + e;
        pk = Math.max(pk, Math.abs(out[i * 2]), Math.abs(out[i * 2 + 1]));
    }
    const fade = at(0.6);
    for (let i = 0; i < fade; i++) { const g = i / fade; out[(N - 1 - i) * 2] *= g; out[(N - 1 - i) * 2 + 1] *= g; }
    const gain = Math.pow(10, -1.5 / 20) / pk;

    const wav = Buffer.alloc(44 + N * 4);
    wav.write('RIFF', 0); wav.writeUInt32LE(36 + N * 4, 4); wav.write('WAVE', 8); wav.write('fmt ', 12);
    wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(SR, 24);
    wav.writeUInt32LE(SR * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(N * 4, 40);
    for (let i = 0; i < N * 2; i++) wav.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(out[i] * gain * 32767))), 44 + i * 2);
    fs.writeFileSync(path.join(DIR, 'audio.wav'), wav);

    // 7. timeline for the picture
    const timeline = {
        FPS, TOTAL,
        scenes,
        lines: lines.map(l => ({ scene: l.scene, text: l.text, from: F(l.start), to: F(l.end) })),
        mouth
    };
    fs.writeFileSync(path.join(DIR, 'timeline.js'),
        '// generated by build-audio.js — do not edit by hand\nwindow.TL = ' + JSON.stringify(timeline) + ';\n');
    fs.rmSync(TMP, { recursive: true, force: true });

    console.log(`duration ${DURATION.toFixed(1)}s · ${TOTAL} frames`);
    scenes.forEach(s => console.log(`  ${s.id.padEnd(4)} ${(s.from / FPS).toFixed(1).padStart(6)}s – ${(s.to / FPS).toFixed(1).padStart(6)}s`));
})().catch(e => { console.error(e); process.exit(1); });
