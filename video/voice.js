/**
 * Builds the Thai voice-over track: video/voice.wav
 *
 *   node video/voice.js
 *
 * Each line is synthesised separately with Microsoft's th-TH-NiwatNeural voice
 * (via the Edge read-aloud service), slowed and pitched down slightly for a
 * heavier read, then placed at its cue. Cues are in seconds and line up with
 * the scene cuts in timeline.js. The script fails loudly if any line runs into
 * the next cue, rather than letting two lines overlap in the final mix.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const T = require('./timeline.js');

const VOICE = 'th-TH-NiwatNeural';
const SR = 44100;
const DURATION = T.TOTAL / T.FPS;
const TMP = path.join(__dirname, '.voice-tmp');

// [cue in seconds, line]. Numbers are written out so they are read the way a
// Thai announcer would say them, not digit by digit.
const SCRIPT = [
    [ 4.0, 'บีเอสเอส โซลูชั่น'],
    [ 5.7, 'ผู้เชี่ยวชาญ ระบบสายพานลำเลียง'],
    [ 8.2, 'รับทำสายพานลำเลียง... ครบวงจร'],
    [11.0, 'ออกแบบ ผลิต ติดตั้ง ซ่อมบำรุง'],
    [14.3, 'จบในที่เดียว ตั้งแต่ออกแบบ จนส่งมอบหน้างาน'],
    [20.3, 'สายพาน พีวีซี พียู ลูกกลิ้ง โซ่ สกรูลำเลียง'],
    [23.8, 'ทำได้ทุกแบบ'],
    [26.5, 'ทำไมต้อง บีเอสเอส?'],
    [30.3, 'ออกแบบโดยวิศวกร ติดตั้งโดยช่างผู้ชำนาญ'],
    [33.4, 'พร้อมบริการหลังการขาย ถึงหน้างาน'],
    [36.5, 'กว่าห้าร้อยโปรเจกต์ ที่ส่งมอบแล้ว'],
    [39.4, 'ครอบคลุม หกจังหวัด'],
    [50.0, 'ผลงาน... จากทีมเรา'],
    [54.3, 'บีเอสเอส โซลูชั่น หนึ่งเก้าเจ็ดแปด'],
    [57.0, 'โทร ศูนย์สอง สามหนึ่งเจ็ด ห้าสี่เจ็ดศูนย์']
];

function decode(file) {
    // mono float PCM at the project rate
    const r = spawnSync(ffmpeg, ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'],
        { maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0) throw new Error('decode failed: ' + r.stderr);
    return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4);
}

async function synth(text, i) {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    const dir = path.join(TMP, String(i));
    fs.mkdirSync(dir, { recursive: true });
    // a touch slower and lower than default: weight, not speed
    const { audioFilePath } = await tts.toFile(dir, text, { rate: '-6%', pitch: '-4Hz' });
    tts.close && tts.close();
    return audioFilePath;
}

(async () => {
    fs.rmSync(TMP, { recursive: true, force: true });
    const N = Math.ceil(DURATION * SR);
    const out = new Float32Array(N);
    const report = [];

    for (let i = 0; i < SCRIPT.length; i++) {
        const [cue, text] = SCRIPT[i];
        const pcm = decode(await synth(text, i));

        // trim leading/trailing silence so the cue is where speech starts
        let a = 0, b = pcm.length - 1;
        while (a < b && Math.abs(pcm[a]) < 0.01) a++;
        while (b > a && Math.abs(pcm[b]) < 0.01) b--;
        const line = pcm.subarray(Math.max(0, a - 200), Math.min(pcm.length, b + 2000));

        const len = line.length / SR;
        const next = i + 1 < SCRIPT.length ? SCRIPT[i + 1][0] : DURATION;
        report.push({ cue, len, end: cue + len, next, text });
        if (cue + len > next - 0.05) {
            throw new Error(`line ${i + 1} ("${text}") runs ${(cue + len - next).toFixed(2)}s into the next cue — shorten it or move the cue`);
        }
        const s0 = Math.round(cue * SR);
        for (let j = 0; j < line.length && s0 + j < N; j++) out[s0 + j] += line[j];
    }

    // write raw, then let ffmpeg do the voice chain: cut rumble, add chest,
    // add presence, compress so every word sits at the same level
    const raw = path.join(TMP, 'raw.f32');
    fs.writeFileSync(raw, Buffer.from(out.buffer));
    const wav = path.join(__dirname, 'voice.wav');
    const r = spawnSync(ffmpeg, ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', raw,
        '-af', [
            'highpass=f=80',
            'equalizer=f=140:t=q:w=1:g=3',      // chest
            'equalizer=f=3200:t=q:w=1.2:g=3',   // presence / intelligibility
            'acompressor=threshold=-20dB:ratio=4:attack=5:release=120:makeup=4',
            'alimiter=limit=0.85'
        ].join(','),
        '-ac', '2', wav], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(r.stderr);
    fs.rmSync(TMP, { recursive: true, force: true });

    console.log(`wrote ${wav}`);
    for (const l of report) {
        const gap = l.next - l.end;
        console.log(`${l.cue.toFixed(1).padStart(5)}s  ${l.len.toFixed(2)}s  gap ${gap.toFixed(2)}s  ${l.text}`);
    }
})().catch(e => { console.error(e.message); process.exit(1); });
