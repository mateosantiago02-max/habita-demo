/* Montevideo abstracta: trazado de manzanas con ochava, costa con bahía, rambla, parques y torres.
   Coordenadas en metros: x hacia el este, y hacia el norte. Determinístico (misma semilla, misma ciudad). */
export function makeCity(seed = 11) {
  let s = seed >>> 0;
  const rnd = () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const P = 96, B = 78, CH = 10;
  const coast = x => -170 + 60 * Math.sin(x / 380) - 120 * Math.exp(-(((x + 330) / 230) ** 2)) + 50 * Math.exp(-(((x - 620) / 200) ** 2));
  const blocks = [], lots = [], towers = [], trees = [];
  for (let i = -11; i <= 11; i++) for (let j = -1; j <= 10; j++) {
    const cx = i * P + (j % 2 ? 6 : 0), cy = j * P;
    const minY = cy - B / 2;
    if (minY < coast(cx - B / 2) + 62 || minY < coast(cx + B / 2) + 62) continue;
    const r = rnd();
    const park = r < 0.07;
    const tower = !park && r > 0.07 && r < 0.125;
    const block = { cx, cy, park, tower, size: B, ch: CH };
    blocks.push(block);
    if (park) {
      for (let k = 0; k < 26; k++) trees.push({ x: cx + (rnd() - 0.5) * (B - 14), y: cy + (rnd() - 0.5) * (B - 14), r: 4 + rnd() * 4, park: true });
      continue;
    }
    const base = 10 + rnd() * 18;
    const sides = [
      [cx - B / 2, cy - B / 2, 1, 0], [cx + B / 2, cy - B / 2, 0, 1], [cx + B / 2, cy + B / 2, -1, 0], [cx - B / 2, cy + B / 2, 0, -1],
    ];
    for (const [sx, sy, dx, dy] of sides) {
      let t = CH + 1;
      while (t < B - CH - 6) {
        const w = Math.min(10 + rnd() * 10, B - CH - 1 - t);
        const d = 18 + rnd() * 8, h = Math.max(6, base + (rnd() - 0.5) * 14);
        const ax = sx + dx * t, ay = sy + dy * t;
        const nx = -dy, ny = dx; // normal hacia adentro
        const x1 = Math.min(ax, ax + dx * w, ax + nx * d), x2 = Math.max(ax, ax + dx * w, ax + nx * d);
        const y1 = Math.min(ay, ay + dy * w, ay + ny * d), y2 = Math.max(ay, ay + dy * w, ay + ny * d);
        lots.push({ x: (x1 + x2) / 2, y: (y1 + y2) / 2, w: x2 - x1, d: y2 - y1, h });
        t += w + 0.6;
      }
    }
    if (tower) towers.push({ x: cx, y: cy, w: 30, d: 30, h: 80 + rnd() * 70 });
  }
  // árboles de la rambla
  for (let x = -1150; x <= 1150; x += 22) trees.push({ x, y: coast(x) + 40, r: 3.2, park: false });
  // la torre protagonista: la torre más cercana a la costa, cerca del centro
  let hero = towers[0], best = Infinity;
  for (const t of towers) { const d = Math.abs(t.x + 150) + (t.y - coast(t.x)) * 1.4; if (d < best) { best = d; hero = t; } }
  hero.hero = true; hero.h = Math.max(hero.h, 130);
  return { P, B, CH, coast, blocks, lots, towers, trees, hero, xmin: -1150, xmax: 1150, ymax: 10.6 * P };
}

export function chamferRect(cx, cy, size, ch) {
  const h = size / 2;
  return [[cx - h + ch, cy - h], [cx + h - ch, cy - h], [cx + h, cy - h + ch], [cx + h, cy + h - ch], [cx + h - ch, cy + h], [cx - h + ch, cy + h], [cx - h, cy + h - ch], [cx - h, cy - h + ch]];
}
