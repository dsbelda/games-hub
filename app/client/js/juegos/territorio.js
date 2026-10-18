'use strict';
// Territorio: flechas/WASD (o ratón/dedo hacia donde quieras ir). Sal de tu zona, rodea y vuelve.
(() => {
  const A = window.Arena;
  const st = A.crear();
  let dueno = [], rastro = [];
  const cam = { x: 32, y: 32 };
  const aclarar = (hex, k) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * k)); return `rgb(${c.join(',')})`; };
  function pintar(g) {
    const m = A.marco(st); if (!m) return;
    const v = st.v, G = v.g, T = 15;
    const pjs = A.mezclar(m.a.p, m.b.p, m.k, [2, 3]);
    const mi = A.yo(st), mia = pjs.find((p) => p[0] === mi?.id);
    if (mia) { cam.x += (mia[2] / 10 + 0.5 - cam.x) * 0.2; cam.y += (mia[3] / 10 + 0.5 - cam.y) * 0.2; }
    g.fillStyle = '#d9cfb6'; g.fillRect(0, 0, A.W, A.H);
    const ox = A.W / 2 - cam.x * T, oy = A.H / 2 - cam.y * T;
    g.fillStyle = '#f3eddc'; g.fillRect(ox, oy, G * T, G * T);
    const colI = (i) => v.jug[i]?.color || '#9aa0b5';
    const x0 = Math.max(0, Math.floor(-ox / T)), x1 = Math.min(G, Math.ceil((A.W - ox) / T)), y0 = Math.max(0, Math.floor(-oy / T)), y1 = Math.min(G, Math.ceil((A.H - oy) / T));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const k = y * G + x, d = dueno[k], r = rastro[k];
      if (d >= 0) { g.fillStyle = colI(d); g.fillRect(ox + x * T, oy + y * T, T, T); g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(ox + x * T, oy + y * T + T - 2, T, 2); }
      else if ((x + y) % 2) { g.fillStyle = '#ece4cf'; g.fillRect(ox + x * T, oy + y * T, T, T); }
      if (r >= 0) { g.fillStyle = aclarar(colI(r), 0.45); g.fillRect(ox + x * T + 2, oy + y * T + 2, T - 4, T - 4); }
    }
    g.strokeStyle = '#1e1b2e'; g.lineWidth = 4; g.strokeRect(ox, oy, G * T, G * T);
    for (const p of pjs) {
      const x = ox + p[2] / 10 * T, y = oy + p[3] / 10 * T, col = colI(p[1]);
      g.fillStyle = '#1e1b2e'; g.fillRect(x - 3, y - 5, T + 6, T + 6);
      g.fillStyle = col; g.fillRect(x - 1, y - 3, T + 2, T + 2);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, y - 2, T, 4);
      g.font = 'bold 12px Rubik, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#1e1b2e'; g.fillText(A.nombreDe(st, p[0]), x + T / 2, y - 18); g.textAlign = 'left';
    }
    A.tabla(g, st, m.b.t.map(([id, pts]) => [id, pts]), ' %');
    // minimapa con los territorios
    const s = 90, mx = 10, my = A.H - s - 10;
    g.fillStyle = 'rgba(30,27,46,.55)'; g.fillRect(mx, my, s, s);
    for (let k = 0; k < G * G; k += 1) if (dueno[k] >= 0) { g.fillStyle = colI(dueno[k]); g.fillRect(mx + (k % G) * s / G, my + Math.floor(k / G) * s / G, s / G + 0.5, s / G + 0.5); }
    if (mia) { g.fillStyle = '#fff'; g.fillRect(mx + mia[2] / 10 * s / G - 2, my + mia[3] / 10 * s / G - 2, 4, 4); }
    const mio = m.b.t.find(([id]) => id === mi?.id);
    if (mi?.vivo) window.Lienzo.texto(g, `Tuyo: ${mio ? mio[1] : '<'} %`, 110, A.H - 26, { tam: 16, color: '#1e1b2e', sombra: '#fff' });
    A.cartel(g, st, '¡TE HAN CORTADO!');
  }
  const base = A.enganchar(st, pintar, (f) => { if (f.c) for (const [k, d, r] of f.c) { dueno[k] = d; rastro[k] = r; } });
  window.JUEGO = {
    evento: base.evento,
    render(zona, v, ctx) {
      dueno = v.dueno; rastro = v.rastro;
      base.render(zona, v, ctx, 'Flechas o WASD (o ratón/dedo) para moverte · sal de tu zona, rodea un trozo y vuelve · si alguien pisa tu rastro, caes');
    },
  };
})();
