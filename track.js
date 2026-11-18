/* Habitá · medición (Umami) y contacto por WhatsApp.
 *
 * 1. Creá una cuenta gratis en https://cloud.umami.is, agregá el sitio y pegá su "Website ID" abajo.
 * 2. En cada mail mandá el link con el nombre de la empresa:  https://…/habita-demo/?e=constructora-x
 *    Umami muestra qué empresa entró, hasta dónde bajó y si tocó WhatsApp o abrió la app.
 */
(function () {
  const UMAMI_ID = '';            // ← pegá acá el Website ID de Umami
  const WHATSAPP = '59899682512'; // número con código de país, sin "+" ni espacios

  const q = new URLSearchParams(location.search);
  let empresa = '';
  try {
    empresa = (q.get('e') || sessionStorage.getItem('habita-e') || '').trim().slice(0, 60);
    if (empresa) sessionStorage.setItem('habita-e', empresa);
  } catch (e) { /* almacenamiento bloqueado */ }

  const local = /^(localhost|127\.|\[::1\])/.test(location.hostname);
  const embebida = q.has('embed'); // la app dentro del teléfono de la web no cuenta como visita aparte
  if (UMAMI_ID && !local && !embebida) {
    const s = document.createElement('script');
    s.defer = true;
    s.src = 'https://cloud.umami.is/script.js';
    s.dataset.websiteId = UMAMI_ID;
    s.onload = () => { try { if (empresa && window.umami && umami.identify) umami.identify({ empresa }); } catch (e) {} };
    document.head.appendChild(s);
  }

  function track(evento, datos) {
    const d = Object.assign({}, datos || {}, empresa ? { empresa } : {});
    try { if (window.umami) umami.track(evento, d); } catch (e) {}
    try { if (embebida && parent !== window && parent.Habita) parent.Habita.track(evento, Object.assign({ desde: 'app' }, d)); } catch (e) {}
  }

  function waLink() {
    const quien = empresa ? ` (escribo de ${empresa.replace(/[-_]+/g, ' ')})` : '';
    const msg = `Hola Santiago, vi Habitá${quien} y me gustaría verlo en una de nuestras próximas obras.`;
    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
  }

  function wire(root) {
    (root || document).querySelectorAll('[data-wa]').forEach(a => {
      a.href = waLink();
      a.target = '_blank';
      a.rel = 'noopener';
      if (a.dataset.waWired) return;
      a.dataset.waWired = '1';
      a.addEventListener('click', () => track('whatsapp', { origen: a.dataset.wa || 'web' }));
    });
    (root || document).querySelectorAll('[data-open-app]').forEach(a => {
      if (a.dataset.appWired) return;
      a.dataset.appWired = '1';
      a.addEventListener('click', () => track('abrir-app', { origen: a.dataset.openApp || 'web' }));
    });
  }

  window.Habita = { track, waLink, wire, empresa };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => wire());
  else wire();
})();
