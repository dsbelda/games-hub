'use strict';
// Ajedrez: toca una pieza y luego la casilla de destino. Si juegas con negras, el tablero se gira.
(() => {
  const { el, boton } = UI;
  const NOMBRE = { p: 'peón', n: 'caballo', b: 'alfil', r: 'torre', q: 'dama', k: 'rey' };
  let sel = null, promoPendiente = null, confirmar = 0;
  const nombreCasilla = (i) => 'abcdefgh'[i % 8] + (8 - Math.floor(i / 8));
  window.JUEGO = {
    render(zona, v, ctx) {
      const yo = ctx.yo;
      const negras = yo === 1;
      const miTurno = v.turno === yo && ctx.fase === 'juego';
      if (!miTurno) { sel = null; promoPendiente = null; }
      const rivalIdx = yo === 1 ? 0 : 1;
      const cab = el('div', 'aj-jugador');
      cab.append(el('span', 'aj-color ' + (rivalIdx === 0 ? 'b' : 'n')), el('b', null, ctx.nombre(rivalIdx)), capturas(v.capturadas[rivalIdx]));
      const estado = el('p', 'turno' + (miTurno ? ' mio' : ''));
      if (ctx.fase === 'juego') estado.textContent = miTurno ? (v.jaque >= 0 ? '¡Jaque! Te toca' : 'Te toca') : `Piensa ${ctx.nombre(v.turno)}…`;
      const tablero = el('div', 'aj-tablero' + (negras ? ' girado' : ''));
      const destinos = sel !== null ? v.legales[sel] || [] : [];
      for (let k = 0; k < 64; k++) {
        const i = negras ? 63 - k : k;
        const f = Math.floor(i / 8), c = i % 8;
        const b = el('button', 'aj-casilla ' + ((f + c) % 2 ? 'oscura' : 'clara'));
        b.type = 'button';
        const p = v.b[i];
        if (v.ultima && (v.ultima.de === i || v.ultima.a === i)) b.classList.add('ultima');
        if (i === v.jaque) b.classList.add('jaque');
        if (i === sel) b.classList.add('sel');
        if (destinos.includes(i)) b.classList.add(p ? 'captura' : 'destino');
        if (p) { const s = el('span', 'aj-pieza'); s.innerHTML = window.PIEZAS_PIXEL(p); if (v.ultima && v.ultima.a === i) s.classList.add('llega'); b.append(s); }
        b.setAttribute('aria-label', `${nombreCasilla(i)}${p ? ': ' + NOMBRE[p.toLowerCase()] + (p === p.toUpperCase() ? ' blanco' : ' negro') : ''}`);
        // coordenadas en el borde
        if ((negras ? f === 0 : f === 7)) b.append(el('small', 'aj-col', 'abcdefgh'[c]));
        if ((negras ? c === 7 : c === 0)) b.append(el('small', 'aj-fila', String(8 - f)));
        b.disabled = !miTurno;
        b.onclick = () => {
          if (destinos.includes(i)) {
            const pz = v.b[sel].toLowerCase();
            if (pz === 'p' && (Math.floor(i / 8) === 0 || Math.floor(i / 8) === 7)) { promoPendiente = { de: sel, a: i }; return window.JUEGO.render(zona.replaceChildren() || zona, v, ctx); }
            ctx.enviar({ tipo: 'mover', de: sel, a: i }); sel = null; return;
          }
          sel = v.legales[i] ? (sel === i ? null : i) : null;
          window.JUEGO.render(zona.replaceChildren() || zona, v, ctx);
        };
        tablero.append(b);
      }
      const pie = el('div', 'aj-jugador');
      pie.append(el('span', 'aj-color ' + (yo === 1 ? 'n' : 'b')), el('b', null, yo >= 0 ? `${ctx.nombre(yo)} (tú)` : ctx.nombre(0)), capturas(v.capturadas[yo >= 0 ? yo : 0]));
      const marco = el('div', 'aj-marco');
      marco.append(cab, tablero, pie);
      if (promoPendiente) {
        const pr = el('div', 'aj-promo');
        pr.append(el('span', null, 'Corona en:'));
        for (const q of 'qrbn') {
          const b = el('button', 'aj-promo-op'); b.type = 'button'; b.innerHTML = window.PIEZAS_PIXEL(yo === 0 ? q.toUpperCase() : q); b.setAttribute('aria-label', NOMBRE[q]);
          b.onclick = () => { ctx.enviar({ tipo: 'mover', ...promoPendiente, promo: q }); promoPendiente = null; sel = null; };
          pr.append(b);
        }
        marco.append(pr);
      }
      // lista de jugadas
      const lista = el('ol', 'aj-jugadas');
      for (let k = 0; k < v.jugadas.length; k += 2) { const li = el('li'); li.append(el('span', null, v.jugadas[k]), el('span', null, v.jugadas[k + 1] || '')); lista.append(li); }
      const acciones = el('div', 'fila centro');
      if (ctx.fase === 'juego' && yo >= 0) acciones.append(boton(Date.now() < confirmar ? '¿Seguro? Pulsa otra vez' : 'Rendirse', () => { if (Date.now() < confirmar) ctx.enviar({ tipo: 'rendirse' }); else { confirmar = Date.now() + 3000; UI.aviso('Pulsa «Rendirse» otra vez para abandonar'); } }, 'mini flojo'));
      zona.append(estado, marco, acciones, lista);
      requestAnimationFrame(() => { lista.scrollTop = lista.scrollHeight; });
    },
  };
  function capturas(lista) {
    const d = el('span', 'aj-capturas');
    const orden = 'qrbnp';
    [...lista].sort((a, b) => orden.indexOf(a) - orden.indexOf(b)).forEach((p) => { const s = el('span'); s.innerHTML = window.PIEZAS_PIXEL(p); d.append(s); });
    return d;
  }
})();
