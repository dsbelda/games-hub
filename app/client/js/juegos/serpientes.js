'use strict';
// Serpientes: la serpiente va hacia el ratón o el dedo; espacio o mantener pulsado para acelerar.
// El cuerpo se dibuja con el rastro de la cabeza (el servidor solo manda cabeza, grosor y largo).
(() => {
  const A = window.Arena;
  const st = A.crear({ teclas: { Space: 1 } });
  const comida = new Map(), rastros = new Map();
  const PAL = ['#ff5a36', '#ff9f2e', '#ffc63d', '#3fbf5f', '#18b39b', '#4d7cfe', '#8a5cf6', '#ff6fa8', '#c93a1c', '#d99a12', '#24863e', '#0f7f6e', '#2f55c4', '#5b37b8', '#c8457a', '#9a5b2e'];
  const cam = { x: 1300, y: 1300 };
  const turbo = A.botonTactil(st, '⚡ Turbo', 1);
  function pintar(g) {
    const m = A.marco(st); if (!m) return;
    const serps = A.mezclar(m.a.s, m.b.s, m.k, [2, 3]);
    const vivas = new Set(serps.map((s) => s[0]));
    for (const id of rastros.keys()) if (!vivas.has(id)) rastros.delete(id);
    // el rastro crece con la cabeza interpolada y se recorta a su largo
    for (const s of serps) {
      let r = rastros.get(s[0]); if (!r) { r = [[s[2], s[3]]]; rastros.set(s[0], r); }
      const [x0, y0] = r[0];
      if (Math.hypot(s[2] - x0, s[3] - y0) > 60) { r.length = 0; r.push([s[2], s[3]]); }
      if (Math.hypot(s[2] - x0, s[3] - y0) >= 4) r.unshift([s[2], s[3]]); else r[0] = [s[2], s[3]];
      let l = 0; for (let i = 1; i < r.length; i++) { l += Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]); if (l > s[5]) { r.length = i + 1; break; } }
    }
    const mi = A.yo(st)?.id, mia = serps.find((s) => s[1] === mi);
    if (mia) { cam.x += (mia[2] - cam.x) * 0.25; cam.y += (mia[3] - cam.y) * 0.25; }
    const z = mia ? Math.max(0.55, 1 - mia[4] / 60) : 0.8;
    const pos = A.rejilla(g, cam, st.v.mapa, z, '#20233f', '#2b2f52', 60);
    for (const [, f] of comida) { const [x, y] = pos(f[0], f[1]); if (x < -10 || y < -10 || x > A.W + 10 || y > A.H + 10) continue; g.fillStyle = PAL[f[2]]; g.beginPath(); g.arc(x, y, (2.5 + f[3] * 1.5) * z, 0, Math.PI * 2); g.fill(); }
    for (const s of serps) {
      const r = rastros.get(s[0]); if (!r || r.length < 2) continue;
      const col = A.colorDe(st, s[1]), w = s[4] * 2 * z;
      g.lineCap = 'round'; g.lineJoin = 'round';
      const trazo = () => { g.beginPath(); const [x, y] = pos(...r[0]); g.moveTo(x, y); for (let i = 1; i < r.length; i++) { const [a, b] = pos(...r[i]); g.lineTo(a, b); } g.stroke(); };
      if (s[6]) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = w + 12; trazo(); }
      g.strokeStyle = '#1e1b2e'; g.lineWidth = w + 5; trazo();
      g.strokeStyle = col; g.lineWidth = w; trazo();
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = w * 0.35; trazo();
      // ojos
      const [hx, hy] = pos(s[2], s[3]), [bx, by] = pos(...r[Math.min(2, r.length - 1)]), a = Math.atan2(hy - by, hx - bx);
      for (const lado of [-1, 1]) { const ox = hx + Math.cos(a + lado * 0.9) * w * 0.32, oy = hy + Math.sin(a + lado * 0.9) * w * 0.32; g.fillStyle = '#fff'; g.beginPath(); g.arc(ox, oy, w * 0.2, 0, Math.PI * 2); g.fill(); g.fillStyle = '#1e1b2e'; g.beginPath(); g.arc(ox + Math.cos(a) * w * 0.07, oy + Math.sin(a) * w * 0.07, w * 0.1, 0, Math.PI * 2); g.fill(); }
      g.font = 'bold 13px Rubik, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText(A.nombreDe(st, s[1]), hx, hy - w - 16); g.textAlign = 'left';
    }
    A.tabla(g, st, m.b.t);
    A.minimapa(g, st.v.mapa, serps.map((s) => [s[2], s[3], s[1] === mi ? '#fff' : A.colorDe(st, s[1]), s[1] === mi ? 5 : 3]), cam);
    if (mia) window.Lienzo.texto(g, `Longitud: ${A.yo(st) ? Math.round((mia[5] - 70) / 3.2) : 0}`, 110, A.H - 26, { tam: 16, color: '#fff' });
    A.cartel(g, st, '¡HAS CHOCADO!');
  }
  const base = A.enganchar(st, pintar, (f) => { if (f.n) for (const [id, ...c] of f.n) comida.set(id, c); if (f.x) for (const id of f.x) comida.delete(id); });
  window.JUEGO = {
    evento: base.evento,
    render(zona, v, ctx) {
      comida.clear(); for (const [id, ...c] of v.comida) comida.set(id, c);
      rastros.clear(); for (const [id, pts] of Object.entries(v.cuerpos)) rastros.set(Number(id), pts.map((p) => [...p]));
      base.render(zona, v, ctx, 'Ratón o dedo para girar · espacio, clic mantenido o el botón Turbo para acelerar (pierdes longitud) · que tu cabeza no toque a otra serpiente', [turbo]);
    },
  };
})();
