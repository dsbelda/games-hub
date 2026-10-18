'use strict';
// Base del navegador para los juegos «.io»: lienzo con cámara que te sigue, interpolación entre fotos del
// servidor, mando con ratón/dedo (dirección e intensidad desde el centro de la pantalla) y teclas, y
// clasificación, minimapa y cartel de «vuelves en…».
window.Arena = (() => {
  const { el } = UI;
  // en un móvil en vertical el lienzo también es vertical (apaisado quedaba diminuto)
  const movil = window.matchMedia('(max-width: 640px)').matches;
  const W = movil ? 480 : 720, H = movil ? 640 : 450;
  function crear({ teclas = {}, pantallaW = W, pantallaH = H } = {}) {
    const st = { fotos: [], ctx: null, v: null, lz: null, mando: { a: 0, f: 0, x: 0, y: 0, k: 0 }, enviado: '', ultimoEnvio: 0, raton: false, toque: false };
    st.cont = el('div', 'lz-cont ar-cont');
    st.lz = window.Lienzo.crear(st.cont, pantallaW, pantallaH, { clase: 'ar-lienzo' });
    st.lz.g.imageSmoothingEnabled = true;
    const c = st.lz.c;
    const apuntar = (e) => { const p = st.lz.punto(e); const dx = p.x - pantallaW / 2, dy = p.y - pantallaH / 2; st.mando.a = Math.round(Math.atan2(dy, dx) * 100) / 100; st.mando.f = Math.min(1, Math.round(Math.hypot(dx, dy) / (pantallaH / 3) * 20) / 20); st.mando.mx = p.x; st.mando.my = p.y; };
    c.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || st.toque) apuntar(e); });
    c.addEventListener('pointerdown', (e) => { e.preventDefault(); c.setPointerCapture(e.pointerId); if (e.pointerType !== 'mouse') { st.toque = true; st.mando.k |= 64; } apuntar(e); st.raton = true; st.mando.k |= 128; });
    for (const n of ['pointerup', 'pointercancel']) c.addEventListener(n, () => { st.raton = false; st.toque = false; st.mando.k &= ~(128 | 64); });
    // teclas: { Space: 1, KeyW: 2, … } → bits de mando.k; flechas/WASD también como x, y (para Tanques)
    const dirs = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
    const pulsadas = new Set();
    const recalcular = () => { let x = 0, y = 0; for (const k of pulsadas) if (dirs[k]) { x += dirs[k][0]; y += dirs[k][1]; } st.mando.x = Math.sign(x); st.mando.y = Math.sign(y); };
    document.addEventListener('keydown', (e) => { if (e.target.closest('input, textarea') || !st.v) return; if (teclas[e.code]) { e.preventDefault(); st.mando.k |= teclas[e.code]; } if (dirs[e.code]) { e.preventDefault(); pulsadas.add(e.code); recalcular(); } });
    // al soltar, el bit se borra después del próximo envío (así no se pierde una pulsación corta)
    document.addEventListener('keyup', (e) => { if (teclas[e.code]) st.soltar = (st.soltar || 0) | teclas[e.code]; if (dirs[e.code]) { pulsadas.delete(e.code); recalcular(); } });
    window.addEventListener('blur', () => { st.mando.k = 0; pulsadas.clear(); recalcular(); });
    // mandar el mando cuando cambia (como mucho cada 50 ms)
    setInterval(() => {
      if (!st.ctx || st.ctx.fase !== 'juego' || st.ctx.yo < 0) return;
      const m = st.mando, s = `${m.a}|${m.f}|${m.x}|${m.y}|${m.k}`;
      if (s === st.enviado && performance.now() - st.ultimoEnvio < 1000) { if (st.soltar) { m.k &= ~st.soltar; st.soltar = 0; } return; }
      st.enviado = s; st.ultimoEnvio = performance.now();
      st.ctx.enviar({ tipo: 'mando', a: m.a, f: m.f, x: m.x, y: m.y, k: m.k });
      if (st.soltar) { m.k &= ~st.soltar; st.soltar = 0; }
    }, 50);
    return st;
  }
  // botón táctil (solo se ve en pantallas táctiles) que mantiene un bit del mando
  function botonTactil(st, texto, bit) { const b = UI.mantener(UI.boton(texto, null, 'oro'), () => { st.mando.k |= bit; }, () => { st.soltar = (st.soltar || 0) | bit; }); b.classList.add('ar-tactil'); return b; }
  // par de fotos alrededor de «ahora − 90 ms» y fracción entre ellas
  function marco(st) {
    const f = st.fotos; if (!f.length) return null;
    const ahora = performance.now() - 90;
    let a = f[0], b = f[0];
    for (let i = 0; i < f.length - 1; i++) if (f[i].t <= ahora && f[i + 1].t >= ahora) { a = f[i]; b = f[i + 1]; }
    if (ahora >= f[f.length - 1].t) a = b = f[f.length - 1];
    const k = b.t > a.t ? Math.max(0, Math.min(1, (ahora - a.t) / (b.t - a.t))) : 1;
    return { a: a.f, b: b.f, k };
  }
  // entidades interpoladas: listas [id, …] en a y b; campos = índices numéricos a interpolar
  function mezclar(la, lb, k, campos) {
    const ma = new Map(la.map((x) => [x[0], x]));
    return lb.map((xb) => { const xa = ma.get(xb[0]); if (!xa) return xb; const out = [...xb]; for (const i of campos) out[i] = xa[i] + (xb[i] - xa[i]) * k; return out; });
  }
  function rejilla(g, cam, mapa, z, fondo = '#f3eddc', linea = '#e3dac2', paso = 50) {
    g.fillStyle = '#d9cfb6'; g.fillRect(0, 0, W, H);
    const x0 = W / 2 - cam.x * z, y0 = H / 2 - cam.y * z;
    g.fillStyle = fondo; g.fillRect(x0, y0, mapa * z, mapa * z);
    g.strokeStyle = linea; g.lineWidth = 1; g.beginPath();
    const ini = (v) => Math.max(0, Math.floor(v / paso) * paso);
    for (let x = ini(cam.x - W / 2 / z); x <= Math.min(mapa, cam.x + W / 2 / z); x += paso) { g.moveTo(x0 + x * z, Math.max(0, y0)); g.lineTo(x0 + x * z, Math.min(H, y0 + mapa * z)); }
    for (let y = ini(cam.y - H / 2 / z); y <= Math.min(mapa, cam.y + H / 2 / z); y += paso) { g.moveTo(Math.max(0, x0), y0 + y * z); g.lineTo(Math.min(W, x0 + mapa * z), y0 + y * z); }
    g.stroke();
    g.strokeStyle = '#1e1b2e'; g.lineWidth = 4; g.strokeRect(x0, y0, mapa * z, mapa * z);
    return (x, y) => [x0 + x * z, y0 + y * z];
  }
  const nombreDe = (st, id) => { const p = st.v.jug.find((x) => x.id === id); if (!p) return '?'; return p.j >= 0 ? st.ctx.nombre(p.j) : p.nombre; };
  const colorDe = (st, id) => st.v.jug.find((x) => x.id === id)?.color || '#9aa0b5';
  const yo = (st) => st.v.jug.find((x) => x.j === st.ctx.yo);
  function tabla(g, st, t, unidad = '') {
    const mi = yo(st)?.id;
    g.fillStyle = 'rgba(30,27,46,.72)'; g.fillRect(W - 210, 10, 200, 26 + t.length * 20);
    window.Lienzo.texto(g, 'CLASIFICACIÓN', W - 200, 16, { tam: 12, color: '#ffc63d', sombra: null });
    t.forEach(([id, pts], i) => { g.font = `${id === mi ? 'bold ' : ''}15px Rubik, sans-serif`; g.fillStyle = id === mi ? '#ffc63d' : '#fff'; g.textAlign = 'left'; g.fillText(`${i + 1}. ${nombreDe(st, id).slice(0, 12)}`, W - 200, 46 + i * 20); g.textAlign = 'right'; g.fillText(`${pts}${unidad}`, W - 18, 46 + i * 20); });
    g.textAlign = 'left';
  }
  function minimapa(g, mapa, puntos, cam) {
    const s = 90, x0 = 10, y0 = H - s - 10;
    g.fillStyle = 'rgba(30,27,46,.55)'; g.fillRect(x0, y0, s, s);
    for (const [x, y, color, r] of puntos) { g.fillStyle = color; const rr = r || 2; g.fillRect(x0 + x / mapa * s - rr / 2, y0 + y / mapa * s - rr / 2, rr, rr); }
    if (cam) { g.strokeStyle = '#fff'; g.lineWidth = 1; g.strokeRect(x0 + cam.x / mapa * s - 3, y0 + cam.y / mapa * s - 3, 6, 6); }
  }
  function cartel(g, st, txtMuerto) {
    const p = yo(st); if (!p) return;
    window.Lienzo.texto(g, `⏱ ${Math.floor((st.ultimaF?.r ?? st.v.reloj) / 60)}:${String((st.ultimaF?.r ?? st.v.reloj) % 60).padStart(2, '0')}`, 14, 14, { tam: 16, color: '#1e1b2e', sombra: '#fff' });
    if (!p.vivo && !st.v.ganadores) { g.fillStyle = 'rgba(30,27,46,.55)'; g.fillRect(0, H / 2 - 50, W, 100); window.Lienzo.texto(g, txtMuerto, W / 2, H / 2 - 30, { tam: 24, color: '#ffc63d', alinear: 'center' }); window.Lienzo.texto(g, `Vuelves en un momento · tu máximo: ${p.max}`, W / 2, H / 2 + 8, { tam: 12, color: '#fff', alinear: 'center' }); }
  }
  // integración con la sala: guarda fotos y repinta al recibir la vista
  function enganchar(st, pintar, alFoto) {
    window.Lienzo.bucle(() => {}, () => { if (st.v && st.ctx) pintar(st.lz.g); });
    return {
      evento(ev) { if (ev.tipo !== 'foto') return; st.ultimaF = ev.f; if (alFoto) alFoto(ev.f); st.fotos.push({ t: performance.now(), f: ev.f }); if (st.fotos.length > 8) st.fotos.shift(); },
      render(zona, v, ctx, extra, botones = []) {
        const nuevo = !st.v;
        st.v = v; st.ctx = ctx;
        if (nuevo || v.foto) { if (!st.fotos.length) st.fotos.push({ t: performance.now(), f: v.foto }); }
        const info = el('p', 'suave centro', extra || '');
        const fila = UI.el('div', 'fila centro ar-botones'); fila.append(...botones);
        zona.append(st.cont, fila, info);
        if (v.ganadores) st.fotos = [];
      },
    };
  }
  return { crear, botonTactil, marco, mezclar, rejilla, tabla, minimapa, cartel, enganchar, nombreDe, colorDe, yo, W, H };
})();
