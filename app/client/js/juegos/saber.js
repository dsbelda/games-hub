'use strict';
// Ruleta del saber: ruleta de 7 sectores (6 categorías + corona), pregunta con 4 respuestas y personajes.
(() => {
  const { el, boton } = UI;
  const CAT = {
    geografia: ['Geografía', '🌍', '#4d7cfe'], historia: ['Historia', '📜', '#ffc63d'], ciencia: ['Ciencia', '🔬', '#3fbf5f'],
    arte: ['Arte y letras', '🎨', '#8a5cf6'], deportes: ['Deportes', '⚽', '#ff9f2e'], ocio: ['Ocio', '🎬', '#ff6fa8'], corona: ['Corona', '👑', '#ff5a36'],
  };
  const ORDEN = ['geografia', 'historia', 'ciencia', 'arte', 'deportes', 'ocio', 'corona'];
  let rueda = null, giroVisto = -1, rot = 0, ultimaVista = 0, mostrarDesde = 0, repinta = null;
  function crearRueda() {
    const r = el('div', 'sb-rueda');
    const disco = el('div', 'sb-disco');
    disco.style.background = `conic-gradient(${ORDEN.map((c, i) => `${CAT[c][2]} ${(i * 360) / 7}deg ${((i + 1) * 360) / 7}deg`).join(',')})`;
    ORDEN.forEach((c, i) => { const s = el('span', 'sb-sector', CAT[c][1]); s.style.transform = `rotate(${(i + 0.5) * 360 / 7}deg)`; disco.append(s); });
    r.append(disco, el('i', 'sb-flecha'), el('b', 'sb-centro'));
    return { r, disco };
  }
  function girarA(sector) {
    const i = ORDEN.indexOf(sector), centro = (i + 0.5) * 360 / 7;
    const actual = ((rot % 360) + 360) % 360;
    rot += 360 * 4 + ((360 - centro) - actual + 360) % 360;
    rueda.disco.style.transform = `rotate(${rot}deg)`;
  }
  // tarjeta que se queda unos segundos con el resultado de la última pregunta (aunque se repinte la partida)
  function mostrarUltima(u, ctx) {
    document.querySelector('.sb-veredicto')?.remove();
    const c = el('div', 'sb-veredicto ' + (u.bien ? 'bien' : 'mal'));
    c.append(el('b', null, u.bien ? (u.corona ? `👑 ¡${ctx.nombre(u.j)} gana el personaje de ${CAT[u.cat][0]}!` : `✔ ¡${u.j === ctx.yo ? 'Correcto' : ctx.nombre(u.j) + ' acierta'}!`) : u.elegida < 0 ? `⏱ ¡Tiempo! (${ctx.nombre(u.j)})` : `✘ ${u.j === ctx.yo ? 'Has fallado' : ctx.nombre(u.j) + ' falla'}`),
      el('small', null, u.texto), el('span', null, `Respuesta: ${u.opciones[u.correcta]}`));
    document.body.append(c);
    setTimeout(() => c.classList.add('fuera'), 2300); setTimeout(() => c.remove(), 2700);
  }
  const ficha = (cat, tiene) => { const s = el('span', 'sb-pj' + (tiene ? ' si' : '')); s.textContent = CAT[cat][1]; s.style.setProperty('--c', CAT[cat][2]); s.title = CAT[cat][0] + (tiene ? ' ✔' : ''); return s; };

  window.JUEGO = {
    render(zona, v, ctx) {
      const yo = ctx.yo, mio = v.turno === yo && !v.ganadores;
      if (!rueda) rueda = crearRueda();
      if (v.ultima && v.ultima.id !== ultimaVista) { if (giroVisto >= 0) mostrarUltima(v.ultima, ctx); ultimaVista = v.ultima.id; }
      // al entrar a media partida no se anima el giro que ya pasó
      if (giroVisto < 0) giroVisto = v.giro ? v.giro.n : 0;
      else if (v.giro && v.giro.n !== giroVisto) { giroVisto = v.giro.n; girarA(v.giro.sector); mostrarDesde = Date.now() + 1900; }
      clearTimeout(repinta);
      const esperando = Date.now() < mostrarDesde;
      if (esperando) repinta = setTimeout(() => { if (zona.isConnected) { zona.replaceChildren(); window.JUEGO.render(zona, v, ctx); } }, mostrarDesde - Date.now());

      // jugadores: personajes y barra de aciertos
      const jugadores = el('div', 'sb-jugadores');
      for (let j = 0; j < v.n; j++) {
        const p = el('div', 'sb-jug' + (v.turno === j ? ' activo' : ''));
        const pjs = el('div', 'sb-pjs'); v.cats.forEach((c) => pjs.append(ficha(c, v.personajes[j].includes(c))));
        const barra = el('div', 'sb-barra'); for (let k = 0; k < 3; k++) barra.append(el('i', k < v.barra[j] ? 'si' : ''));
        p.append(el('b', null, `${v.turno === j ? '▶ ' : ''}${ctx.nombre(j)}`), pjs, barra);
        jugadores.append(p);
      }
      const cab = el('div', 'fi-cab'); cab.append(el('span', 'etiqueta', `Vuelta ${v.vuelta}/${v.vueltas}`));
      const centro = el('div', 'sb-centro-juego');
      const estado = el('p', 'turno' + (mio ? ' mio' : ''));
      if (v.ganadores) estado.textContent = '';
      else if (esperando || v.fase === 'girar') {
        estado.textContent = esperando ? '¡Girando…!' : mio ? 'Te toca: ¡gira la ruleta!' : `Turno de ${ctx.nombre(v.turno)}`;
        centro.append(rueda.r);
        if (mio && !esperando && v.fase === 'girar') centro.append(boton('¡Girar!', () => ctx.enviar({ tipo: 'girar' }), 'oro'));
      } else if (v.fase === 'corona') {
        estado.textContent = mio ? '👑 ¡Corona! Elige qué personaje quieres intentar ganar' : `👑 ${ctx.nombre(v.turno)} elige personaje…`;
        centro.append(rueda.r);
        if (mio) { const f = el('div', 'sb-elige'); for (const c of v.faltan) { const b = boton(`${CAT[c][1]} ${CAT[c][0]}`, () => ctx.enviar({ tipo: 'corona', cat: c })); b.style.setProperty('--c', CAT[c][2]); f.append(b); } centro.append(f); }
      } else if (v.preg) {
        const c = CAT[v.preg.cat];
        estado.textContent = mio ? (v.fase === 'corona-responder' ? '👑 Pregunta por el personaje' : 'Contesta antes de que acabe el tiempo') : `Contesta ${ctx.nombre(v.turno)}…`;
        const tarjeta = el('div', 'sb-tarjeta'); tarjeta.style.setProperty('--c', c[2]);
        const reloj = el('span', 'fi-reloj'); reloj.dataset.cuentaAtras = v.hasta; reloj.dataset.texto = '⏱ {s} s';
        const tiempo = el('div', 'sb-tiempo'); const barra = el('i'); barra.style.animationDuration = `${Math.max(0, v.hasta - Date.now() - (ctx.desfase || 0))}ms`; tiempo.append(barra);
        tarjeta.append(el('div', 'sb-cat', `${c[1]} ${c[0]}`), reloj, el('h3', null, v.preg.texto), tiempo);
        const ops = el('div', 'sb-ops');
        v.preg.opciones.forEach((o, i) => { const b = boton(o, mio ? () => { ops.querySelectorAll('button').forEach((x) => { x.disabled = true; }); b.classList.add('elegida'); ctx.enviar({ tipo: 'responder', op: i }); } : null); b.disabled = !mio; ops.append(b); });
        tarjeta.append(ops);
        centro.append(tarjeta);
      }
      zona.append(cab, jugadores, estado, centro);
    },
  };
})();
