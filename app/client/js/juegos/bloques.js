'use strict';
// Bloques: piezas de 4 cuadros que caen; completa líneas para borrarlas. Con pieza fantasma, siguiente y reserva.
// Teclado: ← → mover, ↑ / X girar, Z girar al revés, ↓ bajar, espacio caer del todo, C reservar, P pausa.
// Móvil: botones o gestos (deslizar a los lados, abajo para caer, tocar para girar).
window.JUEGO = {
  montar(raiz) {
    const { el, boton } = UI;
    const W = 10, H = 20, T = 24; // casillas y píxeles por casilla
    const PIEZAS = {
      I: { c: '#4dd0ff', f: [[0, 1], [1, 1], [2, 1], [3, 1]] }, O: { c: '#ffc63d', f: [[1, 0], [2, 0], [1, 1], [2, 1]] },
      T: { c: '#8a5cf6', f: [[1, 0], [0, 1], [1, 1], [2, 1]] }, S: { c: '#3fbf5f', f: [[1, 0], [2, 0], [0, 1], [1, 1]] },
      Z: { c: '#ff5a36', f: [[0, 0], [1, 0], [1, 1], [2, 1]] }, J: { c: '#4d7cfe', f: [[0, 0], [0, 1], [1, 1], [2, 1]] },
      L: { c: '#ff9f2e', f: [[2, 0], [0, 1], [1, 1], [2, 1]] },
    };
    const caja = el('div', 'solo bloques');
    const marcador = el('p', 'marcador');
    const zona = el('div', 'bq-zona');
    const lienzo = el('canvas', 'bq-lienzo'); lienzo.width = W * T; lienzo.height = H * T; lienzo.setAttribute('aria-label', 'Tablero de bloques');
    const lado = el('div', 'bq-lado');
    const sig = el('canvas', 'bq-mini'); sig.width = sig.height = 4 * 16;
    const res = el('canvas', 'bq-mini'); res.width = res.height = 4 * 16;
    const d1 = el('div', 'bq-caja'); d1.append(el('span', null, 'Siguiente'), sig);
    const d2 = el('div', 'bq-caja'); d2.append(el('span', null, 'Reserva'), res);
    const nivelTxt = el('div', 'bq-caja bq-num'), lineasTxt = el('div', 'bq-caja bq-num');
    lado.append(d1, d2, nivelTxt, lineasTxt);
    zona.append(lienzo, lado);
    const mandos = el('div', 'bq-mandos');
    // los de moverse y bajar se repiten al mantener pulsado
    const mando = (txt, fn, etq, repite = false) => { const b = boton(txt, null, 'mini'); b.setAttribute('aria-label', etq); let rep; UI.mantener(b, () => { fn(); if (repite) rep = setInterval(fn, 110); }, () => clearInterval(rep)); return b; };
    mandos.append(mando('◀', () => mover(-1), 'Izquierda', true), mando('⟳', () => girar(1), 'Girar'), mando('▶', () => mover(1), 'Derecha', true), mando('▼', () => bajar(true), 'Bajar', true), mando('⤓', () => caer(), 'Caer'), mando('⇄', () => reservar(), 'Reservar'));
    const empezar = boton('Empezar', () => nueva(), 'oro');
    caja.append(marcador, zona, mandos, empezar, el('p', 'suave centro', '← → mover · ↑ girar · ↓ bajar · espacio caer · C reservar · P pausa'));
    raiz.replaceChildren(caja);
    const g = lienzo.getContext('2d'), gs = sig.getContext('2d'), gr = res.getContext('2d');

    let tab, pieza, bolsa, siguiente, reserva, yaReservo, puntos, lineas, nivel, vivo = false, pausa = false, ultimo, acum, flash = [];
    let record = UI.leer('bloques', 0);
    const forma = (k, rot) => { let f = PIEZAS[k].f.map(([x, y]) => [x, y]); if (k === 'O') return f; const n = k === 'I' ? 4 : 3; for (let r = 0; r < ((rot % 4) + 4) % 4; r++) f = f.map(([x, y]) => [n - 1 - y, x]); return f; };
    const sacar = () => { if (!bolsa.length) { bolsa = Object.keys(PIEZAS); for (let i = bolsa.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bolsa[i], bolsa[j]] = [bolsa[j], bolsa[i]]; } } return bolsa.pop(); };
    const cabe = (k, rot, x, y) => forma(k, rot).every(([a, b]) => { const X = x + a, Y = y + b; return X >= 0 && X < W && Y < H && (Y < 0 || !tab[Y][X]); });
    function nueva() {
      tab = Array.from({ length: H }, () => Array(W).fill(null));
      bolsa = []; siguiente = sacar(); reserva = null; puntos = 0; lineas = 0; nivel = 1; vivo = true; pausa = false; flash = [];
      empezar.hidden = true; nuevaPieza(); ultimo = performance.now(); acum = 0; requestAnimationFrame(bucle);
    }
    function nuevaPieza(k) {
      pieza = { k: k || siguiente, rot: 0, x: 3, y: -1 };
      if (!k) siguiente = sacar();
      yaReservo = !!k && yaReservo;
      if (!cabe(pieza.k, 0, pieza.x, pieza.y)) fin();
    }
    const intervalo = () => Math.max(60, 800 * Math.pow(0.84, nivel - 1));
    function mover(dx) { if (vivo && !pausa && cabe(pieza.k, pieza.rot, pieza.x + dx, pieza.y)) { pieza.x += dx; dibujar(); } }
    function girar(d) {
      if (!vivo || pausa) return;
      const r = pieza.rot + d;
      for (const dx of [0, -1, 1, -2, 2]) for (const dy of [0, -1]) if (cabe(pieza.k, r, pieza.x + dx, pieza.y + dy)) { pieza.rot = r; pieza.x += dx; pieza.y += dy; dibujar(); return; }
    }
    function bajar(manual) {
      if (!vivo || pausa) return false;
      if (cabe(pieza.k, pieza.rot, pieza.x, pieza.y + 1)) { pieza.y++; if (manual) puntos += 1; acum = 0; dibujar(); return true; }
      fijar(); return false;
    }
    function caer() { if (!vivo || pausa) return; let n = 0; while (cabe(pieza.k, pieza.rot, pieza.x, pieza.y + 1)) { pieza.y++; n++; } puntos += n * 2; lienzo.classList.remove('golpe'); void lienzo.offsetWidth; lienzo.classList.add('golpe'); fijar(); }
    function reservar() {
      if (!vivo || pausa || yaReservo) return;
      const k = pieza.k;
      if (reserva) { const r = reserva; reserva = k; nuevaPieza(r); } else { reserva = k; nuevaPieza(); }
      yaReservo = true; dibujar();
    }
    function fijar() {
      for (const [a, b] of forma(pieza.k, pieza.rot)) { const Y = pieza.y + b; if (Y < 0) return fin(); tab[Y][pieza.x + a] = PIEZAS[pieza.k].c; }
      const llenas = tab.map((f, i) => (f.every(Boolean) ? i : -1)).filter((i) => i >= 0);
      if (llenas.length) {
        flash = llenas; dibujar();
        vivo = false; // pausa breve para el destello
        setTimeout(() => {
          for (const i of llenas) { tab.splice(i, 1); tab.unshift(Array(W).fill(null)); }
          lineas += llenas.length;
          puntos += [0, 100, 300, 500, 800][llenas.length] * nivel;
          if (llenas.length === 4) UI.aviso('¡Cuatro de golpe!', 'bien');
          const nuevoNivel = Math.floor(lineas / 10) + 1;
          if (nuevoNivel > nivel) { nivel = nuevoNivel; UI.aviso(`Nivel ${nivel}`); }
          flash = []; vivo = true; nuevaPieza(); dibujar(); ultimo = performance.now(); requestAnimationFrame(bucle);
        }, 180);
        return;
      }
      nuevaPieza(); dibujar();
    }
    function fin() {
      vivo = false;
      if (puntos > record) { record = puntos; UI.guardar('bloques', record); UI.aviso(`¡Nuevo récord! ${puntos}`, 'bien'); Confeti(); } else UI.aviso('Fin de la partida', 'mal');
      if (puntos > 0) Cuenta.record('bloques', puntos);
      empezar.textContent = 'Otra vez'; empezar.hidden = false; dibujar();
    }
    function bucle(t) {
      if (!vivo) return;
      if (!pausa) { acum += t - ultimo; if (acum >= intervalo()) { acum = 0; bajar(false); } }
      ultimo = t;
      if (vivo) requestAnimationFrame(bucle);
    }
    function cuadro(ctx, x, y, c, t, alfa = 1) {
      ctx.globalAlpha = alfa;
      ctx.fillStyle = '#1e1b2e'; ctx.fillRect(x * t, y * t, t, t);
      ctx.fillStyle = c; ctx.fillRect(x * t + 2, y * t + 2, t - 4, t - 4);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x * t + 2, y * t + 2, t - 4, 3); ctx.fillRect(x * t + 2, y * t + 2, 3, t - 4);
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x * t + 2, y * t + t - 5, t - 4, 3);
      ctx.globalAlpha = 1;
    }
    function mini(ctx, k) {
      ctx.clearRect(0, 0, 64, 64);
      if (!k) return;
      const f = forma(k, 0);
      const minx = Math.min(...f.map((p) => p[0])), maxx = Math.max(...f.map((p) => p[0])), miny = Math.min(...f.map((p) => p[1])), maxy = Math.max(...f.map((p) => p[1]));
      const ox = (4 - (maxx - minx + 1)) / 2 - minx, oy = (4 - (maxy - miny + 1)) / 2 - miny;
      for (const [a, b] of f) cuadro(ctx, a + ox, b + oy, PIEZAS[k].c, 16);
    }
    function dibujar() {
      g.fillStyle = '#23264f'; g.fillRect(0, 0, lienzo.width, lienzo.height);
      g.fillStyle = '#2b2f5e';
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x + y) % 2) g.fillRect(x * T, y * T, T, T);
      if (tab) {
        tab.forEach((f, y) => f.forEach((c, x) => { if (c) cuadro(g, x, y, flash.includes(y) ? '#ffffff' : c, T); }));
        if (pieza && vivo) {
          let gy = pieza.y; while (cabe(pieza.k, pieza.rot, pieza.x, gy + 1)) gy++;
          for (const [a, b] of forma(pieza.k, pieza.rot)) if (gy + b >= 0) cuadro(g, pieza.x + a, gy + b, PIEZAS[pieza.k].c, T, .25);
          for (const [a, b] of forma(pieza.k, pieza.rot)) if (pieza.y + b >= 0) cuadro(g, pieza.x + a, pieza.y + b, PIEZAS[pieza.k].c, T);
        }
      }
      mini(gs, siguiente); mini(gr, reserva);
      marcador.textContent = `Puntos: ${puntos || 0} · Récord: ${record}${pausa ? ' · PAUSA' : ''}`;
      nivelTxt.replaceChildren(el('span', null, 'Nivel'), el('b', null, String(nivel || 1)));
      lineasTxt.replaceChildren(el('span', null, 'Líneas'), el('b', null, String(lineas || 0)));
    }
    document.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea, dialog')) return;
      const k = e.key;
      const acciones = { ArrowLeft: () => mover(-1), ArrowRight: () => mover(1), ArrowDown: () => bajar(true), ArrowUp: () => girar(1), x: () => girar(1), X: () => girar(1), z: () => girar(-1), Z: () => girar(-1), ' ': () => (vivo ? caer() : !tab || empezar.hidden === false ? nueva() : null), c: reservar, C: reservar, p: () => { pausa = !pausa; dibujar(); }, P: () => { pausa = !pausa; dibujar(); } };
      if (acciones[k]) { e.preventDefault(); acciones[k](); }
    });
    // gestos en el tablero
    let toque = null;
    lienzo.addEventListener('touchstart', (e) => { toque = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now(), movido: 0 }; }, { passive: true });
    lienzo.addEventListener('touchmove', (e) => {
      e.preventDefault(); if (!toque) return;
      const dx = e.touches[0].clientX - toque.x;
      const paso = lienzo.getBoundingClientRect().width / W;
      while (dx - toque.movido * paso > paso) { mover(1); toque.movido++; }
      while (dx - toque.movido * paso < -paso) { mover(-1); toque.movido--; }
    }, { passive: false });
    lienzo.addEventListener('touchend', (e) => {
      if (!toque) return;
      const dy = e.changedTouches[0].clientY - toque.y, dx = e.changedTouches[0].clientX - toque.x;
      if (dy > 60 && Math.abs(dy) > Math.abs(dx)) caer();
      else if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && Date.now() - toque.t < 250) girar(1);
      toque = null;
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && vivo) { pausa = true; dibujar(); } });
    dibujar();
  },
};
