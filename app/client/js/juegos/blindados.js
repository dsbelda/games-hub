'use strict';
// Tanques mejorables: WASD para moverte, ratón para apuntar, clic para disparar, E disparo automático,
// 1-5 para mejorar. En el móvil, mantén el dedo: el tanque va hacia él, apunta y dispara.
(() => {
  const { el, boton } = UI;
  const A = window.Arena;
  const st = A.crear();
  // E: disparo automático (interruptor; el bit 4 queda puesto mientras está activo)
  document.addEventListener('keydown', (e) => { if (e.code !== 'KeyE' || e.repeat || e.target.closest('input, textarea') || !st.v) return; st.mando.k ^= 4; UI.aviso(st.mando.k & 4 ? 'Disparo automático activado' : 'Disparo automático desactivado'); });
  st.lz.c.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') st.mando.k |= 64; });
  for (const n of ['pointerup', 'pointercancel']) st.lz.c.addEventListener(n, () => { st.mando.k &= ~64; });
  const figs = new Map();
  const cam = { x: 1200, y: 1200 };
  const FIG = { c: ['#ffc63d', '#d99a12', 4, 11], t: ['#ff5a36', '#c93a1c', 3, 13], p: ['#4d7cfe', '#2f55c4', 5, 22] };
  const STATS = [['dano', 'Daño'], ['bala', 'Velocidad de bala'], ['recarga', 'Recarga'], ['vida', 'Blindaje'], ['motor', 'Motor']];
  const CLASES = [['doble', 'Doble', 'Dos cañones'], ['francotirador', 'Francotirador', 'Lejos y fuerte'], ['ametralladora', 'Ametralladora', 'Muchas balas']];
  const CANONES = { b: [[0, 22, 9]], d: [[-7, 22, 7], [7, 22, 7]], f: [[0, 30, 8]], a: [[0, 20, 12]] };
  let ctxB = null;
  document.addEventListener('keydown', (e) => { if (!ctxB || e.target.closest('input, textarea')) return; const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].indexOf(e.code); if (i >= 0 && st.v?.mio?.puntos > 0) ctxB.enviar({ tipo: 'mejora', s: STATS[i][0] }); });
  function poligono(g, x, y, lados, r, rot) { g.beginPath(); for (let i = 0; i < lados; i++) { const a = rot + i * 2 * Math.PI / lados; g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); }
  function pintar(g) {
    const m = A.marco(st); if (!m) return;
    const tanques = A.mezclar(m.a.k, m.b.k, m.k, [2, 3]);
    const mi = A.yo(st)?.id, mio = tanques.find((t) => t[1] === mi);
    if (mio) { cam.x += (mio[2] - cam.x) * 0.25; cam.y += (mio[3] - cam.y) * 0.25; }
    const z = mio && mio[7] === 'f' ? 0.62 : 0.75;
    const pos = A.rejilla(g, cam, st.v.mapa, z, '#e8e6e0', '#d8d5cc', 40);
    const t0 = performance.now() / 1000;
    for (const [, f] of figs) {
      const [x, y] = pos(f[2], f[3]); const d = FIG[f[1]]; const r = d[3] * z; if (x < -r || y < -r || x > A.W + r || y > A.H + r) continue;
      poligono(g, x, y, d[2], r, f[4] + t0 * 0.3); g.fillStyle = d[0]; g.fill(); g.lineWidth = 3; g.strokeStyle = d[1]; g.stroke();
      if (f[5] < 100) { g.fillStyle = '#1e1b2e'; g.fillRect(x - r, y + r + 4, 2 * r, 4); g.fillStyle = '#3fbf5f'; g.fillRect(x - r, y + r + 4, 2 * r * f[5] / 100, 4); }
    }
    // balas (extrapoladas desde la última foto)
    const ultima = st.fotos[st.fotos.length - 1], dtB = ultima ? Math.min(0.1, (performance.now() - ultima.t) / 1000) : 0;
    for (const b of m.b.b) { const [x, y] = pos(b[0] + b[2] * dtB, b[1] + b[3] * dtB); g.fillStyle = '#1e1b2e'; g.beginPath(); g.arc(x, y, (b[4] + 2) * z, 0, Math.PI * 2); g.fill(); g.fillStyle = A.colorDe(st, b[5]); g.beginPath(); g.arc(x, y, b[4] * z, 0, Math.PI * 2); g.fill(); }
    for (const t of tanques) {
      const [x, y] = pos(t[2], t[3]); const col = A.colorDe(st, t[1]);
      g.save(); g.translate(x, y); g.rotate(t[4]); g.scale(z, z);
      for (const [lado, largo, ancho] of CANONES[t[7]] || CANONES.b) { g.fillStyle = '#1e1b2e'; g.fillRect(0, lado - ancho / 2 - 2, largo + 4, ancho + 4); g.fillStyle = '#9aa0b5'; g.fillRect(0, lado - ancho / 2, largo + 2, ancho); }
      g.restore();
      g.fillStyle = '#1e1b2e'; g.beginPath(); g.arc(x, y, 20 * z, 0, Math.PI * 2); g.fill();
      g.fillStyle = t[8] ? '#ffffff' : col; g.beginPath(); g.arc(x, y, 17 * z, 0, Math.PI * 2); g.fill();
      if (t[5] < 100) { g.fillStyle = '#1e1b2e'; g.fillRect(x - 20 * z, y + 26 * z, 40 * z, 5); g.fillStyle = t[5] > 40 ? '#3fbf5f' : '#ff5a36'; g.fillRect(x - 20 * z, y + 26 * z, 40 * z * t[5] / 100, 5); }
      g.font = 'bold 12px Rubik, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#1e1b2e'; g.fillText(`${A.nombreDe(st, t[1])} · ${t[6]}`, x, y - 30 * z - 6); g.textAlign = 'left';
    }
    A.tabla(g, st, m.b.t);
    A.minimapa(g, st.v.mapa, tanques.map((t) => [t[2], t[3], t[1] === mi ? '#fff' : A.colorDe(st, t[1]), t[1] === mi ? 5 : 3]), cam);
    A.cartel(g, st, '¡TANQUE DESTRUIDO!');
  }
  const base = A.enganchar(st, pintar, (f) => { if (f.n) for (const x of f.n) figs.set(x[0], x); if (f.x) for (const id of f.x) figs.delete(id); });
  window.JUEGO = {
    evento: base.evento,
    render(zona, v, ctx) {
      ctxB = ctx;
      figs.clear(); for (const f of v.figs) figs.set(f[0], f);
      base.render(zona, v, ctx, 'WASD para moverte · ratón para apuntar · clic para disparar · E disparo automático · 1-5 mejoras · en el móvil, mantén el dedo');
      const hud = el('div', 'bl-hud');
      const m = v.mio;
      if (m) {
        const barra = el('div', 'bl-xp'); const i = el('i'); i.style.width = `${Math.min(100, (m.xp - m.ant) / Math.max(1, m.sig - m.ant) * 100)}%`; barra.append(i, el('span', null, `Nivel ${m.nivel} · ${m.xp} puntos`));
        hud.append(barra);
        if (m.puedeClase) { const f = el('div', 'bl-clases'); f.append(el('b', null, '¡Nivel 10! Elige clase:')); for (const [id, n, d] of CLASES) { const b = boton(n, () => ctx.enviar({ tipo: 'clase', c: id }), 'oro'); b.title = d; f.append(b); } hud.append(f); }
        const mej = el('div', 'bl-mejoras' + (m.puntos ? ' hay' : ''));
        mej.append(el('b', null, m.puntos ? `Mejoras (${m.puntos} punto${m.puntos > 1 ? 's' : ''})` : 'Mejoras'));
        STATS.forEach(([id, nombre], k) => { const b = boton(`${k + 1}. ${nombre}`, () => ctx.enviar({ tipo: 'mejora', s: id }), 'mini'); b.disabled = !m.puntos || m.stats[id] >= 7; const pips = el('span', 'bl-pips'); for (let q = 0; q < 7; q++) pips.append(el('i', q < m.stats[id] ? 'si' : '')); b.append(pips); mej.append(b); });
        hud.append(mej);
      }
      zona.append(hud);
    },
  };
})();
