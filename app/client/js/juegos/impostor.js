'use strict';
// El impostor: tu palabra (o «eres el impostor»), las pistas por turnos, la votación y el resultado.
(() => {
  const { el, boton } = UI;
  let borrador = '';
  const reloj = (hasta, texto) => { const t = el('span', 'fi-reloj'); if (hasta) { t.dataset.cuentaAtras = hasta; t.dataset.texto = texto || '⏱ {s} s'; } return t; };
  window.JUEGO = {
    render(zona, v, ctx) {
      const yo = ctx.yo;
      const cab = el('div', 'fi-cab');
      cab.append(el('span', 'etiqueta', `Ronda ${v.ronda}/${v.rondas}`), el('span', null, `Categoría: ${v.categoria}`), reloj(v.hasta));
      const tarjeta = el('div', 'fi-tarjeta' + (v.soyImpostor ? ' impostor' : ''));
      if (yo < 0) tarjeta.append(el('b', null, 'Mirando la partida'));
      else if (v.soyImpostor) tarjeta.append(el('small', null, 'Tu papel'), el('b', null, '🤫 Eres el impostor'), el('span', null, 'Disimula: da pistas creíbles y descubre la palabra.'));
      else tarjeta.append(el('small', null, 'Tu palabra secreta'), el('b', null, v.palabra), el('span', null, 'Da pistas sin decirla… y encuentra al impostor.'));
      // pistas en una tabla: una columna por vuelta
      const pistas = el('div', 'fi-pistas');
      for (let j = 0; j < v.n; j++) {
        const fila = el('div', 'fi-fila' + (v.turno === j && v.fase === 'pistas' ? ' activo' : ''));
        fila.append(el('b', null, ctx.nombre(j)));
        v.pistas.filter((p) => p.j === j).forEach((p) => fila.append(el('span', 'fi-pista', p.texto)));
        if (v.fase === 'votar') fila.append(el('small', 'suave', v.votaron[j] ? '✔ ha votado' : '…'));
        if (v.cuenta) fila.append(el('small', 'fi-votos', `${v.cuenta[j]} voto${v.cuenta[j] === 1 ? '' : 's'}`));
        pistas.append(fila);
      }
      const accion = el('div', 'fila centro');
      const estado = el('p', 'turno');
      if (v.fase === 'pistas') {
        if (v.turno === yo) {
          estado.className = 'turno mio'; estado.textContent = 'Te toca: da tu pista (una o dos palabras)';
          const f = el('form', 'fila centro');
          const i = el('input'); i.maxLength = 24; i.placeholder = 'Tu pista'; i.value = borrador; i.oninput = () => { borrador = i.value; };
          const b = boton('Dar pista', null, 'oro'); b.type = 'submit';
          f.append(i, b);
          f.onsubmit = (e) => { e.preventDefault(); if (i.value.trim()) { ctx.enviar({ tipo: 'pista', texto: i.value }); borrador = ''; } };
          accion.append(f);
          requestAnimationFrame(() => i.focus());
        } else estado.textContent = `Pista de ${ctx.nombre(v.turno)}…`;
      } else if (v.fase === 'votar') {
        estado.className = 'turno' + (v.yaVote ? '' : ' mio');
        estado.textContent = v.yaVote ? 'Has votado. Esperando al resto…' : '¿Quién es el impostor? Vota';
        if (!v.yaVote && yo >= 0) for (let j = 0; j < v.n; j++) if (j !== yo) accion.append(boton(ctx.nombre(j), () => ctx.enviar({ tipo: 'votar', a: j })));
      } else if (v.fase === 'adivinar') {
        if (v.soyImpostor) {
          estado.className = 'turno mio'; estado.textContent = '¡Te han pillado! Adivina la palabra para ganar igualmente';
          const f = el('form', 'fila centro'); const i = el('input'); i.maxLength = 40; i.placeholder = '¿Cuál es la palabra?';
          const b = boton('Probar', null, 'oro'); b.type = 'submit'; f.append(i, b);
          f.onsubmit = (e) => { e.preventDefault(); if (i.value.trim()) ctx.enviar({ tipo: 'adivinar', texto: i.value }); };
          accion.append(f);
        } else estado.textContent = 'Han pillado al impostor… ¿adivinará la palabra?';
      } else if (v.fase === 'resultado' && v.resultado) {
        const r = v.resultado;
        const p = el('div', 'panel fi-resultado');
        p.append(el('h2', null, r.gana === 'impostor' ? '🤫 ¡Gana el impostor!' : '🎉 ¡Gana el pueblo!'),
          el('p', null, `El impostor era ${ctx.nombre(r.impostor)}. La palabra: «${r.palabra}».`), el('p', 'suave', r.motivo + (r.intento ? ` (dijo «${r.intento}»)` : '')));
        if (!v.ganadores) { const t = el('p', 'suave'); t.dataset.cuentaAtras = v.hasta; t.dataset.texto = 'Siguiente ronda en {s} s'; p.append(t, boton('Siguiente ronda ya', () => ctx.enviar({ tipo: 'seguir' }), 'mini')); }
        accion.append(p);
      }
      const marcador = el('div', 'fi-marcador');
      for (let j = 0; j < v.n; j++) marcador.append(el('span', null, `${ctx.nombre(j)}: ${v.puntos[j]}`));
      zona.append(cab, tarjeta, estado, pistas, accion, marcador);
    },
  };
})();
