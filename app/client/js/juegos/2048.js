'use strict';
// 2048: flechas o deslizar. Se guarda la partida y el récord en este navegador.
window.JUEGO = {
  montar(raiz) {
    const { el, boton } = UI;
    const caja = el('div', 'solo win');
    const marcador = el('p', 'marcador');
    const tablero = el('div', 't2048');
    tablero.setAttribute('aria-label', 'Tablero de 2048'); tablero.tabIndex = 0;
    caja.append(marcador, tablero, boton('Nueva partida', () => nueva(), 'oro'), el('p', 'muted', 'Flechas o WASD; en el móvil, desliza el dedo.'));
    raiz.replaceChildren(caja);
    let g, puntos, record = UI.leer('2048-record', 0), ganado;
    const vacias = () => { const v = []; g.forEach((f, y) => f.forEach((x, c) => { if (!x) v.push([y, c]); })); return v; };
    const poner = () => { const v = vacias(); if (!v.length) return; const [y, c] = v[Math.floor(Math.random() * v.length)]; g[y][c] = Math.random() < 0.9 ? 2 : 4; };
    function nueva() { g = Array.from({ length: 4 }, () => Array(4).fill(0)); puntos = 0; ganado = false; poner(); poner(); guardar(); pintar(); }
    function guardar() { UI.guardar('2048', { g, puntos, ganado }); if (puntos > record) { record = puntos; UI.guardar('2048-record', record); } }
    function deslizar(fila) {
      const f = fila.filter(Boolean);
      for (let i = 0; i < f.length - 1; i++) if (f[i] === f[i + 1]) { f[i] *= 2; puntos += f[i]; if (f[i] === 2048 && !ganado) { ganado = true; UI.aviso('¡2048! Puedes seguir jugando'); } f.splice(i + 1, 1); }
      while (f.length < 4) f.push(0);
      return f;
    }
    function mover(d) {
      const antes = JSON.stringify(g);
      const rot = (m) => m[0].map((_, c) => m.map((f) => f[c]).reverse()); // giro horario
      let m = g, giros = { izquierda: 0, abajo: 1, derecha: 2, arriba: 3 }[d];
      for (let i = 0; i < giros; i++) m = rot(m);
      m = m.map(deslizar);
      for (let i = 0; i < (4 - giros) % 4; i++) m = rot(m);
      g = m;
      if (JSON.stringify(g) !== antes) { poner(); guardar(); }
      pintar();
    }
    const atascado = () => !vacias().length && g.every((f, y) => f.every((x, c) => x !== f[c + 1] && x !== (g[y + 1] || [])[c]));
    function pintar() {
      tablero.replaceChildren(...g.flat().map((x) => { const d = el('div', `celda v${Math.min(x, 4096)}`, x || ''); return d; }));
      marcador.textContent = `Puntos: ${puntos} · Récord: ${record}${atascado() ? ' · Sin movimientos' : ''}`;
    }
    const TECLAS = { ArrowUp: 'arriba', w: 'arriba', ArrowDown: 'abajo', s: 'abajo', ArrowLeft: 'izquierda', a: 'izquierda', ArrowRight: 'derecha', d: 'derecha' };
    document.addEventListener('keydown', (e) => { if (TECLAS[e.key] && !e.target.matches('input')) { e.preventDefault(); mover(TECLAS[e.key]); } });
    let toque = null;
    tablero.addEventListener('touchstart', (e) => { toque = [e.touches[0].clientX, e.touches[0].clientY]; }, { passive: true });
    tablero.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    tablero.addEventListener('touchend', (e) => {
      if (!toque) return;
      const dx = e.changedTouches[0].clientX - toque[0], dy = e.changedTouches[0].clientY - toque[1];
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 25) mover(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'derecha' : 'izquierda') : (dy > 0 ? 'abajo' : 'arriba'));
      toque = null;
    });
    const guardada = UI.leer('2048', null);
    if (guardada && Array.isArray(guardada.g)) { ({ g, puntos, ganado } = guardada); pintar(); } else nueva();
  },
};
