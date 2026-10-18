'use strict';
// Bombas: flechas/WASD para moverte y espacio para poner una bomba (en el móvil, la cruceta y el botón).
(() => {
  const { el } = UI;
  const T = 40;
  const M = window.Mandos.crear({ teclas: { ArrowUp: 1, KeyW: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 4, KeyA: 4, ArrowRight: 8, KeyD: 8, Space: 16 },
    botones: [{ clase: 'cruz', botones: [['▲', 1, 'arr'], ['◀', 4, 'izq'], ['▶', 8, 'der'], ['▼', 2, 'aba']] }, { botones: [['💣 Bomba', 16, 'oro grande']] }] });
  const MEJ = { bomba: '💣', fuego: '🔥', patines: '👟' };
  let lz = null, vB = null, ctxB = null, fotos = [];
  function pintar() {
    if (!lz || !vB || !fotos.length) return;
    const g = lz.g, b = fotos[fotos.length - 1], a = fotos[fotos.length - 2] || b, k = Math.min(1, (performance.now() - b.t) / 50), f = b.f;
    const filas = f.m.split('|');
    for (let y = 0; y < vB.al; y++) for (let x = 0; x < vB.an; x++) {
      const c = filas[y][x], px = x * T, py = y * T;
      if (c === '1') { g.fillStyle = '#4a4560'; g.fillRect(px, py, T, T); g.fillStyle = '#6b6680'; g.fillRect(px + 3, py + 3, T - 6, T - 10); }
      else if (c === '2') { g.fillStyle = '#9a5b2e'; g.fillRect(px, py, T, T); g.fillStyle = '#c08a5a'; g.fillRect(px + 2, py + 2, T / 2 - 3, T / 2 - 3); g.fillRect(px + T / 2 + 1, py + T / 2 + 1, T / 2 - 3, T / 2 - 3); g.fillRect(px + T / 2 + 1, py + 2, T / 2 - 3, T / 2 - 3); g.fillRect(px + 2, py + T / 2 + 1, T / 2 - 3, T / 2 - 3); }
      else { g.fillStyle = (x + y) % 2 ? '#5fc46f' : '#55b865'; g.fillRect(px, py, T, T); }
    }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const [clave, m] of Object.entries(f.mj)) { const [x, y] = clave.split(',').map(Number); g.font = '24px serif'; g.fillText(MEJ[m], x * T + T / 2, y * T + T / 2); }
    for (const [x, y, t] of f.b) { const s = 1 + Math.sin(performance.now() / (t < 1 ? 60 : 150)) * 0.08; g.fillStyle = '#1e1b2e'; g.beginPath(); g.arc(x * T + T / 2, y * T + T / 2 + 2, 14 * s, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ff5a36'; g.fillRect(x * T + T / 2 + 6, y * T + 5, 4, 6); }
    for (const [x, y] of f.l) { g.fillStyle = '#ffc63d'; g.fillRect(x * T + 2, y * T + 2, T - 4, T - 4); g.fillStyle = '#ff9f2e'; g.fillRect(x * T + 8, y * T + 8, T - 16, T - 16); }
    f.j.forEach((p, j) => {
      if (!p[2]) return; const pa = a.f.j[j] || p, x = (pa[0] + (p[0] - pa[0]) * k) * T, y = (pa[1] + (p[1] - pa[1]) * k) * T;
      g.fillStyle = '#1e1b2e'; g.beginPath(); g.arc(x, y, 15, 0, Math.PI * 2); g.fill();
      g.fillStyle = vB.colores[j]; g.beginPath(); g.arc(x, y, 13, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1e1b2e'; g.fillRect(x - 6 + p[3] * 3, y - 3 + p[4] * 3, 3, 4); g.fillRect(x + 3 + p[3] * 3, y - 3 + p[4] * 3, 3, 4);
      if (j === ctxB.yo) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 18, 0, Math.PI * 2); g.stroke(); }
    });
    if (f.pa) window.Lienzo.texto(g, f.f === null || f.f === undefined ? '¡PREPARADOS!' : f.f >= 0 ? `RONDA PARA ${ctxB.nombre(f.f).toUpperCase()}` : 'EMPATE', vB.an * T / 2, vB.al * T / 2 - 8, { tam: 16, color: '#ffffff', alinear: 'center' });
  }
  window.JUEGO = {
    evento(ev) { if (ev.tipo !== 'foto') return; fotos.push({ t: performance.now(), f: ev.f }); if (fotos.length > 4) fotos.shift(); },
    render(zona, v, ctx) {
      ctxB = ctx; vB = v; M.usar(ctx);
      if (!fotos.length || v.ronda !== vB._ronda) { fotos = [{ t: performance.now(), f: v.foto }]; vB._ronda = v.ronda; }
      const cont = el('div', 'lz-cont');
      if (!lz) { lz = window.Lienzo.crear(cont, v.an * T, v.al * T, { clase: 'bo-mapa' }); lz.g.imageSmoothingEnabled = true; window.Lienzo.bucle(() => {}, pintar); } else cont.append(lz.c);
      const marcador = el('div', 'fi-marcador'); v.puntos.forEach((p, j) => { const s = el('span', j === ctx.yo ? 'dibuja' : ''); const pt = el('i', 'oc-punto'); pt.style.background = v.colores[j]; s.append(pt, ` ${ctx.nombre(j)}: ${p} · 💣${v.stats[j][0]} 🔥${v.stats[j][1]}`); marcador.append(s); });
      zona.append(marcador, el('p', 'suave centro', `Ronda ${v.ronda} · gana quien llegue a ${v.meta} · flechas/WASD para moverte, espacio para poner bomba`), cont, M.el);
    },
  };
})();
