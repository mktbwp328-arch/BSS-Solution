/**
 * The BSS robot mascot as narrator, from the supplied front-facing artwork
 * (mascot2.webp, 1024×1536, transparent). Coordinates are the artwork's own
 * pixels, measured from gridded close-ups.
 *
 * The artwork is used as is; it is cut, not redrawn:
 *   - arms: each arm is clipped out along its outline and drawn as its own
 *     layer, pivoting at the shoulder. The base layer has the arms masked
 *     away, so a raised arm leaves no ghost behind.
 *   - mouth: the drawn smile is covered with the visor colour and redrawn in
 *     the same shape and colours, its depth driven by the narration's
 *     loudness (TL.mouth). At rest it keeps a small open smile.
 *   - blink: both eyes are covered for a few frames by closed arcs.
 */
(function () {
'use strict';
const VISOR = '#f5f6f8', INK = '#071b45', TONGUE = '#fc8000';
const IMG = 'mascot2.webp';

// Cut lines follow the measured gap between fingertips and thigh, row by row;
// a straight cut clipped a sliver of the leg outline into the arm layer.
const ARM_L = '232,600 322,600 320,790 305,880 296,960 298,1060 300,1110 262,1140 240,1162 100,1162 100,880 150,760 200,640';
const ARM_R = '792,600 702,600 704,790 719,880 728,960 726,1060 724,1110 762,1140 784,1162 924,1162 924,880 874,760 824,640';
const PIV_L = [275, 680], PIV_R = [749, 680];

const svg = `
<g id="ms">
  <defs>
    <mask id="ms-noArms" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1536">
      <rect width="1024" height="1536" fill="#fff"/>
      <polygon points="${ARM_L}" fill="#000"/><polygon points="${ARM_R}" fill="#000"/>
    </mask>
    <clipPath id="ms-clipL"><polygon points="${ARM_L}"/></clipPath>
    <clipPath id="ms-clipR"><polygon points="${ARM_R}"/></clipPath>
    <clipPath id="ms-mclip"><path id="ms-mclipP" d=""/></clipPath>
  </defs>
  <ellipse cx="512" cy="1505" rx="330" ry="34" fill="#000" opacity=".28"/>
  <!-- arms first, so the shoulder edge tucks under the body -->
  <g id="ms-armL"><image href="${IMG}" width="1024" height="1536" clip-path="url(#ms-clipL)"/></g>
  <g id="ms-armR"><image href="${IMG}" width="1024" height="1536" clip-path="url(#ms-clipR)"/></g>
  <image href="${IMG}" width="1024" height="1536" mask="url(#ms-noArms)"/>
  <!-- mouth overlay -->
  <ellipse cx="512" cy="510" rx="74" ry="38" fill="${VISOR}"/>
  <path id="ms-mouth" d="" fill="${INK}"/>
  <g clip-path="url(#ms-mclip)">
    <path id="ms-teeth" d="" fill="#ffffff"/>
    <ellipse id="ms-tongue" cx="512" cy="530" rx="40" ry="14" fill="${TONGUE}"/>
  </g>
  <path id="ms-mouthLine" d="" fill="none" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/>
  <!-- blink -->
  <g id="ms-blink" opacity="0">
    <ellipse cx="404" cy="418" rx="47" ry="62" fill="${VISOR}"/><ellipse cx="617" cy="418" rx="47" ry="62" fill="${VISOR}"/>
    <path d="M366,426 Q404,452 442,426 M579,426 Q617,452 655,426" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
  </g>
</g>`;

const mouthPath = d =>
    `M448,481 Q512,474 576,479 Q570,${(479 + d * 1.1).toFixed(1)} 512,${(481 + d).toFixed(1)} Q454,${(481 + d).toFixed(1)} 448,481 Z`;

/* opts: talk 0..1, hop 0..1, armL/armR degrees (outward positive), dance 0..1, enter 0..1 */
function pose(f, o) {
    const at = (id, k, v) => { const e = document.getElementById(id); if (e) e.setAttribute(k, v); };
    const { talk = 0, hop = 0, armL = 0, armR = 0, dance = 0, enter = 1 } = o;

    const d = 30 + talk * 38;
    const mp = mouthPath(d);
    at('ms-mouth', 'd', mp); at('ms-mclipP', 'd', mp); at('ms-mouthLine', 'd', mp);
    const tw = Math.min(14, d * .3);
    at('ms-teeth', 'd', `M452,482 Q512,476 572,480 L572,${(480 + tw).toFixed(1)} Q512,${(476 + tw).toFixed(1)} 452,${(482 + tw).toFixed(1)} Z`);
    at('ms-tongue', 'cy', (481 + d - 10).toFixed(1));
    at('ms-tongue', 'rx', Math.min(56, 22 + d * .5).toFixed(1));
    at('ms-tongue', 'ry', Math.min(18, 4 + d * .22).toFixed(1));

    const ph = f % 112, dbl = Math.floor(f / 112) % 3 === 2 && ph > 7 && ph < 10;
    at('ms-blink', 'opacity', ph < 3 || dbl ? 1 : 0);

    // arms: SVG rotation is clockwise-positive with y down, so a hand hanging
    // below the shoulder swings OUTWARD with a positive angle on the left arm
    // and a negative one on the right. (The signs were the other way round and
    // tucked the arms in behind the body.)
    const idle = Math.sin(f * .07) * 2.5;
    at('ms-armL', 'transform', `rotate(${(armL + idle).toFixed(2)} ${PIV_L[0]} ${PIV_L[1]})`);
    at('ms-armR', 'transform', `rotate(${(-armR - idle).toFixed(2)} ${PIV_R[0]} ${PIV_R[1]})`);

    const sway = Math.sin(f * .04) * 1.4 + talk * Math.sin(f * .3) * 1.1 + dance * Math.sin(f * .28) * 3;
    const breathe = 1 + Math.sin(f * .06) * .012;
    const lift = talk * 14 + hop * 140 + Math.abs(Math.sin(f * .28)) * 50 * dance;
    at('ms', 'transform',
        `translate(0,${(-lift + (1 - enter) * 1700).toFixed(1)}) rotate(${sway.toFixed(2)} 512 1500) translate(512,1500) scale(${(1 / Math.sqrt(breathe)).toFixed(4)},${breathe.toFixed(4)}) translate(-512,-1500)`);
}

window.MASCOT = { svg, pose };
})();
