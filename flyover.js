/* Sobrevuelo en línea: el trazado de Montevideo se dibuja con el scroll, la cámara baja hacia una
   manzana y en su esquina ochavada se levanta un volumen blanco macizo, con un piso y una vivienda marcados. */
import { makeCity, chamferRect } from './city.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };
const lerp = (a, b, t) => a + (b - a) * t;

export function createFlyover(canvas, opts = {}) {
  const ctx = canvas.getContext('2d');
  const city = makeCity(opts.seed || 11);
  const COL = { bg: '#F4F3EF', ink: '30,35,33', rio: '79,127,132', oliva: '142,154,59', olivaSolid: '#8E9A3B', olivaSoft: '#E3E7C8' };

  // manzana protagonista: la de la torre elegida por la ciudad; el volumen va en su esquina sureste (hacia la rambla)
  const heroBlock = city.blocks.find(b => b.cx === city.hero.x && b.cy === city.hero.y) || city.blocks[0];
  const h2 = heroBlock.size / 2, X = heroBlock.cx + h2, Y = heroBlock.cy - h2, ch = heroBlock.ch, L = 36;
  const lot = [[X - L, Y], [X - ch, Y], [X, Y + ch], [X, Y + L], [X - L, Y + L]]; // sigue la ochava
  const FLOORS = 11, FH = 4.2, HV = FLOORS * FH, FLOOR = 3;
  const K = [0, 1]; // dirección de la altura en el plano (proyección oblicua)
  const lotC = [X - L * 0.45, Y + L * 0.45];

  const blocks = city.blocks.map(b => {
    const pts = chamferRect(b.cx, b.cy, b.size, b.ch);
    let len = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], c = pts[(i + 1) % pts.length]; len += Math.hypot(a[0] - c[0], a[1] - c[1]); }
    return { ...b, pts, len, d: Math.hypot(b.cx - heroBlock.cx, b.cy - heroBlock.cy) };
  });
  const maxD = Math.max(...blocks.map(b => b.d));
  const coastPts = []; for (let x = -1300; x <= 1300; x += 12) coastPts.push([x, city.coast(x)]);

  let W = 0, H = 0, dpr = 1, cam = { x: 0, y: 0, s: 1 }, anchor = null;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  const toS = (x, y) => [W * cam.ax + (x - cam.x) * cam.s, H * cam.ay - (y - cam.y) * cam.s];
  const up = (p, z) => [p[0] + K[0] * z, p[1] + K[1] * z];
  const path = pts => { ctx.beginPath(); pts.forEach((p, i) => { const q = toS(p[0], p[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); };

  function render(p, intro = 1) {
    const desk = W > 900;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);

    // cámara: de la ciudad entera a la esquina de la manzana
    const z = smooth(clamp((p - 0.12) / 0.5));
    const rise = smooth(clamp((p - 0.56) / 0.22));
    const s0 = Math.min(W, H) / (desk ? 1350 : 900);
    const s1 = Math.min(W * 0.5 / (L + 30), H * 0.66 / (L * 0.6 + HV * K[1] + 20));
    cam.s = Math.exp(lerp(Math.log(s0), Math.log(s1), z));
    cam.x = lerp(desk ? -60 : -150, lotC[0] + HV * K[0] * 0.5 * rise, z);
    cam.y = lerp(260, lotC[1] + HV * K[1] * 0.45 * rise, z);
    cam.ax = desk ? lerp(0.6, 0.64, z) : 0.5; cam.ay = desk ? 0.54 : lerp(0.42, 0.4, z);
    const lw = 1;

    // río y costa
    ctx.beginPath(); coastPts.forEach((c, i) => { const q = toS(c[0], c[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
    let q = toS(1300, -3000); ctx.lineTo(q[0], q[1]); q = toS(-1300, -3000); ctx.lineTo(q[0], q[1]); ctx.closePath();
    ctx.fillStyle = `rgba(${COL.rio},.09)`; ctx.fill();
    const draw = clamp(0.32 + p / 0.3) * intro;
    for (const [o, a, w] of [[0, 0.9, 1.6], [-16, 0.4, 1], [-34, 0.22, 1], [-56, 0.12, 1]]) {
      ctx.beginPath(); coastPts.forEach((c, i) => { const r = toS(c[0], c[1] + o); i ? ctx.lineTo(r[0], r[1]) : ctx.moveTo(r[0], r[1]); });
      ctx.strokeStyle = `rgba(${COL.rio},${a * draw})`; ctx.lineWidth = w * lw; ctx.stroke();
    }
    ctx.beginPath(); coastPts.forEach((c, i) => { const r = toS(c[0], c[1] + 40); i ? ctx.lineTo(r[0], r[1]) : ctx.moveTo(r[0], r[1]); });
    ctx.setLineDash([5, 6]); ctx.strokeStyle = `rgba(${COL.ink},${0.3 * draw})`; ctx.lineWidth = lw; ctx.stroke(); ctx.setLineDash([]);

    // manzanas que se dibujan desde la protagonista hacia afuera
    for (const b of blocks) {
      const local = clamp(draw * 1.7 - (b.d / maxD) * 0.85);
      if (local <= 0) continue;
      path(b.pts);
      if (b.park) { ctx.fillStyle = `rgba(${COL.oliva},${0.16 * local})`; ctx.fill(); }
      const len = b.len * cam.s;
      ctx.setLineDash([len * local, len]);
      const isHero = b === heroBlock;
      ctx.strokeStyle = isHero ? `rgba(${COL.ink},${0.75})` : `rgba(${COL.ink},${0.42 - 0.18 * z})`;
      ctx.lineWidth = (isHero ? 1.4 : 1) * lw; ctx.stroke(); ctx.setLineDash([]);
    }

    // lote en la esquina: se marca antes de levantarse
    const mark = smooth(clamp((p - 0.46) / 0.1));
    if (mark > 0) { path(lot); ctx.fillStyle = `rgba(${COL.oliva},${0.18 * mark * (1 - rise)})`; ctx.fill(); ctx.strokeStyle = `rgba(${COL.ink},${0.8 * mark})`; ctx.lineWidth = 1.4; ctx.stroke(); }

    anchor = null;
    if (rise > 0) {
      const hv = HV * rise;
      // sombra proyectada hacia el sureste
      const sh = [hv * 0.62, -hv * 0.34];
      ctx.fillStyle = `rgba(${COL.ink},${0.1 * rise})`;
      for (let i = 0; i < lot.length; i++) {
        const a = lot[i], b = lot[(i + 1) % lot.length];
        path([a, b, [b[0] + sh[0], b[1] + sh[1]], [a[0] + sh[0], a[1] + sh[1]]]); ctx.fill();
      }
      path(lot.map(v => [v[0] + sh[0], v[1] + sh[1]])); ctx.fill();

      // caras laterales visibles (normal opuesta a la dirección de la altura), sombreadas según orientación
      const faces = [];
      for (let i = 0; i < lot.length; i++) {
        const a = lot[i], b = lot[(i + 1) % lot.length];
        const n = [b[1] - a[1], -(b[0] - a[0])]; const nl = Math.hypot(n[0], n[1]); n[0] /= nl; n[1] /= nl;
        const vis = n[0] * K[0] + n[1] * K[1];
        if (vis < -1e-6) faces.push({ a, b, n, i });
      }
      const shade = n => { const l = 0.5 + 0.5 * (n[0] * -0.6 + n[1] * -0.8); return Math.round(lerp(212, 236, l)); };
      for (const f of faces) {
        path([f.a, f.b, up(f.b, hv), up(f.a, hv)]);
        const g = shade(f.n); ctx.fillStyle = `rgb(${g},${g},${g - 4})`; ctx.fill();
        ctx.strokeStyle = `rgba(${COL.ink},.55)`; ctx.lineWidth = 1; ctx.stroke();
      }
      // piso marcado y vivienda
      const hl = smooth(clamp((p - 0.8) / 0.08));
      const unit = smooth(clamp((p - 0.88) / 0.07));
      const z1 = FLOOR * FH, z2 = z1 + FH;
      if (hl > 0 && hv > z2) {
        for (const f of faces) {
          path([up(f.a, z1), up(f.b, z1), up(f.b, z2), up(f.a, z2)]);
          ctx.fillStyle = `rgba(${COL.oliva},${0.32 * hl})`; ctx.fill();
          ctx.strokeStyle = `rgba(${COL.ink},${0.5 * hl})`; ctx.lineWidth = 1; ctx.stroke();
        }
        // la vivienda: la cara de la ochava y la mitad de la cara este
        const ochava = faces.find(f => f.i === 1), sur = faces.find(f => f.i === 0);
        const unitFaces = [];
        if (ochava) unitFaces.push([ochava.a, ochava.b]);
        if (sur) unitFaces.push([[sur.a[0] + (sur.b[0] - sur.a[0]) * 0.55, sur.a[1] + (sur.b[1] - sur.a[1]) * 0.55], sur.b]);
        if (!unitFaces.length && faces[0]) unitFaces.push([faces[0].a, faces[0].b]);
        for (const [a, b] of unitFaces) {
          path([up(a, z1), up(b, z1), up(b, z2), up(a, z2)]);
          ctx.fillStyle = `rgba(${COL.oliva},${unit})`; ctx.fill();
        }
        if (unitFaces[0]) {
          const [a, b] = unitFaces[0], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], c = up(m, (z1 + z2) / 2);
          anchor = { x: toS(c[0], c[1])[0], y: toS(c[0], c[1])[1], on: unit > 0.5 };
        }
      }
      // tapa
      path(lot.map(v => up(v, hv))); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.strokeStyle = `rgba(${COL.ink},.6)`; ctx.lineWidth = 1.1; ctx.stroke();
      // aristas verticales
      for (const f of faces) for (const v of [f.a, f.b]) { const s1 = toS(v[0], v[1]), s2 = toS(...up(v, hv)); ctx.beginPath(); ctx.moveTo(s1[0], s1[1]); ctx.lineTo(s2[0], s2[1]); ctx.strokeStyle = `rgba(${COL.ink},.55)`; ctx.stroke(); }
    }
  }
  resize();
  return { resize, render, anchor: () => anchor, city };
}
