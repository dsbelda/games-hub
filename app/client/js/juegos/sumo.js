'use strict';
// Sumo de bolas: flechas/WASD (o el dedo: mantenlo pulsado hacia donde quieras ir) y espacio para embestir.
(() => {
  const { el, boton } = UI;
  let lz = null, ctxS = null, vS = null, fotos = [], dir = [0, 0], teclas = new Set(), dedo = null, embiste = 0, enviado = '';
  const T = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
  document.addEventListener('keydown', (e) => { if (!vS || e.target.closest('input, textarea')) return; if (T[e.code]) { e.preventDefault(); teclas.add(e.code); } if (e.code === 'Space') { e.preventDefault(); embiste = 16; } });
  document.addEventListener('keyup', (e) => { teclas.delete(e.code); if (e.code === 'Space') embiste = 0; });
  setInterval(() => {
    if (!ctxS || ctxS.fase !== 'juego' || ctxS.yo < 0 || !fotos.length) return;
    let x = 0, y = 0; for (const c of teclas) { x += T[c][0]; y += T[c][1]; }
    if (dedo) { const b = fotos[fotos.length - 1].f.b[ctxS.yo]; if (b) { const dx = dedo.x - b[0], dy = dedo.y - b[1], d = Math.hypot(dx, dy); if (d > 12) { x = dx / d; y = dy / d; } } }
    const s = `${x.toFixed(2)},${y.toFixed(2)},${embiste}`;
    if (s !== enviado) { enviado = s; ctxS.enviar({ tipo: 'mando', x, y, k: embiste }); }
  }, 40);
  function pintar() {
    if (!lz || !vS || !fotos.length) return;
    const g = lz.g, b = fotos[fotos.length - 1], a = fotos[fotos.length - 2] || b, k = Math.min(1, (performance.now() - b.t) / 50), C = vS.centro;
    g.fillStyle = '#4d7cfe'; g.fillRect(0, 0, 600, 600);
    g.fillStyle = '#7fa3ff'; for (let i = 0; i < 12; i++) g.fillRect((i * 97 + performance.now() / 40) % 640 - 20, (i * 53) % 600, 30, 3);
    const r = a.f.r + (b.f.r - a.f.r) * k;
    g.fillStyle = '#1e1b2e'; g.beginPath(); g.arc(C, C + 8, r + 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8d5a8'; g.beginPath(); g.arc(C, C, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#c93a1c'; g.lineWidth = 5; g.beginPath(); g.arc(C, C, r - 6, 0, Math.PI * 2); g.stroke();
    b.f.b.forEach((bb, j) => {
      const ba = a.f.b[j] || bb; if (!bb[2]) return;
      const x = ba[0] + (bb[0] - ba[0]) * k, y = ba[1] + (bb[1] - ba[1]) * k;
      g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(x, y + 16, 20, 7, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1e1b2e'; g.beginPath(); g.arc(x, y, vS.rb + 2, 0, Math.PI * 2); g.fill();
      g.fillStyle = vS.colores[j]; g.beginPath(); g.arc(x, y, vS.rb, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.arc(x - 7, y - 7, 6, 0, Math.PI * 2); g.fill();
      if (j === ctxS.yo) { g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, vS.rb + 6, 0, Math.PI * 2); g.stroke(); }
      if (bb[3] && j === ctxS.yo) { g.fillStyle = '#1e1b2e'; g.fillRect(x - 14, y - 34, 28, 4); }
    });
    if (b.f.pa) window.Lienzo.texto(g, b.f.f === null || b.f.f === undefined ? `¡PREPARADOS! ${b.f.pa}` : b.f.f >= 0 ? `RONDA PARA ${ctxS.nombre(b.f.f).toUpperCase()}` : 'NADIE GANA LA RONDA', 300, 40, { tam: 16, color: '#ffc63d', alinear: 'center' });
  }
  window.JUEGO = {
    evento(ev) { if (ev.tipo !== 'foto') return; fotos.push({ t: performance.now(), f: ev.f }); if (fotos.length > 4) fotos.shift(); },
    render(zona, v, ctx) {
      ctxS = ctx; vS = v;
      if (!fotos.length) fotos.push({ t: performance.now(), f: v.foto });
      const cont = el('div', 'lz-cont');
      if (!lz) {
        lz = window.Lienzo.crear(cont, 600, 600, { clase: 'su-ring' }); lz.g.imageSmoothingEnabled = true;
        lz.c.addEventListener('pointerdown', (e) => { e.preventDefault(); lz.c.setPointerCapture(e.pointerId); dedo = lz.punto(e); });
        lz.c.addEventListener('pointermove', (e) => { if (dedo) dedo = lz.punto(e); });
        for (const n of ['pointerup', 'pointercancel']) lz.c.addEventListener(n, () => { dedo = null; });
        window.Lienzo.bucle(() => {}, pintar);
      } else cont.append(lz.c);
      const marcador = el('div', 'fi-marcador'); v.puntos.forEach((p, j) => { const s = el('span', j === ctx.yo ? 'dibuja' : ''); const pt = el('i', 'oc-punto'); pt.style.background = v.colores[j]; s.append(pt, ` ${ctx.nombre(j)}: ${p}`); marcador.append(s); });
      const emb = UI.mantener(boton('💥 Embestir', null, 'oro su-emb'), () => { embiste = 16; }, () => { embiste = 0; });
      zona.append(marcador, el('p', 'suave centro', `Ronda ${v.ronda} · gana quien llegue a ${v.meta} · flechas/WASD o mantén el dedo hacia donde ir · espacio: embestir`), cont, emb);
    },
  };
})();
