/**
 * High-lift scissor pallet truck, modelled from a product photo.
 *
 *   node cad/pallet-truck.mjs
 *     -> cad/out/high-lift-pallet-truck.step   (assembly: named, coloured parts)
 *     -> cad/out/parts/<name>.step             (each part on its own)
 *     -> cad/out/preview-mesh.json             (for the three.js preview)
 *
 * Dimensions are typical for a narrow (540 mm) high-lift truck, estimated
 * from the photo, not measured: forks 1150 × 160 mm, shown raised with the
 * fork tops at 700 mm. Units: mm. Axes: X along the forks (0 at the
 * backrest face, + toward the tips), Y across, Z up.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ocFactory from './node_modules/replicad-opencascadejs/dist/replicad_single.js';
import { setOC, makeBox, makeCylinder, makeSphere, exportSTEP } from 'replicad';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out');
fs.mkdirSync(path.join(OUT, 'parts'), { recursive: true });
setOC(await ocFactory({ wasmBinary: fs.readFileSync(path.join(HERE, 'node_modules/replicad-opencascadejs/dist/replicad_single.wasm')) }));

const ORANGE = '#f26a1b', BLACK = '#262626', YELLOW = '#ffd200', RED = '#c8102e', STEEL = '#c3c7cd', DARK = '#3a3a3a';

/* ------------------------------------------------------------ dimensions */
const FORK_L = 1150, FORK_W = 160, FORK_H = 55, WALL = 5;
const WIDTH = 540, FY = WIDTH / 2 - FORK_W / 2;           // fork centre lines at y = ±190
const TOP = 700;                                          // fork top height (raised)
const BR_H = 620;                                         // backrest height above the forks

/* --------------------------------------------------------------- helpers */
const box = (x0, y0, z0, x1, y1, z1) => makeBox([x0, y0, z0], [x1, y1, z1]);
// a straight bar of rectangular section w×t from p to q, t across Y
function bar(p, q, w, t, y) {
    const dx = q[0] - p[0], dz = q[1] - p[1], L = Math.hypot(dx, dz), ang = Math.atan2(dz, dx) * 180 / Math.PI;
    return box(0, y - t / 2, -w / 2, L, y + t / 2, w / 2).rotate(-ang, [0, 0, 0], [0, 1, 0]).translate([p[0], 0, p[1]]);
}
// a round tube from a to b
function tube(a, b, r) {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d);
    return makeCylinder(r, L, a, d.map(v => v / L));
}
const fuseAll = list => list.reduce((acc, s) => acc ? acc.fuse(s) : s, null);

/* ------------------------------------------------------------- the parts */
const parts = [];
const add = (name, shape, color) => parts.push({ name, shape, color });

// forks: an inverted channel each, with a bevelled lead-in at the tip
function fork(yc) {
    let f = box(0, yc - FORK_W / 2, TOP - FORK_H, FORK_L, yc + FORK_W / 2, TOP)
        .cut(box(-1, yc - FORK_W / 2 + WALL, TOP - FORK_H - 1, FORK_L - WALL, yc + FORK_W / 2 - WALL, TOP - WALL));
    // bevel: slice the underside of the last 120 mm
    const wedge = box(0, yc - 200, -200, 400, yc + 200, 0).rotate(-14, [0, 0, 0], [0, 1, 0]).translate([FORK_L - 140, 0, TOP - FORK_H]);
    return f.cut(wedge);
}
// fork frame: both forks, the cross beam behind them and the backrest
let frame = fuseAll([
    fork(-FY), fork(FY),
    box(-60, -WIDTH / 2, TOP - 90, 0, WIDTH / 2, TOP),                       // cross beam
    // backrest: two tall side plates and a centre mast plate, tied at the top
    box(-60, -WIDTH / 2, TOP, -48, -WIDTH / 2 + 70, TOP + BR_H),
    box(-60, WIDTH / 2 - 70, TOP, -48, WIDTH / 2, TOP + BR_H),
    box(-60, -110, TOP, -48, 110, TOP + BR_H),
    box(-70, -WIDTH / 2, TOP + BR_H - 60, -40, WIDTH / 2, TOP + BR_H),       // top bar
    box(-70, -WIDTH / 2, TOP + 260, -40, WIDTH / 2, TOP + 300),              // mid bar
    // triangular gussets where the plates meet the forks
    ...[-WIDTH / 2 + 35, WIDTH / 2 - 35].map(y => box(-48, y - 6, TOP, 200, y + 6, TOP + 160)
        .cut(box(-48, y - 10, TOP, 400, y + 10, TOP + 400).rotate(38, [-48, 0, TOP], [0, 1, 0]).translate([0, 0, 0])))
]);
add('Fork Frame', frame, ORANGE);

// scissor: two flat bars per side crossing under each fork, pinned mid-way
const ARM_W = 80, ARM_T = 22, G = 70;                                     // G: foot height above the floor
const A0 = [120, TOP - FORK_H - 30], A1 = [980, G], B0 = [160, G], B1 = [1020, TOP - FORK_H - 30];
for (const [side, yc] of [['L', -FY], ['R', FY]]) {
    const yA = yc - 30, yB = yc + 30;
    add(`Scissor Arm Outer ${side}`, bar(A0, A1, ARM_W, ARM_T, yA), BLACK);
    add(`Scissor Arm Inner ${side}`, bar(B0, B1, ARM_W, ARM_T, yB), BLACK);
    // hazard stripes: thin yellow pads on the outer face of each arm
    const stripes = [];
    for (const [p, q, y, s] of [[A0, A1, yA, -1], [B0, B1, yB, 1]]) {
        const dx = q[0] - p[0], dz = q[1] - p[1], L = Math.hypot(dx, dz);
        for (let u = 90; u < L - 90; u += 110) {
            const a = [p[0] + dx * u / L, p[1] + dz * u / L], b = [p[0] + dx * (u + 50) / L, p[1] + dz * (u + 50) / L];
            stripes.push(bar(a, b, ARM_W - 10, 1.2, y + s * (ARM_T / 2 + .6)));
        }
    }
    add(`Hazard Stripes ${side}`, fuseAll(stripes), YELLOW);
    // pivot pin through the crossing, and the pins at the fork end
    const cx = (A0[0] + A1[0]) / 2, cz = (A0[1] + A1[1]) / 2;
    add(`Pivot Pin ${side}`, fuseAll([
        tube([cx, yc - 50, cz], [cx, yc + 50, cz], 14),
        tube([A0[0], yc - 50, A0[1]], [A0[0], yc + 50, A0[1]], 12),
        tube([B1[0], yc - 50, B1[1]], [B1[0], yc + 50, B1[1]], 12)]), STEEL);
    // ground feet with small rollers at the bottom of each arm
    add(`Ground Foot ${side}`, fuseAll([
        box(A1[0] - 60, yc - 60, 0, A1[0] + 60, yc + 60, 14), box(A1[0] - 25, yA - 16, 14, A1[0] + 25, yA + 16, G),
        box(B0[0] - 60, yc - 60, 0, B0[0] + 60, yc + 60, 14), box(B0[0] - 25, yB - 16, 14, B0[0] + 25, yB + 16, G)]), DARK);
    add(`Foot Roller ${side}`, fuseAll([
        tube([A1[0], yc - 50, G], [A1[0], yc - 20, G], 38), tube([B0[0], yc + 20, G], [B0[0], yc + 50, G], 38)]), RED);
}

// pump unit: chassis block over the steering wheels, hydraulic cylinder up the backrest
const PX = -190;                                                          // steering axle position
add('Pump Chassis', fuseAll([
    box(PX - 90, -120, 150, PX + 90, 120, 330),                            // pump housing
    box(PX - 30, -95, 60, PX + 30, -75, 160), box(PX - 30, 75, 60, PX + 30, 95, 160),   // wheel fork plates
    box(PX + 60, -60, 260, -60, 60, 320),                                  // tie to the cross beam
    box(-130, -60, 320, -70, 60, TOP - 90)                                 // column up to the frame
]), BLACK);
add('Hydraulic Cylinder', tube([-110, 0, 330], [-110, 0, 940], 42), DARK);
add('Piston Rod', tube([-110, 0, 940], [-110, 0, TOP + BR_H - 40], 16), STEEL);
// steering wheels: red tyre on a dark hub
for (const [side, y] of [['L', -45], ['R', 45]]) {
    add(`Steering Wheel ${side}`, tube([PX, y - 25, 90], [PX, y + 25, 90], 90).cut(tube([PX, y - 30, 90], [PX, y + 30, 90], 55)), RED);
    add(`Wheel Hub ${side}`, tube([PX, y - 22, 90], [PX, y + 22, 90], 55), DARK);
}
add('Axle', tube([PX, -100, 90], [PX, 100, 90], 12), STEEL);

// tiller handle: pivots on the chassis, swept back to a loop grip
const H0 = [PX - 40, 0, 330], H1 = [PX - 160, 0, 1050], GW = 110;
add('Handle', fuseAll([
    tube(H0, [H1[0], 0, H1[2] - 10], 18),
    tube([PX - 60, -40, 340], [PX - 60, 40, 340], 22),                    // pivot boss
    // loop grip
    tube([H1[0], -GW, H1[2]], [H1[0], GW, H1[2]], 16),
    tube([H1[0], -GW, H1[2]], [H1[0] - 40, -GW, H1[2] + 200], 16),
    tube([H1[0], GW, H1[2]], [H1[0] - 40, GW, H1[2] + 200], 16),
    tube([H1[0] - 40, -GW, H1[2] + 200], [H1[0] - 40, GW, H1[2] + 200], 18),
    makeSphere(16).translate([H1[0], -GW, H1[2]]), makeSphere(16).translate([H1[0], GW, H1[2]]),
    makeSphere(18).translate([H1[0] - 40, -GW, H1[2] + 200]), makeSphere(18).translate([H1[0] - 40, GW, H1[2] + 200])
]), BLACK);
add('Release Lever', box(H1[0] - 70, -30, H1[2] + 150, H1[0] - 30, 30, H1[2] + 165), RED);

/* ---------------------------------------------------------------- export */
const toBuf = async blob => Buffer.from(await blob.arrayBuffer());
fs.writeFileSync(path.join(OUT, 'high-lift-pallet-truck.step'), await toBuf(exportSTEP(parts.map(p => ({ shape: p.shape, name: p.name, color: p.color })), { unit: 'MM' })));
for (const p of parts) fs.writeFileSync(path.join(OUT, 'parts', p.name.replace(/\s+/g, '-').toLowerCase() + '.step'), await toBuf(p.shape.blobSTEP()));
// meshes for the preview
const meshes = parts.map(p => { const m = p.shape.mesh({ tolerance: .8, angularTolerance: 15 }); return { name: p.name, color: p.color, v: m.vertices, n: m.normals, t: m.triangles }; });
fs.writeFileSync(path.join(OUT, 'preview-mesh.json'), JSON.stringify(meshes));
console.log(`parts: ${parts.length}, assembly: ${(fs.statSync(path.join(OUT, 'high-lift-pallet-truck.step')).size / 1024).toFixed(0)} KB`);
