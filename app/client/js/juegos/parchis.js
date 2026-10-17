'use strict';
// Parchís: tira el dado y toca la ficha que quieras mover (las que pueden, laten).
(() => {
  const { el, boton } = UI;
  const COLOR_BRAZO = ['rojo', 'verde', 'amarillo', 'azul']; // 0 arriba, 1 derecha, 2 abajo, 3 izquierda
  const ENTRADA = [8, 25, 42, 59];
  const SEGUROS = new Set(ENTRADA.flatMap((en) => [en, (en + 5) % 68, (en + 12) % 68]));
  // coordenadas [fila, columna] de cada casilla del recorrido (cruz de 19×19)
  const RECORRIDO = [];
  for (let f = 7; f >= 0; f--) RECORRIDO.push([f, 8]);
  RECORRIDO.push([0, 9]);
  for (let f = 0; f <= 7; f++) RECORRIDO.push([f, 10]);
  for (let c = 11; c <= 18; c++) RECORRIDO.push([8, c]);
  RECORRIDO.push([9, 18]);
  for (let c = 18; c >= 11; c--) RECORRIDO.push([10, c]);
  for (let f = 11; f <= 18; f++) RECORRIDO.push([f, 10]);
  RECORRIDO.push([18, 9]);
  for (let f = 18; f >= 11; f--) RECORRIDO.push([f, 8]);
  for (let c = 7; c >= 0; c--) RECORRIDO.push([10, c]);
  RECORRIDO.push([9, 0]);
  for (let c = 0; c <= 7; c++) RECORRIDO.push([8, c]);
  const PASILLO = [(k) => [k, 9], (k) => [9, 18 - k], (k) => [18 - k, 9], (k) => [9, k]];
  const CASA = [[0, 11], [11, 11], [11, 0], [0, 0]]; // esquina superior izquierda de cada casa (8×8)
  const salida = (b) => (ENTRADA[b] + 5) % 68;
  let girando = false, dadoVisto = null;
  const caras = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8], 7: [0, 2, 3, 4, 5, 6, 8] };
  function dado(v, cls = '') { const d = el('div', 'pc-dado ' + cls); for (let i = 0; i < 9; i++) d.append(el('i', (caras[v] || []).includes(i) ? 'si' : '')); d.setAttribute('aria-label', v ? `Dado: ${v}` : 'Dado'); return d; }

  window.JUEGO = {
    render(zona, v, ctx) {
      const yo = ctx.yo;
      const miTurno = v.turno === yo && ctx.fase === 'juego';
      const tablero = el('div', 'pc-tablero');
      // fondo: casas, pasillos, recorrido y meta
      CASA.forEach(([f, c], b) => { const d = el('div', `pc-casa ${COLOR_BRAZO[b]}`); d.style.gridArea = `${f + 1} / ${c + 1} / span 8 / span 8`; tablero.append(d); });
      RECORRIDO.forEach(([f, c], t) => {
        const d = el('div', 'pc-celda');
        d.style.gridArea = `${f + 1} / ${c + 1}`;
        const b = [0, 1, 2, 3].find((k) => salida(k) === t);
        if (b !== undefined) d.classList.add('salida', COLOR_BRAZO[b]);
        if (SEGUROS.has(t)) d.classList.add('seguro');
        tablero.append(d);
      });
      for (let b = 0; b < 4; b++) for (let k = 1; k <= 7; k++) { const [f, c] = PASILLO[b](k); const d = el('div', `pc-celda pasillo ${COLOR_BRAZO[b]}`); d.style.gridArea = `${f + 1} / ${c + 1}`; tablero.append(d); }
      const meta = el('div', 'pc-meta'); meta.style.gridArea = '9 / 9 / span 3 / span 3'; tablero.append(meta);
      // fichas
      const mueven = new Map(v.mueven.map((m) => [m.f, m]));
      const porSitio = new Map();
      v.fichas.forEach((fs, j) => fs.forEach((p, f) => {
        const b = v.brazos[j];
        let pos;
        if (p === -1) { const [cf, cc] = CASA[b]; pos = [cf + 2 + Math.floor(f / 2) * 3, cc + 2 + (f % 2) * 3, 'casa']; }
        else if (p <= 63) pos = [...RECORRIDO[(salida(b) + p) % 68]];
        else if (p < 71) pos = [...PASILLO[b](p - 63)];
        else pos = [9 + (f >> 1), 9 + (f & 1) + (b % 2), 'meta'];
        const clave = pos.join();
        if (!porSitio.has(clave)) porSitio.set(clave, []);
        porSitio.get(clave).push({ j, f, p, pos });
      }));
      for (const fichas of porSitio.values()) fichas.forEach((x, i) => {
        const color = v.colores[x.j];
        const puede = miTurno && x.j === yo && mueven.has(x.f);
        const d = el(puede ? 'button' : 'div', `pc-ficha ${color}` + (puede ? ' puede' : '') + (fichas.length > 1 && x.pos[2] !== 'casa' ? (i ? ' dcha' : ' izda') : '') + (x.pos[2] === 'casa' ? ' grande' : ''));
        d.style.gridArea = `${x.pos[0] + 1} / ${x.pos[1] + 1}` + (x.pos[2] === 'casa' ? ' / span 2 / span 2' : '');
        if (v.ultimoMov && v.ultimoMov.j === x.j && v.ultimoMov.f === x.f && x.p === v.ultimoMov.hasta) d.classList.add('movida');
        d.textContent = x.f + 1;
        d.setAttribute('aria-label', `Ficha ${x.f + 1} ${color}${puede ? ', se puede mover' : ''}`);
        if (puede) { d.type = 'button'; d.onclick = () => ctx.enviar({ tipo: 'mover', ficha: x.f }); if (mueven.get(x.f).come) d.title = '¡Come!'; }
        tablero.append(d);
      });
      // panel lateral: dado, turno y registro
      const panel = el('div', 'pc-panel');
      const estado = el('p', 'turno' + (miTurno ? ' mio' : ''));
      const colorTurno = v.colores[v.turno];
      if (ctx.fase === 'juego') estado.textContent = miTurno ? (v.puedeTirar ? '¡Tira el dado!' : v.pendiente ? (v.pendiente.tipo === 'premio' ? `Premio: mueve ${v.pendiente.valor}` : `Mueve ${v.pendiente.valor}`) : '') : `Turno de ${ctx.nombre(v.turno)} (${colorTurno})`;
      const nuevo = v.dado !== null && v.dado !== dadoVisto;
      dadoVisto = v.dado;
      const d = dado(v.dado, nuevo ? 'rueda' : '');
      const zonaDado = el('div', 'pc-zona-dado');
      zonaDado.append(d);
      if (v.puedeTirar) { const b = boton('🎲 Tirar', () => { if (girando) return; girando = true; d.classList.add('rueda'); setTimeout(() => { girando = false; ctx.enviar({ tipo: 'tirar' }); }, 350); }, 'oro'); zonaDado.append(b); }
      const leyenda = el('div', 'pc-leyenda');
      v.colores.forEach((c, j) => { const s = el('span', 'pc-jug' + (v.turno === j ? ' activo' : '')); s.append(el('i', `pc-ficha mini ${c}`), ` ${ctx.nombre(j)} · ${v.fichas[j].filter((p) => p === 71).length}/4`); leyenda.append(s); });
      const registro = el('ul', 'pc-log');
      for (const t of v.log) registro.append(el('li', null, t));
      panel.append(estado, zonaDado, leyenda, registro);
      const cont = el('div', 'pc-cont');
      cont.append(tablero, panel);
      zona.append(cont);
    },
  };
})();
