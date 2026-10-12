/**
 * Narrator avatar — an original anime-style streamer bust for BSS: brown hair,
 * gaming headset with boom mic, brand-orange hoodie with a BSS badge.
 *
 * Exposes window.AVATAR = { svg, pose(f, opts) }. Everything is a function of
 * the frame number. Lip sync reads TL.mouth (the narration's own loudness per
 * frame, written by video/cartoon/build-audio.js).
 *
 * Local coordinates: 400 × 460, origin top-left, chin around y 300.
 */
(function () {
'use strict';
const SKIN = '#ffe2cc', SKIN2 = '#f3c2a2', LINE = '#3a2620', HAIR = '#5b3925', HAIR2 = '#7e5237', HAIRD = '#3f2618';
const HOOD = '#ff8a2b', HOOD2 = '#e2701c', SET = '#2f3542', SET2 = '#47505f';

const svg = `
<g id="av">
  <ellipse cx="200" cy="452" rx="170" ry="16" fill="#000" opacity=".12"/>
  <g id="av-body">
    <!-- hoodie -->
    <path d="M28,460 Q36,372 112,344 L160,332 Q200,352 240,332 L288,344 Q364,372 372,460 Z" fill="${HOOD}" stroke="${LINE}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M112,344 Q96,392 104,460 M288,344 Q304,392 296,460" fill="none" stroke="${HOOD2}" stroke-width="6" stroke-linecap="round"/>
    <path d="M150,334 Q200,392 250,334 Q236,372 200,382 Q164,372 150,334 Z" fill="${HOOD2}" stroke="${LINE}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M178,372 L172,430 M222,372 L228,430" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
    <circle cx="172" cy="434" r="6" fill="#fff" stroke="${LINE}" stroke-width="2.5"/><circle cx="228" cy="434" r="6" fill="#fff" stroke="${LINE}" stroke-width="2.5"/>
    <rect x="262" y="392" width="62" height="30" rx="6" fill="#fff" stroke="${LINE}" stroke-width="3" transform="rotate(-6 293 407)"/>
    <text x="293" y="414" font-family="Kanit, sans-serif" font-weight="800" font-size="19" text-anchor="middle" fill="${HOOD2}" transform="rotate(-6 293 407)">BSS</text>
    <!-- neck -->
    <path d="M172,286 L170,342 Q200,358 230,342 L228,286 Z" fill="${SKIN}" stroke="${LINE}" stroke-width="3.5"/>
    <path d="M172,300 Q200,326 228,300 L228,318 Q200,338 172,318 Z" fill="${SKIN2}"/>
  </g>
  <g id="av-head">
    <!-- back hair -->
    <g id="av-hairB"><path d="M96,236 Q70,120 150,74 Q206,46 262,72 Q334,108 306,238 Q300,270 284,282 L116,282 Q100,268 96,236 Z" fill="${HAIRD}" stroke="${LINE}" stroke-width="4" stroke-linejoin="round"/></g>
    <!-- ears -->
    <path d="M104,208 Q84,206 88,232 Q92,254 112,250" fill="${SKIN}" stroke="${LINE}" stroke-width="3.5"/>
    <path d="M296,208 Q316,206 312,232 Q308,254 288,250" fill="${SKIN}" stroke="${LINE}" stroke-width="3.5"/>
    <!-- face -->
    <path d="M106,180 Q104,248 140,282 Q170,308 200,310 Q230,308 260,282 Q296,248 294,180 Q292,112 200,108 Q108,112 106,180 Z" fill="${SKIN}" stroke="${LINE}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M110,172 Q150,206 200,196 Q250,206 290,172 L292,150 Q200,138 108,150 Z" fill="${SKIN2}" opacity=".8"/>
    <ellipse cx="146" cy="262" rx="20" ry="9" fill="#ff9b9b" opacity=".45"/>
    <ellipse cx="254" cy="262" rx="20" ry="9" fill="#ff9b9b" opacity=".45"/>
    <!-- brows -->
    <path id="av-brL" d="M132,176 Q152,166 176,172" fill="none" stroke="${HAIRD}" stroke-width="5" stroke-linecap="round"/>
    <path id="av-brR" d="M224,172 Q248,166 268,176" fill="none" stroke="${HAIRD}" stroke-width="5" stroke-linecap="round"/>
    <!-- eyes -->
    <g id="av-eyeL">
      <path d="M126,214 Q152,192 182,210 Q178,240 154,242 Q130,240 126,214 Z" fill="#fff" stroke="${LINE}" stroke-width="2.5"/>
      <g id="av-irL"><circle cx="156" cy="220" r="17" fill="#8a4b1f"/><path d="M139,214 Q156,200 173,214 L173,220 L139,220 Z" fill="#5a2c10"/><circle cx="156" cy="221" r="8" fill="#2a160a"/>
        <circle cx="162" cy="213" r="5" fill="#fff"/><circle cx="150" cy="228" r="2.5" fill="#fff"/></g>
      <path d="M122,214 Q152,186 186,208" fill="none" stroke="#2a1a14" stroke-width="6.5" stroke-linecap="round"/>
      <path d="M182,206 L190,198" stroke="#2a1a14" stroke-width="4" stroke-linecap="round"/>
    </g>
    <g id="av-eyeR">
      <path d="M218,210 Q248,192 274,214 Q270,240 246,242 Q222,240 218,210 Z" fill="#fff" stroke="${LINE}" stroke-width="2.5"/>
      <g id="av-irR"><circle cx="244" cy="220" r="17" fill="#8a4b1f"/><path d="M227,214 Q244,200 261,214 L261,220 L227,220 Z" fill="#5a2c10"/><circle cx="244" cy="221" r="8" fill="#2a160a"/>
        <circle cx="250" cy="213" r="5" fill="#fff"/><circle cx="238" cy="228" r="2.5" fill="#fff"/></g>
      <path d="M214,208 Q248,186 278,214" fill="none" stroke="#2a1a14" stroke-width="6.5" stroke-linecap="round"/>
      <path d="M218,206 L210,198" stroke="#2a1a14" stroke-width="4" stroke-linecap="round"/>
    </g>
    <!-- closed / happy eyes, swapped in for blinks and smiles -->
    <path id="av-shutL" d="M126,222 Q154,234 182,220" fill="none" stroke="#2a1a14" stroke-width="6" stroke-linecap="round" opacity="0"/>
    <path id="av-shutR" d="M218,220 Q246,234 274,222" fill="none" stroke="#2a1a14" stroke-width="6" stroke-linecap="round" opacity="0"/>
    <path d="M198,248 L194,262 L202,263" fill="none" stroke="${SKIN2}" stroke-width="3.5" stroke-linecap="round"/>
    <!-- mouth -->
    <g id="av-mouthG" transform="translate(200,284)">
      <path id="av-mOpen" d="M-16,0 Q0,0 16,0 Q14,14 0,14 Q-14,14 -16,0 Z" fill="#7a2a2e" stroke="${LINE}" stroke-width="3"/>
      <path id="av-tongue" d="M-9,9 Q0,4 9,9 Q6,13 0,13 Q-6,13 -9,9 Z" fill="#ff8e94"/>
      <path id="av-mClosed" d="M-14,-2 Q0,8 14,-2" fill="none" stroke="${LINE}" stroke-width="3.5" stroke-linecap="round"/>
    </g>
    <!-- front hair: bangs and side locks -->
    <g id="av-hairF">
      <path d="M100,196 Q96,104 170,92 Q240,80 288,116 Q312,140 302,206 L290,170 L276,200 L262,150 L246,186 L230,140 L212,180 L198,136 L180,182 L168,142 L150,186 L140,150 L124,200 L118,166 Z"
            fill="${HAIR}" stroke="${LINE}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M100,196 Q92,232 108,262 L118,214 Z M302,206 Q312,236 294,264 L284,214 Z" fill="${HAIR}" stroke="${LINE}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M150,104 Q196,92 246,104" fill="none" stroke="${HAIR2}" stroke-width="9" stroke-linecap="round"/>
      <path id="av-ahoge" d="M206,92 Q196,52 228,40 Q214,62 222,90" fill="${HAIR}" stroke="${LINE}" stroke-width="3.5" stroke-linejoin="round"/>
    </g>
    <!-- headset -->
    <path d="M92,214 Q84,64 200,56 Q316,64 308,214" fill="none" stroke="${SET}" stroke-width="15" stroke-linecap="round"/>
    <path d="M92,214 Q84,64 200,56 Q316,64 308,214" fill="none" stroke="${SET2}" stroke-width="5" stroke-linecap="round"/>
    <rect x="70" y="196" width="40" height="70" rx="16" fill="${SET}" stroke="${LINE}" stroke-width="3.5"/>
    <rect x="290" y="196" width="40" height="70" rx="16" fill="${SET}" stroke="${LINE}" stroke-width="3.5"/>
    <circle cx="90" cy="231" r="11" fill="${HOOD}"/><circle cx="310" cy="231" r="11" fill="${HOOD}"/>
    <path d="M86,256 Q96,318 158,300" fill="none" stroke="${SET}" stroke-width="8" stroke-linecap="round"/>
    <rect id="av-mic" x="150" y="290" width="30" height="20" rx="10" fill="#1f232b" stroke="${LINE}" stroke-width="3"/>
    <circle id="av-micLed" cx="172" cy="300" r="3.5" fill="#ff5a3c"/>
  </g>
</g>`;

/* opts: talk 0..1, mood 'neutral'|'worried'|'think'|'happy', look -1..1 (x), lookY */
function pose(f, o) {
    const at = (id, k, v) => { const e = document.getElementById(id); if (e) e.setAttribute(k, v); };
    const { talk = 0, mood = 'neutral', look = .6, lookY = 0, enter = 1 } = o;

    // breathing and an idle sway; talking adds a little nod
    const breath = Math.sin(f * .055) * 2.2;
    at('av-body', 'transform', `translate(0,${breath.toFixed(2)})`);
    const tilt = Math.sin(f * .031) * 2.2 + talk * Math.sin(f * .27) * 2.2 + (mood === 'think' ? 5 : 0) + (mood === 'worried' ? -3 : 0);
    const nod = -talk * 4 + Math.sin(f * .055 + .6) * 1.2;
    at('av-head', 'transform', `translate(0,${nod.toFixed(2)}) rotate(${tilt.toFixed(2)} 200 300)`);
    // hair trails the head: back hair lags, the ahoge bounces
    at('av-hairB', 'transform', `rotate(${(-tilt * .25).toFixed(2)} 200 100)`);
    at('av-ahoge', 'transform', `rotate(${(Math.sin(f * .21) * 6 + talk * 8 * Math.sin(f * .4)).toFixed(2)} 214 90)`);

    // eyes: look toward the content, blink every ~3.5s with the odd double blink
    const ph = f % 104, dbl = (Math.floor(f / 104) % 3 === 1) && ph > 8 && ph < 12;
    const blink = ph < 4 || dbl;
    const happyEyes = mood === 'happy' && talk < .15 && Math.floor(f / 45) % 2 === 0;
    const shut = blink || happyEyes;
    ['L', 'R'].forEach(s => {
        at('av-eye' + s, 'opacity', shut ? 0 : 1);
        at('av-shut' + s, 'opacity', shut ? 1 : 0);
        at('av-shut' + s, 'd', happyEyes
            ? (s === 'L' ? 'M128,224 Q154,198 182,222' : 'M218,222 Q246,198 272,224')
            : (s === 'L' ? 'M126,222 Q154,234 182,220' : 'M218,220 Q246,234 274,222'));
        at('av-ir' + s, 'transform', `translate(${(look * 6).toFixed(1)},${(lookY * 5).toFixed(1)})`);
    });

    // brows carry most of the mood
    const br = { neutral: [0, 0], worried: [5, -14], think: [-6, 6], happy: [-5, 0] }[mood];
    at('av-brL', 'transform', `translate(0,${br[0]}) rotate(${br[1]} 154 172)`);
    at('av-brR', 'transform', `translate(0,${mood === 'think' ? br[0] - 6 : br[0]}) rotate(${-br[1]} 246 172)`);

    // mouth: closed line when quiet, open shape scaled by the voice's loudness
    const open = talk > .08;
    const h = 4 + talk * 22, w = 14 + talk * 6;
    at('av-mOpen', 'd', `M${-w},0 Q0,${mood === 'happy' ? 4 : 0} ${w},0 Q${w - 2},${h} 0,${h} Q${-(w - 2)},${h} ${-w},0 Z`);
    at('av-mOpen', 'opacity', open ? 1 : 0);
    at('av-tongue', 'opacity', open && talk > .35 ? 1 : 0);
    at('av-tongue', 'transform', `translate(0,${(h - 13).toFixed(1)})`);
    at('av-mClosed', 'opacity', open ? 0 : 1);
    at('av-mClosed', 'd', mood === 'worried' ? 'M-12,4 Q0,-4 12,4' : mood === 'happy' ? 'M-16,-4 Q0,12 16,-4' : 'M-14,-2 Q0,8 14,-2');
    at('av-micLed', 'opacity', open ? 1 : .35);

    at('av', 'transform', `translate(0,${((1 - enter) * 520).toFixed(1)})`);
}

window.AVATAR = { svg, pose };
})();
