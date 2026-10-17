'use strict';
// Póquer Texas Hold'em (fichas de mentira). Mesa con los jugadores alrededor y tus controles abajo.
(() => {
  const { el, boton } = UI;
  const ROJO = new Set(['♥', '♦']);
  const R = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
  const naipe = (c, cls = '') => { const d = el('div', `naipe ${ROJO.has(c.s) ? 'r' : 'n'} ${cls}`); const t = R[c.r] || String(c.r); d.append(el('span', 'nq-esq', t + c.s), el('span', 'nq-centro', c.s)); d.setAttribute('aria-label', `${t} de ${c.s}`); return d; };
  const dorso = () => el('div', 'naipe dorso');
  let subida = null, mesaVista = 0;
  window.JUEGO = {
    render(zona, v, ctx) {
      const yo = ctx.yo;
      const miTurno = v.turno === yo && ctx.fase === 'juego';
      const mesa = el('div', 'pq-mesa');
      // asientos alrededor: yo abajo, el resto repartido
      const orden = Array.from({ length: v.n }, (_, k) => (Math.max(0, yo) + k) % v.n);
      orden.forEach((j, k) => {
        const ang = Math.PI / 2 + (k / v.n) * Math.PI * 2;
        const s = el('div', 'pq-asiento' + (v.turno === j ? ' activo' : '') + (v.retirado[j] ? ' retirado' : '') + (v.fuera[j] ? ' fuera' : '') + (j === yo ? ' yo' : ''));
        s.style.left = `${50 + Math.cos(ang) * 44}%`; s.style.top = `${50 + Math.sin(ang) * 40}%`;
        const cab = el('div', 'pq-cab'); cab.append(el('b', null, ctx.nombre(j)));
        if (j === v.boton) cab.append(el('span', 'pq-boton', 'D'));
        s.append(cab, el('span', 'pq-fichas', v.fuera[j] ? 'fuera' : `🪙 ${v.fichas[j]}`));
        if (v.dijo[j]) s.append(el('span', 'pq-dijo', v.dijo[j]));
        if (v.puesto[j]) s.append(el('span', 'pq-apuesta', `${v.puesto[j]}`));
        // cartas: las mías siempre; las de otros, al enseñar
        const muestra = v.resumen?.mostrar.find((m) => m.j === j);
        const cartas = el('div', 'pq-cartas');
        if (j === yo && v.misCartas.length) v.misCartas.forEach((c) => cartas.append(naipe(c)));
        else if (muestra) muestra.cartas.forEach((c) => cartas.append(naipe(c)));
        else if (!v.retirado[j] && !v.fuera[j]) { cartas.append(dorso(), dorso()); }
        s.append(cartas);
        if (muestra) s.append(el('span', 'pq-jugada', muestra.jugada));
        mesa.append(s);
      });
      const centro = el('div', 'pq-centro');
      const comunes = el('div', 'pq-comunes');
      v.mesa.forEach((c, i) => comunes.append(naipe(c, i >= mesaVista ? 'tirada' : '')));
      for (let i = v.mesa.length; i < 5; i++) comunes.append(el('div', 'naipe hueco'));
      mesaVista = v.mesa.length;
      centro.append(comunes, el('div', 'pq-bote', `Bote: ${v.bote}`), el('small', null, `Ciegas ${v.cp}/${v.cg} · mano ${v.manos}`));
      mesa.append(centro);
      const estado = el('p', 'turno' + (miTurno ? ' mio' : ''));
      if (ctx.fase === 'juego') estado.textContent = v.fase === 'fin' ? 'Fin de la mano' : miTurno ? `Te toca${v.miJugada ? ` · llevas ${v.miJugada.toLowerCase()}` : ''}` : `Piensa ${ctx.nombre(v.turno)}…`;
      const controles = el('div', 'pq-controles');
      if (miTurno && v.opciones) {
        const o = v.opciones;
        controles.append(boton('Retirarse', () => ctx.enviar({ tipo: 'retirarse' }), 'flojo'));
        controles.append(o.puedePasar ? boton('Pasar', () => ctx.enviar({ tipo: 'pasar' })) : boton(`Igualar ${o.debe}`, () => ctx.enviar({ tipo: 'igualar' })));
        if (o.maxSubir > o.maximo) {
          if (subida === null || subida < o.minSubir || subida > o.maxSubir) subida = o.minSubir;
          const r = el('input'); r.type = 'range'; r.min = o.minSubir; r.max = o.maxSubir; r.step = Math.max(1, Math.round(v.cg / 2)); r.value = subida; r.setAttribute('aria-label', 'Cantidad');
          const sub = boton(`Subir a ${subida}`, () => ctx.enviar(subida >= o.maxSubir ? { tipo: 'todo' } : { tipo: 'subir', hasta: subida }), 'oro');
          r.oninput = () => { subida = +r.value; sub.textContent = subida >= o.maxSubir ? '¡Con todo!' : `Subir a ${subida}`; };
          const atajo = (txt, val) => boton(txt, () => { subida = Math.max(o.minSubir, Math.min(o.maxSubir, val)); r.value = subida; sub.textContent = subida >= o.maxSubir ? '¡Con todo!' : `Subir a ${subida}`; }, 'mini');
          const fila = el('div', 'fila centro');
          fila.append(atajo('½ bote', o.maximo + Math.round(v.bote / 2)), atajo('Bote', o.maximo + v.bote), atajo('Todo', o.maxSubir));
          controles.append(r, sub, fila);
        }
      }
      zona.append(mesa, estado, controles);
      if (v.resumen && v.fase === 'fin') {
        const p = el('div', 'panel pq-resumen');
        p.append(el('h2', null, 'Resultado de la mano'));
        for (const b of v.resumen.botes) p.append(el('p', null, `${b.ganadores.map(ctx.nombre).join(' y ')} ${b.ganadores.length > 1 ? 'se reparten' : 'gana'} ${b.cantidad}${b.jugada ? ` con ${b.jugada.toLowerCase()}` : ' (los demás se retiran)'}`));
        if (v.ganador < 0) { const t = el('p', 'suave'); t.dataset.cuentaAtras = v.pausaHasta; t.dataset.texto = 'Siguiente mano en {s} s'; p.append(t, boton('Siguiente mano ya', () => ctx.enviar({ tipo: 'seguir' }), 'mini')); }
        zona.append(p);
      }
    },
  };
})();
