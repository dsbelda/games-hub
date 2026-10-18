'use strict';
// Dominó por parejas: la mesa (fila de fichas que se enrosca), tu mano abajo y tus rivales y tu pareja alrededor.
// Toca una ficha que encaje; si encaja por los dos lados, eliges cuál.
(() => {
  const { el, boton } = UI;
  const PUNTOS = { 0: [], 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const mitad = (n) => { const m = el('span', 'dmn-mitad'); for (let i = 0; i < 9; i++) m.append(el('i', PUNTOS[n].includes(i) ? 'si' : '')); return m; };
  const ficha = ([a, b], cls = '') => { const f = el('div', 'dmn-ficha ' + cls); f.append(mitad(a), mitad(b)); f.setAttribute('aria-label', `${a}-${b}`); return f; };
  let eligiendo = null;
  window.JUEGO = {
    render(zona, v, ctx) {
      const yo = ctx.yo, mio = v.turno === yo && !v.resultado && !v.ganadores;
      if (!mio) eligiendo = null;
      const pareja = (j) => (j % 2 === (yo >= 0 ? yo : 0) % 2 ? 'tu pareja' : 'rival');
      const marcador = el('div', 'fi-marcador');
      marcador.append(el('span', 'dibuja', `${ctx.nombre(0)} y ${ctx.nombre(2)}: ${v.puntos[0]}`), el('span', null, `${ctx.nombre(1)} y ${ctx.nombre(3)}: ${v.puntos[1]}`), el('span', null, `Mano ${v.mano} · a ${v.meta}`));
      const otros = el('div', 'dmn-otros');
      for (let k = 1; k < 4; k++) {
        const j = ((yo >= 0 ? yo : 0) + k) % 4;
        const o = el('div', 'dmn-otro' + (v.turno === j && !v.resultado ? ' activo' : '') + (pareja(j) === 'tu pareja' ? ' pareja' : ''));
        const dorsos = el('div', 'dmn-dorsos'); for (let q = 0; q < v.cuantas[j]; q++) dorsos.append(el('i'));
        o.append(el('b', null, ctx.nombre(j)), el('small', null, pareja(j)), dorsos);
        otros.append(o);
      }
      const mesa = el('div', 'dmn-mesa');
      if (!v.linea.length) mesa.append(el('p', 'suave', v.abreSeis ? 'Empieza quien tiene el seis doble' : 'Mesa vacía: sale quien ganó la mano'));
      v.linea.forEach((x, k) => mesa.append(ficha(x.f, (x.f[0] === x.f[1] ? 'doble' : '') + (k === 0 || k === v.linea.length - 1 ? ' extremo' : ''))));
      const ult = v.log.slice(-3).map((l) => (l.pasa ? `${ctx.nombre(l.j)} pasa` : `${ctx.nombre(l.j)} pone ${l.f.join('-')}`)).join(' · ');
      const estado = el('p', 'turno' + (mio ? ' mio' : ''), v.resultado ? '' : mio ? (eligiendo ? '¿Por qué lado?' : 'Te toca: elige ficha') : `Turno de ${ctx.nombre(v.turno)}`);
      const mano = el('div', 'dmn-mano');
      const puede = new Map(v.jugables.map(([i, l]) => [i, l]));
      v.mia.forEach((f, i) => {
        const b = ficha(f, (puede.has(i) ? 'puede' : mio ? 'no' : '') + (eligiendo === i ? ' sel' : ''));
        if (puede.has(i)) { b.setAttribute('role', 'button'); b.tabIndex = 0; b.onclick = () => { const l = puede.get(i); if (l.length > 1 && v.extremos[0] !== v.extremos[1]) { eligiendo = i; zona.replaceChildren(); window.JUEGO.render(zona, v, ctx); } else ctx.enviar({ tipo: 'poner', i, lado: l[0] }); }; }
        mano.append(b);
      });
      const lados = el('div', 'fila centro');
      if (eligiendo !== null) lados.append(boton(`◀ Junto al ${v.extremos[0]}`, () => { const i = eligiendo; eligiendo = null; ctx.enviar({ tipo: 'poner', i, lado: 'izq' }); }, 'oro'), boton(`Junto al ${v.extremos[1]} ▶`, () => { const i = eligiendo; eligiendo = null; ctx.enviar({ tipo: 'poner', i, lado: 'der' }); }, 'oro'), boton('Cancelar', () => { eligiendo = null; zona.replaceChildren(); window.JUEGO.render(zona, v, ctx); }, 'mini flojo'));
      zona.append(marcador, otros, mesa, el('p', 'suave centro', ult || ' '), estado, lados, mano);
      if (v.resultado && !v.ganadores) {
        const r = v.resultado, p = el('div', 'panel dmn-res');
        const quien = r.gana < 0 ? 'Nadie' : `${ctx.nombre(r.gana)} y ${ctx.nombre(r.gana + 2)}`;
        p.append(el('h3', null, r.como === 'domino' ? `¡Dominó de ${ctx.nombre(r.quien)}!` : '¡Tranque!'), el('p', null, `${quien} se ${r.gana < 0 ? 'lleva nada (empate)' : `llevan ${r.pts} puntos`}.`));
        r.manos.forEach((m, j) => { if (!m.length) return; const f = el('div', 'fila'); f.append(el('small', null, ctx.nombre(j) + ':')); for (const x of m) f.append(ficha(x, 'peque')); p.append(f); });
        if (yo >= 0) p.append(boton('Siguiente mano', () => ctx.enviar({ tipo: 'seguir' }), 'oro'));
        zona.append(p);
      }
    },
  };
})();
