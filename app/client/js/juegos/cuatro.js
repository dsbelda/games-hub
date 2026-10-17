'use strict';
// Cuatro en raya: tablero de 7×6; se pulsa una columna para soltar la ficha.
window.JUEGO = {
  render(zona, v, ctx) {
    const { el } = UI;
    const miTurno = v.turno === ctx.yo && ctx.fase === 'juego';
    const estado = el('p', 'turno' + (miTurno ? ' mio' : ''));
    estado.textContent = ctx.fase !== 'juego' ? '' : miTurno ? 'Te toca: elige columna' : `Turno de ${ctx.nombre(v.turno)}`;
    const leyenda = el('div', 'fila leyenda');
    for (const j of [0, 1]) { const s = el('span'); s.append(el("i", `disco f${j}`), ` ${ctx.nombre(j)}`); leyenda.append(s); }
    const t = el('div', 'c4');
    t.setAttribute('role', 'grid'); t.setAttribute('aria-label', 'Tablero');
    const enLinea = new Set(v.linea.map(([f, c]) => `${f},${c}`));
    for (let c = 0; c < 7; c++) {
      const col = el('button', 'c4-col');
      col.type = 'button';
      col.setAttribute('aria-label', `Columna ${c + 1}`);
      col.disabled = !miTurno || v.tablero[0][c] >= 0;
      col.onclick = () => ctx.enviar({ tipo: 'soltar', col: c });
      for (let f = 0; f < 6; f++) {
        const x = v.tablero[f][c];
        const h = el('span', 'c4-hueco');
        if (x >= 0) {
          const ultima = v.ultima && v.ultima[0] === f && v.ultima[1] === c;
          h.append(el('i', `disco f${x}${enLinea.has(`${f},${c}`) ? ' gana' : ''}${ultima ? ' cae' : ''}`));
          if (ultima) h.style.setProperty('--caida', `${(f + 1) * -100}%`);
        }
        col.append(h);
      }
      t.append(col);
    }
    zona.append(leyenda, estado, t);
  },
};
