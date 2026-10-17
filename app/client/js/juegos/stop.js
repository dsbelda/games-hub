'use strict';
// Stop: rellena las categorías con la letra de la ronda. Tus respuestas se guardan solas mientras escribes.
(() => {
  const { el, boton } = UI;
  let cache = null; // formulario de la ronda actual (para no perder lo escrito al repintar)
  const reloj = (hasta, texto) => { const t = el('span', 'fi-reloj'); if (hasta) { t.dataset.cuentaAtras = hasta; t.dataset.texto = texto || '⏱ {s} s'; } return t; };
  window.JUEGO = {
    render(zona, v, ctx) {
      const yo = ctx.yo;
      const cab = el('div', 'fi-cab');
      cab.append(el('span', 'etiqueta', `Ronda ${v.ronda}/${v.rondas}`), el('span', 'st-letra', v.letra), reloj(v.hasta, v.stop !== null && v.fase === 'escribir' ? '¡STOP! {s} s' : '⏱ {s} s'));
      zona.append(cab);
      if (v.fase === 'escribir') {
        if (v.stop !== null) zona.append(el('p', 'turno mio', `¡${ctx.nombre(v.stop)} ha dicho STOP! Termina rápido`));
        if (!cache || cache.ronda !== v.ronda) {
          const f = el('form', 'st-form');
          const inputs = v.cats.map((c, i) => { const l = el('label', 'campo'); const inp = el('input'); inp.maxLength = 30; inp.autocomplete = 'off'; inp.value = v.mias[i] || ''; inp.placeholder = `${c} con ${v.letra}…`; l.append(el('span', null, c), inp); f.append(l); return inp; });
          let t = null;
          const datos = () => Object.fromEntries(inputs.map((x, i) => [i, x.value]));
          const stop = boton('¡STOP!', null, 'rojo st-stop'); stop.type = 'submit';
          const comprobar = () => { stop.disabled = inputs.some((x) => !x.value.trim()); };
          inputs.forEach((x) => { x.oninput = () => { comprobar(); clearTimeout(t); t = setTimeout(() => ctx.enviar({ tipo: 'guardar', resp: datos() }), 500); }; });
          f.onsubmit = (e) => { e.preventDefault(); clearTimeout(t); ctx.enviar({ tipo: 'stop', resp: datos() }); };
          f.append(stop); comprobar();
          cache = { ronda: v.ronda, form: f };
        }
        zona.append(cache.form);
        return;
      }
      // revisar o resultado: tabla con las respuestas de todos
      const tabla = el('div', 'st-tabla');
      tabla.style.gridTemplateColumns = `minmax(90px, auto) repeat(${v.n}, minmax(110px, 1fr))`;
      tabla.append(el('b', 'st-cab', ''));
      for (let j = 0; j < v.n; j++) tabla.append(el('b', 'st-cab', ctx.nombre(j) + (v.fase === 'revisar' && v.listos[j] ? ' ✔' : '')));
      v.cats.forEach((cat, ci) => {
        tabla.append(el('b', 'st-cat', cat));
        for (let j = 0; j < v.n; j++) {
          const txt = (v.todas[j] || {})[ci] || '';
          const celda = el(v.fase === 'revisar' && j !== yo && txt ? 'button' : 'div', 'st-celda');
          celda.textContent = txt || '—';
          if (v.fase === 'revisar') {
            const vetos = v.vetos?.[`${j}:${ci}`] || [];
            if (vetos.length) { celda.classList.add('vetada'); celda.title = `${vetos.length} lo tachan`; }
            if (vetos.includes(yo)) celda.classList.add('mio');
            if (celda.tagName === 'BUTTON') { celda.type = 'button'; celda.onclick = () => ctx.enviar({ tipo: 'vetar', j, c: ci }); }
          } else if (v.tabla) {
            const f = v.tabla.filas[ci].fila[j];
            celda.classList.add(f.ok ? 'buena' : 'mala');
            if (f.ok) celda.append(el('small', null, ` +${f.pts}`));
          }
          tabla.append(celda);
        }
      });
      if (v.tabla) { tabla.append(el('b', 'st-cat', 'Ronda')); v.tabla.suma.forEach((s) => tabla.append(el('b', 'st-celda total', `+${s}`))); }
      const scroll = el('div', 'st-scroll'); scroll.append(tabla);
      const ayuda = el('p', v.fase === 'revisar' ? 'turno mio' : 'suave centro', v.fase === 'revisar' ? 'Toca las respuestas que no valgan para tacharlas. Pulsa «Listo» al acabar.' : 'Resultado de la ronda');
      zona.append(ayuda, scroll);
      if (v.fase === 'revisar' && yo >= 0 && !v.listos[yo]) zona.append(boton('Listo', () => ctx.enviar({ tipo: 'listo' }), 'oro'));
      if (v.fase === 'resultado' && !v.ganadores) { const t = el('p', 'suave'); t.dataset.cuentaAtras = v.hasta; t.dataset.texto = 'Siguiente letra en {s} s'; zona.append(t, boton('Siguiente ronda ya', () => ctx.enviar({ tipo: 'seguir' }), 'mini')); }
      const marcador = el('div', 'fi-marcador');
      for (let j = 0; j < v.n; j++) marcador.append(el('span', null, `${ctx.nombre(j)}: ${v.puntos[j]}`));
      zona.append(marcador);
    },
  };
})();
