'use strict';
// Hockey de aire: mueve el ratón o el dedo por tu mitad (abajo); el mazo lo sigue. También con las flechas.
(() => {
  const { el } = UI;
  let lz = null, ctxH = null, vH = null, fotos = [], obj = [0.5, 0.87], enviado = '', ultimo = 0, golVisto = null;
  const teclas = new Set();
  document.addEventListener('keydown', (e) => { if (vH && /^Arrow/.test(e.code)) { e.preventDefault(); teclas.add(e.code); } });
  document.addEventListener('keyup', (e) => teclas.delete(e.code));
  setInterval(() => {
    if (!ctxH || ctxH.fase !== 'juego' || ctxH.yo < 0) return;
    if (teclas.size) { const d = 0.035; if (teclas.has('ArrowLeft')) obj[0] -= d; if (teclas.has('ArrowRight')) obj[0] += d; if (teclas.has('ArrowUp')) obj[1] -= d * 0.67; if (teclas.has('ArrowDown')) obj[1] += d * 0.67; obj = [Math.max(0, Math.min(1, obj[0])), Math.max(0.5, Math.min(1, obj[1]))]; }
    const s = obj.map((x) => x.toFixed(3)).join();
    if (s !== enviado || performance.now() - ultimo > 1000) { enviado = s; ultimo = performance.now(); ctxH.enviar({ tipo: 'mando', x: obj[0], y: obj[1] }); }
  }, 33);
  function pintar() {
    if (!lz || !vH || !fotos.length) return;
    const g = lz.g, W = vH.ancho, H = vH.alto, yo = ctxH.yo === 1 ? 1 : 0;
    const b = fotos[fotos.length - 1], a = fotos[fotos.length - 2] || b, k = Math.min(1, (performance.now() - b.t) / 50);
    const v = (p, q) => p + (q - p) * k;
    const P = (x, y) => (yo === 0 ? [x, y] : [W - x, H - y]);
    g.fillStyle = '#dff3ff'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#ff5a36'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
    g.beginPath(); g.arc(W / 2, H / 2, 60, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#4d7cfe'; for (const y of [0, H]) { g.beginPath(); g.arc(W / 2, y, 90, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = '#1e1b2e'; g.fillRect(W / 2 - vH.porteria / 2, 0, vH.porteria, 8); g.fillRect(W / 2 - vH.porteria / 2, H - 8, vH.porteria, 8);
    g.strokeStyle = '#1e1b2e'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
    const fa = a.f, fb = b.f;
    const [dx, dy] = P(v(fa.d[0], fb.d[0]), v(fa.d[1], fb.d[1]));
    g.fillStyle = '#1e1b2e'; g.beginPath(); g.arc(dx, dy, vH.rd, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffc63d'; g.beginPath(); g.arc(dx, dy, vH.rd - 4, 0, Math.PI * 2); g.fill();
    fb.m.forEach((m, j) => {
      const ma = fa.m[j] || m, [x, y] = P(v(ma[0], m[0]), v(ma[1], m[1]));
      const col = j === yo ? '#4d7cfe' : '#ff5a36';
      g.fillStyle = '#1e1b2e'; g.beginPath(); g.arc(x, y, vH.rm, 0, Math.PI * 2); g.fill();
      g.fillStyle = col; g.beginPath(); g.arc(x, y, vH.rm - 4, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(x, y, vH.rm * 0.45, 0, Math.PI * 2); g.fill();
    });
    const mis = fb.g[yo], suyos = fb.g[1 - yo];
    window.Lienzo.texto(g, String(suyos), 16, H / 2 - 40, { tam: 24, color: '#ff5a36' });
    window.Lienzo.texto(g, String(mis), 16, H / 2 + 14, { tam: 24, color: '#4d7cfe' });
    if (fb.gol !== null && fb.gol !== undefined) window.Lienzo.texto(g, fb.gol === yo ? '¡GOL!' : 'GOL…', W / 2, H / 2 - 12, { tam: 24, color: fb.gol === yo ? '#3fbf5f' : '#ff5a36', alinear: 'center' });
  }
  window.JUEGO = {
    evento(ev) { if (ev.tipo !== 'foto') return; fotos.push({ t: performance.now(), f: ev.f }); if (fotos.length > 4) fotos.shift(); if (ev.f.gol !== null && ev.f.gol !== golVisto && ev.f.gol === ctxH?.yo && navigator.vibrate) navigator.vibrate(80); golVisto = ev.f.gol; },
    render(zona, v, ctx) {
      ctxH = ctx; vH = v;
      if (!fotos.length) fotos.push({ t: performance.now(), f: v.foto });
      const cont = el('div', 'lz-cont');
      if (!lz) {
        lz = window.Lienzo.crear(cont, v.ancho, v.alto, { clase: 'hk-mesa' }); lz.g.imageSmoothingEnabled = true;
        const mover = (e) => { const p = lz.punto(e); obj = [Math.max(0, Math.min(1, p.x / v.ancho)), Math.max(0.5, Math.min(1, p.y / v.alto))]; };
        lz.c.addEventListener('pointermove', mover); lz.c.addEventListener('pointerdown', (e) => { e.preventDefault(); lz.c.setPointerCapture(e.pointerId); mover(e); });
        window.Lienzo.bucle(() => {}, pintar);
      } else cont.append(lz.c);
      zona.append(el('p', 'suave centro', `A ${v.meta} goles · tu mazo es el azul (abajo): muévelo con el ratón, el dedo o las flechas`), cont);
    },
  };
})();
