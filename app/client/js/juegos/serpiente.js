'use strict';
// Serpiente: lienzo de 20×20 casillas. Flechas/WASD, deslizar el dedo o los botones en pantalla.
window.JUEGO = {
  montar(raiz) {
    const { el, boton } = UI;
    const N = 20;
    const caja = el('div', 'solo');
    const marcador = el('p', 'marcador');
    const lienzo = el('canvas', 'lienzo'); lienzo.width = N * 16; lienzo.height = N * 16;
    lienzo.setAttribute('aria-label', 'Tablero de la serpiente');
    const g = lienzo.getContext('2d');
    const flechas = el('div', 'cruceta');
    const DIRS = { arriba: [0, -1], abajo: [0, 1], izquierda: [-1, 0], derecha: [1, 0] };
    for (const [k, t] of [['arriba', '▲'], ['izquierda', '◀'], ['abajo', '▼'], ['derecha', '▶']]) {
      const b = boton(t, () => girar(DIRS[k]), 'mini ' + k); b.setAttribute('aria-label', k); flechas.append(b);
    }
    const empezar = boton('Empezar', () => reiniciar(), 'oro');
    caja.append(marcador, lienzo, flechas, empezar, el('p', 'suave', 'Flechas o WASD; en el móvil, desliza el dedo. Espacio: pausa.'));
    raiz.replaceChildren(caja);

    let motivo = '', cuerpo, dir, siguiente, comida, puntos, vivo = false, pausa = false, temporizador;
    let record = UI.leer('serpiente', 0);
    const libre = () => { let p; do { p = [Math.floor(Math.random() * N), Math.floor(Math.random() * N)]; } while (cuerpo.some(([x, y]) => x === p[0] && y === p[1])); return p; };
    function reiniciar() {
      cuerpo = [[10, 10], [9, 10], [8, 10]]; dir = [1, 0]; siguiente = [1, 0]; puntos = 0; comida = libre(); vivo = true; pausa = false;
      empezar.hidden = true; clearInterval(temporizador); temporizador = setInterval(paso, 120); dibujar(); lienzo.focus?.();
    }
    function girar(d) { if (!vivo) return; if (d[0] === -dir[0] && d[1] === -dir[1]) return; siguiente = d; }
    function paso() {
      if (pausa) return;
      dir = siguiente;
      const cabeza = [cuerpo[0][0] + dir[0], cuerpo[0][1] + dir[1]];
      if (cabeza[0] < 0 || cabeza[1] < 0 || cabeza[0] >= N || cabeza[1] >= N) { motivo = '¡Contra la pared!'; return morir(); }
      // la punta de la cola se aparta en este mismo paso (salvo si se come): pisarla no es morderse
      const come = cabeza[0] === comida[0] && cabeza[1] === comida[1];
      if ((come ? cuerpo : cuerpo.slice(0, -1)).some(([x, y]) => x === cabeza[0] && y === cabeza[1])) { motivo = '¡Te has mordido!'; return morir(); }
      cuerpo.unshift(cabeza);
      if (cabeza[0] === comida[0] && cabeza[1] === comida[1]) {
        puntos++; comida = libre();
        clearInterval(temporizador); temporizador = setInterval(paso, Math.max(55, 120 - puntos * 2));
      } else cuerpo.pop();
      dibujar();
    }
    function morir() {
      vivo = false; clearInterval(temporizador);
      if (puntos > record) { record = puntos; UI.guardar('serpiente', record); UI.aviso('¡Nuevo récord!', 'bien'); Confeti(); }
      if (puntos > 0) Cuenta.record('serpiente', puntos);
      empezar.textContent = 'Otra vez'; empezar.hidden = false; dibujar();
    }
    function dibujar() {
      g.fillStyle = '#2b3a1e'; g.fillRect(0, 0, lienzo.width, lienzo.height);
      g.fillStyle = '#33461f';
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if ((x + y) % 2) g.fillRect(x * 16, y * 16, 16, 16);
      if (cuerpo) {
        g.fillStyle = '#c0392b'; g.fillRect(comida[0] * 16 + 3, comida[1] * 16 + 4, 10, 10);
        g.fillStyle = '#4f8a3d'; g.fillRect(comida[0] * 16 + 7, comida[1] * 16 + 1, 3, 4);
        cuerpo.forEach(([x, y], i) => { g.fillStyle = i ? (i % 2 ? '#e2b33c' : '#c9973a') : '#f0c35a'; g.fillRect(x * 16 + 1, y * 16 + 1, 14, 14); });
        g.fillStyle = '#1a0f08'; const [hx, hy] = cuerpo[0]; g.fillRect(hx * 16 + 4, hy * 16 + 4, 3, 3); g.fillRect(hx * 16 + 9, hy * 16 + 4, 3, 3);
      }
      marcador.textContent = `Puntos: ${puntos || 0} · Récord: ${record}${pausa ? ' · PAUSA' : ''}${cuerpo && !vivo && motivo ? ' · ' + motivo : ''}`;
    }
    const TECLAS = { ArrowUp: 'arriba', w: 'arriba', ArrowDown: 'abajo', s: 'abajo', ArrowLeft: 'izquierda', a: 'izquierda', ArrowRight: 'derecha', d: 'derecha' };
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input')) return;
      if (TECLAS[e.key]) { e.preventDefault(); if (!vivo && !cuerpo) reiniciar(); girar(DIRS[TECLAS[e.key]]); }
      if (e.key === ' ' && vivo) { e.preventDefault(); pausa = !pausa; dibujar(); }
    });
    let toque = null;
    lienzo.addEventListener('touchstart', (e) => { toque = [e.touches[0].clientX, e.touches[0].clientY]; }, { passive: true });
    lienzo.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    lienzo.addEventListener('touchend', (e) => {
      if (!toque) return;
      const dx = e.changedTouches[0].clientX - toque[0], dy = e.changedTouches[0].clientY - toque[1];
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 20) girar(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);
      toque = null;
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && vivo) { pausa = true; dibujar(); } });
    dibujar();
  },
};
