'use strict';
// Brisca: baraja española dibujada en píxeles con SVG.
(() => {
  const { el } = UI;
  // palos en 16×16, un rectángulo por píxel (con shape-rendering crispEdges)
  const PALOS = {
    oros: { c: '#e2b33c', d: '#8a5a12', px: ['5,1,6,1', '3,2,10,1', '2,3,12,1', '2,4,3,8', '11,4,3,8', '2,12,12,1', '3,13,10,1', '5,14,6,1', '6,5,4,6'] },
    copas: { c: '#c0392b', d: '#5e1410', px: ['2,2,12,2', '3,4,10,2', '4,6,8,2', '6,8,4,2', '7,10,2,2', '5,12,6,1', '4,13,8,2'] },
    espadas: { c: '#4a7fc1', d: '#1e3555', px: ['7,1,2,9', '6,2,1,7', '9,2,1,7', '3,10,10,2', '7,12,2,2', '6,14,4,1'] },
    bastos: { c: '#4f8a3d', d: '#6b3f1d', px: ['8,1,3,3', '7,4,3,3', '6,7,3,3', '5,10,3,3', '4,13,3,2', '11,2,2,2', '4,6,2,2'] },
  };
  const svgPalo = (p, cls = '') => {
    const P = PALOS[p];
    const r = P.px.map((s) => { const [x, y, w, h] = s.split(','); return `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`; }).join('');
    const sombra = P.px.map((s) => { const [x, y, w, h] = s.split(','); return `<rect x="${+x + 1}" y="${+y + 1}" width="${w}" height="${h}"/>`; }).join('');
    const span = el('span', 'palo ' + cls);
    span.innerHTML = `<svg viewBox="0 0 17 17" shape-rendering="crispEdges" aria-hidden="true"><g fill="${P.d}">${sombra}</g><g fill="${P.c}">${r}</g></svg>`;
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
      if (v.mesa.length) for (const x of v.mesa) { const w = el('div', 'jugada'); w.append(carta(x.carta), el('small', null, ctx.nombre(x.j))); mesa.append(w); }
      else if (v.ultimaBaza && ctx.fase === 'juego') {
        const w = el('div', 'ultima');
        w.append(el('small', null, `Última baza para ${ctx.nombre(v.ultimaBaza.ganador)} (+${v.ultimaBaza.puntos})`));
        const fila = el('div', 'fila'); for (const x of v.ultimaBaza.cartas) fila.append(carta(x.carta, { cls: 'peque' + (x.j === v.ultimaBaza.ganador ? ' gana' : '') })); w.append(fila);
        mesa.append(w);
      }
      centro.append(mazo, mesa);
      const estado = el('p', 'turno' + (miTurno ? ' mio' : ''));
      if (ctx.fase === 'juego') estado.textContent = miTurno ? 'Te toca: elige carta' : `Turno de ${ctx.nombre(v.turno)}`;
      if (v.aviso) estado.textContent += ` · ${ctx.nombre(v.aviso.j)} ${v.aviso.texto}`;
      // mi mano
      const mano = el('div', 'mano');
      for (const c of v.mano) mano.append(carta(c, { onclick: miTurno ? () => ctx.enviar({ tipo: 'jugar', carta: idc(c) }) : null, cls: c.p === v.palo ? 'es-triunfo' : '' }));
      const acciones = el('div', 'fila centro');
      if (v.puedeCambiar7) acciones.append(UI.boton('Cambiar el 7 por el triunfo', () => ctx.enviar({ tipo: 'cambiar7' })));
      const marcador = el('p', 'muted centro');
      const bz = v.bazas.map((b, i) => (v.n === 4 ? `Pareja ${i + 1}: ${b}` : `${ctx.nombre(i)}: ${b}`)).join(' · ');
      marcador.textContent = v.puntos ? `Puntos — ${v.puntos.map((p, i) => (v.n === 4 ? `Pareja ${i + 1}: ${p}` : `${ctx.nombre(i)}: ${p}`)).join(' · ')}` : `Bazas — ${bz}`;
      if (v.n === 4 && yo >= 0) marcador.textContent += ` (tú eres la ${equipoDe(yo)})`;
      zona.append(rivales, centro, estado, mano, acciones, marcador);
    },
  };
})();
