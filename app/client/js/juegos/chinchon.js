'use strict';
// Chinchón: roba del mazo o del descarte, toca la carta que quieras tirar y pulsa «Tirar» (o «Cerrar»).
// Tus combinaciones se ven juntas y las cartas sueltas, marcadas.
(() => {
  const { el, boton } = UI;
  const { carta, dorso, id } = window.CartasES;
  let elegida = null, vistas = new Set();
  const ORDEN = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
  window.JUEGO = {
    render(zona, v, ctx) {
      const repintar = () => window.JUEGO.render(zona.replaceChildren() || zona, v, ctx);
      const yo = ctx.yo;
      const miTurno = v.turno === yo && ctx.fase === 'juego' && !v.resumen;
      if (!miTurno || !v.robado) elegida = null;
      // jugadores y puntos (barra hasta 100)
      const tabla = el('div', 'ch-jugadores');
      for (let j = 0; j < v.n; j++) {
        const f = el('div', 'ch-jug' + (v.turno === j ? ' activo' : '') + (v.fuera[j] ? ' fuera' : ''));
        const barra = el('div', 'barra-lim'); const r = el('i'); r.style.width = `${Math.min(100, v.puntos[j] / v.limite * 100)}%`; if (v.puntos[j] > v.limite * 0.8) r.classList.add('peligro'); barra.append(r);
        f.append(el('b', null, ctx.nombre(j) + (j === yo ? ' (tú)' : '')), el('span', null, v.fuera[j] ? 'eliminado' : `${v.puntos[j]} pts · ${v.cartas[j]} cartas`), barra);
        tabla.append(f);
      }
      const centro = el('div', 'mesa-brisca ch-mesa');
      const mazo = el('button', 'ch-pila'); mazo.type = 'button'; mazo.append(dorso(), el('small', null, `Mazo (${v.quedan})`));
      mazo.disabled = !miTurno || v.robado; mazo.onclick = () => ctx.enviar({ tipo: 'robar', de: 'mazo' });
      const desc = el('button', 'ch-pila'); desc.type = 'button';
      if (v.arriba) desc.append(carta(v.arriba, { cls: v.ultima && v.ultima.carta && id(v.ultima.carta) === id(v.arriba) ? 'tirada' : '' })); else desc.append(el('div', 'carta-es hueco'));
      desc.append(el('small', null, 'Descarte'));
      desc.disabled = !miTurno || v.robado || !v.arriba; desc.onclick = () => ctx.enviar({ tipo: 'robar', de: 'descarte' });
      centro.append(mazo, desc);
      const estado = el('p', 'turno' + (miTurno ? ' mio' : ''));
      if (ctx.fase === 'juego' && !v.resumen) estado.textContent = miTurno ? (v.robado ? 'Elige qué carta tirar' : 'Roba del mazo o del descarte') : `Turno de ${ctx.nombre(v.turno)}${v.ultima && v.ultima.j !== yo ? ` · ${ctx.nombre(v.ultima.j)} ${v.ultima.texto}` : ''}`;
      // mano: combinadas primero, sueltas al final
      const sueltas = new Set(v.sueltas);
      const orden = [...v.mano].sort((a, b) => (sueltas.has(id(a)) - sueltas.has(id(b))) || a.p.localeCompare(b.p) || ORDEN.indexOf(a.n) - ORDEN.indexOf(b.n));
      const mano = el('div', 'mano');
      let k = 0;
      for (const c of orden) {
        const nueva = !vistas.has(id(c));
        const e = carta(c, { onclick: miTurno && v.robado ? () => { elegida = id(c) === elegida ? null : id(c); repintar(); } : null, cls: (sueltas.has(id(c)) ? 'suelta' : 'ligada') + (elegida === id(c) ? ' elegida' : '') + (nueva ? ' nueva' : '') });
        if (nueva) e.style.setProperty('--i', k++);
        mano.append(e);
      }
      vistas = new Set(v.mano.map(id));
      const info = el('p', 'suave centro', `Cartas sueltas: ${v.sueltasPuntos} puntos${v.sueltas.length === 0 ? ' · ¡todo combinado!' : ''}`);
      const acciones = el('div', 'fila centro');
      if (miTurno && v.robado) {
        const tirar = boton('Tirar', () => { ctx.enviar({ tipo: 'tirar', carta: elegida }); elegida = null; }, 'oro'); tirar.disabled = !elegida;
        const cerrar = boton('¡Cerrar!', () => { ctx.enviar({ tipo: 'cerrar', carta: elegida }); elegida = null; }, 'sol'); cerrar.disabled = !elegida || !v.cierraCon.includes(elegida);
        acciones.append(tirar, cerrar);
        if (v.cierraCon.length && !elegida) acciones.append(el('span', 'suave', 'Puedes cerrar tirando la carta adecuada'));
      }
      zona.append(tabla, centro, estado, mano, info, acciones);
      if (v.resumen) zona.append(resumen(v, ctx));
    },
  };
  function resumen(v, ctx) {
    const p = el('div', 'panel ch-resumen');
    p.append(el('h2', null, v.resumen.nula ? `Ronda ${v.ronda} nula: el mazo se ha acabado tres veces` : `${ctx.nombre(v.resumen.quien)} cierra la ronda ${v.ronda}`));
    for (const f of v.resumen.filas) {
      const fila = el('div', 'ch-res-fila');
      const cartas = el('div', 'fila');
      for (const g of f.grupos) { const gg = el('span', 'ch-grupo'); g.forEach((c) => gg.append(carta(c, { cls: 'peque' }))); cartas.append(gg); }
      for (const c of f.sueltas) cartas.append(carta(c, { cls: 'peque suelta' }));
      fila.append(el('b', null, `${ctx.nombre(f.j)}: ${f.suma >= 0 ? '+' : ''}${f.suma}${f.nota ? ' · ' + f.nota : ''}`), cartas);
      p.append(fila);
    }
    if (v.resumen.eliminados.length) p.append(el('p', null, `Eliminados: ${v.resumen.eliminados.map(ctx.nombre).join(', ')}`));
    if (v.ganador < 0) {
      const t = el('p', 'suave'); t.dataset.cuentaAtras = v.pausaHasta; t.dataset.texto = 'La siguiente ronda empieza en {s} s';
      p.append(t, boton('Siguiente ronda ya', () => ctx.enviar({ tipo: 'seguir' }), 'mini'));
    }
    return p;
  }
})();
