'use strict';
// Células: mueve el ratón (o el dedo) hacia donde quieras ir; espacio (o doble toque) para dividirte.
(() => {
  const A = window.Arena;
  const st = A.crear({ teclas: { Space: 1 } });
  const comida = new Map();
  const PAL = ['#ff5a36', '#ff9f2e', '#ffc63d', '#3fbf5f', '#18b39b', '#4d7cfe', '#8a5cf6', '#ff6fa8', '#c93a1c', '#d99a12', '#24863e', '#0f7f6e', '#2f55c4', '#5b37b8', '#c8457a', '#9a5b2e'];
  let toqueAntes = 0;
  st.lz.c.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') return; const t = performance.now(); if (t - toqueAntes < 300) { st.mando.k |= 1; setTimeout(() => { st.mando.k &= ~1; }, 150); } toqueAntes = t; });
  let cam = { x: 1500, y: 1500, z: 1 };
  function pintar(g) {
    const m = A.marco(st); if (!m) return;
    const celulas = A.mezclar(m.a.c, m.b.c, m.k, [2, 3, 4]);
    const mi = A.yo(st)?.id, mias = celulas.filter((c) => c[1] === mi);
    if (mias.length) {
      const tot = mias.reduce((s, c) => s + c[4] * c[4], 0);
      const cx = mias.reduce((s, c) => s + c[2] * c[4] * c[4], 0) / tot, cy = mias.reduce((s, c) => s + c[3] * c[4] * c[4], 0) / tot;
      const z = Math.max(0.35, Math.min(1.3, 1.5 - Math.sqrt(tot) / 260));
      cam.x += (cx - cam.x) * 0.2; cam.y += (cy - cam.y) * 0.2; cam.z += (z - cam.z) * 0.05;
    }
    const z = cam.z, pos = A.rejilla(g, cam, st.v.mapa, z);
    for (const [, f] of comida) { const [x, y] = pos(f[0], f[1]); if (x < -10 || y < -10 || x > A.W + 10 || y > A.H + 10) continue; g.fillStyle = PAL[f[2]]; g.beginPath(); g.arc(x, y, Math.max(2, 5 * z), 0, Math.PI * 2); g.fill(); }
    for (const c of [...celulas].sort((a, b) => a[4] - b[4])) {
      const [x, y] = pos(c[2], c[3]), r = c[4] * z; if (x < -r || y < -r || x > A.W + r || y > A.H + r) continue;
      const col = A.colorDe(st, c[1]);
      g.fillStyle = '#1e1b2e'; g.beginPath(); g.arc(x, y, r + 3, 0, Math.PI * 2); g.fill();
      g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2); g.fill();
      if (r > 14) { g.font = `bold ${Math.max(11, Math.min(28, r / 2.6))}px Rubik, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = '#1e1b2e'; g.strokeText(A.nombreDe(st, c[1]), x, y); g.fillStyle = '#fff'; g.fillText(A.nombreDe(st, c[1]), x, y); g.textBaseline = 'top'; g.textAlign = 'left'; }
    }
    A.tabla(g, st, m.b.t);
    A.minimapa(g, st.v.mapa, celulas.filter((c) => c[4] > 25 || c[1] === mi).map((c) => [c[2], c[3], c[1] === mi ? '#fff' : A.colorDe(st, c[1]), c[1] === mi ? 5 : 3]), cam);
    const masa = Math.round(mias.reduce((s, c) => s + ((c[4] - 4) / 3.4) ** 2, 0));
    window.Lienzo.texto(g, `Masa: ${masa}`, 110, A.H - 26, { tam: 16, color: '#1e1b2e', sombra: '#fff' });
    A.cartel(g, st, '¡TE HAN COMIDO!');
  }
  const base = A.enganchar(st, pintar, (f) => { if (f.n) for (const [id, ...c] of f.n) comida.set(id, c); if (f.x) for (const id of f.x) comida.delete(id); });
  window.JUEGO = {
    evento: base.evento,
    render(zona, v, ctx) {
      if (v.comida && (!st.v || v.comida.length)) { comida.clear(); for (const [id, ...c] of v.comida) comida.set(id, c); }
      base.render(zona, v, ctx, 'Ratón o dedo para moverte · espacio (o doble toque) para dividirte y cazar · hay que ser un 25 % más grande para comerse a otra');
    },
  };
})();
