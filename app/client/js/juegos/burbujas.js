'use strict';
// Burbujas: apunta con el ratón o el dedo y dispara. Junta 3 o más del mismo color y explotan; las que se
// quedan colgando caen (y dan más puntos). Cada 6 disparos fallidos baja el techo. Si llegan abajo, se acaba.
window.JUEGO = {
  montar(raiz) {
    const { el, boton } = UI;
    const L = window.Lienzo;
    const W = 240, H = 360, R = 10, COLS = 11, FILA = R * Math.sqrt(3);
    const COLORES = ['#ff5a36', '#ffc63d', '#3fbf5f', '#4d7cfe', '#8a5cf6', '#ff6fa8'];
    const caja = el('div', 'solo burbujas');
    const marcador = el('p', 'marcador');
    const cont = el('div', 'lz-cont');
    caja.append(marcador, cont);
    const { c, g, punto } = L.crear(cont, W, H);
    const otra = boton('Nueva partida', () => nueva(), 'oro');
    caja.append(otra, el('p', 'suave centro', 'Apunta y toca para disparar. Pulsa la burbuja de abajo a la derecha para cambiarla.'));
    raiz.replaceChildren(caja);

    let rejilla, techo, disparo, actual, siguiente, puntos, fallos, vivo, apunta = -Math.PI / 2, record = UI.leer('burbujas', 0), particulas = [], cayendo = [];
    const filas = 15;
    const enFila = (f) => (((f + techo) % 2) ? COLS - 1 : COLS);
    const pos = (f, k) => ({ x: R + k * 2 * R + (((f + techo) % 2) ? R : 0), y: R + f * FILA + techo * FILA * 0 + bajada * FILA });
    let bajada = 0;
    const coloresVivos = () => { const s = new Set(); rejilla.forEach((fila) => fila.forEach((b) => { if (b !== null) s.add(b); })); return [...s]; };
    const nuevaBola = () => { const cs = coloresVivos(); return cs.length ? cs[Math.floor(Math.random() * cs.length)] : Math.floor(Math.random() * 4); };
    function nueva() {
      techo = 0; bajada = 0; puntos = 0; fallos = 0; vivo = true; particulas = []; cayendo = [];
      rejilla = Array.from({ length: filas }, (_, f) => Array.from({ length: COLS }, () => null));
      for (let f = 0; f < 6; f++) for (let k = 0; k < enFila(f); k++) rejilla[f][k] = Math.floor(Math.random() * 5);
      actual = nuevaBola(); siguiente = nuevaBola(); disparo = null;
      otra.hidden = true;
    }
    function vecinos(f, k) {
      const par = ((f + techo) % 2) === 1;
      const d = par ? [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]] : [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]];
      return d.map(([df, dk]) => [f + df, k + dk]).filter(([y, x]) => y >= 0 && y < filas && x >= 0 && x < enFila(y));
    }
    function grupo(f, k, mismoColor) {
      const color = rejilla[f][k], visto = new Set([`${f},${k}`]), pila = [[f, k]], res = [];
      while (pila.length) { const [y, x] = pila.pop(); res.push([y, x]); for (const [a, b] of vecinos(y, x)) { const cl = `${a},${b}`; if (!visto.has(cl) && rejilla[a][b] !== null && (!mismoColor || rejilla[a][b] === color)) { visto.add(cl); pila.push([a, b]); } } }
      return res;
    }
    function explotar(f, k) {
      const g1 = grupo(f, k, true);
      if (g1.length < 3) { fallos++; return; }
      for (const [y, x] of g1) { const p = pos(y, x); chispas(p.x, p.y, COLORES[rejilla[y][x]]); rejilla[y][x] = null; }
      puntos += g1.length * 10;
      // las que no tocan el techo caen
      const pegadas = new Set();
      for (let x = 0; x < enFila(0); x++) if (rejilla[0][x] !== null) for (const [a, b] of grupo(0, x, false)) pegadas.add(`${a},${b}`);
      let caen = 0;
      rejilla.forEach((fila, y) => fila.forEach((bb, x) => { if (bb !== null && !pegadas.has(`${y},${x}`)) { const p = pos(y, x); cayendo.push({ ...p, vy: 0, c: bb }); rejilla[y][x] = null; caen++; } }));
      if (caen) { puntos += caen * 20 * (1 + Math.floor(caen / 5)); }
      if (!coloresVivos().length) { puntos += 1000; UI.aviso('¡Pantalla limpia! +1000', 'bien'); Confeti(); for (let f = 0; f < 5; f++) for (let x = 0; x < enFila(f); x++) rejilla[f][x] = Math.floor(Math.random() * 6); }
    }
    function chispas(x, y, color) { for (let i = 0; i < 6; i++) particulas.push({ x, y, vx: (Math.random() - .5) * 120, vy: (Math.random() - .8) * 120, t: .5, color }); }
    function bajarTecho() {
      bajada++;
      if (fallos) fallos = 0;
    }
    function fijar(b) {
      // la celda libre más cercana
      let mejor = null, d = Infinity;
      for (let f = 0; f < filas; f++) for (let k = 0; k < enFila(f); k++) {
        if (rejilla[f][k] !== null) continue;
        const p = pos(f, k); const dd = (p.x - b.x) ** 2 + (p.y - b.y) ** 2;
        if (dd < d && (f === 0 || vecinos(f, k).some(([y, x]) => rejilla[y][x] !== null))) { d = dd; mejor = [f, k]; }
      }
      if (!mejor) return;
      rejilla[mejor[0]][mejor[1]] = b.c;
      explotar(mejor[0], mejor[1]);
      if (fallos >= 6) bajarTecho();
      // ¿llega abajo?
      rejilla.forEach((fila, y) => fila.forEach((bb, x) => { if (bb !== null && pos(y, x).y > H - 50) fin(); }));
    }
    function fin() {
      if (!vivo) return;
      vivo = false;
      if (puntos > record) { record = puntos; UI.guardar('burbujas', record); UI.aviso(`¡Nuevo récord! ${puntos}`, 'bien'); Confeti(); } else UI.aviso('Fin de la partida', 'mal');
      if (puntos) Cuenta.record('burbujas', puntos);
      otra.textContent = 'Otra vez'; otra.hidden = false;
    }
    function disparar() {
      if (!vivo || disparo) return;
      const v = 360;
      disparo = { x: W / 2, y: H - 22, vx: Math.cos(apunta) * v, vy: Math.sin(apunta) * v, c: actual };
      actual = siguiente; siguiente = nuevaBola();
    }
    c.addEventListener('pointermove', (e) => { const p = punto(e); apunta = Math.max(-Math.PI + 0.15, Math.min(-0.15, Math.atan2(p.y - (H - 22), p.x - W / 2))); });
    c.addEventListener('pointerdown', (e) => {
      const p = punto(e);
      if (Math.hypot(p.x - (W - 24), p.y - (H - 18)) < 14) { [actual, siguiente] = [siguiente, actual]; return; }
      apunta = Math.max(-Math.PI + 0.15, Math.min(-0.15, Math.atan2(p.y - (H - 22), p.x - W / 2)));
      disparar();
    });
    document.addEventListener('keydown', (e) => { if (e.code === 'Space') disparar(); });
    function actualizar(dt) {
      if (L.teclas.has('ArrowLeft')) apunta = Math.max(-Math.PI + 0.15, apunta - 1.8 * dt);
      if (L.teclas.has('ArrowRight')) apunta = Math.min(-0.15, apunta + 1.8 * dt);
      if (disparo) {
        for (let s = 0; s < 4; s++) {
          disparo.x += disparo.vx * dt / 4; disparo.y += disparo.vy * dt / 4;
          if (disparo.x < R) { disparo.x = R; disparo.vx *= -1; }
          if (disparo.x > W - R) { disparo.x = W - R; disparo.vx *= -1; }
          let choca = disparo.y < R + bajada * FILA;
          rejilla.forEach((fila, y) => fila.forEach((bb, x) => { if (bb !== null) { const p = pos(y, x); if ((p.x - disparo.x) ** 2 + (p.y - disparo.y) ** 2 < (2 * R - 3) ** 2) choca = true; } }));
          if (choca) { const b = disparo; disparo = null; fijar(b); break; }
        }
      }
      for (const p of particulas) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.t -= dt; }
      particulas = particulas.filter((p) => p.t > 0);
      for (const b of cayendo) { b.vy += 600 * dt; b.y += b.vy * dt; }
      cayendo = cayendo.filter((b) => b.y < H + 20);
    }
    function bola(x, y, color, r = R) {
      g.fillStyle = '#1e1b2e'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = color; g.beginPath(); g.arc(x, y, r - 1.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(Math.round(x - r / 2), Math.round(y - r / 2), 3, 3);
    }
    function pintar() {
      g.fillStyle = '#23264f'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#2b2f5e'; for (let y = 0; y < H; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < W; x += 16) g.fillRect(x, y, 8, 8);
      g.fillStyle = '#5b37b8'; g.fillRect(0, 0, W, bajada * FILA);
      g.fillStyle = '#ff5a36'; for (let x = 0; x < W; x += 8) g.fillRect(x, H - 50, 4, 1);
      if (!rejilla) return;
      rejilla.forEach((fila, y) => fila.forEach((bb, x) => { if (bb !== null) { const p = pos(y, x); bola(p.x, p.y, COLORES[bb]); } }));
      for (const b of cayendo) bola(b.x, b.y, COLORES[b.c]);
      // guía de puntería (punteada, con un rebote)
      if (vivo) {
        let x = W / 2, y = H - 22, vx = Math.cos(apunta), vy = Math.sin(apunta);
        g.fillStyle = 'rgba(255,255,255,.5)';
        for (let i = 0; i < 40; i++) { x += vx * 6; y += vy * 6; if (x < R || x > W - R) vx *= -1; if (i % 2) g.fillRect(Math.round(x), Math.round(y), 2, 2); }
      }
      if (disparo) bola(disparo.x, disparo.y, COLORES[disparo.c]);
      bola(W / 2, H - 22, COLORES[actual]);
      bola(W - 24, H - 18, COLORES[siguiente], 7);
      for (const p of particulas) { g.fillStyle = p.color; g.fillRect(Math.round(p.x), Math.round(p.y), 3, 3); }
      L.texto(g, `${puntos}`, 6, H - 14, { tam: 8, color: '#ffc63d' });
      L.texto(g, `${6 - fallos}`, 60, H - 14, { tam: 8, color: '#ff8466' });
      marcador.textContent = `Puntos: ${puntos} · Récord: ${record}`;
    }
    nueva();
    L.bucle(actualizar, pintar);
  },
};
