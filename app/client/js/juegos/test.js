'use strict';
// Test imposible: preguntas trampa. Lee bien, desconfía de todo y no te fíes de los botones.
// 3 vidas y un comodín para saltar una pregunta. Récord: la pregunta a la que llegas.
window.JUEGO = {
  montar(raiz) {
    const { el, boton } = UI;
    // tipo: normal (ok = índice correcto) · pequeno (gana el botón más pequeño) · tiempo (s segundos) · esperar (no tocar nada)
    //       letra (pulsar una letra del enunciado) · escribir (teclear) · colores · ordenar (pulsar en orden) · casiTodas (vale todo menos una)
    const P = [
      { q: '¿Cuántos meses tienen 28 días?', o: ['Uno', 'Todos', 'Febrero', 'Depende del año'], ok: 1 },
      { q: 'Pulsa la respuesta correcta.', o: ['La respuesta correcta', 'Esta no', 'Esta tampoco', 'Ninguna'], ok: 0 },
      { q: '¿De qué color era el caballo blanco de Santiago?', o: ['Marrón', 'Negro', 'Blanco', 'Pinto'], ok: 2 },
      { q: '¿Qué pesa más: un kilo de paja o un kilo de hierro?', o: ['El hierro', 'La paja', 'Pesan lo mismo', 'Depende de la paja'], ok: 2 },
      { q: 'Pulsa el botón más pequeño.', tipo: 'pequeno', o: ['ESTE', 'Este', 'este', 'este'], ok: 3 },
      { q: '¡Rápido! ¿Cuánto es 7 × 8?', tipo: 'tiempo', s: 4, o: ['54', '56', '58', '63'], ok: 1 },
      { q: 'Un gallo pone un huevo en lo alto de un tejado. ¿Hacia qué lado cae?', o: ['Izquierda', 'Derecha', 'Rueda hasta el canalón', 'Los gallos no ponen huevos'], ok: 3 },
      { q: '¿Cuántos animales de cada especie metió Moisés en el arca?', o: ['Dos', 'Uno', 'Siete', 'Ninguno, fue Noé'], ok: 3 },
      { q: '¿Qué hay en medio de París?', o: ['La torre Eiffel', 'El Sena', 'La letra R', 'Un croissant'], ok: 2 },
      { q: 'No toques nada durante cinco segundos.', tipo: 'esperar', s: 5, o: ['¡Toca aquí!', 'Siguiente', 'Ya está', 'Socorro'] },
      { q: '¿Cuánto es 2 + 2 × 2?', o: ['8', '6', '4', '22'], ok: 1 },
      { q: 'Un tren eléctrico va hacia el norte y el viento sopla hacia el sur. ¿Hacia dónde va el humo?', o: ['Al sur', 'Al norte', 'Hacia arriba', 'No echa humo'], ok: 3 },
      { q: '¿Qué palabra se escribe siempre incorrectamente?', o: ['Bien', 'Mal', 'Incorrectamente', 'Ninguna'], ok: 2 },
      { q: 'Pulsa la letra Ñ de esta pregunta. Sí, la de «España».', tipo: 'letra', letra: 'ñ', o: ['Ñ', 'ñ', 'N', 'Eñe'] },
      { q: 'Entras a oscuras en una casa con una vela, una chimenea y un farol. Solo tienes una cerilla. ¿Qué enciendes primero?', o: ['La vela', 'La chimenea', 'El farol', 'La cerilla'], ok: 3 },
      { q: '¿Cuántas letras tiene «el alfabeto»?', o: ['27', '26', '10', '11'], ok: 2 },
      { q: 'Si me tienes, quieres compartirme. Si me compartes, ya no me tienes. ¿Qué soy?', o: ['Un bocadillo', 'Un secreto', 'La wifi', 'Un resfriado'], ok: 1 },
      { q: 'Estás en una carrera y adelantas al segundo. ¿En qué posición vas?', o: ['Primero', 'Segundo', 'Tercero', 'Último'], ok: 1 },
      { q: 'Pulsa el botón VERDE.', tipo: 'colores', o: [['VERDE', '#ff5a36'], ['ROJO', '#3fbf5f'], ['AZUL', '#ffc63d'], ['AMARILLO', '#4d7cfe']], ok: 1 },
      { q: '¿Cuántas veces puedes restarle 5 a 25?', o: ['5', '4', 'Una', 'Infinitas'], ok: 2 },
      { q: 'Escribe «patata» al revés.', tipo: 'escribir', resp: 'atatap' },
      { q: '¿Cuántos huevos puedes comer en ayunas?', o: ['Ninguno', 'Uno', 'Dos', 'Los que quieras'], ok: 1 },
      { q: '¿Qué tiene dientes pero no muerde?', o: ['Un tiburón dormido', 'Un peine', 'Tu abuela', 'Una cremallera… y un peine'], ok: 1 },
      { q: 'Pulsa los botones en orden: 1, 2, 3, 4.', tipo: 'ordenar', o: ['3', '1', '4', '2'] },
      { q: 'Si adelantas al último, ¿en qué posición vas?', o: ['Último', 'Penúltimo', 'No se puede adelantar al último', 'Primero'], ok: 2 },
      { q: '¡Bomba! ¿Cuántos lados tiene un círculo?', tipo: 'tiempo', s: 5, o: ['Ninguno', 'Uno', 'Infinitos', 'Dos: dentro y fuera'], ok: 3 },
      { q: 'Un avión se estrella justo en la frontera entre España y Portugal. ¿Dónde entierran a los supervivientes?', o: ['En España', 'En Portugal', 'En la frontera', 'A los supervivientes no se les entierra'], ok: 3 },
      { q: '¿Qué número sigue? 1, 11, 21, 1211, 111221, …', o: ['1112221', '312211', '122111', '211211'], ok: 1 },
      { q: 'Pulsa la respuesta que NO sea la última.', o: ['Esta', 'O esta', 'O esta otra', 'Esta no'], tipo: 'casiTodas', mal: 3 },
      { q: 'Última pregunta. ¿Te ha gustado el test?', tipo: 'casiTodas', o: ['Sí', 'Mucho', 'Muchísimo', 'No'], mal: 3 },
    ];
    const caja = el('div', 'solo test');
    raiz.replaceChildren(caja);
    let n, vidas, comodin, reloj, record = UI.leer('test', 0), orden;
    function nueva() { n = 0; vidas = 3; comodin = true; pregunta(); }
    function fallo() {
      clearInterval(reloj); vidas--;
      caja.classList.remove('temblor'); void caja.offsetWidth; caja.classList.add('temblor');
      if (navigator.vibrate) navigator.vibrate(80);
      if (vidas <= 0) return fin(false);
      UI.aviso(['¡Nooo!', '¡Casi!', 'Ejem…', '¿Seguro que has leído bien?'][Math.floor(Math.random() * 4)], 'mal');
      pregunta();
    }
    function acierto() { clearInterval(reloj); n++; if (n > record) { record = n; UI.guardar('test', record); } Cuenta.record('test', n); if (n >= P.length) return fin(true); pregunta(); }
    function fin(ganado) {
      clearInterval(reloj);
      caja.replaceChildren();
      const p = el('div', 'panel tq-fin');
      p.append(el('h2', null, ganado ? '¡Lo has conseguido!' : 'Fin del test'), el('p', null, ganado ? 'Has superado el test imposible. Ahora pásaselo a alguien y ríete.' : `Has llegado a la pregunta ${n + 1} de ${P.length}.`), el('p', 'suave', `Récord: ${record} preguntas`), boton('Volver a empezar', () => nueva(), 'oro'));
      if (ganado) Confeti(200);
      caja.append(p);
    }
    function pregunta() {
      const q = P[n];
      caja.replaceChildren();
      const cab = el('div', 'tq-cab');
      cab.append(el('span', 'etiqueta', `Pregunta ${n + 1}/${P.length}`), el('span', 'tq-vidas', '❤️'.repeat(vidas) + '🖤'.repeat(3 - vidas)));
      const texto = el('h2', 'tq-pregunta');
      if (q.tipo === 'letra') {
        [...q.q].forEach((ch) => { const s = el('span', 'tq-letra', ch); if (ch.toLowerCase() === q.letra) s.onclick = (e) => { e.stopPropagation(); acierto(); }; texto.append(s); });
      } else texto.textContent = q.q;
      const ops = el('div', 'tq-opciones');
      if (q.tipo === 'escribir') {
        const f = el('form', 'fila centro'); const i = el('input'); i.autocomplete = 'off'; i.maxLength = 30; const b = boton('Responder', null, 'oro'); b.type = 'submit'; f.append(i, b);
        f.onsubmit = (e) => { e.preventDefault(); if (i.value.trim().toLowerCase() === q.resp) acierto(); else fallo(); };
        ops.append(f); requestAnimationFrame(() => i.focus());
      } else {
        orden = 1;
        q.o.forEach((o, i) => {
          const [txt, color] = Array.isArray(o) ? o : [o, null];
          const b = boton(txt, () => {
            if (q.tipo === 'esperar' || q.tipo === 'letra') return fallo();
            if (q.tipo === 'ordenar') { if (+txt === orden) { b.disabled = true; orden++; if (orden > 4) acierto(); } else fallo(); return; }
            if (q.tipo === 'casiTodas') return i === q.mal ? fallo() : acierto();
            if (q.tipo === 'pequeno') return i === q.ok ? acierto() : fallo();
            return i === q.ok ? acierto() : fallo();
          }, 'tq-op');
          if (color) { b.style.background = color; b.style.color = '#1e1b2e'; }
          if (q.tipo === 'pequeno') b.style.fontSize = ['26px', '18px', '14px', '9px'][i];
          ops.append(b);
        });
      }
      const pie = el('div', 'fila centro');
      if (comodin) pie.append(boton('🃏 Comodín: saltar', () => { comodin = false; acierto(); }, 'mini flojo'));
      caja.append(cab, texto, ops, pie);
      // reloj: bomba o espera
      if (q.tipo === 'tiempo' || q.tipo === 'esperar') {
        let quedan = q.s;
        const bomba = el('div', 'tq-bomba' + (q.tipo === 'esperar' ? ' espera' : ''), `${q.tipo === 'tiempo' ? '💣' : '⏳'} ${quedan}`);
        caja.insertBefore(bomba, ops);
        reloj = setInterval(() => { quedan--; bomba.textContent = `${q.tipo === 'tiempo' ? '💣' : '⏳'} ${quedan}`; if (quedan <= 0) { clearInterval(reloj); if (q.tipo === 'tiempo') fallo(); else acierto(); } }, 1000);
      }
    }
    nueva();
  },
};
