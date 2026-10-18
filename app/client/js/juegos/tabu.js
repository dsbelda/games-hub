'use strict';
// Tabú: quien describe ve la tarjeta y puede escribir pistas (o hablar y marcar «Acertada»); su equipo escribe
// lo que cree que es; el otro equipo ve la tarjeta y pita «¡Tabú!». Los campos de texto se conservan.
(() => {
  const { el, boton } = UI;
  let campo = null, acciones = null, claveAcc = '';
  function crearCampo() {
    const f = el('form', 'fila tb-form'); const i = el('input', 'grow'); i.maxLength = 80; i.autocomplete = 'off'; const b = boton('Enviar', null, 'oro'); b.type = 'submit';
    f.append(i, b);
    f.onsubmit = (e) => { e.preventDefault(); if (!i.value.trim() || !campo.enviar) return; campo.enviar(i.value); i.value = ''; i.focus(); };
    return { f, i, b, enviar: null };
  }
  window.JUEGO = {
    render(zona, v, ctx) {
      const yo = ctx.yo, miEq = yo >= 0 ? yo % 2 : -1, describo = yo === v.describe, nuestro = miEq === v.equipoTurno;
      const cab = el('div', 'fi-cab');
      const reloj = el('span', 'fi-reloj'); if (v.hasta) { reloj.dataset.cuentaAtras = v.hasta; reloj.dataset.texto = v.fase === 'jugando' ? '⏱ {s} s' : 'Siguiente turno en {s} s'; }
      cab.append(el('span', 'etiqueta', `Turno ${Math.min(v.turnoN + 1, v.total)}/${v.total}`), reloj);
      const marcador = el('div', 'fi-marcador');
      [0, 1].forEach((t) => marcador.append(el('span', t === v.equipoTurno ? 'dibuja' : '', `Equipo ${t ? 'azul' : 'rojo'} (${Array.from({ length: v.n }, (_, j) => j).filter((j) => j % 2 === t).map(ctx.nombre).join(', ')}): ${v.puntos[t]}`)));
      const estado = el('p', 'turno');
      zona.append(cab, marcador, estado);
      if (v.fase === 'listo') {
        estado.textContent = describo ? 'Te toca describir. Cuando estés listo…' : `Va a describir ${ctx.nombre(v.describe)} (equipo ${v.equipoTurno ? 'azul' : 'rojo'})`;
        if (describo) { estado.classList.add('mio'); const f = el('div', 'fila centro'); f.append(boton('▶ Empezar (60 s)', () => ctx.enviar({ tipo: 'empezar' }), 'oro')); zona.append(f); }
      } else if (v.fase === 'jugando') {
        estado.textContent = describo ? '¡Describe! Sin decir la palabra ni las prohibidas' : nuestro ? `¡Adivina lo que describe ${ctx.nombre(v.describe)}!` : `Vigila a ${ctx.nombre(v.describe)}: si dice una prohibida, ¡pita!`;
        if (describo || nuestro) estado.classList.add('mio');
        if (v.carta) {
          const t = el('div', 'tb-carta'); t.append(el('b', null, v.carta[0].toUpperCase())); const ul = el('ul'); for (const p of v.carta[1]) ul.append(el('li', null, p)); t.append(ul); zona.append(t);
        }
        // los botones se crean una vez por turno (con cada intento escrito llega una vista nueva)
        const k = `${v.turnoN}|${describo}|${nuestro}`;
        if (k !== claveAcc) {
          claveAcc = k; acciones = el('div', 'fila centro');
          if (describo) acciones.append(boton('✔ Acertada', () => ctx.enviar({ tipo: 'acierto' }), 'oro'), boton('Pasar', () => ctx.enviar({ tipo: 'pasar' }), 'mini flojo'));
          if (!nuestro && yo >= 0) acciones.append(boton('📣 ¡Tabú!', () => ctx.enviar({ tipo: 'tabu' }), 'rojo'));
        }
        zona.append(acciones);
        if (describo || (nuestro && !describo)) {
          if (!campo) campo = crearCampo();
          campo.i.placeholder = describo ? 'Escribe una pista (opcional si estáis juntos)' : '¿Qué es? Escríbelo';
          campo.enviar = (texto) => ctx.enviar({ tipo: describo ? 'pista' : 'adivinar', texto });
          zona.append(campo.f);
        }
      } else if (v.fase === 'pausa') {
        estado.textContent = `Fin del turno: ${v.cuentaTurno.aciertos} aciertos, ${v.cuentaTurno.tabus} tabús, ${v.cuentaTurno.pasadas} pasadas`;
        if (yo >= 0 && !v.ganadores) { const f = el('div', 'fila centro'); f.append(boton('Siguiente turno', () => ctx.enviar({ tipo: 'seguir' }), 'mini')); zona.append(f); }
      }
      const feed = el('div', 'dj-feed tb-feed');
      for (const m of v.feed) {
        const p = el('p', m.tipo === 'acierto' ? 'acierto' : m.tipo === 'tabu' ? 'tabu' : m.tipo === 'pista' ? 'sistema' : '');
        p.append(el('b', null, ctx.nombre(m.j) + ' '));
        p.append(document.createTextNode(m.tipo === 'pista' ? `💬 ${m.texto}` : m.tipo === 'intento' ? m.texto : m.tipo === 'acierto' ? `✔ «${m.palabra}»` : m.tipo === 'tabu' ? `📣 ¡Tabú! «${m.palabra}»${m.extra ? ' (' + m.extra + ')' : ''}` : `⏭ pasa «${m.palabra}»`));
        feed.append(p);
      }
      requestAnimationFrame(() => { feed.scrollTop = feed.scrollHeight; });
      zona.append(feed);
    },
  };
})();
