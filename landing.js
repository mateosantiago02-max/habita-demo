import { createFlyover } from './flyover.js';
import { makeCity, chamferRect } from './city.js';

const M = window.Motion;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const motionOn = !!M && !reduce;
if (motionOn) document.documentElement.classList.add('js-motion');
else document.documentElement.classList.add('no-intro');
const EASE = [0.22, 1, 0.36, 1];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* Logo */
const wm = document.getElementById('wm').innerHTML;
document.querySelectorAll('[data-wm]').forEach(el => (el.innerHTML = wm));

function splitLines(el) {
  if (el.dataset.split) return;
  el.dataset.split = '1';
  el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i).map(s => `<span class="line"><span>${s.trim()}</span></span>`).join('');
}
document.querySelectorAll('[data-lines]').forEach(splitLines);

/* ---------------- Sobrevuelo ---------------- */
const fly = document.getElementById('sobrevuelo');
const stage = fly.querySelector('.fly-stage');
const canvas = stage.querySelector('canvas');
const hero = stage.querySelector('.fly-hero');
const cue = stage.querySelector('.scroll-cue');
const tag = stage.querySelector('.unit-tag');
const flyover = createFlyover(canvas);

const BEATS = [
  { label: 'Inicio', from: 0, to: 0.13, hero: true },
  { label: 'Ciudad', from: 0.16, to: 0.38, k: '01', e: 'La ciudad', t: 'Cada obra nueva<br><em>suma casas a la ciudad.</em>', b: 'Y cada casa se entrega con un manual en papel que casi nadie vuelve a abrir.' },
  { label: 'Obra', from: 0.4, to: 0.56, k: '02', e: 'La obra', t: 'Todo lo que se sabe de la obra,<br><em>en un solo lugar.</em>', b: 'La empresa sube lo que ya tiene: planos, manual de obra, fichas técnicas, fotos o el modelo BIM.' },
  { label: 'Edificio', from: 0.58, to: 0.8, k: '03', e: 'El edificio', t: 'Ordenado por piso,<br><em>vivienda y ambiente.</em>', b: 'Habitá arma el manual de cada unidad a partir de esa documentación.' },
  { label: 'Vivienda', from: 0.82, to: 1.01, k: '04', e: 'La vivienda', t: 'Y cada propietario<br><em>recibe el suyo.</em>', b: 'El mantenimiento, las garantías y los reclamos de su casa, en el celular.' },
];
const beatsEl = stage.querySelector('.beats');
const railEl = stage.querySelector('.fly-rail');
const beats = BEATS.map((b, i) => {
  let el = null;
  if (!b.hero) {
    el = document.createElement('div');
    el.className = 'beat';
    el.innerHTML = `<p class="eyebrow"><b>${b.k}</b>${b.e}</p><h2>${b.t}</h2><p class="beat-b">${b.b}</p>`;
    beatsEl.appendChild(el);
    splitLines(el.querySelector('h2'));
  }
  const li = document.createElement('li');
  li.innerHTML = `<button type="button"><span>${b.label}</span></button>`;
  li.firstChild.onclick = () => scrollTo({ top: fly.offsetTop + (b.from + (b.to - b.from) * 0.5) * (fly.offsetHeight - innerHeight), behavior: 'smooth' });
  railEl.appendChild(li);
  return { ...b, el, li, on: false };
});

function showBeat(b, on) {
  if (!b.el || b.on === on) return;
  b.on = on;
  const el = b.el;
  if (!motionOn) { el.classList.toggle('on', on); return; }
  if (on) {
    el.classList.add('on');
    M.animate(el, { opacity: 1 }, { duration: 0.01 });
    M.animate(el.querySelectorAll('.line > span'), { y: ['110%', '0%'] }, { duration: 0.85, ease: EASE, delay: M.stagger(0.08) });
    M.animate(el.querySelectorAll('.eyebrow, .beat-b'), { opacity: [0, 1], y: [12, 0] }, { duration: 0.6, ease: EASE, delay: M.stagger(0.1, { startDelay: 0.1 }) });
  } else {
    M.animate(el, { opacity: 0 }, { duration: 0.22 }).then(() => { if (!b.on) el.classList.remove('on'); });
  }
}

let target = 0, current = 0;
let introT = 1;
const read = () => { const v = (scrollY - fly.offsetTop) / (fly.offsetHeight - innerHeight); target = Number.isFinite(v) ? clamp(v) : 0; };
function frame() {
  if (!Number.isFinite(current)) current = target;
  current += (target - current) * (reduce ? 1 : 0.09);
  if (Math.abs(target - current) < 0.0003) current = target;
  const p = current;
  flyover.render(p, introT);
  for (const b of beats) {
    const inside = p >= b.from && p < b.to;
    showBeat(b, inside);
    b.li.classList.toggle('on', inside || (b.hero && p < b.from));
  }
  const h = 1 - clamp((p - 0.07) / 0.07);
  hero.style.opacity = h; hero.style.visibility = h < 0.01 ? 'hidden' : 'visible';
  hero.style.translate = `0 ${((1 - h) * -26).toFixed(1)}px`;
  cue.style.opacity = 1 - clamp(p / 0.06);
  const a = flyover.anchor();
  if (a) tag.style.transform = `translate(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px)`;
  tag.classList.toggle('on', !!(a && a.on));
  requestAnimationFrame(frame);
}
addEventListener('scroll', read, { passive: true });
let lastW = innerWidth;
addEventListener('resize', () => { if (matchMedia('(pointer: coarse)').matches && innerWidth === lastW) return; lastW = innerWidth; flyover.resize(); read(); });
read(); current = target; requestAnimationFrame(frame);

/* Nav */
const nav = document.querySelector('.nav');
const navCheck = () => nav.classList.toggle('solid', scrollY > fly.offsetTop + fly.offsetHeight - innerHeight - 20);
addEventListener('scroll', navCheck, { passive: true }); addEventListener('resize', navCheck); navCheck();

/* ---------------- Carga de obra ---------------- */
const lvls = [...document.querySelectorAll('.lvl')];
const docRows = [...document.querySelectorAll('.docs-row[data-l]')];
function setLevel(l, animate) {
  lvls.forEach(b => { b.classList.toggle('on', +b.dataset.level === l); b.setAttribute('aria-selected', +b.dataset.level === l); });
  const changed = [];
  docRows.forEach(r => {
    const on = +r.dataset.l <= l, was = !r.classList.contains('off');
    r.classList.toggle('off', !on);
    r.querySelector('.st em').textContent = on ? 'Leído' : 'No incluido';
    if (on && !was) changed.push(r);
  });
  if (motionOn && animate && changed.length) M.animate(changed, { opacity: [0.42, 1], x: [-6, 0] }, { duration: 0.45, ease: EASE, delay: M.stagger(0.06) });
}
lvls.forEach(b => b.addEventListener('click', () => setLevel(+b.dataset.level, true)));
setLevel(1, false);

/* ---------------- Plan ---------------- */
const PLAN = [
  { t: 'Interruptor diferencial', s: 'Probar el botón de prueba', every: 1 / 12, who: 'Propietario' },
  { t: 'Sifones y cajas', s: 'Baño y cocina, limpios y con agua', every: 1 / 12, who: 'Propietario' },
  { t: 'Aberturas', s: 'Limpiar guías y desagües · repintar cada 3 años', every: 0.5, major: 3, who: 'Propietario' },
  { t: 'Azotea y balcones', s: 'Revisar impermeabilización · renovar a los 10 años', every: 0.5, major: 10, who: 'Administración' },
  { t: 'Llaves de agua y gas', s: 'Revisar llaves de corte y equipos de gas', every: 1, who: 'Técnico' },
  { t: 'Paredes interiores', s: 'Repintar', every: 5, who: 'Propietario' },
  { t: 'Instalaciones', s: 'Revisión general de agua, energía y gas', every: 5, who: 'Técnico' },
  { t: 'Estructura y cubierta', s: 'Inspección con arquitecto o ingeniero', every: 10, who: 'Administración' },
];
const ticks = document.querySelector('.g-ticks');
for (let y = 0; y <= 10; y += 2) ticks.insertAdjacentHTML('beforeend', `<span style="left:${y * 10}%">${y === 0 ? 'Entrega' : 'Año ' + y}</span>`);
const rowsEl = document.querySelector('.g-rows');
for (const r of PLAN) {
  let html = '';
  for (let t = r.every; t <= 10.001; t += r.every) {
    const major = (r.major && Math.abs(t / r.major - Math.round(t / r.major)) < 0.001) || r.every >= 5;
    html += `<i class="g-dot${major ? ' major' : r.every < 0.2 ? ' tiny' : ''}" data-t="${(t / 10).toFixed(4)}" style="left:${(t * 10).toFixed(2)}%"></i>`;
  }
  const freq = r.every < 0.2 ? 'Mensual' : r.every === 0.5 ? 'Cada 6 meses' : r.every === 1 ? 'Anual' : `Cada ${r.every} años`;
  rowsEl.insertAdjacentHTML('beforeend', `<div class="g-row" role="row"><div class="g-name" role="cell"><b>${r.t}</b><small>${freq} · ${r.s}</small></div><div class="g-track" role="cell"><span class="g-fill"></span>${html}</div><span class="g-who" role="cell">${r.who}</span></div>`);
}
const dots = [...rowsEl.querySelectorAll('.g-dot')], fills = rowsEl.querySelectorAll('.g-fill');
const gantt = p => { for (const f of fills) f.style.setProperty('--p', p); for (const d of dots) d.classList.toggle('on', +d.dataset.t <= p + 0.001); };

/* ---------------- App: la lista maneja el teléfono ---------------- */
const frameEl = document.querySelector('.phone iframe');
document.querySelectorAll('.feat button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.feat button').forEach(x => x.classList.toggle('on', x === b));
  try { frameEl.contentWindow.go(b.dataset.go); } catch (e) { /* el iframe todavía carga */ }
}));

/* ---------------- Cierre: trazado de la ciudad ---------------- */
(function ctaPlan() {
  const cv = document.querySelector('.cta canvas'), ctx = cv.getContext('2d'), city = makeCity(23);
  const draw = () => {
    const dpr = Math.min(devicePixelRatio, 2), w = cv.clientWidth, h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const s = Math.max(w, h) / 1300;
    ctx.strokeStyle = 'rgba(244,243,239,.22)'; ctx.lineWidth = 1;
    for (const b of city.blocks) {
      ctx.beginPath(); chamferRect(b.cx, b.cy, b.size, b.ch).forEach(([x, y], i) => { const X = w * 0.55 + x * s, Y = h * 0.75 - (y - 300) * s; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath(); ctx.stroke();
    }
  };
  draw(); addEventListener('resize', draw);
})();

/* ---------------- Frase ---------------- */
const statement = document.querySelector('[data-words]');
const words = [];
(function wrap(node) {
  [...node.childNodes].forEach(n => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
        else { const s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.appendChild(s); words.push(s); }
      });
      n.replaceWith(frag);
    } else wrap(n);
  });
})(statement);

if (!motionOn) {
  gantt(1); words.forEach(w => (w.style.opacity = 1));
  document.querySelectorAll('[data-count]').forEach(el => (el.textContent = el.dataset.count));
} else {
  const { animate, scroll, inView, stagger } = M;
  runIntro();
  scroll(animate('.progress', { scaleX: [0, 1] }, { ease: 'linear' }));
  document.querySelectorAll('main [data-lines]').forEach(el => {
    if (hero.contains(el)) return;
    inView(el, () => { animate(el.querySelectorAll('.line > span'), { y: ['110%', '0%'] }, { duration: 0.95, ease: EASE, delay: stagger(0.09) }); }, { amount: 0.4 });
  });
  const groups = new Map();
  document.querySelectorAll('main [data-reveal]').forEach(el => {
    if (hero.contains(el)) return;
    const p = el.parentElement; if (!groups.has(p)) groups.set(p, []); groups.get(p).push(el);
  });
  groups.forEach((els, parent) => inView(parent, () => { animate(els, { opacity: [0, 1], y: [24, 0] }, { duration: 0.85, ease: EASE, delay: stagger(0.09, { startDelay: 0.1 }) }); }, { amount: 0.12 }));
  document.querySelectorAll('[data-count]').forEach(el => inView(el, () => { animate(0, +el.dataset.count, { duration: 1.5, ease: EASE, onUpdate: v => (el.textContent = Math.round(v)) }); }, { amount: 0.6 }));
  scroll(p => { const n = p * words.length * 1.15; for (let i = 0; i < words.length; i++) words[i].style.opacity = clamp(n - i, 0.16, 1); }, { target: statement, offset: ['start 0.85', 'end 0.5'] });
  scroll(p => gantt(p), { target: rowsEl, offset: ['start 0.75', 'end 0.6'] });
  // los archivos "se leen" uno por uno al entrar
  inView('.docs', () => { animate('.docs-row:not(.off) .st', { opacity: [0, 1], x: [-6, 0] }, { duration: 0.4, delay: stagger(0.12, { startDelay: 0.3 }) }); }, { amount: 0.3 });
}


/* ---------------- Apertura: la manzana se dibuja, aparece la marca, se levanta el telón ---------------- */
function revealPage() {
  const { animate, stagger } = M;
  document.documentElement.style.overflow = '';
  animate(0, 1, { duration: 2, ease: EASE, onUpdate: v => (introT = v) });
  animate(hero.querySelectorAll('.line > span'), { y: ['110%', '0%'] }, { duration: 1.1, ease: EASE, delay: stagger(0.12, { startDelay: 0.25 }) });
  animate('.nav', { opacity: [0, 1], y: [-10, 0] }, { duration: 0.7, ease: EASE, delay: 0.6 });
  animate(railEl.children, { opacity: [0, 1], x: [8, 0] }, { duration: 0.5, delay: stagger(0.06, { startDelay: 0.9 }) });
  animate('.scroll-cue', { opacity: [0, 1] }, { duration: 0.6, delay: 1.2 });
}
function runIntro() {
  const mg = document.querySelector('.intro-mg');
  if (!mg) return;
  if (scrollY > 40) { mg.remove(); return; }
  const { animate, stagger } = M;
  introT = 0;
  document.querySelector('.nav').style.opacity = 0;
  document.documentElement.style.overflow = 'hidden';
  const path = mg.querySelector('.intro-block path');
  const len = path.getTotalLength();
  path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
  const letters = mg.querySelectorAll('.intro-word > span');
  const roof = mg.querySelector('.intro-word .wm-a svg path');
  letters.forEach(l => (l.style.opacity = 0));
  const seq = animate([
    [path, { strokeDashoffset: [len, 0] }, { duration: 0.9, ease: EASE }],
    [path, { fillOpacity: [0, 1] }, { duration: 0.4, at: '-0.15' }],
    [letters, { y: [26, 0], opacity: [0, 1] }, { duration: 0.6, ease: EASE, delay: stagger(0.045), at: '-0.25' }],
    [roof, { strokeDashoffset: [26, 0] }, { duration: 0.5, ease: EASE, at: '-0.05' }],
    [mg, { clipPath: ['inset(0% 0% 0% 0%)', 'inset(0% 0% 100% 0%)'] }, { duration: 1, ease: [0.76, 0, 0.24, 1], at: '+0.5' }],
  ]);
  let revealed = false;
  const go = () => { if (revealed) return; revealed = true; revealPage(); };
  const timer = setTimeout(go, Math.max(0, (seq.duration - 0.85) * 1000));
  const skip = () => { clearTimeout(timer); seq.complete(); go(); };
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(ev => addEventListener(ev, skip, { once: true, passive: true }));
  seq.finished.then(() => { go(); mg.remove(); });
}
