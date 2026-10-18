'use strict';
// En la onda: dial semicircular. Quien da la pista ve la zona premiada; los demás mueven su aguja.
(() => {
  const { el, boton } = UI;
  const NS = 'http://www.w3.org/2000/svg';
  const S = (tag, at) => { const x = document.createElementNS(NS, tag); for (const k in at) x.setAttribute(k, at[k]); return x; };
  const COLORES = ['#4d7cfe', '#ff5a36', '#3fbf5f', '#ffc63d', '#8a5cf6', '#ff6fa8', '#18b39b', '#ff9f2e', '#9a5b2e', '#2f55c4'];
  const pos = (v, r) => { const a = Math.PI * (1 - v / 100); return [100 + Math.cos(a) * r, 100 - Math.sin(a) * r]; };
  const sector = (a, b, r) => { const [x1, y1] = pos(a, r), [x2, y2] = pos(b, r); return `M100,100 L${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2} Z`; };
  let rondaVista = 0, valor = 50, campo = null, envio = null, rango = null, dialVivo = null;
  function dial(objetivo, agujas) {
    const s = S('svg', { viewBox: '0 0 200 110', class: 'on-dial' });
    s.append(S('path', { d: sector(0, 100, 92), fill: '#23264f' }));
    if (objetivo != null) for (const [d, c] of [[25, '#ffc63d'], [17, '#ff9f2e'], [10, '#ff5a36'], [4, '#3fbf5f']]) s.append(S('path', { d: sector(Math.max(0, objetivo - d), Math.min(100, objetivo + d), 90), fill: c }));
    for (const [v, c, w] of agujas) { const [x, y] = pos(v, 86); s.append(S('line', { x1: 100, y1: 100, x2: x, y2: y, stroke: c, 'stroke-width': w, 'stroke-linecap': 'round' })); }
    s.append(S('circle', { cx: 100, cy: 100, r: 8, fill: '#1e1b2e' }));
    return s;
  }
  window.JUEGO = {
    render(zona, v, ctx) {
      const yo = ctx.yo, psiquico = yo === v.psiquico;
      if (rondaVista !== v.ronda) { rondaVista = v.ronda; valor = v.miDial; campo = null; rango = null; }
      const cab = el('div', 'fi-cab'); const reloj = el('span', 'fi-reloj'); if (v.hasta) { reloj.dataset.cuentaAtras = v.hasta; reloj.dataset.texto = '⏱ {s} s'; }
      cab.append(el('span', 'etiqueta', `Ronda ${v.ronda}/${v.total}`), reloj);
      const escala = el('div', 'on-escala'); escala.append(el('b', null, '◀ ' + v.escala[0]), el('b', null, v.escala[1] + ' ▶'));
      const marcador = el('div', 'fi-marcador'); v.puntos.forEach((p, j) => marcador.append(el('span', j === v.psiquico ? 'dibuja' : v.listos[j] ? 'acierto' : '', `${j === v.psiquico ? '🔮 ' : ''}${ctx.nombre(j)}: ${p}`)));
      const estado = el('p', 'turno');
      zona.append(cab, marcador, estado);
      const agujas = [];
      if (v.fase === 'resultado') { v.resultado.diales.forEach((d, j) => { if (j !== v.psiquico) agujas.push([d, COLORES[j % COLORES.length], 3]); }); }
      else if (!psiquico && v.fase === 'adivinar' && yo >= 0) agujas.push([valor, '#ffffff', 4]);
      const d = dial(v.objetivo, agujas); dialVivo = d;
      zona.append(escala, d);
      if (v.pista) zona.append(el('p', 'on-pista', `«${v.pista}»`));
      if (v.fase === 'pista') {
        estado.textContent = psiquico ? 'Tú das la pista: la zona premiada está en el dial. Escribe algo que esté ahí en la escala.' : `${ctx.nombre(v.psiquico)} está pensando una pista…`;
        if (psiquico) {
          estado.classList.add('mio');
          if (!campo) { campo = el('form', 'fila centro'); const i = el('input', 'grow'); i.maxLength = 60; i.placeholder = 'Tu pista (p. ej. «una sopa de sobre»)'; const b = boton('Dar pista', null, 'oro'); b.type = 'submit'; campo.append(i, b); campo.onsubmit = (e) => { e.preventDefault(); if (i.value.trim()) ctx.enviar({ tipo: 'pista', texto: i.value }); }; }
          zona.append(campo);
        }
      } else if (v.fase === 'adivinar') {
        estado.textContent = psiquico ? 'Los demás están moviendo sus agujas…' : v.listos[yo] ? 'Listo. Puedes cambiarlo hasta que acabe el tiempo.' : '¿Dónde está la pista en la escala? Mueve la aguja';
        if (!psiquico && yo >= 0) {
          if (!v.listos[yo]) estado.classList.add('mio');
          // el deslizador se conserva toda la ronda (si se rehiciera al llegar la vista, se cortaría el arrastre)
          if (!rango) { rango = el('input', 'on-rango'); rango.type = 'range'; rango.min = 0; rango.max = 100; rango.value = valor; }
          const r = rango;
          r.oninput = () => { valor = Number(r.value); const n = dial(v.objetivo, [[valor, '#ffffff', 4]]); dialVivo.replaceWith(n); dialVivo = n; clearTimeout(envio); envio = setTimeout(() => ctx.enviar({ tipo: 'dial', v: valor }), 250); };
          const f = el('div', 'fila centro'); f.append(boton(v.listos[yo] ? 'Cambiar' : '✔ Listo', () => ctx.enviar({ tipo: 'dial', v: valor, listo: !v.listos[yo] }), 'oro'));
          zona.append(r, f);
        }
      } else if (v.fase === 'resultado') {
        estado.textContent = `La aguja estaba en ${v.resultado.objetivo}. ` + v.resultado.pts.map((p, j) => `${ctx.nombre(j)} +${p}`).join(' · ');
        if (yo >= 0 && !v.ganadores) { const f = el('div', 'fila centro'); f.append(boton('Siguiente ronda', () => ctx.enviar({ tipo: 'seguir' }), 'mini')); zona.append(f); }
      }
    },
  };
})();
