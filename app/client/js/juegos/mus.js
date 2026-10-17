'use strict';
// Mus: tu pareja enfrente y los rivales a los lados. Botones según el momento: mus, descarte y lances.
(() => {
  const { el, boton } = UI;
  const { carta, id } = window.CartasES;
  let marcadas = new Set(), cuanto = 2, vistas = new Set();
  const NOMBRE_LANCE = { grande: 'Grande', chica: 'Chica', pares: 'Pares', juego: 'Juego', punto: 'Punto' };
  window.JUEGO = {
    render(zona, v, ctx) {
      const repintar = () => window.JUEGO.render(zona.replaceChildren() || zona, v, ctx);
      const yo = Math.max(0, ctx.yo);
      const miTurno = v.turno === ctx.yo && ctx.fase === 'juego';
      if (v.fase !== 'descarte' || v.yaDescartado) marcadas = new Set();
      // marcador en piedras (y amarracos de 5)
      const marcador = el('div', 'mus-marcador');
      for (const eq of [0, 1]) {
        const d = el('div', 'mus-eq' + (eq === yo % 2 ? ' nuestro' : ''));
        const nombres = [eq, eq + 2].map(ctx.nombre).join(' y ');
        const amarr = el('div', 'amarracos'); for (let k = 0; k < Math.floor(v.piedras[eq] / 5); k++) amarr.append(el('i'));
        d.append(el('b', null, `${v.piedras[eq]}/${v.meta}`), el('span', null, nombres), amarr);
        marcador.append(d);
      }
      // mesa: compañero arriba, rivales a los lados
      const mesa = el('div', 'mus-mesa');
      const pos = { 0: 'abajo', 1: 'derecha', 2: 'arriba', 3: 'izquierda' };
      for (let k = 1; k < 4; k++) {
        const j = (yo + k) % 4;
        const s = el('div', `mus-jug ${pos[k]}` + (v.turno === j ? ' activo' : '') + (j % 2 === yo % 2 ? ' companero' : ''));
        s.append(el('b', null, ctx.nombre(j) + (j === v.mano ? ' · mano' : '')));
        const cartas = el('div', 'fila centro mus-cartas');
        if (v.todas) v.todas[j].forEach((c) => cartas.append(carta(c, { cls: 'peque' })));
        else for (let x = 0; x < 4; x++) cartas.append(el('div', 'carta-es dorso peque'));
        s.append(cartas);
        if (v.dijo[j]) s.append(el('span', 'mus-dijo', v.dijo[j]));
        if (v.declaraciones) s.append(el('small', 'suave', `${v.declaraciones[j].pares ? 'Pares sí' : 'Pares no'} · ${v.declaraciones[j].juego ? 'Juego sí' : 'Juego no'}`));
        if (v.fase === 'descarte') s.append(el('small', 'suave', v.descartados[j] ? 'descartado' : 'pensando…'));
        mesa.append(s);
      }
      // lances
      const lances = el('div', 'mus-lances');
      for (const l of ['grande', 'chica', 'pares', v.hayJuego === false ? 'punto' : 'juego']) {
        const L = v.lances?.[l];
        const d = el('div', 'mus-lance' + (v.lance === l && v.fase === 'lances' ? ' actual' : ''));
        let txt = '—';
        if (L) txt = L.estado === 'querido' ? `querido (${L.cantidad})` : L.estado === 'no querido' ? `no querido (+${L.cantidad} pareja ${L.ganaEquipo + 1})` : L.estado;
        if (v.lance === l && v.apuesta && v.fase === 'lances') txt = v.apuesta.ordago ? '¡órdago!' : `envite de ${v.apuesta.cantidad}`;
        d.append(el('b', null, NOMBRE_LANCE[l]), el('span', null, txt));
        lances.append(d);
      }
      const estado = el('p', 'turno' + (miTurno || (v.fase === 'descarte' && !v.yaDescartado) ? ' mio' : ''));
      if (ctx.fase === 'juego') estado.textContent = v.fase === 'mus' ? (miTurno ? '¿Mus o no hay mus?' : `Habla ${ctx.nombre(v.turno)}…`)
        : v.fase === 'descarte' ? (v.yaDescartado ? 'Esperando a que se descarten los demás…' : 'Toca las cartas que quieres cambiar')
        : v.fase === 'lances' ? (miTurno ? `Te toca hablar a ${NOMBRE_LANCE[v.lance].toLowerCase()}` : `Habla ${ctx.nombre(v.turno)} a ${NOMBRE_LANCE[v.lance].toLowerCase()}…`) : '';
      // mis cartas
      const mano = el('div', 'mano');
      let k = 0;
      for (const c of v.misCartas) {
        const descartando = v.fase === 'descarte' && !v.yaDescartado;
        const nueva = !vistas.has(id(c));
        const e = carta(c, { onclick: descartando ? () => { marcadas.has(id(c)) ? marcadas.delete(id(c)) : marcadas.add(id(c)); repintar(); } : null, cls: (marcadas.has(id(c)) ? 'marcada' : '') + (nueva ? ' nueva' : '') });
        if (nueva) e.style.setProperty('--i', k++);
        mano.append(e);
      }
      vistas = new Set(v.misCartas.map(id));
      if (v.dijo[yo]) estado.textContent += ` · tú: ${v.dijo[yo]}`;
      const info = el('p', 'suave centro', v.miJugada ? `Tienes: ${v.miJugada.pares || 'sin pares'} · ${v.miJugada.juego >= 31 ? `juego de ${v.miJugada.juego}` : `${v.miJugada.juego} al punto`}` : '');
      const acciones = el('div', 'fila centro');
      if (miTurno && v.fase === 'mus') acciones.append(boton('Mus', () => ctx.enviar({ tipo: 'mus' })), boton('No hay mus', () => ctx.enviar({ tipo: 'cortar' }), 'oro'));
      if (v.fase === 'descarte' && !v.yaDescartado) { const b = boton(`Descartar ${marcadas.size || ''}`, () => { ctx.enviar({ tipo: 'descartar', cartas: [...marcadas] }); marcadas = new Set(); }, 'oro'); b.disabled = !marcadas.size; acciones.append(b); }
      if (miTurno && v.fase === 'lances' && v.puede) {
        if (v.puede.contestar) acciones.append(boton('Quiero', () => ctx.enviar({ tipo: 'quiero' }), 'oro'), boton('No quiero', () => ctx.enviar({ tipo: 'noquiero' })));
        else acciones.append(boton('Paso', () => ctx.enviar({ tipo: 'paso' })));
        if (v.puede.envidar) {
          const menos = boton('−', () => { cuanto = Math.max(2, cuanto - 1); repintar(); }, 'mini'), mas = boton('+', () => { cuanto = Math.min(30, cuanto + 1); repintar(); }, 'mini');
          acciones.append(menos, boton(v.apuesta ? `Envido ${cuanto} más` : `Envido ${cuanto}`, () => { ctx.enviar({ tipo: 'envido', cantidad: cuanto }); cuanto = 2; }, 'sol'), mas, boton('¡Órdago!', () => ctx.enviar({ tipo: 'ordago' }), 'rojo'));
        }
      }
      zona.append(marcador, mesa, lances, estado, mano, info, acciones);
      if (v.resumen && (v.fase === 'resumen' || v.ganador >= 0)) {
        const p = el('div', 'panel');
        p.append(el('h2', null, v.ordago ? 'Órdago' : 'Conteo de la mano'));
        if (!v.resumen.filas.length) p.append(el('p', 'suave', 'Nadie cobra en esta mano.'));
        for (const f of v.resumen.filas) p.append(el('p', null, `${NOMBRE_LANCE[f.lance] || f.lance}: +${f.piedras} para la pareja de ${[f.equipo, f.equipo + 2].map(ctx.nombre).join(' y ')} (${f.texto})`));
        if (v.ganador < 0) { const t = el('p', 'suave'); t.dataset.cuentaAtras = v.pausaHasta; t.dataset.texto = 'Siguiente mano en {s} s'; p.append(t, boton('Siguiente mano ya', () => ctx.enviar({ tipo: 'seguir' }), 'mini')); }
        zona.append(p);
      }
    },
  };
})();
