/**
 * The BSS robot mascot as narrator, from the supplied artwork (mascot.webp,
 * 1024×1536, transparent). The artwork itself is untouched; two small
 * overlays make it talk:
 *
 *   - mouth: the drawn smile is covered with the visor colour and redrawn in
 *     the same shape and colours, its depth driven by the narration's loudness
 *     (TL.mouth). At rest it keeps a small open smile like the original.
 *   - blink: the open eye is periodically covered and replaced by a closed arc
 *     in the style of the winking eye.
 *
 * Coordinates below are in the artwork's own pixels, measured from a gridded
 * close-up of the face.
 */
(function () {
'use strict';
const VISOR = '#f0f0f0', INK = '#071b45', TONGUE = '#f97102';

const svg = `
<g id="ms">
  <ellipse cx="512" cy="1505" rx="300" ry="34" fill="#000" opacity=".14"/>
  <image href="mascot.webp" x="0" y="0" width="1024" height="1536"/>
  <!-- mouth overlay -->
  <ellipse cx="565" cy="486" rx="78" ry="44" fill="${VISOR}"/>
  <clipPath id="ms-mclip"><path id="ms-mclipP" d=""/></clipPath>
  <path id="ms-mouth" d="" fill="${INK}"/>
  <g clip-path="url(#ms-mclip)">
    <path id="ms-teeth" d="" fill="#ffffff"/>
    <ellipse id="ms-tongue" cx="562" cy="500" rx="40" ry="14" fill="${TONGUE}"/>
  </g>
  <path id="ms-mouthLine" d="" fill="none" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/>
  <!-- blink overlay for the open eye -->
  <g id="ms-blink" opacity="0">
    <ellipse cx="464" cy="410" rx="41" ry="55" fill="${VISOR}"/>
    <path d="M430,418 Q464,388 500,412" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>
  </g>
</g>`;

function mouthPath(d) {
    // top edge slopes up to the right like the original; the lower lip is a
    // deep curve whose depth d (artwork px) is the openness
    return `M503,467 L628,452 Q612,${(452 + d * 1.25).toFixed(1)} 560,${(470 + d).toFixed(1)} Q510,${(467 + d * .95).toFixed(1)} 503,467 Z`;
}

/* opts: talk 0..1, hop 0..1 (impact jump), bounce 0..1 (happy dance), enter 0..1 */
function pose(f, o) {
    const at = (id, k, v) => { const e = document.getElementById(id); if (e) e.setAttribute(k, v); };
    const { talk = 0, hop = 0, bounce = 0, enter = 1 } = o;

    const d = 26 + talk * 40;                       // rest smile → wide open
    const mp = mouthPath(d);
    at('ms-mouth', 'd', mp); at('ms-mclipP', 'd', mp); at('ms-mouthLine', 'd', mp);
    const tw = Math.min(13, d * .32);
    at('ms-teeth', 'd', `M506,468 L626,453 L626,${(453 + tw).toFixed(1)} L506,${(468 + tw).toFixed(1)} Z`);
    at('ms-tongue', 'cy', (470 + d - 9).toFixed(1));
    at('ms-tongue', 'rx', Math.min(54, 22 + d * .5).toFixed(1));
    at('ms-tongue', 'ry', Math.min(17, 4 + d * .22).toFixed(1));

    const ph = f % 112, dbl = Math.floor(f / 112) % 3 === 2 && ph > 7 && ph < 10;
    at('ms-blink', 'opacity', ph < 3 || dbl ? 1 : 0);

    // whole body: sway on the feet, breathe, nod with speech, hop on impacts,
    // a little dance when things are going well; slides up on entry
    const sway = Math.sin(f * .04) * 1.6 + talk * Math.sin(f * .3) * 1.2;
    const breathe = 1 + Math.sin(f * .06) * .012;
    const lift = talk * 15 + hop * 150 + Math.abs(Math.sin(f * .28)) * 45 * bounce;
    at('ms', 'transform',
        `translate(0,${(-lift + (1 - enter) * 1700).toFixed(1)}) rotate(${sway.toFixed(2)} 512 1500) translate(512,1500) scale(${(1 / Math.sqrt(breathe)).toFixed(4)},${breathe.toFixed(4)}) translate(-512,-1500)`);
}

window.MASCOT = { svg, pose };
})();
