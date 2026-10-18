'use strict';
// Cabezones: ← → moverse, ↑ saltar, espacio chutar (en el móvil, los botones). Atacas hacia la portería contraria.
(() => {
  const { el, boton } = UI;
  const ARRIBA = 1, IZQ = 4, DER = 8, CHUT = 16;
  let lz = null, ctxC = null, vC = null, fotos = [], mias = 0, enviadas = -1, botonesK = 0, gol = null, ultimoGol = null;
  function mandar() { const k = mias | botonesK; if (k !== enviadas && ctxC && ctxC.fase === 'juego') { enviadas = k; ctxC.enviar({ tipo: 'teclas', k }); } }
  const MAPA = { ArrowUp: ARRIBA, KeyW: ARRIBA, ArrowLeft: IZQ, KeyA: IZQ, ArrowRight: DER, KeyD: DER, Space: CHUT };
  document.addEventListener('keydown', (e) => { if (!vC || e.target.closest('input, textarea') || !MAPA[e.code]) return; e.preventDefault(); mias |= MAPA[e.code]; mandar(); });
  document.addEventListener('keyup', (e) => { if (!MAPA[e.code]) return; mias &= ~MAPA[e.code]; mandar(); });
  window.addEventListener('blur', () => { mias = 0; botonesK = 0; mandar(); });
  function jugador(g, v, x, y, i, chut, bx, by) {
    const dir = i === 0 ? 1 : -1, RC = v.RC;
    // pierna (estirada al chutar)
    g.fillStyle = '#1e1b2e'; g.fillRect(x - 6, y - 14, 12, 14);
    g.fillStyle = i ? '#ff5a36' : '#4d7cfe'; g.fillRect(x - 5, y - 13, 10, 8);
    g.save(); g.translate(x + dir * 2, y - 6); g.rotate(chut ? -dir * 1.1 : 0);
    g.fillStyle = '#1e1b2e'; g.fillRect(dir > 0 ? 0 : -16, -3, 16, 6); g.fillStyle = '#ffffff'; g.fillRect(dir > 0 ? 10 : -16, -3, 6, 6);
    g.restore();
    // cabeza grande
    const hx = x, hy = y - RC - 12;
    g.fillStyle = '#1e1b2e'; g.beginPath(); g.arc(hx, hy, RC + 2, 0, Math.PI * 2); g.fill();
    g.fillStyle = ['#e0ac7e', '#a86b45'][i]; g.beginPath(); g.arc(hx, hy, RC, 0, Math.PI * 2); g.fill();
    g.fillStyle = ['#6b3f1d', '#1e1b2e'][i]; g.beginPath(); g.arc(hx, hy - 4, RC, Math.PI * 1.05, Math.PI * 1.95); g.fill();
    g.fillStyle = i ? '#ff5a36' : '#4d7cfe'; g.fillRect(hx - RC + 2, hy - 12, RC * 2 - 4, 5);
    // ojos que miran al balón
    const a = Math.atan2(by - hy, bx - hx);
    for (const ox of [-8, 8]) { g.fillStyle = '#ffffff'; g.fillRect(hx + ox - 4, hy - 3, 8, 8); g.fillStyle = '#1e1b2e'; g.fillRect(hx + ox - 1 + Math.cos(a) * 2, hy + 1 + Math.sin(a) * 2, 3, 3); }
    g.fillStyle = '#1e1b2e'; g.fillRect(hx - 5, hy + 12, 10, 2);
  }
  function pintar() {
    if (!lz || !vC) return;
    const g = lz.g, v = vC;
    g.fillStyle = '#9ad1ff'; g.fillRect(0, 0, v.W, v.H);
    // grada
    for (let y = 40; y < 150; y += 12) for (let x = (y / 12 % 2) * 6; x < v.W; x += 12) { g.fillStyle = ['#ff5a36', '#4d7cfe', '#ffc63d', '#3fbf5f', '#ffffff'][(x * 7 + y) % 5]; g.fillRect(x, y, 5, 6); }
    g.fillStyle = '#5b37b8'; g.fillRect(0, 150, v.W, 10);
    g.fillStyle = '#3fbf5f'; g.fillRect(0, 160, v.W, v.H - 160);
    for (let x = 0; x < v.W; x += 64) { g.fillStyle = x / 64 % 2 ? '#47c968' : '#3fbf5f'; g.fillRect(x, 160, 64, v.SUELO - 160); }
    g.fillStyle = '#2f9a4a'; g.fillRect(0, v.SUELO, v.W, v.H - v.SUELO);
    g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(v.W / 2 - 1, 160, 2, v.SUELO - 160);
    // porterías
    for (const lado of [0, 1]) {
      const x0 = lado ? v.W - v.PORTERIA : 0;
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x0, v.LARGUERO, v.PORTERIA, v.SUELO - v.LARGUERO);
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1; for (let y = v.LARGUERO; y < v.SUELO; y += 8) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + v.PORTERIA, y); g.stroke(); }
      g.fillStyle = '#ffffff'; g.fillRect(x0, v.LARGUERO - 4, v.PORTERIA, 5); g.fillRect(lado ? x0 : x0 + v.PORTERIA - 4, v.LARGUERO - 4, 4, v.SUELO - v.LARGUERO + 4);
    }
    // interpolación
    const ahora = performance.now() - 60;
    let a = fotos[0], b = fotos[1] || fotos[0];
    for (let i = 0; i < fotos.length - 1; i++) if (fotos[i].t <= ahora && fotos[i + 1].t >= ahora) { a = fotos[i]; b = fotos[i + 1]; }
    if (ahora > (fotos[fotos.length - 1]?.t || 0)) a = b = fotos[fotos.length - 1];
    if (!a) return;
    const k = b.t > a.t ? Math.max(0, Math.min(1, (ahora - a.t) / (b.t - a.t))) : 1;
    const L = (p, q) => p + (q - p) * k;
    const bx = L(a.f.b[0], b.f.b[0]), by = L(a.f.b[1], b.f.b[1]);
    a.f.j.forEach((pa, i) => { const pb = b.f.j[i]; jugador(g, v, L(pa[0], pb[0]), L(pa[1], pb[1]), i, pb[2], bx, by); });
    // balón
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(bx, v.SUELO, 12 * Math.max(0.3, 1 - (v.SUELO - by) / 300), 3, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1e1b2e'; g.beginPath(); g.arc(bx, by, v.RB + 1.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(bx, by, v.RB, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1e1b2e'; const giro = bx / 10; for (let q = 0; q < 3; q++) g.fillRect(bx + Math.cos(giro + q * 2.1) * 6 - 2, by + Math.sin(giro + q * 2.1) * 6 - 2, 4, 4);
    // marcador
    const T = window.Lienzo.texto;
    g.fillStyle = '#1e1b2e'; g.fillRect(v.W / 2 - 70, 6, 140, 26);
    T(g, `${v.goles[0]} - ${v.goles[1]}`, v.W / 2, 10, { tam: 16, color: '#ffc63d', alinear: 'center', sombra: null });
    T(g, `${b.f.reloj ?? v.reloj}`, v.W / 2 + 54, 13, { tam: 8, color: '#ffffff', alinear: 'center', sombra: null });
    if (gol && performance.now() - gol < 1500) { const t = (performance.now() - gol) / 1500; T(g, '¡GOL!', v.W / 2, 110 - t * 20, { tam: 32, color: '#ffc63d', alinear: 'center' }); }
  }
  window.JUEGO = {
    evento(ev) { if (ev.tipo === 'foto') { fotos.push({ t: performance.now(), f: ev.f }); if (fotos.length > 6) fotos.shift(); } },
    render(zona, v, ctx) {
      ctxC = ctx; vC = v;
      if (!fotos.length) fotos.push({ t: performance.now(), f: v.foto });
      if (v.ultimoGol && v.ultimoGol.t !== ultimoGol) { if (ultimoGol !== null || Date.now() - v.ultimoGol.t < 2000) { gol = performance.now(); if (v.ultimoGol.marca === ctx.yo) Confeti(80); } ultimoGol = v.ultimoGol.t; }
      const cont = el('div', 'lz-cont');
      if (!lz) { lz = window.Lienzo.crear(cont, v.W, v.H); window.Lienzo.bucle(() => {}, pintar); } else cont.append(lz.c);
      const marcador = el('div', 'fila centro dm-marcador');
      [0, 1].forEach((j) => marcador.append(el('span', 'dm-jug', `${j ? '🔴' : '🔵'} ${ctx.nombre(j)}${j === ctx.yo ? ' (tú)' : ''}: ${v.goles[j]}`)));
      const mandos = el('div', 'tk-mandos cabezones');
      for (const [txt, bit, cls] of [['◀', IZQ, 'izq'], ['▶', DER, 'der'], ['⤒', ARRIBA, 'arr'], ['⚽', CHUT, 'fuego']]) {
        const b = boton(txt, null, 'mini ' + cls); b.setAttribute('aria-label', cls);
        UI.mantener(b, () => { botonesK |= bit; mandar(); }, () => { botonesK &= ~bit; mandar(); });
        mandos.append(b);
      }
      zona.append(marcador, cont, mandos, el('p', 'suave centro', `← → moverse · ↑ saltar · espacio chutar. Atacas hacia la ${ctx.yo === 1 ? 'izquierda' : 'derecha'}.`));
    },
  };
})();
