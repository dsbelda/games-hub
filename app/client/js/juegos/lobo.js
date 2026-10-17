'use strict';
// Hombre lobo: tu papel arriba, el narrador, y las acciones sobre cada jugador según la fase.
(() => {
  const { el, boton } = UI;
  const PAPEL = {
    lobo: ['🐺', 'Lobo', 'De noche, elige con los otros lobos a quién atacar. De día, disimula.'],
    vidente: ['🔮', 'Vidente', 'Cada noche descubres si alguien es lobo. Ayuda al pueblo sin que te descubran.'],
    bruja: ['🧪', 'Bruja', 'Tienes una poción para salvar a la víctima de los lobos y otra para envenenar a alguien. Una vez cada una.'],
    aldeano: ['🧑‍🌾', 'Aldeano', 'No tienes poderes: observa, debate y vota bien.'],
  };
  const FASE = { noche: '🌙 Noche', bruja: '🌙 Noche (la bruja actúa)', dia: '☀️ Día: debate', votar: '⚖️ Votación', amanecer: '🌅 Cae la tarde…', fin: 'Fin' };
  let charla = '';
  window.JUEGO = {
    render(zona, v, ctx) {
      const yo = ctx.yo;
      const nom = (t) => t.replace(/\{(\d+)\}/g, (_, i) => ctx.nombre(+i));
      const cab = el('div', 'fi-cab');
      const reloj = el('span', 'fi-reloj'); if (v.hasta) { reloj.dataset.cuentaAtras = v.hasta; reloj.dataset.texto = '⏱ {s} s'; }
      cab.append(el('span', 'etiqueta', `Día ${v.dia}`), el('b', null, FASE[v.fase] || ''), el('span', null, `Lobos vivos: ${v.lobos}/${v.total}`), reloj);
      const [icono, nombre, desc] = PAPEL[v.papel] || ['👀', 'Espectador', ''];
      const tarjeta = el('div', 'lb-papel ' + (v.papel || '') + (v.muerto ? ' muerto' : ''));
      tarjeta.append(el('span', 'lb-icono', icono), el('div'));
      tarjeta.lastChild.append(el('small', null, v.muerto ? 'Has muerto (ahora lo ves todo)' : 'Tu papel'), el('b', null, nombre), el('p', null, desc));
      if (v.bruja && v.bruja.pociones) tarjeta.lastChild.append(el('small', null, `Pociones: ${v.bruja.pociones.salvar ? '💚 salvar' : '—'} · ${v.bruja.pociones.matar ? '☠️ envenenar' : '—'}`));
      // jugadores
      const rejilla = el('div', 'lb-jugadores');
      const yaVoteLobo = v.votosLobo && v.votosLobo[yo] !== undefined;
      for (let j = 0; j < v.n; j++) {
        const c = el('div', 'lb-jug' + (v.vivos[j] ? '' : ' muerto') + (j === yo ? ' yo' : ''));
        const papel = v.papeles[j];
        c.append(el('b', null, ctx.nombre(j) + (j === yo ? ' (tú)' : '')));
        if (papel && (j !== yo || !v.vivos[j])) c.append(el('small', 'lb-rol', `${PAPEL[papel][0]} ${PAPEL[papel][1]}`));
        if (!v.vivos[j]) c.append(el('small', null, '✝ muerto'));
        if (v.visto && v.visto[j] !== undefined) c.append(el('small', v.visto[j] ? 'lb-lobo' : 'lb-limpio', v.visto[j] ? '🔮 ¡es lobo!' : '🔮 no es lobo'));
        if (v.votosLobo) { const n = Object.values(v.votosLobo).filter((x) => x === j).length; if (n) c.append(el('small', 'lb-lobo', `🐺 ×${n}`)); }
        if (v.fase === 'dia' && v.listos.includes(j)) c.append(el('small', 'suave', '✔ listo'));
        if (v.fase === 'votar' && v.votaron.includes(j)) c.append(el('small', 'suave', '✔ ha votado'));
        // acciones
        const vivoYo = yo >= 0 && v.vivos[yo];
        if (vivoYo && v.vivos[j] && j !== yo) {
          if (v.fase === 'noche' && v.papel === 'lobo' && papel !== 'lobo') c.append(boton(v.votosLobo[yo] === j ? '🐺 Atacando' : 'Atacar', () => ctx.enviar({ tipo: 'matar', a: j }), v.votosLobo[yo] === j ? 'mini rojo' : 'mini'));
          if (v.fase === 'noche' && v.papel === 'vidente' && !v.yaMire && (v.visto?.[j] === undefined)) c.append(boton('Mirar', () => ctx.enviar({ tipo: 'mirar', a: j }), 'mini'));
          if (v.fase === 'bruja' && v.papel === 'bruja' && v.bruja.pociones.matar) c.append(boton('☠️ Envenenar', () => ctx.enviar({ tipo: 'pocion', cual: 'matar', a: j }), 'mini'));
          if (v.fase === 'votar' && v.miVoto === null) c.append(boton('Votar', () => ctx.enviar({ tipo: 'votar', a: j }), 'mini oro'));
        }
        rejilla.append(c);
      }
      const acciones = el('div', 'fila centro');
      const estado = el('p', 'turno');
      const vivoYo = yo >= 0 && v.vivos[yo];
      if (v.fase === 'noche') estado.textContent = !vivoYo ? 'Es de noche…' : v.papel === 'lobo' ? (yaVoteLobo ? 'Esperando a los otros lobos…' : 'Elige a quién atacar') : v.papel === 'vidente' ? (v.yaMire ? 'Ya has mirado esta noche' : 'Elige a quién mirar') : 'Duermes… (cierra los ojos 😴)';
      if (v.fase === 'bruja') {
        if (v.papel === 'bruja' && vivoYo) {
          estado.className = 'turno mio';
          estado.textContent = v.bruja.victima !== null ? `Los lobos han atacado a ${ctx.nombre(v.bruja.victima)}.` : 'Esta noche los lobos no han atacado a nadie.';
          if (v.bruja.victima !== null && v.bruja.pociones.salvar && !v.bruja.salva) acciones.append(boton('💚 Salvarle', () => ctx.enviar({ tipo: 'pocion', cual: 'salvar' }), 'oro'));
          acciones.append(boton('Terminar la noche', () => ctx.enviar({ tipo: 'pocion', cual: 'nada' })));
        } else estado.textContent = 'Es de noche…';
      }
      if (v.fase === 'dia') { estado.textContent = 'Debatid quién puede ser lobo (por el chat o en voz alta)'; if (vivoYo && !v.listos.includes(yo)) acciones.append(boton('Listo para votar', () => ctx.enviar({ tipo: 'listo' }), 'oro')); }
      if (v.fase === 'votar') { estado.className = 'turno' + (vivoYo && v.miVoto === null ? ' mio' : ''); estado.textContent = !vivoYo ? 'El pueblo vota…' : v.miVoto === null ? '¿A quién expulsáis? Vota en su tarjeta' : 'Has votado'; if (vivoYo && v.miVoto === null) acciones.append(boton('No votar a nadie', () => ctx.enviar({ tipo: 'votar', a: -1 }), 'mini flojo')); }
      if (v.fase === 'amanecer') estado.textContent = 'Cae la tarde… pronto será de noche';
      // narrador
      const log = el('div', 'lb-log');
      for (const l of v.log) log.append(el('p', null, nom(l.t)));
      requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });
      zona.append(cab, tarjeta, estado, acciones, rejilla, log);
      // chat de los lobos
      if (v.lobochat) {
        const p = el('div', 'panel lb-chat');
        p.append(el('h3', null, '🐺 Chat de los lobos (solo lo veis vosotros)'));
        const l = el('div', 'chat-log');
        for (const m of v.lobochat) { const q = el('p'); q.append(el('b', null, ctx.nombre(m.j) + ': '), document.createTextNode(m.t)); l.append(q); }
        p.append(l);
        if (v.papel === 'lobo') {
          const f = el('form', 'fila'); const i = el('input'); i.className = 'grow'; i.maxLength = 160; i.placeholder = 'Habla con tu manada…'; i.value = charla; i.oninput = () => { charla = i.value; };
          const b = boton('Enviar'); b.type = 'submit'; f.append(i, b);
          f.onsubmit = (e) => { e.preventDefault(); if (i.value.trim()) { ctx.enviar({ tipo: 'lobochat', texto: i.value }); charla = ''; } };
          p.append(f);
        }
        zona.append(p);
      }
    },
  };
})();
