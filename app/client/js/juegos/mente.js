'use strict';
// Sin palabras: tus cartas abajo; un botón grande juega la más baja. Sin turnos: cuando creas que te toca.
(() => {
  const { el, boton } = UI;
  let botonJugar = null, claveBoton = '';
  window.JUEGO = {
    cooperativo: true,
    render(zona, v, ctx) {
      const yo = ctx.yo;
      const cab = el('div', 'fi-cab');
      cab.append(el('span', 'etiqueta', `Nivel ${v.nivel}/${v.maxNivel}`), el('span', 'mn-vidas', '❤️'.repeat(Math.max(0, v.vidas))), el('span', 'mn-estrellas', '⭐'.repeat(v.estrellas) || 'sin estrellas'));
      const otros = el('div', 'fi-marcador');
      v.cuantas.forEach((c, j) => otros.append(el('span', v.pideEstrella[j] ? 'dibuja' : v.fase === 'preparados' && v.listos[j] ? 'acierto' : '', `${ctx.nombre(j)}${j === yo ? ' (tú)' : ''}: ${c} carta${c === 1 ? '' : 's'}${v.pideEstrella[j] ? ' ⭐' : ''}`)));
      const mesa = el('div', 'mn-mesa');
      if (v.ultima) { const c = el('div', 'mn-carta grande' + (v.fallo && v.fallo.c === v.ultima.c ? ' mal' : ''), String(v.ultima.c)); c.append(el('small', null, ctx.nombre(v.ultima.j))); mesa.append(c); }
      else mesa.append(el('p', 'suave', 'Aún no hay cartas en la mesa'));
      const hist = el('div', 'mn-hist'); for (const x of v.mesa.slice(0, -1)) hist.append(el('span', null, String(x.c)));
      const estado = el('p', 'turno');
      const aviso = el('p', 'suave centro');
      if (v.fallo && v.fase === 'jugando') aviso.textContent = `¡Uy! ${ctx.nombre(v.fallo.j)} jugó el ${v.fallo.c}, pero había ${v.fallo.bajas.map((b) => `${b.c} (${ctx.nombre(b.j)})`).join(', ')}. Se pierde una vida.`;
      zona.append(cab, otros, mesa, hist, estado, aviso);
      if (v.fase === 'preparados' || v.fase === 'superado') {
        estado.textContent = v.fase === 'superado' ? `¡Nivel ${v.nivel} superado! Cuando estéis listos, el siguiente.` : 'Concentraos… pulsad «Listos» para empezar el nivel';
        if (yo >= 0 && !(v.fase === 'preparados' && v.listos[yo])) { estado.classList.add('mio'); const f = el('div', 'fila centro'); f.append(boton('🤝 ¡Listos!', () => ctx.enviar({ tipo: 'listo' }), 'oro')); zona.append(f); }
      } else if (v.fase === 'jugando') {
        estado.textContent = v.mia.length ? 'Juega tu carta cuando creas que es la más baja de la mesa' : 'No te quedan cartas: mira cómo acaban los demás';
        if (yo >= 0 && v.mia.length) {
          // el botón se conserva mientras no cambie la carta (pulsar justo cuando llega otra vista no debe perderse)
          const k = `${v.nivel}|${v.mia[0]}`;
          if (k !== claveBoton) { claveBoton = k; botonJugar = boton(`Jugar mi ${v.mia[0]}`, () => ctx.enviar({ tipo: 'jugar' }), 'oro mn-jugar'); }
          const f = el('div', 'fila centro'); f.append(botonJugar);
          if (v.estrellas > 0) f.append(boton(v.pideEstrella[yo] ? '⭐ Retirar petición' : '⭐ Pedir estrella', () => ctx.enviar({ tipo: 'estrella' }), 'mini'));
          zona.append(f);
        }
      }
      const mano = el('div', 'mn-mano'); for (const c of v.mia) mano.append(el('div', 'mn-carta', String(c)));
      zona.append(mano);
    },
  };
})();
