'use strict';
// Tanques en laberinto: ↑ ↓ avanzar, ← → girar, espacio disparar (en el móvil, los botones de abajo).
(() => {
  const { el, boton } = UI;
  const ARRIBA = 1, ABAJO = 2, IZQ = 4, DER = 8, FUEGO = 16;
  let lz = null, ctxT = null, vT = null, fotos = [], mias = 0, enviadas = -1, botonesK = 0, booms = [], ultimoBoom = null;
  function mandar() { const k = mias | botonesK; if (k !== enviadas && ctxT && ctxT.fase === 'juego') { enviadas = k; ctxT.enviar({ tipo: 'teclas', k }); } }
  const MAPA = { ArrowUp: ARRIBA, KeyW: ARRIBA, ArrowDown: ABAJO, KeyS: ABAJO, ArrowLeft: IZQ, KeyA: IZQ, ArrowRight: DER, KeyD: DER, Space: FUEGO };
  document.addEventListener('keydown', (e) => { if (!vT || e.target.closest('input, textarea') || !MAPA[e.code]) return; e.preventDefault(); mias |= MAPA[e.code]; mandar(); });
  document.addEventListener('keyup', (e) => { if (!MAPA[e.code]) return; mias &= ~MAPA[e.code]; mandar(); });
  window.addEventListener('blur', () => { mias = 0; botonesK = 0; mandar(); });
  function tanque(g, x, y, a, color) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = '#1e1b2e'; g.fillRect(-11, -9, 22, 18);
    g.fillStyle = color; g.fillRect(-10, -8, 20, 16);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-10, -8, 20, 3); g.fillRect(-10, 5, 20, 3);
    g.fillStyle = '#1e1b2e'; g.fillRect(-4, -4, 8, 8); g.fillRect(0, -2, 14, 4);
    g.restore();
  }
  function pintar() {
    if (!lz || !vT) return;
    const g = lz.g, v = vT;
    g.fillStyle = '#e9e2d0'; g.fillRect(0, 0, v.ancho, v.alto);
    g.fillStyle = '#ddd4bd'; for (let y = 0; y < v.alto; y += 20) for (let x = (y / 20) % 2 ? 10 : 0; x < v.ancho; x += 20) g.fillRect(x, y, 10, 10);
    g.strokeStyle = '#1e1b2e'; g.lineWidth = 4; g.lineCap = 'square';
    for (const [x1, y1, x2, y2] of v.seg) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
    // interpolación entre las dos últimas fotos
    const ahora = performance.now() - 60;
    let a = fotos[0], b = fotos[1] || fotos[0];
    for (let i = 0; i < fotos.length - 1; i++) if (fotos[i].t <= ahora && fotos[i + 1].t >= ahora) { a = fotos[i]; b = fotos[i + 1]; }
    if (ahora > (fotos[fotos.length - 1]?.t || 0)) { a = b = fotos[fotos.length - 1]; }
    if (!a) return;
    const k = b.t > a.t ? Math.max(0, Math.min(1, (ahora - a.t) / (b.t - a.t))) : 1;
    a.f.t.forEach((ta, j) => {
      const tb = b.f.t[j] || ta; if (!ta[3]) return;
      let da = tb[2] - ta[2]; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      tanque(g, ta[0] + (tb[0] - ta[0]) * k, ta[1] + (tb[1] - ta[1]) * k, ta[2] + da * k, v.colores[j]);
      if (j === ctxT.yo) { g.fillStyle = '#1e1b2e'; g.fillRect(ta[0] - 2, ta[1] - 18, 4, 4); }
    });
    g.fillStyle = '#1e1b2e'; for (const bl of b.f.b) { g.beginPath(); g.arc(bl[0], bl[1], 3, 0, Math.PI * 2); g.fill(); }
    for (const bm of booms) { const t = (performance.now() - bm.t0) / 500; if (t > 1) continue; g.fillStyle = `rgba(255,159,46,${1 - t})`; g.beginPath(); g.arc(bm.x, bm.y, 8 + t * 26, 0, Math.PI * 2); g.fill(); for (let q = 0; q < 8; q++) { g.fillStyle = q % 2 ? '#ff5a36' : '#1e1b2e'; g.fillRect(bm.x + Math.cos(q) * t * 30, bm.y + Math.sin(q * 1.7) * t * 30, 3, 3); } }
    booms = booms.filter((bm) => performance.now() - bm.t0 < 500);
    if (v.finRonda !== null && !v.ganador) window.Lienzo.texto(g, 'FIN DE LA RONDA', v.ancho / 2, v.alto / 2 - 8, { tam: 16, color: '#ffc63d', alinear: 'center' });
  }
  window.JUEGO = {
    evento(ev) { if (ev.tipo === 'foto') { fotos.push({ t: performance.now(), f: ev.f }); if (fotos.length > 6) fotos.shift(); } },
    render(zona, v, ctx) {
      ctxT = ctx; vT = v;
      if (!fotos.length) fotos.push({ t: performance.now(), f: v.foto });
      if (v.boom && JSON.stringify(v.boom) !== ultimoBoom) { ultimoBoom = JSON.stringify(v.boom); booms.push({ ...v.boom, t0: performance.now() }); if (v.boom.j === ctx.yo) { if (navigator.vibrate) navigator.vibrate(150); } }
      const cont = el('div', 'lz-cont');
      if (!lz) { lz = window.Lienzo.crear(cont, v.ancho, v.alto, { clase: 'tanques-mapa' }); window.Lienzo.bucle(() => {}, pintar); } else cont.append(lz.c);
      const marcador = el('div', 'fila centro dm-marcador');
      v.puntos.forEach((p, j) => { const s = el('span', 'dm-jug'); const c = el('i', 'tq-color'); c.style.background = v.colores[j]; s.append(c, ` ${ctx.nombre(j)}${j === ctx.yo ? ' (tú)' : ''}: ${p}`); marcador.append(s); });
      const info = el('p', 'suave centro', `Ronda ${v.ronda} · gana quien llegue a ${v.meta} · ⏱ ${v.reloj} s`);
      const mandos = el('div', 'tk-mandos');
      for (const [txt, bit, cls] of [['◀', IZQ, 'izq'], ['▲', ARRIBA, 'arr'], ['▶', DER, 'der'], ['▼', ABAJO, 'aba'], ['💥', FUEGO, 'fuego']]) {
        const b = boton(txt, null, 'mini ' + cls); b.setAttribute('aria-label', cls);
        UI.mantener(b, () => { botonesK |= bit; mandar(); }, () => { botonesK &= ~bit; mandar(); });
        mandos.append(b);
      }
      zona.append(marcador, info, cont, mandos, el('p', 'suave centro', '↑ ↓ avanzar · ← → girar · espacio disparar. ¡Las balas rebotan!'));
    },
  };
})();
