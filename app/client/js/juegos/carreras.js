'use strict';
// Carreras: ↑ acelerar, ↓ frenar, ← → girar, espacio turbo (una vez por vuelta). En el móvil, botones.
(() => {
  const { el } = UI;
  const M = window.Mandos.crear({ teclas: { ArrowUp: 1, KeyW: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 4, KeyA: 4, ArrowRight: 8, KeyD: 8, Space: 16 },
    botones: [{ botones: [['◀', 4, 'grande'], ['▶', 8, 'grande']] }, { botones: [['🚀', 16, ''], ['Freno', 2, ''], ['Acelerar', 1, 'oro grande']] }] });
  let lz = null, vC = null, ctxC = null, fotos = [], fondo = null;
  function dibujarFondo(v) {
    const c = document.createElement('canvas'); c.width = 960; c.height = 640; const g = c.getContext('2d');
    g.fillStyle = '#5fc46f'; g.fillRect(0, 0, 960, 640);
    g.fillStyle = '#55b865'; for (let i = 0; i < 260; i++) g.fillRect((i * 131) % 960, (i * 197) % 640, 6, 6);
    const camino = (w, color, guion) => { g.strokeStyle = color; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round'; g.setLineDash(guion || []); g.beginPath(); v.pista.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke(); g.setLineDash([]); };
    camino(v.ancho + 12, '#ff5a36', [14, 14]); camino(v.ancho + 12, '#ffffff', [0, 14, 14, 0]); camino(v.ancho, '#4a4560'); camino(2, 'rgba(255,255,255,.5)', [16, 18]);
    const [a, b] = v.pista[0], [c2, d] = v.pista[1], ang = Math.atan2(d - b, c2 - a);
    g.save(); g.translate(a, b); g.rotate(ang + Math.PI / 2); for (let i = -4; i < 4; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#fff' : '#1e1b2e'; g.fillRect(i * 9, j * 9 - 9, 9, 9); } g.restore();
    return c;
  }
  function pintar() {
    if (!lz || !vC || !fotos.length) return;
    const g = lz.g, b = fotos[fotos.length - 1], a = fotos[fotos.length - 2] || b, k = Math.min(1, (performance.now() - b.t) / 50);
    g.drawImage(fondo, 0, 0);
    b.f.c.forEach((c, j) => {
      const ca = a.f.c[j] || c; let da = c[2] - ca[2]; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      const x = ca[0] + (c[0] - ca[0]) * k, y = ca[1] + (c[1] - ca[1]) * k, an = ca[2] + da * k;
      g.save(); g.translate(x, y); g.rotate(an);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-12, -6, 26, 16);
      g.fillStyle = '#1e1b2e'; g.fillRect(-13, -9, 26, 18);
      g.fillStyle = vC.colores[j]; g.fillRect(-12, -8, 24, 16);
      g.fillStyle = '#bfe9ff'; g.fillRect(2, -6, 6, 12);
      g.fillStyle = '#1e1b2e'; g.fillRect(-10, -11, 7, 3); g.fillRect(-10, 8, 7, 3); g.fillRect(4, -11, 7, 3); g.fillRect(4, 8, 7, 3);
      if (c[4]) { g.fillStyle = '#ff9f2e'; g.fillRect(-20, -4, 7, 8); g.fillStyle = '#ffc63d'; g.fillRect(-18, -2, 4, 4); }
      g.restore();
      if (j === ctxC.yo) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 20, 0, Math.PI * 2); g.stroke(); }
    });
    const yo = b.f.c[ctxC.yo];
    if (yo) window.Lienzo.texto(g, `VUELTA ${yo[3]}/${vC.vueltas} · ${b.f.o.indexOf(ctxC.yo) + 1}º · ${yo[5] ? 'turbo gastado' : 'TURBO LISTO'}`, 14, 14, { tam: 16, color: '#ffffff' });
    if (b.f.s > 0) window.Lienzo.texto(g, String(b.f.s), 480, 280, { tam: 48, color: '#ffc63d', alinear: 'center' });
  }
  window.JUEGO = {
    evento(ev) { if (ev.tipo !== 'foto') return; fotos.push({ t: performance.now(), f: ev.f }); if (fotos.length > 4) fotos.shift(); },
    render(zona, v, ctx) {
      ctxC = ctx; vC = v; M.usar(ctx);
      if (!fotos.length) fotos.push({ t: performance.now(), f: v.foto });
      if (!fondo) fondo = dibujarFondo(v);
      const cont = el('div', 'lz-cont');
      if (!lz) { lz = window.Lienzo.crear(cont, 960, 640, { clase: 'ca-pista' }); lz.g.imageSmoothingEnabled = true; window.Lienzo.bucle(() => {}, pintar); } else cont.append(lz.c);
      zona.append(el('p', 'suave centro', `${v.vueltas} vueltas · ↑ acelerar, ↓ frenar, ← → girar, espacio turbo (uno por vuelta). Fuera del asfalto se va muy lento.`), cont, M.el);
    },
  };
})();
