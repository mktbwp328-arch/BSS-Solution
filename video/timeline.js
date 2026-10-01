/**
 * The one timing source for both picture and sound.
 *
 * scene.html loads this as a <script>; music.js require()s it. Every scene cut
 * is a whole number of bars, so it lands on a downbeat, and the music places
 * its impact hits on exactly these frames. Change a scene length here and both
 * the edit and the soundtrack move together — they cannot drift apart.
 *
 * 120 BPM at 30fps makes a beat exactly 15 frames and a bar exactly 60 frames
 * (2 seconds). Integer frame counts mean no cut ever falls between frames.
 */
(function (root) {
    'use strict';

    const FPS  = 30;
    const BPM  = 120;
    const BEAT = FPS * 60 / BPM;     // 15 frames
    const BAR  = BEAT * 4;           // 60 frames = 2.0s
    const BARS = 30;                 // 60 seconds
    const TOTAL = BAR * BARS;        // 1800 frames

    // [id, first bar, bar after last]
    const SCENE_BARS = [
        ['s1',  0,  4],   //  0–8s   logo         · intro, builds
        ['s2',  4,  7],   //  8–14s  hook         · DROP A lands on the cut
        ['s3',  7, 10],   // 14–20s  services
        ['s4', 10, 13],   // 20–26s  product range
        ['s5', 13, 15],   // 26–30s  why us       · breakdown, beat drops out
        ['s6', 15, 18],   // 30–36s  process      · DROP B lands on the cut
        ['s7', 18, 21],   // 36–42s  numbers
        ['s8', 21, 27],   // 42–54s  montage      · cuts accelerate with the beat
        ['s9', 27, 30]    // 54–60s  contact      · final impact, ring out
    ];

    const SCENES = SCENE_BARS.map(([id, a, b]) => ({ id, from: a * BAR, to: b * BAR }));

    // Musical sections, in bars. music.js arranges the parts from these.
    const SECTIONS = {
        intro:     [0, 4],
        dropA:     [4, 13],
        breakdown: [13, 15],
        dropB:     [15, 27],
        outro:     [27, 30]
    };

    /* Montage cut points: a shot every two beats for three bars, then every
       beat for three bars. Halving the shot length mid-scene is what makes the
       montage feel like it is speeding up into the ending. */
    const MONTAGE_CUTS = [];
    {
        const start = 21 * BAR;
        for (let f = start; f < start + 3 * BAR; f += BEAT * 2) MONTAGE_CUTS.push(f);
        for (let f = start + 3 * BAR; f < 27 * BAR; f += BEAT) MONTAGE_CUTS.push(f);
    }

    const T = { FPS, BPM, BEAT, BAR, BARS, TOTAL, SCENES, SECTIONS, MONTAGE_CUTS };

    if (typeof module !== 'undefined' && module.exports) module.exports = T;
    else root.TIMELINE = T;
})(typeof window !== 'undefined' ? window : globalThis);
