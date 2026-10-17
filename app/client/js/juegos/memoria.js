'use strict';
// Memoria: parejas de iconos. En solitario (menos intentos = mejor) o dos personas en el mismo dispositivo.
window.JUEGO = {
  montar(raiz) {
    const { el, boton } = UI;
    const ICONOS = ['🏰', '🐉', '⚔️', '🛡️', '👑', '🍷', '🐴', '🦉', '🗝️', '🔥', '🌙', '🍄', '🎲', '🪙', '🏹', '📜', '🐺', '🌻'];
    const TAM = { facil: [4, 4], medio: [6, 4], dificil: [6, 6] };
    const caja = el('div', 'solo win');
    const opciones = el('div', 'fila centro');
    const nivel = el('select'); nivel.setAttribute('aria-label', 'Tamaño');
    for (const [v, t] of [['facil', '4×4'], ['medio', '6×4'], ['dificil', '6×6']]) { const o = el('option', null, t); o.value = v; nivel.append(o); }
    nivel.value = UI.leer('memoria-nivel', 'facil');
    const modo = el('select'); modo.setAttribute('aria-label', 'Modo');
    for (const [v, t] of [['1', 'Solitario'], ['2', 'Dos jugadores']]) { const o = el('option', null, t); o.value = v; modo.append(o); }
    opciones.append(nivel, modo, boton('Nueva partida', () => nueva(), 'oro'));
    const marcador = el('p', 'marcador');
    const tablero = el('div', 'memoria');
    caja.append(opciones, marcador, tablero);
    raiz.replaceChildren(caja);
    let cartas, vueltas, intentos, bloqueo, jugador, puntos;
    function nueva() {
      UI.guardar('memoria-nivel', nivel.value);
      const [c, f] = TAM[nivel.value];
      const iconos = ICONOS.slice(0, (c * f) / 2);
      cartas = [...iconos, ...iconos].map((i) => ({ i, vista: false, hecha: false }));
      for (let k = cartas.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [cartas[k], cartas[j]] = [cartas[j], cartas[k]]; }
      tablero.style.gridTemplateColumns = `repeat(${c}, 1fr)`;
      vueltas = []; intentos = 0; bloqueo = false; jugador = 0; puntos = [0, 0];
      pintar();
    }
    function pulsar(k) {
      const c = cartas[k];
      if (bloqueo || c.vista || c.hecha) return;
      c.vista = true; vueltas.push(k);
      if (vueltas.length === 2) {
        intentos++;
        const [a, b] = vueltas.map((x) => cartas[x]);
        if (a.i === b.i) { a.hecha = b.hecha = true; puntos[jugador]++; vueltas = []; }
        else { bloqueo = true; setTimeout(() => { a.vista = b.vista = false; vueltas = []; bloqueo = false; if (modo.value === '2') jugador = 1 - jugador; pintar(); }, 900); }
      }
      pintar();
    }
    function pintar() {
      tablero.replaceChildren(...cartas.map((c, k) => {
        const b = boton(c.vista || c.hecha ? c.i : '', () => pulsar(k), 'mem' + (c.vista || c.hecha ? ' vista' : '') + (c.hecha ? ' hecha' : ''));
        b.setAttribute('aria-label', c.vista || c.hecha ? c.i : 'Carta boca abajo');
        return b;
      }));
      const acabada = cartas.every((c) => c.hecha);
      const clave = 'memoria-' + nivel.value;
      if (modo.value === '1') {
        let mejor = UI.leer(clave, null);
        if (acabada && (mejor === null || intentos < mejor)) { mejor = intentos; UI.guardar(clave, mejor); UI.aviso('¡Nuevo récord!'); }
        marcador.textContent = `Intentos: ${intentos}${mejor !== null ? ` · Récord: ${mejor}` : ''}${acabada ? ' · ¡Completado!' : ''}`;
      } else {
        marcador.textContent = acabada
          ? (puntos[0] === puntos[1] ? `Empate ${puntos[0]}–${puntos[1]}` : `¡Gana el jugador ${puntos[0] > puntos[1] ? 1 : 2}! (${puntos[0]}–${puntos[1]})`)
          : `Jugador 1: ${puntos[0]} · Jugador 2: ${puntos[1]} · Turno del jugador ${jugador + 1}`;
      }
    }
    nueva();
  },
};
