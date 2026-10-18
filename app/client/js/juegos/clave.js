'use strict';
// Palabras en clave: rejilla de 25 palabras. El jefe ve los colores y da la pista; su equipo toca las cartas.
(() => {
  const { el, boton } = UI;
  const EQ = ['Rojo', 'Azul'], COL = ['rojo', 'azul', 'neutral', 'asesino'];
  let form = null;
  function crearForm(ctx) {
    const f = el('form', 'fila centro cl-form');
    const w = el('input'); w.placeholder = 'Una palabra'; w.maxLength = 25; w.autocomplete = 'off';
    const n = el('select'); for (let k = 1; k <= 9; k++) { const o = el('option', null, String(k)); o.value = k; n.append(o); }
    const b = boton('Dar pista', null, 'oro'); b.type = 'submit';
    f.append(w, n, b);
    f.onsubmit = async (e) => { e.preventDefault(); const r = await form.ctx.enviar({ tipo: 'pista', palabra: w.value, n: Number(n.value) }); if (r.ok) w.value = ''; };
    return { f, ctx };
  }
  window.JUEGO = {
    render(zona, v, ctx) {
      const yo = ctx.yo, miEq = yo >= 0 ? yo % 2 : -1, soyJefe = v.soyJefe;
      const marcador = el('div', 'fi-marcador');
      [0, 1].forEach((t) => { const s = el('span', 'cl-eq ' + COL[t] + (v.turno === t && !v.ganadores ? ' activo' : ''), `${EQ[t]}: faltan ${v.restan[t]}`); marcador.append(s); });
      const equipos = el('p', 'suave centro', [0, 1].map((t) => `${EQ[t]}: ` + Array.from({ length: v.n }, (_, j) => j).filter((j) => j % 2 === t).map((j) => ctx.nombre(j) + (v.jefes[t] === j ? ' (jefe)' : '')).join(', ')).join(' · '));
      const estado = el('p', 'turno');
      const nuestro = v.turno === miEq && !v.ganadores;
      if (v.ganadores) estado.textContent = '';
      else if (v.fase === 'pista') { estado.textContent = soyJefe && nuestro ? 'Eres el jefe: da una pista de una palabra y un número' : `Esperando la pista del jefe ${EQ[v.turno].toLowerCase()} (${ctx.nombre(v.jefes[v.turno])})`; if (soyJefe && nuestro) estado.classList.add('mio'); }
      else { estado.textContent = `Pista: «${v.pista.palabra}» ${v.pista.n} · ${nuestro && !soyJefe ? `¡toca cartas! (te quedan ${v.quedan})` : `adivina el equipo ${EQ[v.turno].toLowerCase()}`}`; if (nuestro && !soyJefe) estado.classList.add('mio'); }
      const rejilla = el('div', 'cl-rejilla');
      v.palabras.forEach((w, i) => {
        const c = v.colores[i], ab = v.abiertas[i];
        const b = el('button', 'cl-carta' + (c >= 0 ? ' ' + COL[c] : '') + (ab ? ' abierta' : '') + (v.ultima && v.ultima.i === i ? ' ultima' : ''), w);
        b.type = 'button';
        b.disabled = ab || v.fase !== 'adivinar' || !nuestro || soyJefe || !!v.ganadores;
        b.onclick = () => ctx.enviar({ tipo: 'tocar', i });
        rejilla.append(b);
      });
      zona.append(marcador, equipos, estado, rejilla);
      if (soyJefe && nuestro && v.fase === 'pista') { if (!form) form = crearForm(ctx); form.ctx = ctx; zona.append(form.f); }
      if (nuestro && !soyJefe && v.fase === 'adivinar') { const f = el('div', 'fila centro'); f.append(boton('Pasar turno', () => ctx.enviar({ tipo: 'pasar' }), 'mini flojo')); zona.append(f); }
      if (v.historial.length) { const h = el('div', 'cl-hist'); for (const p of [...v.historial].reverse()) h.append(el('span', COL[p.t], `«${p.palabra}» ${p.n} → ${p.aciertos} ✓`)); zona.append(h); }
    },
  };
})();
