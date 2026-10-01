/**
 * Synthesises the soundtrack for the motion graphic, sample by sample.
 *
 *   node video/music.js        -> video/soundtrack.wav
 *
 * Original audio generated in code, so there is no licence to clear and no
 * Content ID claim waiting on Facebook or YouTube. It reads timeline.js — the
 * same file scene.html uses — so every impact lands on the exact frame a scene
 * cuts, and the drops land on the cuts into the hook and the process scene.
 *
 * E minor, 120 BPM, industrial: four-on-the-floor kick, claps on 2 and 4,
 * 16th hats, an eighth-note saw bass ducked by the kick, and a held pad. Every
 * scene cut gets a sub boom + noise crash, with a riser leading into each drop.
 */

const fs = require('fs');
const path = require('path');
const T = require('./timeline.js');

const SR = 44100;
const SEC_PER_BEAT = 60 / T.BPM;               // 0.5s
const SEC_PER_BAR = SEC_PER_BEAT * 4;           // 2.0s
const DURATION = T.TOTAL / T.FPS;               // 60s
const N = Math.ceil(DURATION * SR);

// Two dry buses: drums and hits stay at full level, everything sustained goes
// on the music bus so the kick can duck it.
const L = new Float32Array(N), R = new Float32Array(N);       // music bus (ducked)
const DL = new Float32Array(N), DR = new Float32Array(N);     // drum bus (not ducked)
const RL = new Float32Array(N), RR = new Float32Array(N);     // reverb send
const sidechain = new Float32Array(N);                         // kick envelope

const TAU = Math.PI * 2;
const bar  = b => b * SEC_PER_BAR;
const beat = (b, k) => bar(b) + k * SEC_PER_BEAT;
const at   = s => Math.round(s * SR);
const inSec = (s, name) => { const [a, b] = T.SECTIONS[name]; return s >= bar(a) && s < bar(b); };

/* Deterministic noise: the track must come out identical on every run. */
let seed = 0x9e3779b9;
function rnd() {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return ((seed >>> 0) / 4294967296) * 2 - 1;
}

/* Mix a generated mono buffer onto a bus at time `t` (seconds). */
function mix(busL, busR, buf, t, gain, pan, send) {
    const s0 = at(t);
    const gl = gain * Math.cos((pan + 1) * Math.PI / 4);
    const gr = gain * Math.sin((pan + 1) * Math.PI / 4);
    for (let i = 0; i < buf.length; i++) {
        const j = s0 + i;
        if (j < 0 || j >= N) continue;
        busL[j] += buf[i] * gl; busR[j] += buf[i] * gr;
        if (send) { RL[j] += buf[i] * gl * send; RR[j] += buf[i] * gr * send; }
    }
}
const place = (buf, t, gain = 1, pan = 0, send = 0) => mix(L, R, buf, t, gain, pan, send);
const hit   = (buf, t, gain = 1, pan = 0, send = 0) => mix(DL, DR, buf, t, gain, pan, send);

function onePoleLP(fc) { const a = 1 - Math.exp(-TAU * fc / SR); let y = 0; return x => (y += a * (x - y)); }

/* ---- drums ------------------------------------------------------------ */

function kick() {
    const n = at(0.48), b = new Float32Array(n);
    let ph = 0;
    for (let i = 0; i < n; i++) {
        const t = i / SR;
        const f = 46 + 128 * Math.exp(-t * 30);          // the pitch drop is the punch
        ph += TAU * f / SR;
        const body  = Math.sin(ph) * Math.exp(-t * 6.5);
        const click = rnd() * Math.exp(-t * 420) * 0.35;
        b[i] = Math.tanh((body + click) * 2.4) * 0.92;   // saturate for weight
    }
    return b;
}

function clap() {
    const n = at(0.42), b = new Float32Array(n);
    const hp = onePoleLP(900), lp = onePoleLP(6500);
    for (let i = 0; i < n; i++) {
        const t = i / SR;
        // three tight bursts then a tail — what makes it read as hands, not a snare
        const bursts = [0, 0.011, 0.022].reduce((a, o) => a + (t >= o ? Math.exp(-(t - o) * 190) : 0), 0);
        const env = bursts * 0.6 + Math.exp(-t * 14) * 0.55;
        const nz = rnd();
        const band = lp(nz) - hp(nz);
        const tone = Math.sin(TAU * 196 * t) * Math.exp(-t * 34) * 0.35;
        b[i] = (band * env + tone) * 0.9;
    }
    return b;
}

function hat(open) {
    const n = at(open ? 0.34 : 0.075), b = new Float32Array(n);
    const lp = onePoleLP(7000);
    const dec = open ? 9 : 62;
    for (let i = 0; i < n; i++) {
        const t = i / SR, nz = rnd();
        b[i] = (nz - lp(nz)) * Math.exp(-t * dec) * 0.5;  // high-passed noise
    }
    return b;
}

function tom(freq) {
    const n = at(0.4), b = new Float32Array(n);
    let ph = 0;
    for (let i = 0; i < n; i++) {
        const t = i / SR;
        ph += TAU * (freq + freq * 0.6 * Math.exp(-t * 18)) / SR;
        b[i] = Math.tanh(Math.sin(ph) * Math.exp(-t * 9) * 1.8) * 0.7;
    }
    return b;
}

/* ---- impacts and risers ----------------------------------------------- */

function impact(size) {
    const n = at(2.6), b = new Float32Array(n);
    const lp = onePoleLP(2200);
    let ph = 0;
    for (let i = 0; i < n; i++) {
        const t = i / SR;
        ph += TAU * (34 + 30 * Math.exp(-t * 3.2)) / SR;
        const boom  = Math.sin(ph) * Math.exp(-t * 1.9);
        const crash = lp(rnd()) * Math.exp(-t * 3.4) * 0.9;
        const crack = rnd() * Math.exp(-t * 60) * 0.5;
        b[i] = Math.tanh((boom * 1.3 + crash + crack) * 1.6) * size;
    }
    return b;
}

/* Noise and a sine both climbing over `len` seconds, ending exactly on the
   downbeat it leads into — the ear hears the cut coming. */
function riser(len) {
    const n = at(len), b = new Float32Array(n);
    let y = 0, ph = 0;
    for (let i = 0; i < n; i++) {
        const p = i / n;
        const fc = 300 + 9000 * p * p;
        const a = 1 - Math.exp(-TAU * fc / SR);
        y += a * (rnd() - y);
        ph += TAU * (180 + 1400 * p * p * p) / SR;
        b[i] = (y * 0.75 + Math.sin(ph) * 0.18) * Math.pow(p, 2.2) * 0.9;
    }
    return b;
}

function whooshIn(len) {
    const n = at(len), b = new Float32Array(n);
    const lp = onePoleLP(3000);
    for (let i = 0; i < n; i++) { const p = i / n; b[i] = lp(rnd()) * Math.pow(p, 3) * 0.8; }
    return b;
}

/* ---- tonal parts -------------------------------------------------------- */

const NOTE = { E1: 41.20, G1: 49.00, A1: 55.00, B1: 61.74, C2: 65.41, D2: 73.42,
               E2: 82.41, G2: 98.00, A2: 110.0, B2: 123.47, C3: 130.81, D3: 146.83,
               E3: 164.81, Fs3: 185.0, G3: 196.0, A3: 220.0, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63 };

// i – VI – VII – V in E minor: the classic "epic" turn, one chord per bar
const PROG = [
    { root: NOTE.E2, chord: [NOTE.E3, NOTE.G3, NOTE.B3] },
    { root: NOTE.C2, chord: [NOTE.C3, NOTE.E3, NOTE.G3] },
    { root: NOTE.D2, chord: [NOTE.D3, NOTE.Fs3, NOTE.A3] },
    { root: NOTE.B1, chord: [NOTE.B2, NOTE.D3, NOTE.Fs3] }
];
const chordAt = b => PROG[((b % 4) + 4) % 4];

/* Band-limited saw (polyBLEP) — a naive saw at these pitches aliases into a
   fizzy whine that reads as cheap. */
function polyBlep(t, dt) {
    if (t < dt) { t /= dt; return t + t - t * t - 1; }
    if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
    return 0;
}
function sawOsc() {
    let p = 0;
    return f => {
        const dt = f / SR;
        p += dt; if (p >= 1) p -= 1;
        return 2 * p - 1 - polyBlep(p, dt);
    };
}

function bassNote(freq, len, cutoff) {
    const n = at(len), b = new Float32Array(n);
    const o1 = sawOsc(), o2 = sawOsc();
    let y1 = 0, y2 = 0;
    for (let i = 0; i < n; i++) {
        const t = i / SR;
        const env = Math.min(1, t * 400) * Math.exp(-t * 3.2);
        // filter opens on the attack and closes as the note dies: the "growl"
        const fc = cutoff * (0.35 + 0.65 * Math.exp(-t * 14));
        const a = 1 - Math.exp(-TAU * fc / SR);
        const x = o1(freq) * 0.6 + o2(freq * 1.006) * 0.6;
        y1 += a * (x - y1); y2 += a * (y1 - y2);                // 2-pole
        b[i] = Math.tanh(y2 * 2.2) * env * 0.62;
    }
    return b;
}

function padChord(freqs, len, bright) {
    const n = at(len), b = new Float32Array(n);
    const oscs = [];
    freqs.forEach(f => [-0.011, 0, 0.009].forEach(d => oscs.push([sawOsc(), f * (1 + d)])));
    let y = 0;
    const a = 1 - Math.exp(-TAU * bright / SR);
    for (let i = 0; i < n; i++) {
        const t = i / SR;
        const env = Math.min(1, t / 0.35) * Math.min(1, (len - t) / 0.4);
        let x = 0;
        for (const [o, f] of oscs) x += o(f);
        y += a * (x / oscs.length - y);
        b[i] = y * env * 0.9;
    }
    return b;
}

function stab(freqs) {
    const n = at(0.32), b = new Float32Array(n);
    const oscs = freqs.flatMap(f => [[sawOsc(), f], [sawOsc(), f * 2.003]]);
    let y = 0;
    for (let i = 0; i < n; i++) {
        const t = i / SR;
        const fc = 600 + 5000 * Math.exp(-t * 16);
        const a = 1 - Math.exp(-TAU * fc / SR);
        let x = 0; for (const [o, f] of oscs) x += o(f);
        y += a * (x / oscs.length - y);
        b[i] = Math.tanh(y * 3) * Math.exp(-t * 7) * 0.5;
    }
    return b;
}

/* ======================================================================== */
/*  Arrangement                                                             */
/* ======================================================================== */

const K = kick(), CL = clap(), HC = hat(false), HO = hat(true);
const MUFFLED = (() => { const lp = onePoleLP(140); return K.map(x => lp(x) * 0.7); })();
const cuts = T.SCENES.slice(1).map(s => s.from / T.FPS);      // seconds
const DROPS = [T.SECTIONS.dropA[0], T.SECTIONS.dropB[0]].map(bar);
const FINAL = bar(T.SECTIONS.outro[0]);

function placeKick(t, g = 1) {
    hit(K, t, g, 0, 0.04);
    const s0 = at(t);
    for (let i = 0; i < at(0.32); i++) {
        const j = s0 + i; if (j >= N) break;
        sidechain[j] = Math.max(sidechain[j], Math.exp(-i / SR * 11));
    }
}

for (let b = 0; b < T.BARS; b++) {
    const t0 = bar(b);
    const intro = inSec(t0, 'intro'), brk = inSec(t0, 'breakdown'), outro = inSec(t0, 'outro');
    const drop = inSec(t0, 'dropA') || inSec(t0, 'dropB');
    const dropB = inSec(t0, 'dropB');
    const { root, chord } = chordAt(b);

    /* -- drums -- */
    if (drop) {
        for (let k = 0; k < 4; k++) placeKick(beat(b, k));
        hit(CL, beat(b, 1), 0.7, 0, 0.28);
        hit(CL, beat(b, 3), 0.7, 0, 0.28);
        for (let s = 0; s < 16; s++) {
            const accent = s % 2 === 0 ? 0.32 : 0.2;
            hit(HC, t0 + s * SEC_PER_BEAT / 4, accent, 0.35);
        }
        if (dropB) for (let k = 0; k < 4; k++) hit(HO, beat(b, k) + SEC_PER_BEAT / 2, 0.22, -0.4, 0.1);
        // a tom fill on the last beat of every fourth bar keeps the loop moving
        if (b % 4 === 3) {
            [0, 0.125, 0.25, 0.375].forEach((o, i) => hit(tom([150, 120, 95, 75][i]), beat(b, 3) + o * SEC_PER_BEAT * 2, 0.55, -0.3 + i * 0.2, 0.1));
        }
    } else if (intro) {
        if (b >= 1) for (let s = 0; s < 8; s++) hit(HC, t0 + s * SEC_PER_BEAT / 2, 0.14 + b * 0.04, 0.35);
        // A muffled heartbeat under bar 1. Measured at -29.8 dB RMS without it,
        // ~20 dB under the drops: on a phone speaker that bar played as silence.
        if (b === 1) { hit(MUFFLED, beat(b, 0), 0.75); hit(MUFFLED, beat(b, 1) - 0.12, 0.45);
                       hit(MUFFLED, beat(b, 2), 0.75); hit(MUFFLED, beat(b, 3) - 0.12, 0.45); }
        if (b === 2) { placeKick(beat(b, 0)); placeKick(beat(b, 2), 0.8); }
        if (b === 3) for (let k = 0; k < 4; k++) placeKick(beat(b, k), 0.85);
    } else if (brk) {
        for (let s = 0; s < 4; s++) hit(HC, beat(b, s) + SEC_PER_BEAT / 2, 0.16, 0.35);
    }

    // snare roll speeding up over the bar before each drop
    if (DROPS.some(d => Math.abs(d - (t0 + SEC_PER_BAR)) < 1e-6)) {
        const steps = 16;
        for (let s = 0; s < steps; s++) hit(CL, t0 + s * SEC_PER_BAR / steps, 0.18 + 0.5 * (s / steps), 0, 0.15);
    }

    /* -- bass: eighth notes, octave jumps on the off-beats -- */
    if (drop || (brk && b === T.SECTIONS.breakdown[1] - 1) || (intro && b === 3)) {
        const cutoff = brk ? 300 : dropB ? 1500 : 1100;
        const pattern = [1, 1, 2, 1, 1, 2, 1, 2];
        for (let e = 0; e < 8; e++) place(bassNote(root * pattern[e], SEC_PER_BEAT / 2 * 0.92, cutoff), t0 + e * SEC_PER_BEAT / 2, 0.8, 0);
    }

    /* -- pad: carries the intro, breakdown and outro; sits low under drops -- */
    const padGain = intro ? 0.42 + b * 0.05 : brk ? 0.46 : outro ? 0.45 : 0.15;
    const padBright = brk ? 1400 : drop ? 1800 : 900;
    if (!(outro && b > T.SECTIONS.outro[0])) {
        const len = outro ? SEC_PER_BAR * 3 : SEC_PER_BAR;
        const ch = outro ? PROG[0].chord : chord;
        place(padChord(ch, len, padBright), t0, padGain, -0.25, 0.35);
        place(padChord(ch.map(f => f * 1.003), len, padBright), t0, padGain, 0.25, 0.35);
    }

    /* -- stabs on the downbeats of drop B: the extra muscle in the second half -- */
    if (dropB) {
        place(stab(chord), t0, 0.55, -0.5, 0.2);
        place(stab(chord.map(f => f * 1.004)), t0, 0.55, 0.5, 0.2);
        if (b % 2) place(stab(chord), beat(b, 2) + SEC_PER_BEAT / 2, 0.38, 0, 0.2);
    }
}

/* -- sub drone under the outro so the ending has weight, not just reverb -- */
{
    const n = at(DURATION - FINAL), b = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        const t = i / SR;
        b[i] = Math.sin(TAU * NOTE.E1 * t) * Math.min(1, t * 6) * Math.max(0, 1 - t / (n / SR)) * 0.5;
    }
    place(b, FINAL, 0.9);
}

/* -- impacts on every scene cut, plus the opening and the name slam -- */
hit(impact(0.75), 0, 1, 0, 0.5);
hit(impact(0.6), bar(2), 1, 0, 0.5);                // "BSS SOLUTION" lands here in scene 1
cuts.forEach(t => {
    const isDrop  = DROPS.some(d => Math.abs(d - t) < 1e-6);
    const isFinal = Math.abs(t - FINAL) < 1e-6;
    hit(impact(isFinal ? 1.0 : isDrop ? 0.9 : 0.6), t, 1, 0, isFinal ? 0.8 : 0.45);
    place(whooshIn(0.45), t - 0.45, isDrop || isFinal ? 0.55 : 0.4, 0, 0.2);
});

/* -- risers into each drop and into the end card -- */
[...DROPS, FINAL].forEach(t => place(riser(SEC_PER_BAR * 2), t - SEC_PER_BAR * 2, 0.5, 0, 0.3));

/* ======================================================================== */
/*  Sidechain, reverb, master                                               */
/* ======================================================================== */

/* Duck the sustained parts by the kick's envelope, then add the drums on top
   untouched. That breathing is most of what makes this kind of track pump. */
for (let i = 0; i < N; i++) {
    const d = 1 - 0.45 * sidechain[i];
    L[i] = L[i] * d + DL[i];
    R[i] = R[i] * d + DR[i];
}

/* Schroeder reverb: four parallel combs into two allpasses, with different
   delay sets per side so the tail spreads across the stereo field. */
function reverb(input, combs, aps) {
    const out = new Float32Array(N);
    const cb = combs.map(d => ({ buf: new Float32Array(d), i: 0, lp: 0 }));
    const ab = aps.map(d => ({ buf: new Float32Array(d), i: 0 }));
    for (let n = 0; n < N; n++) {
        const x = input[n];
        let y = 0;
        for (const c of cb) {
            const o = c.buf[c.i];
            c.lp += 0.28 * (o - c.lp);                 // damping: darker, less metallic
            c.buf[c.i] = x + c.lp * 0.84;
            c.i = (c.i + 1) % c.buf.length;
            y += o;
        }
        y *= 0.25;
        for (const a of ab) {
            const o = a.buf[a.i];
            const v = y + o * -0.5;
            a.buf[a.i] = v;
            a.i = (a.i + 1) % a.buf.length;
            y = o + v * 0.5;
        }
        out[n] = y;
    }
    return out;
}
const revL = reverb(RL, [1557, 1617, 1491, 1422], [225, 556]);
const revR = reverb(RR, [1580, 1640, 1514, 1445], [248, 579]);
for (let i = 0; i < N; i++) { L[i] += revL[i] * 0.55; R[i] += revR[i] * 0.55; }

/* Gentle fade on the last half second so the file never ends on a click */
const fadeN = at(0.5);
for (let i = 0; i < fadeN; i++) { const g = i / fadeN; L[N - 1 - i] *= g; R[N - 1 - i] *= g; }

/* Master: normalise, soft-clip, then normalise again to a -1 dBFS ceiling.
   The tanh stage is what glues it; the final scale keeps true peaks safe. */
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const pre = 1.35 / (peak || 1);
for (let i = 0; i < N; i++) { L[i] = Math.tanh(L[i] * pre); R[i] = Math.tanh(R[i] * pre); }
peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const ceiling = Math.pow(10, -1 / 20);
const post = ceiling / (peak || 1);

/* ---- write 16-bit stereo WAV ------------------------------------------- */
const out = Buffer.alloc(44 + N * 4);
out.write('RIFF', 0); out.writeUInt32LE(36 + N * 4, 4); out.write('WAVE', 8);
out.write('fmt ', 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22);
out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34);
out.write('data', 36); out.writeUInt32LE(N * 4, 40);
let rmsAcc = 0, nan = 0;
for (let i = 0; i < N; i++) {
    let l = L[i] * post, r = R[i] * post;
    if (!isFinite(l) || !isFinite(r)) { nan++; l = r = 0; }
    rmsAcc += l * l + r * r;
    out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(l * 32767))), 44 + i * 4);
    out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(r * 32767))), 46 + i * 4);
}
const file = path.join(__dirname, 'soundtrack.wav');
fs.writeFileSync(file, out);

const rmsDb = 10 * Math.log10(rmsAcc / (N * 2));
console.log(`wrote ${file}`);
console.log(`${DURATION}s @ ${SR}Hz stereo · peak -1.0 dBFS · RMS ${rmsDb.toFixed(1)} dBFS · non-finite samples: ${nan}`);
console.log(`impacts at: ${[0, bar(2), ...cuts].map(s => s.toFixed(1) + 's').join(' ')}`);
