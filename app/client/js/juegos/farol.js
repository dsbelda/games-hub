'use strict';
// Farol: inventa una definición creíble, luego vota la verdadera. El texto que escribes se conserva.
(() => {
  const { el, boton } = UI;
  let rondaVista = 0, form = null;
  window.JUEGO = {
    render(zona, v, ctx) {
      const yo = ctx.yo;
      if (rondaVista !== v.ronda) { rondaVista = v.ronda; form = null; }
      const cab = el('div', 'fi-cab'); const reloj = el('span', 'fi-reloj'); if (v.hasta) { reloj.dataset.cuentaAtras = v.hasta; reloj.dataset.texto = '⏱ {s} s'; }
      cab.append(el('span', 'etiqueta', `Ronda ${v.ronda}/${v.total}`), reloj);
      const palabra = el('div', 'fa-palabra'); palabra.append(el('small', null, '¿Qué significa…?'), el('b', null, v.palabra));
      const marcador = el('div', 'fi-marcador'); v.puntos.forEach((p, j) => marcador.append(el('span', (v.fase === 'escribir' ? v.escrito[j] : v.votado[j]) ? 'acierto' : '', `${ctx.nombre(j)}: ${p}`)));
      const estado = el('p', 'turno');
      zona.append(cab, palabra, marcador, estado);
      if (v.fase === 'escribir') {
        estado.textContent = v.mio ? 'Enviada. Puedes cambiarla mientras los demás escriben.' : 'Inventa una definición que parezca de diccionario';
        if (!v.mio) estado.classList.add('mio');
        if (yo >= 0) {
          if (!form) { form = el('form', 'fa-form'); const t = el('textarea'); t.maxLength = 140; t.rows = 3; t.placeholder = 'Ej.: «Cesto de mimbre que se usaba para…»'; const b = boton('Enviar', null, 'oro'); b.type = 'submit'; form.append(t, b); form.onsubmit = (e) => { e.preventDefault(); ctx.enviar({ tipo: 'inventar', texto: t.value }); }; form.t = t; }
          if (v.mio && !form.t.value) form.t.value = v.mio;
          zona.append(form);
        }
      } else if (v.fase === 'votar') {
        estado.textContent = v.miVoto !== null ? 'Votado. Esperando a los demás…' : '¿Cuál es la definición de verdad?';
        if (v.miVoto === null) estado.classList.add('mio');
        const ops = el('div', 'fa-ops');
        v.opciones.forEach((o, i) => { const b = el('button', 'fa-op' + (o.mia ? ' mia' : '') + (v.miVoto === i ? ' sel' : ''), o.texto); b.type = 'button'; b.disabled = o.mia || yo < 0; if (o.mia) b.title = 'Es la tuya'; b.onclick = () => ctx.enviar({ tipo: 'votar', o: i }); ops.append(b); });
        zona.append(ops);
      } else if (v.fase === 'resultado') {
        const r = v.resultado; estado.textContent = 'Así ha quedado la ronda';
        const ops = el('div', 'fa-ops');
        r.opciones.forEach((o, i) => {
          const d = el('div', 'fa-op res' + (o.autor < 0 ? ' real' : ''));
          d.append(el('p', null, o.texto), el('small', null, (o.autor < 0 ? '✔ La de verdad' : `Invento de ${ctx.nombre(o.autor)}`) + ' · votos: ' + (r.votos.map((x, j) => (x === i ? ctx.nombre(j) : null)).filter(Boolean).join(', ') || 'ninguno')));
          ops.append(d);
        });
        zona.append(ops, el('p', 'suave centro', r.pts.map((p, j) => `${ctx.nombre(j)} +${p}`).join(' · ')));
        if (yo >= 0 && !v.ganadores) { const f = el('div', 'fila centro'); f.append(boton('Siguiente ronda', () => ctx.enviar({ tipo: 'seguir' }), 'mini')); zona.append(f); }
      }
    },
  };
})();
