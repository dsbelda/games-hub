'use strict';
// Brisca: baraja española dibujada con SVG.
(() => {
  const { el } = UI;
  // palos de la baraja española en vectorial (viewBox 40×40), a juego con las miniaturas del portal
  const PALOS = {
    oros: '<circle cx="20" cy="20" r="15" fill="#f2b51c" stroke="#a06a10" stroke-width="3"/><circle cx="20" cy="20" r="8" fill="none" stroke="#a06a10" stroke-width="2.5"/><circle cx="20" cy="20" r="3" fill="#a06a10"/>',
    copas: '<path d="M8 6h24q0 12-8 16v5h5v4H11v-4h5v-5Q8 18 8 6z" fill="#d6262b" stroke="#7a1010" stroke-width="2.5" stroke-linejoin="round"/><path d="M12 9h16" stroke="#f2b51c" stroke-width="3"/>',
    espadas: '<path d="M20 3l3 5v18h-6V8z" fill="#bcd3f0" stroke="#1e4d8a" stroke-width="2.5" stroke-linejoin="round"/><rect x="10" y="25" width="20" height="4" rx="2" fill="#2f63c9" stroke="#1e4d8a" stroke-width="2"/><rect x="18" y="29" width="4" height="7" fill="#2f63c9" stroke="#1e4d8a" stroke-width="2"/>',
    bastos: '<path d="M24 4q6 1 5 7l-11 26q-3 2-5 0l8-27q-1-5 3-6z" fill="#3a9a3c" stroke="#1e5a22" stroke-width="2.5" stroke-linejoin="round"/><circle cx="23" cy="15" r="2.5" fill="#1e5a22"/><circle cx="19" cy="25" r="2.5" fill="#1e5a22"/>',
  };
  const svgPalo = (p, cls = '') => {
    const span = el('span', 'palo ' + cls);
    span.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true">${PALOS[p]}</svg>`;
    return span;
  };
  const FIG = { 10: 'Sota', 11: 'Caballo', 12: 'Rey', 1: 'As' };
  const LETRA = { 10: 'S', 11: 'C', 12: 'R' };
  const PUNTOS = { 1: 11, 3: 10, 12: 4, 11: 3, 10: 2 };
  const nombreCarta = (c) => `${FIG[c.n] || c.n} de ${c.p}`;
  const idc = (c) => `${c.p}-${c.n}`;

  function carta(c, { onclick, cls = '' } = {}) {
    const b = el(onclick ? 'button' : 'div', `carta-es ${c.p} ${cls}`);
    if (onclick) { b.type = 'button'; b.onclick = onclick; }
    b.setAttribute('aria-label', nombreCarta(c));
    b.title = nombreCarta(c) + (PUNTOS[c.n] ? ` · ${PUNTOS[c.n]} puntos` : '');
    b.append(el('span', 'num', LETRA[c.n] || String(c.n)), svgPalo(c.p), el('span', 'num abajo', LETRA[c.n] || String(c.n)));
    return b;
  }
  const dorso = () => el('div', 'carta-es dorso');

  let vistas = new Set(), mesaVista = new Set(); // cartas que ya estaban en la mano (las nuevas entran con animación)
  window.JUEGO = {
    render(zona, v, ctx) {
      const yo = ctx.yo;
      const miTurno = v.turno === yo && ctx.fase === 'juego';
      const equipoDe = (i) => (v.n === 4 ? `pareja ${v.equipos[i] + 1}` : '');
      // rivales (y compañero) arriba con su número de cartas
      const rivales = el('div', 'rivales');
      for (let k = 1; k < v.n; k++) {
        const i = (yo + k) % v.n;
        const r = el('div', 'rival' + (v.turno === i ? ' activo' : '') + (v.n === 4 && v.equipos[i] === v.equipos[yo] ? ' companero' : ''));
        r.append(el('b', null, ctx.nombre(i)));
        if (v.n === 4) r.append(el('small', null, v.equipos[i] === v.equipos[yo] ? 'tu pareja' : 'rival'));
        const m = el('div', 'mini-mano'); for (let x = 0; x < v.cartas[i]; x++) m.append(el('i')); r.append(m);
        rivales.append(r);
      }
      // centro: mazo + triunfo, mesa y última baza
      const centro = el('div', 'mesa-brisca');
      const mazo = el('div', 'mazo');
      if (v.quedan > 1) mazo.append(dorso());
      if (v.triunfo) mazo.append(carta(v.triunfo, { cls: 'triunfo' }));
      mazo.append(el('small', null, `Triunfo: ${v.palo} · quedan ${v.quedan}`));
      const mesa = el('div', 'baza');
      if (v.mesa.length) for (const x of v.mesa) { const w = el('div', 'jugada'); w.append(carta(x.carta, { cls: mesaVista.has(idc(x.carta)) ? '' : 'tirada' }), el('small', null, ctx.nombre(x.j))); mesa.append(w); }
      else if (v.ultimaBaza && ctx.fase === 'juego') {
        const w = el('div', 'ultima');
        w.append(el('small', null, `Última baza para ${ctx.nombre(v.ultimaBaza.ganador)} (+${v.ultimaBaza.puntos})`));
        const fila = el('div', 'fila'); for (const x of v.ultimaBaza.cartas) fila.append(carta(x.carta, { cls: 'peque' + (x.j === v.ultimaBaza.ganador ? ' gana' : '') })); w.append(fila);
        mesa.append(w);
      }
      mesaVista = new Set(v.mesa.map((x) => idc(x.carta)));
      centro.append(mazo, mesa);
      const estado = el('p', 'turno' + (miTurno ? ' mio' : ''));
      if (ctx.fase === 'juego') estado.textContent = miTurno ? 'Te toca: elige carta' : `Turno de ${ctx.nombre(v.turno)}`;
      if (v.aviso) estado.textContent += ` · ${ctx.nombre(v.aviso.j)} ${v.aviso.texto}`;
      // mi mano
      const mano = el('div', 'mano');
      let k = 0;
      for (const c of v.mano) {
        const nueva = !vistas.has(idc(c));
        const e = carta(c, { onclick: miTurno ? () => ctx.enviar({ tipo: 'jugar', carta: idc(c) }) : null, cls: (c.p === v.palo ? 'es-triunfo' : '') + (nueva ? ' nueva' : '') });
        if (nueva) e.style.setProperty('--i', k++);
        mano.append(e);
      }
      vistas = new Set(v.mano.map(idc));
      const acciones = el('div', 'fila centro');
      if (v.puedeCambiar7) acciones.append(UI.boton('Cambiar el 7 por el triunfo', () => ctx.enviar({ tipo: 'cambiar7' })));
      const marcador = el('p', 'suave centro');
      const bz = v.bazas.map((b, i) => (v.n === 4 ? `Pareja ${i + 1}: ${b}` : `${ctx.nombre(i)}: ${b}`)).join(' · ');
      marcador.textContent = v.puntos ? `Puntos — ${v.puntos.map((p, i) => (v.n === 4 ? `Pareja ${i + 1}: ${p}` : `${ctx.nombre(i)}: ${p}`)).join(' · ')}` : `Bazas — ${bz}`;
      if (v.n === 4 && yo >= 0) marcador.textContent += ` (tú eres la ${equipoDe(yo)})`;
      zona.append(rivales, centro, estado, mano, acciones, marcador);
    },
  };
})();
