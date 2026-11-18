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
  { label: 'Ciudad', from: 0.16, to: 0.38, t: 'Cada obra nueva suma<br>viviendas a la ciudad', b: 'Y después de la entrega, cada vivienda puede tener reclamos.' },
  { label: 'Obra', from: 0.4, to: 0.56, t: 'Los documentos de la obra,<br>en un solo lugar', b: 'Planos, planillas, fichas técnicas, garantías o el modelo BIM.' },
  { label: 'Edificio', from: 0.58, to: 0.8, t: 'Cada vivienda con sus<br>garantías y responsables', b: 'Para cada elemento, Habitá sabe quién responde y hasta cuándo.' },
  { label: 'Vivienda', from: 0.82, to: 1.01, t: 'Cuando algo falla,<br>el reclamo llega completo', b: 'Con foto, con la garantía revisada y asignado a quien corresponde.' },
];
const beatsEl = stage.querySelector('.beats');
const railEl = stage.querySelector('.fly-rail');
const beats = BEATS.map((b, i) => {
  let el = null;
  if (!b.hero) {
    el = document.createElement('div');
    el.className = 'beat';
    el.innerHTML = `<h2>${b.t}</h2><p class="beat-b">${b.b}</p>`;
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
    M.animate(el.querySelectorAll('.beat-b'), { opacity: [0, 1], y: [12, 0] }, { duration: 0.6, ease: EASE, delay: M.stagger(0.1, { startDelay: 0.1 }) });
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
  { t: 'Aberturas', s: 'Limpiar guías y desagües. Repintar cada 3 años', every: 0.5, major: 3, who: 'Propietario' },
  { t: 'Azotea y balcones', s: 'Revisar impermeabilización. Renovarla a los 10 años', every: 0.5, major: 10, who: 'Administración' },
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
  rowsEl.insertAdjacentHTML('beforeend', `<div class="g-row" role="row"><div class="g-name" role="cell"><b>${r.t}</b><small>${freq}. ${r.s}</small></div><div class="g-track" role="cell"><span class="g-fill"></span>${html}</div><span class="g-who" role="cell">${r.who}</span></div>`);
}
const dots = [...rowsEl.querySelectorAll('.g-dot')], fills = rowsEl.querySelectorAll('.g-fill');
const gantt = p => { for (const f of fills) f.style.setProperty('--p', p); for (const d of dots) d.classList.toggle('on', +d.dataset.t <= p + 0.001); };

/* ---------------- App: la lista maneja el teléfono ---------------- */
const H = window.Habita || { track() {} };
const frameEl = document.querySelector('.phone iframe');
document.querySelectorAll('.feat button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.feat button').forEach(x => x.classList.toggle('on', x === b));
  try { frameEl.contentWindow.go(b.dataset.go); } catch (e) { /* el iframe todavía carga */ }
}));

/* ---------------- Panel de la empresa ---------------- */
const ptabs = [...document.querySelectorAll('[data-ptab]')];
const pviews = [...document.querySelectorAll('[data-pview]')];
function drawSignature(view) {
  const sig = view.querySelector('.sig');
  if (!sig || !motionOn) return;
  const l = sig.getTotalLength();
  sig.style.strokeDasharray = l;
  M.animate(sig, { strokeDashoffset: [l, 0] }, { duration: 1.6, ease: 'easeInOut', delay: 0.25 });
}
function showPanel(k) {
  ptabs.forEach(b => b.classList.toggle('on', b.dataset.ptab === k));
  pviews.forEach(v => v.classList.toggle('on', v.dataset.pview === k));
  const v = pviews.find(x => x.dataset.pview === k);
  if (!motionOn || !v) return;
  M.animate(v.querySelectorAll('.p-head, .kpis, .claims, .acta, .rep, .p-note'), { opacity: [0, 1], y: [10, 0] }, { duration: 0.45, ease: EASE, delay: M.stagger(0.05) });
  if (k === 'reportes') v.querySelectorAll('.bars i').forEach((el, i) => M.animate(el, { scaleX: [0, +getComputedStyle(el).getPropertyValue('--w')] }, { duration: 0.9, ease: EASE, delay: 0.15 + i * 0.07 }));
  if (k === 'acta') drawSignature(v);
}
ptabs.forEach(b => b.addEventListener('click', () => { showPanel(b.dataset.ptab); H.track('panel-' + b.dataset.ptab); }));

// Un reclamo nuevo se clasifica y se asigna solo
const newRow = document.querySelector('.c-new');
function routeClaim() {
  const tagEl = newRow.querySelector('.c-route .tag'), who = newRow.querySelector('.c-who'), st = newRow.querySelector('.st');
  tagEl.className = 'tag ok'; tagEl.textContent = 'En garantía hasta 2036 (impermeabilización)';
  who.textContent = 'Impermeabilizaciones del Este';
  st.className = 'st run'; st.textContent = 'Asignado hoy';
  if (motionOn) M.animate([tagEl, who, st], { opacity: [0, 1], scale: [0.94, 1] }, { duration: 0.45, ease: EASE, delay: M.stagger(0.18) });
}
if (newRow) {
  if (!motionOn) routeClaim();
  else M.inView(newRow, () => {
    M.animate(newRow, { opacity: [0, 1], y: [-14, 0] }, { duration: 0.6, ease: EASE, delay: 0.3 });
    setTimeout(routeClaim, 1700);
  }, { amount: 0.8 });
}

/* ---------------- Medición: hasta dónde bajó y qué vio ---------------- */
const depths = [25, 50, 75, 100];
addEventListener('scroll', () => {
  const p = (scrollY + innerHeight) / document.documentElement.scrollHeight * 100;
  while (depths.length && p >= depths[0] - 1) H.track('scroll-' + depths.shift());
}, { passive: true });
if (M) ['posventa', 'carga', 'app', 'empresas', 'demo'].forEach(id => {
  const el = document.getElementById(id);
  if (el) M.inView(el, () => { H.track('vio-' + id); }, { amount: 0.35 });
});

/* WhatsApp flotante en el celular, una vez pasada la apertura */
const waFloat = document.querySelector('.wa-float');
const ctaSec = document.getElementById('demo');
addEventListener('scroll', () => {
  const ctaTop = ctaSec.getBoundingClientRect().top;
  waFloat.classList.toggle('on', scrollY > innerHeight * 0.9 && ctaTop > innerHeight * 0.6);
}, { passive: true });

/* ---------------- Cierre: trazado de la ciudad ---------------- */
(function ctaPlan() {
  const cv = document.querySelector('.cta canvas'), ctx = cv.getContext('2d'), city = makeCity(23);
  const draw = () => {
    const dpr = Math.min(devicePixelRatio, 2), w = cv.clientWidth, h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const s = Math.max(w, h) / 1300;
    ctx.strokeStyle = 'rgba(238, 240, 239,.22)'; ctx.lineWidth = 1;
    for (const b of city.blocks) {
      ctx.beginPath(); chamferRect(b.cx, b.cy, b.size, b.ch).forEach(([x, y], i) => { const X = w * 0.55 + x * s, Y = h * 0.75 - (y - 300) * s; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath(); ctx.stroke();
    }
  };
  draw(); addEventListener('resize', draw);
})();

/* ---------------- Movimiento ----------------
   Un solo momento orquestado (carga + apertura). El resto del movimiento responde a algo:
   el plan se llena con el scroll porque muestra el paso del tiempo, y el panel reacciona al tocarlo. */
if (!motionOn) {
  gantt(1);
} else {
  const { animate, scroll } = M;
  runIntro();
  scroll(animate('.progress', { scaleX: [0, 1] }, { ease: 'linear' }));
  scroll(p => gantt(p), { target: rowsEl, offset: ['start 0.75', 'end 0.6'] });
}


/* ---------------- Apertura: la manzana se dibuja, aparece la marca, se levanta el telón ---------------- */
function revealPage() {
  const { animate, stagger } = M;
  document.documentElement.style.overflow = '';
  animate(0, 1, { duration: 2, ease: EASE, onUpdate: v => (introT = v) });
  animate(hero.querySelectorAll('.line > span'), { y: ['110%', '0%'] }, { duration: 1.1, ease: EASE, delay: stagger(0.12, { startDelay: 0.25 }) });
  animate('.hero-eyebrow, [data-hero-fade]', { opacity: [0, 1], y: [14, 0] }, { duration: 0.8, ease: EASE, delay: stagger(0.12, { startDelay: 0.55 }) });
  animate('.nav', { opacity: [0, 1], y: [-10, 0] }, { duration: 0.7, ease: EASE, delay: 0.6 });
  animate(railEl.children, { opacity: [0, 1], x: [8, 0] }, { duration: 0.5, delay: stagger(0.06, { startDelay: 0.9 }) });
  animate('.scroll-cue', { opacity: [0, 1] }, { duration: 0.6, delay: 1.2 });
}
/* Pantalla de carga: el edificio se levanta piso por piso al ritmo de la carga real
   (fuentes, imágenes y la app embebida), con un mínimo para que se lea y un máximo para no hacer esperar. */
function runIntro() {
  const mg = document.querySelector('.intro-mg');
  if (!mg) return;
  if (scrollY > 40) { mg.remove(); return; }
  const { animate, stagger } = M;
  introT = 0;
  document.querySelector('.nav').style.opacity = 0;
  document.documentElement.style.overflow = 'hidden';

  const NS = 'http://www.w3.org/2000/svg';
  const winsG = mg.querySelector('.bld-wins');
  const wins = [];
  for (let f = 0; f < 5; f++) for (let c = 0; c < 3; c++) {
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('x', 26 + c * 25); r.setAttribute('y', 124 - 22 * (f + 1) + 7);
    r.setAttribute('width', 15); r.setAttribute('height', 9); r.setAttribute('rx', 1.5);
    winsG.appendChild(r);
    wins.push({ r, at: (f + 0.55 + c * 0.12) / 5, on: false });
  }
  const rise = mg.querySelector('.bld-rise');
  const strokes = ['.bld-ground', '.bld-line', '.bld-roof'].map(s => mg.querySelector(s));
  strokes.forEach(p => { const l = p.getTotalLength(); p.style.strokeDasharray = l; p.style.strokeDashoffset = l; p.dataset.l = l; });
  const [ground, line, roofB] = strokes;
  const pctEl = mg.querySelector('.intro-pct b'), stepEl = mg.querySelector('.intro-step'), bar = mg.querySelector('.intro-bar i');
  const letters = mg.querySelectorAll('.intro-word > span'), wmRoof = mg.querySelector('.intro-word .wm-a svg path'), tagEl = mg.querySelector('.intro-tag');
  letters.forEach(l => (l.style.opacity = 0)); tagEl.style.opacity = 0;
  const STEPS = ['Leyendo planos', 'Ubicando viviendas', 'Cargando garantías', 'Asignando subcontratistas'];

  animate(ground, { strokeDashoffset: [+ground.dataset.l, 0] }, { duration: 0.6, ease: EASE });
  animate(line, { strokeDashoffset: [+line.dataset.l, 0] }, { duration: 1, ease: EASE, delay: 0.15 });

  let loaded = false;
  const t0 = performance.now(), MIN = 1900, MAX = 4500;
  const pageLoad = new Promise(r => (document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true })));
  Promise.all([document.fonts ? document.fonts.ready : 0, pageLoad]).then(() => (loaded = true));
  setTimeout(() => (loaded = true), MAX);

  let shown = 0, raf = 0, timer = 0, finished = false, revealed = false, lastT = performance.now();
  const go = () => { if (revealed) return; revealed = true; revealPage(); };
  const tick = () => {
    const now = performance.now(), dt = Math.min(now - lastT, 500); lastT = now;
    const timeP = Math.min(1, (now - t0) / MIN);
    const target = Math.min(timeP, loaded ? 1 : 0.86);
    shown += (target - shown) * (1 - Math.pow(0.86, dt / 16.7)); // igual de rápido con 60 o con 10 cuadros por segundo
    if (target === 1 && shown > 0.97) shown = 1;
    rise.style.transform = `scaleY(${(shown * 0.98).toFixed(4)})`;
    for (const w of wins) if (!w.on && shown >= w.at) { w.on = true; animate(w.r, { opacity: [0, 1] }, { duration: 0.25 }); }
    pctEl.textContent = Math.round(shown * 100);
    bar.style.transform = `scaleX(${shown.toFixed(4)})`;
    stepEl.textContent = shown >= 1 ? 'Listo' : STEPS[Math.min(STEPS.length - 1, Math.floor(shown * STEPS.length))];
    if (shown >= 1 && !finished) return finale();
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  // Red de seguridad: pase lo que pase, a los 6,5 s se entra a la página
  setTimeout(() => { if (!revealed) { cancelAnimationFrame(raf); finished = true; mg.remove(); go(); } }, 6500);

  function finale() {
    finished = true;
    const seq = animate([
      [roofB, { strokeDashoffset: [+roofB.dataset.l, 0] }, { duration: 0.45, ease: EASE }],
      [letters, { y: [26, 0], opacity: [0, 1] }, { duration: 0.6, ease: EASE, delay: stagger(0.045), at: '-0.25' }],
      [wmRoof, { strokeDashoffset: [26, 0] }, { duration: 0.5, ease: EASE, at: '-0.1' }],
      [tagEl, { opacity: [0, 1], y: [8, 0] }, { duration: 0.5, at: '-0.35' }],
      [mg, { clipPath: ['inset(0% 0% 0% 0%)', 'inset(0% 0% 100% 0%)'] }, { duration: 1, ease: [0.76, 0, 0.24, 1], at: '+0.6' }],
    ]);
    timer = setTimeout(go, Math.max(0, (seq.duration - 0.85) * 1000));
    seq.finished.then(() => { go(); mg.remove(); });
  }

  // Quien no quiere esperar, con tocar o scrollear entra directo
  const skip = () => {
    cancelAnimationFrame(raf); clearTimeout(timer); finished = true;
    animate(mg, { opacity: 0 }, { duration: 0.35 }).finished.then(() => mg.remove());
    go();
  };
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(ev => addEventListener(ev, skip, { once: true, passive: true }));
}
