'use strict';
// El juego de la Unidad: cartas de colores; los comodines piden color al tirarlos.
(() => {
  const { el, boton } = UI;
  const COL = ['rojo', 'amarillo', 'verde', 'azul'];
  const TXT = { salta: '⊘', gira: '⇄', '+2': '+2', comodin: '★', '+4': '+4' };
  const NOMBRE = { salta: 'Salta', gira: 'Gira', '+2': 'Roba dos', comodin: 'Comodín', '+4': 'Comodín roba cuatro' };
  function carta(c, { onclick, cls = '' } = {}) {
    const b = el(onclick ? 'button' : 'div', `carta-u ${c.c || 'negra'} ${cls}`);
    if (onclick) { b.type = 'button'; b.onclick = onclick; }
    const t = TXT[c.v] || c.v;
    b.setAttribute('aria-label', `${NOMBRE[c.v] || c.v}${c.c ? ' ' + c.c : ''}`);
    b.append(el('span', 'esq', t), el('span', 'centro-u', t), el('span', 'esq abajo', t));
    return b;
  }
  let eligiendo = null; // carta comodín pendiente de color

  window.JUEGO = {
    render(zona, v, ctx) {
      const yo = ctx.yo;
      const miTurno = v.turno === yo && ctx.fase === 'juego';
      if (!miTurno) eligiendo = null;
      const arriba = v.arriba;
      const sirve = (c) => c.c === null || c.c === v.color || c.v === arriba.v;
      const rivales = el('div', 'rivales');
      for (let k = 1; k < v.n; k++) {
        const i = (yo + k * v.dir + v.n * 10) % v.n;
        const r = el('div', 'rival' + (v.turno === i ? ' activo' : ''));
        r.append(el('b', null, ctx.nombre(i)), el('small', null, `${v.cartas[i]} carta${v.cartas[i] === 1 ? '' : 's'}${v.dijo[i] && v.cartas[i] <= 1 ? ' · ¡Unidad!' : ''}`));
        rivales.append(r);
      }
      const centro = el('div', 'mesa-unidad');
      const mazo = boton('', () => ctx.enviar({ tipo: 'robar' }), 'carta-u dorso-u');
      mazo.setAttribute('aria-label', 'Robar una carta');
      mazo.disabled = !miTurno || v.robada !== null;
      mazo.append(el('span', 'centro-u', 'Robar'));
      centro.append(mazo, carta(arriba, { cls: 'arriba' }));
      const color = el('div', `color-actual ${v.color}`); color.textContent = `Color: ${v.color} · ${v.dir === 1 ? '↻' : '↺'}`;
      centro.append(color);
      const estado = el('p', 'turno' + (miTurno ? ' mio' : ''));
      if (ctx.fase === 'juego') estado.textContent = miTurno ? (v.robada !== null ? 'Te sirve la que has robado: tírala o pasa' : 'Te toca') : `Turno de ${ctx.nombre(v.turno)}`;
      if (v.aviso && v.aviso.texto) estado.textContent += ` · ${ctx.nombre(v.aviso.j)} ${v.aviso.texto}`;
      const mano = el('div', 'mano');
      for (const c of v.mano) {
        const jugable = miTurno && sirve(c) && (v.robada === null || v.robada === c.id);
        mano.append(carta(c, {
          cls: jugable ? 'jugable' : 'apagada',
          onclick: jugable ? () => { if (c.c === null) { eligiendo = c.id; window.JUEGO.render(zona.replaceChildren() || zona, v, ctx); } else ctx.enviar({ tipo: 'jugar', carta: c.id }); } : null,
        }));
      }
      const acciones = el('div', 'fila centro');
      if (eligiendo !== null) {
        acciones.append(el('span', null, 'Elige color:'));
        for (const col of COL) acciones.append(boton(col, () => { const id = eligiendo; eligiendo = null; ctx.enviar({ tipo: 'jugar', carta: id, color: col }); }, `elige ${col}`));
      }
      if (miTurno && v.robada !== null) acciones.append(boton('Pasar', () => ctx.enviar({ tipo: 'pasar' })));
      if (yo >= 0 && v.mano.length <= 2 && !v.dijo[yo] && ctx.fase === 'juego') acciones.append(boton('¡Unidad!', () => ctx.enviar({ tipo: 'unidad' }), 'oro'));
      if (v.pillable >= 0 && v.pillable !== yo && ctx.fase === 'juego') acciones.append(boton(`¡Pillado ${ctx.nombre(v.pillable)}! (+2)`, () => ctx.enviar({ tipo: 'pillar' }), 'rojo'));
      zona.append(rivales, centro, estado, mano, acciones);
    },
  };
})();
