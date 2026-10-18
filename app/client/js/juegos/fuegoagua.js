'use strict';
// Fuego y Agua: plataformas cooperativas. Fuego no puede tocar el agua; Agua no puede tocar la lava; el veneno
// verde mata a los dos. Recoged vuestras gemas y llegad cada uno a su puerta. Los botones abren las compuertas
// mientras alguien los pisa. En el mismo teclado: Fuego con W A D, Agua con las flechas.
(() => {
  const { el, boton } = UI;
  const T = 16, W = 30 * T, H = 20 * T, IZQ = 1, DER = 2, SALTO = 4;
  const SOLIDO = new Set(['#', 'r', 'w', 'g']);
  // --- motor (lo usan el modo local y el anfitrión online) ---------------------------------------------
  function Motor(n, alAcabar) {
    const mapa = window.NIVELES_FA[n].mapa.map((f) => f.split(''));
    const ini = {}; mapa.forEach((f, y) => f.forEach((ch, x) => { if (ch === '1' || ch === '2') { ini[ch] = { x: x * T + 3, y: y * T + 2 }; f[x] = '.'; } }));
    const m = { n, mapa, pj: [], gemas: new Set(), abierto: false, t0: performance.now(), muertes: 0, hecho: false, aviso: null };
    function reiniciar() { m.pj = ['1', '2'].map((c) => ({ x: ini[c].x, y: ini[c].y, vx: 0, vy: 0, suelo: false, vivo: true })); m.gemas = new Set(); }
    reiniciar();
    const tile = (x, y) => (x < 0 || y < 0 || x >= 30 || y >= 20 ? '#' : mapa[y][x]);
    const solido = (ch) => SOLIDO.has(ch) || (ch === 'D' && !m.abierto);
    function choca(p) { for (const [px, py] of [[p.x, p.y], [p.x + 9, p.y], [p.x, p.y + 13], [p.x + 9, p.y + 13]]) if (solido(tile(Math.floor(px / T), Math.floor(py / T)))) return true; return false; }
    m.paso = (teclas, dt) => {
      if (m.hecho) return;
      // botones: abiertos mientras alguien esté encima
      m.abierto = m.pj.some((p) => tile(Math.floor((p.x + 5) / T), Math.floor((p.y + 12) / T)) === 'a');
      m.pj.forEach((p, i) => {
        const k = teclas[i] || 0;
        const quiere = ((k & DER) ? 1 : 0) - ((k & IZQ) ? 1 : 0);
        p.vx += (quiere * 120 - p.vx) * Math.min(1, dt * 14);
        if (k & SALTO && p.suelo) { p.vy = -400; p.suelo = false; }
        p.vy = Math.min(600, p.vy + 1400 * dt);
        const ox = p.x; p.x += p.vx * dt; if (choca(p)) { p.x = ox; p.vx = 0; }
        const oy = p.y; p.y += p.vy * dt;
        if (choca(p)) { p.y = oy; if (p.vy > 0) p.suelo = true; p.vy = 0; } else p.suelo = false;
        // lo que pisa
        const pie = tile(Math.floor((p.x + 5) / T), Math.floor((p.y + 15) / T));
        const mata = i === 0 ? (pie === 'w' || pie === 'g') : (pie === 'r' || pie === 'g');
        if (mata && p.suelo) { m.muertes++; m.aviso = { t: performance.now(), txt: i === 0 ? '¡Fuego se ha apagado!' : '¡Agua se ha evaporado!' }; reiniciar(); return; }
        // gemas
        const cx = Math.floor((p.x + 5) / T), cy = Math.floor((p.y + 7) / T), ch = tile(cx, cy);
        if ((ch === 'R' && i === 0) || (ch === 'B' && i === 1)) m.gemas.add(`${cx},${cy}`);
      });
      const enPuerta = m.pj.map((p, i) => tile(Math.floor((p.x + 5) / T), Math.floor((p.y + 7) / T)) === (i === 0 ? 'F' : 'A'));
      if (enPuerta[0] && enPuerta[1]) { m.hecho = true; alAcabar((performance.now() - m.t0) / 1000); }
    };
    m.foto = () => ({ n: m.n, p: m.pj.map((p) => [Math.round(p.x), Math.round(p.y)]), g: [...m.gemas], a: m.abierto ? 1 : 0, m: m.muertes, t: Math.round((performance.now() - m.t0) / 1000), av: m.aviso && performance.now() - m.aviso.t < 1500 ? m.aviso.txt : null });
    return m;
  }
  // --- dibujo ---------------------------------------------------------------------------------------
  function dibujar(g, f, mapa) {
    g.fillStyle = '#2b2f5e'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#313670'; for (let y = 0; y < H; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < W; x += 16) g.fillRect(x, y, 8, 8);
    const gemas = new Set(f.g), t = performance.now() / 300;
    mapa.forEach((fila, y) => fila.forEach((ch, x) => {
      const px = x * T, py = y * T;
      if (ch === '#') { g.fillStyle = '#6b6680'; g.fillRect(px, py, T, T); g.fillStyle = '#8b86a0'; g.fillRect(px, py, T, 3); g.fillStyle = '#4a4560'; g.fillRect(px, py + T - 2, T, 2); }
      if (ch === 'r' || ch === 'w' || ch === 'g') {
        g.fillStyle = '#6b6680'; g.fillRect(px, py + 6, T, T - 6);
        g.fillStyle = ch === 'r' ? '#ff5a36' : ch === 'w' ? '#4d7cfe' : '#3fbf5f'; g.fillRect(px, py + 2, T, 6);
        g.fillStyle = ch === 'r' ? '#ffc63d' : ch === 'w' ? '#9ad1ff' : '#9adf8c'; g.fillRect(px + ((x * 5 + Math.floor(t * 2)) % 12), py + 2, 4, 2);
      }
      if ((ch === 'R' || ch === 'B') && !gemas.has(`${x},${y}`)) { const c = ch === 'R' ? '#ff5a36' : '#4d7cfe'; const by = py + 4 + Math.sin(t + x) * 1.5; g.fillStyle = '#1e1b2e'; g.fillRect(px + 3, by, 10, 9); g.fillStyle = c; g.fillRect(px + 4, by + 1, 8, 7); g.fillStyle = '#ffffff'; g.fillRect(px + 5, by + 2, 2, 2); }
      if (ch === 'F' || ch === 'A') { g.fillStyle = '#1e1b2e'; g.fillRect(px - 2, py - 10, T + 4, T + 10); g.fillStyle = ch === 'F' ? '#ff8a72' : '#8fb0ff'; g.fillRect(px, py - 8, T, T + 8); g.fillStyle = '#1e1b2e'; g.fillRect(px + 6, py - 2, 4, 8); }
      if (ch === 'a') { g.fillStyle = '#1e1b2e'; g.fillRect(px + 2, py + T - 5, 12, 5); g.fillStyle = f.a ? '#3fbf5f' : '#ffc63d'; g.fillRect(px + 3, py + T - (f.a ? 2 : 4), 10, f.a ? 2 : 3); }
      if (ch === 'D') { g.fillStyle = f.a ? 'rgba(255,198,61,.15)' : '#ffc63d'; g.fillRect(px + 4, py, 8, T); if (!f.a) { g.fillStyle = '#d99a12'; g.fillRect(px + 4, py + 6, 8, 2); } }
    }));
    // personajes
    f.p.forEach(([x, y], i) => {
      const c = i ? '#4d7cfe' : '#ff5a36', c2 = i ? '#9ad1ff' : '#ffc63d';
      g.fillStyle = '#1e1b2e'; g.fillRect(x - 1, y + 3, 12, 12);
      g.fillStyle = c; g.fillRect(x, y + 4, 10, 10);
      // cabeza: llama o gota
      g.fillStyle = c2; if (i === 0) { g.fillRect(x + 2, y - 2 + Math.sin(t * 3) * 1, 6, 6); g.fillRect(x + 4, y - 5 + Math.sin(t * 3 + 1), 2, 4); } else { g.fillRect(x + 3, y - 3, 4, 7); g.fillRect(x + 2, y, 6, 4); }
      g.fillStyle = '#ffffff'; g.fillRect(x + 2, y + 7, 2, 2); g.fillRect(x + 6, y + 7, 2, 2);
    });
    const L = window.Lienzo;
    L.texto(g, `NIVEL ${f.n + 1} · ${f.t}s · ☠${f.m}`, 6, 4, { tam: 8, color: '#ffc63d' });
    if (f.av) L.texto(g, f.av, W / 2, H / 2 - 10, { tam: 16, color: '#ffffff', alinear: 'center' });
  }
  // teclas: en local, cada jugador las suyas; online, cualquiera de las dos para tu personaje
  const MAPA_F = { KeyA: IZQ, KeyD: DER, KeyW: SALTO }, MAPA_A = { ArrowLeft: IZQ, ArrowRight: DER, ArrowUp: SALTO };
  const k = [0, 0];
  let modoOnline = null; // null = local; si no, { yo }
  let alCambiarTeclas = null;
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return;
    const bit = modoOnline ? (MAPA_F[e.code] || MAPA_A[e.code]) : null;
    if (modoOnline && bit) { e.preventDefault(); k[modoOnline.yo] |= bit; alCambiarTeclas?.(); return; }
    if (MAPA_F[e.code]) { k[0] |= MAPA_F[e.code]; e.preventDefault(); } if (MAPA_A[e.code]) { k[1] |= MAPA_A[e.code]; e.preventDefault(); }
  });
  document.addEventListener('keyup', (e) => {
    const bit = modoOnline ? (MAPA_F[e.code] || MAPA_A[e.code]) : null;
    if (modoOnline && bit) { k[modoOnline.yo] &= ~bit; alCambiarTeclas?.(); return; }
    if (MAPA_F[e.code]) k[0] &= ~MAPA_F[e.code]; if (MAPA_A[e.code]) k[1] &= ~MAPA_A[e.code];
  });
  function mandosTactiles(quien, setBit) {
    const d = el('div', 'tk-mandos cabezones');
    for (const [txt, bit] of [['◀', IZQ], ['▶', DER], ['⤒', SALTO]]) {
      const b = boton(txt, null, 'mini'); b.setAttribute('aria-label', txt);
      UI.mantener(b, () => setBit(bit, true), () => setBit(bit, false));
      d.append(b);
    }
    if (quien) d.prepend(el('small', 'suave', quien));
    return d;
  }
  // --- modo local (2 en el mismo teclado) ---------------------------------------------------------------------
  function local(raiz) {
    modoOnline = null;
    const caja = el('div', 'solo fuegoagua'); const cont = el('div', 'lz-cont');
    caja.append(el('p', 'turno mio', 'Fuego: W A D · Agua: ← ↑ →'), cont);
    raiz.replaceChildren(caja);
    const lz = window.Lienzo.crear(cont, W, H);
    let n = 0, tiempos = [];
    let motor = Motor(n, siguiente);
    function siguiente(seg) {
      tiempos.push(seg);
      UI.aviso(`¡Nivel ${n + 1} superado en ${Math.round(seg)} s!`, 'bien'); Confeti(80);
      if (n + 1 >= window.NIVELES_FA.length) { setTimeout(() => { caja.append(el('div', 'panel', `¡Lo habéis conseguido! Tiempo total: ${Math.round(tiempos.reduce((a, b) => a + b, 0))} s`)); }, 500); return; }
      setTimeout(() => { n++; motor = Motor(n, siguiente); }, 1200);
    }
    const tact = el('div', 'fila centro');
    tact.append(mandosTactiles('Fuego', (b, on) => { k[0] = on ? k[0] | b : k[0] & ~b; }), mandosTactiles('Agua', (b, on) => { k[1] = on ? k[1] | b : k[1] & ~b; }));
    caja.append(tact, boton('Reiniciar nivel', () => { motor = Motor(n, siguiente); }, 'mini flojo'));
    window.Lienzo.bucle((dt) => motor.paso(k, dt), () => dibujar(lz.g, motor.foto(), motor.mapa));
  }
  // --- modo online ---------------------------------------------------------------------------------
  let lzO = null, ctxO = null, vO = null, motorO = null, ultimaFoto = null, kRemota = 0, enviadas = -1, cada = 0;
  window.JUEGO = {
    local,
    evento(ev) {
      if (!ctxO) return;
      if (ev.tipo === 'teclas' && ctxO.yo === 0) kRemota = ev.k;
      if (ev.tipo === 'foto' && ctxO.yo !== 0) ultimaFoto = ev.f;
    },
    render(zona, v, ctx) {
      ctxO = ctx; vO = v; modoOnline = { yo: ctx.yo };
      const anfitrion = ctx.yo === 0;
      alCambiarTeclas = anfitrion ? null : () => { if (k[1] !== enviadas) { enviadas = k[1]; ctx.enviar({ tipo: 'teclas', k: k[1] }); } };
      if (anfitrion && (!motorO || motorO.n !== v.nivel) && !v.ganado) motorO = Motor(v.nivel, (seg) => { UI.aviso('¡Nivel superado!', 'bien'); Confeti(80); ctx.enviar({ tipo: 'nivel', n: v.nivel, segundos: seg }); });
      const cont = el('div', 'lz-cont');
      if (!lzO) {
        lzO = window.Lienzo.crear(cont, W, H);
        window.Lienzo.bucle((dt) => {
          if (!vO || vO.ganado || ctxO.fase !== 'juego') return;
          if (ctxO.yo === 0 && motorO) { motorO.paso([k[0], kRemota], dt); if (++cada % 3 === 0) ctxO.enviar({ tipo: 'foto', f: motorO.foto() }); }
        }, () => {
          const f = ctxO.yo === 0 ? motorO?.foto() : ultimaFoto;
          if (f && window.NIVELES_FA[f.n]) dibujar(lzO.g, f, window.NIVELES_FA[f.n].mapa.map((r) => r.split('').map((c) => (c === '1' || c === '2' ? '.' : c))));
          else { lzO.g.fillStyle = '#2b2f5e'; lzO.g.fillRect(0, 0, W, H); window.Lienzo.texto(lzO.g, 'ESPERANDO…', W / 2, H / 2, { tam: 16, color: '#ffc63d', alinear: 'center' }); }
        });
      } else cont.append(lzO.c);
      const info = el('p', 'turno mio', `Eres ${ctx.yo === 0 ? '🔥 Fuego' : '💧 Agua'} · Nivel ${Math.min(v.nivel + 1, v.total)} de ${v.total} · muévete con las flechas o W A D`);
      zona.append(info, cont, mandosTactiles(null, (b, on) => { const yo = ctx.yo; k[yo] = on ? k[yo] | b : k[yo] & ~b; alCambiarTeclas?.(); }));
      if (v.tiempos.length) zona.append(el('p', 'suave centro', `Tiempos: ${v.tiempos.map((t, i) => `nivel ${i + 1} ${t} s`).join(' · ')}`));
    },
  };
})();
