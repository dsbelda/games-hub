'use strict';
// Tute: como la Brisca, pero hay que asistir y montar (solo se pueden tocar las cartas que valen),
// y se cantan las 20 y las 40 tras ganar una baza.
(() => {
  const { el, boton } = UI;
  const { carta, dorso, id } = window.CartasES;
  let vistas = new Set(), mesaVista = new Set();
  window.JUEGO = {
    render(zona, v, ctx) {
      const yo = ctx.yo;
      const miTurno = v.turno === yo && ctx.fase === 'juego';
      const rivales = el('div', 'rivales');
      for (let k = 1; k < v.n; k++) {
        const i = (yo + k) % v.n;
        const r = el('div', 'rival' + (v.turno === i ? ' activo' : '') + (v.n === 4 && v.equipos[i] === v.equipos[yo] ? ' companero' : ''));
        r.append(el('b', null, ctx.nombre(i)));
        if (v.n === 4) r.append(el('small', null, v.equipos[i] === v.equipos[yo] ? 'tu pareja' : 'rival'));
        const m = el('div', 'mini-mano'); for (let x = 0; x < v.cartas[i]; x++) m.append(el('i')); r.append(m);
        rivales.append(r);
      }
      const centro = el('div', 'mesa-brisca');
      const mazo = el('div', 'mazo');
      if (v.quedan > 1) mazo.append(dorso());
      if (v.triunfo) mazo.append(carta(v.triunfo, { cls: v.n === 2 ? 'triunfo' : 'peque' }));
      mazo.append(el('small', null, v.n === 2 ? `Triunfo: ${v.palo} · quedan ${v.quedan}` : `Triunfo: ${v.palo} (lo tiene ${ctx.nombre(v.triunfoDe)})`));
      const mesa = el('div', 'baza');
      if (v.mesa.length) for (const x of v.mesa) { const w = el('div', 'jugada'); w.append(carta(x.carta, { cls: mesaVista.has(id(x.carta)) ? '' : 'tirada' }), el('small', null, ctx.nombre(x.j))); mesa.append(w); }
      else if (v.ultimaBaza && ctx.fase === 'juego') {
        const w = el('div', 'ultima');
        w.append(el('small', null, `Baza para ${ctx.nombre(v.ultimaBaza.ganador)} (+${v.ultimaBaza.puntos}${v.ultimaBaza.ultimas ? ', con las 10 de últimas' : ''})`));
        const f = el('div', 'fila'); for (const x of v.ultimaBaza.cartas) f.append(carta(x.carta, { cls: 'peque' + (x.j === v.ultimaBaza.ganador ? ' gana' : '') })); w.append(f);
        mesa.append(w);
      }
      mesaVista = new Set(v.mesa.map((x) => id(x.carta)));
      centro.append(mazo, mesa);
      const estado = el('p', 'turno' + (miTurno ? ' mio' : ''));
      if (ctx.fase === 'juego') estado.textContent = miTurno ? (v.obligado && v.mesa.length ? 'Te toca: asiste y monta si puedes' : 'Te toca') : `Turno de ${ctx.nombre(v.turno)}`;
      if (v.aviso) estado.textContent += ` · ${ctx.nombre(v.aviso.j)} ${v.aviso.texto}`;
      const mano = el('div', 'mano');
      const jugables = new Set(v.jugables);
      let k = 0;
      for (const c of v.mano) {
        const ok = miTurno && jugables.has(id(c));
        const nueva = !vistas.has(id(c));
        const e = carta(c, { onclick: ok ? () => ctx.enviar({ tipo: 'jugar', carta: id(c) }) : null, cls: (c.p === v.palo ? 'es-triunfo' : '') + (miTurno && !ok ? ' apagada' : '') + (nueva ? ' nueva' : ''), puntos: true });
        if (nueva) e.style.setProperty('--i', k++);
        mano.append(e);
      }
      vistas = new Set(v.mano.map(id));
      const acciones = el('div', 'fila centro');
      if (v.tute) acciones.append(boton('¡Cantar TUTE!', () => ctx.enviar({ tipo: 'tute' }), 'oro'));
      for (const p of v.cantes2) acciones.append(boton(`Cantar las ${p === v.palo ? 40 : 20} en ${p}`, () => ctx.enviar({ tipo: 'cantar', palo: p }), 'sol'));
      if (v.puedeCambiar7) acciones.append(boton('Cambiar el 7 por el triunfo', () => ctx.enviar({ tipo: 'cambiar7' })));
      const marcador = el('p', 'suave centro');
      const nombreEq = (i) => (v.n === 4 ? `Pareja ${i + 1}` : ctx.nombre(i));
      marcador.textContent = v.puntos
        ? `Puntos — ${v.puntos.map((p, i) => `${nombreEq(i)}: ${p}`).join(' · ')}`
        : `Bazas — ${v.bazas.map((b, i) => `${nombreEq(i)}: ${b}${v.cantes[i] ? ` (+${v.cantes[i]} cantes)` : ''}`).join(' · ')}`;
      zona.append(rivales, centro, estado, mano, acciones, marcador);
    },
  };
})();
