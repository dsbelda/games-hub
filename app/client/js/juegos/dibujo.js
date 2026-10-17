'use strict';
// Dibuja y adivina: lienzo compartido. Quien dibuja manda los trazos en directo; el resto escribe abajo.
(() => {
  const { el, boton } = UI;
  const COLORES = ['#1e1b2e', '#ffffff', '#9aa0b5', '#ff5a36', '#ff9f2e', '#ffc63d', '#3fbf5f', '#18b39b', '#4d7cfe', '#8a5cf6', '#ff6fa8', '#9a5b2e'];
  const ANCHO = 1000, ALTO = 750;
  let lienzo = null, g = null, pintados = 0, turnoPintado = -1, color = 0, grosor = 1, borrador = '';
  let trazo = null, pendientes = [], envio = null, ctxActual = null;
  function crearLienzo() {
    lienzo = el('canvas', 'dj-lienzo'); lienzo.width = ANCHO; lienzo.height = ALTO;
    g = lienzo.getContext('2d'); g.lineCap = 'round'; g.lineJoin = 'round';
    limpiar();
    // dibujar (solo quien dibuja: lo comprueba el servidor y el render activa la clase)
    const punto = (e) => { const r = lienzo.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * ANCHO), Math.round((e.clientY - r.top) / r.height * ALTO)]; };
    lienzo.addEventListener('pointerdown', (e) => {
      if (!lienzo.classList.contains('puedo')) return;
      e.preventDefault(); lienzo.setPointerCapture(e.pointerId);
      const p = punto(e);
      trazo = { ultimo: p, nuevo: true };
      pendientes = [...p, ...p];
      programar();
    });
    lienzo.addEventListener('pointermove', (e) => {
      if (!trazo) return;
      const p = punto(e);
      if (Math.hypot(p[0] - trazo.ultimo[0], p[1] - trazo.ultimo[1]) < 4) return;
      // dibujo local inmediato
      g.strokeStyle = COLORES[color]; g.lineWidth = [3, 8, 18, 40][grosor];
      g.beginPath(); g.moveTo(...trazo.ultimo); g.lineTo(...p); g.stroke();
      trazo.ultimo = p; pendientes.push(...p);
      programar();
    });
    const acabar = () => { if (trazo) { enviar(); trazo = null; } };
    lienzo.addEventListener('pointerup', acabar); lienzo.addEventListener('pointercancel', acabar);
  }
  function programar() { if (!envio) envio = setTimeout(enviar, 70); }
  function enviar() {
    clearTimeout(envio); envio = null;
    if (pendientes.length < 2 || !ctxActual) return;
    ctxActual.enviar({ tipo: 'trazo', c: color, g: grosor, p: pendientes, nuevo: trazo ? trazo.nuevo : false });
    pintados++; // el nuestro ya está pintado
    if (trazo) { trazo.nuevo = false; pendientes = [...trazo.ultimo]; } else pendientes = [];
  }
  function limpiar() { g.fillStyle = '#ffffff'; g.fillRect(0, 0, ANCHO, ALTO); }
  function pintarTrazo(t) {
    g.strokeStyle = COLORES[t.c] || '#000'; g.lineWidth = t.g; g.beginPath();
    g.moveTo(t.p[0], t.p[1]);
    for (let i = 2; i < t.p.length; i += 2) g.lineTo(t.p[i], t.p[i + 1]);
    if (t.p.length === 2 || (t.p.length === 4 && t.p[0] === t.p[2] && t.p[1] === t.p[3])) { g.lineTo(t.p[0] + 0.1, t.p[1]); }
    g.stroke();
  }
  function repintarTodo(trazos) { limpiar(); trazos.forEach(pintarTrazo); pintados = trazos.length; }

  window.JUEGO = {
    evento(ev) { if (ev.tipo === 'trazo' && g) { if (ev.n === pintados + 1) { pintarTrazo(ev.t); pintados++; } else if (ev.n > pintados + 1) pintados = -1; } },
    render(zona, v, ctx) {
      ctxActual = ctx;
      const yo = ctx.yo;
      const dibujo = v.dibuja === yo;
      if (!lienzo) crearLienzo();
      // si cambia el turno o falta algún trazo, repintar desde la lista completa
      // quien dibuja no repinta mientras tiene trazos en camino (los suyos aún no han llegado al servidor)
      const enCamino = dibujo && (trazo || envio);
      if (turnoPintado !== v.turnoN || (!enCamino && pintados !== v.nTrazos)) { repintarTodo(v.trazos); turnoPintado = v.turnoN; }
      lienzo.classList.toggle('puedo', dibujo && v.fase === 'dibujar');
      const cab = el('div', 'fi-cab');
      const reloj = el('span', 'fi-reloj'); if (v.hasta) { reloj.dataset.cuentaAtras = v.hasta; reloj.dataset.texto = '⏱ {s} s'; }
      cab.append(el('span', 'etiqueta', `Turno ${v.turnoN}/${v.total}`), reloj);
      const palabra = el('div', 'dj-palabra');
      if (v.palabra) palabra.textContent = v.palabra; else if (v.pista) palabra.textContent = v.pista.split('').join(' ');
      if (v.pista && !v.palabra) palabra.append(el('small', null, ` (${v.largo} letras)`));
      const estado = el('p', 'turno' + (dibujo && v.fase !== 'finTurno' ? ' mio' : ''));
      estado.textContent = v.fase === 'elegir' ? (dibujo ? 'Elige qué vas a dibujar' : `${ctx.nombre(v.dibuja)} está eligiendo palabra…`)
        : v.fase === 'dibujar' ? (dibujo ? '¡Dibuja! (sin letras ni números)' : `Dibuja ${ctx.nombre(v.dibuja)}: ¿qué es?`)
        : v.fase === 'finTurno' ? `Era «${v.palabra}»` : '';
      const marco = el('div', 'dj-marco'); marco.append(lienzo);
      if (v.opciones) { const ops = el('div', 'dj-opciones'); v.opciones.forEach((w, i) => ops.append(boton(w, () => ctx.enviar({ tipo: 'elegir', i }), 'oro'))); marco.append(ops); }
      const herramientas = el('div', 'dj-herr');
      if (dibujo && v.fase === 'dibujar') {
        COLORES.forEach((c, i) => { const b = el('button', 'dj-color' + (i === color ? ' sel' : '')); b.type = 'button'; b.style.background = c; b.setAttribute('aria-label', `Color ${i + 1}`); b.onclick = () => { color = i; herramientas.querySelectorAll('.dj-color').forEach((x, k) => x.classList.toggle('sel', k === i)); }; herramientas.append(b); });
        [3, 8, 18, 40].forEach((px, i) => { const b = el('button', 'dj-grosor' + (i === grosor ? ' sel' : '')); b.type = 'button'; b.setAttribute('aria-label', `Grosor ${i + 1}`); const p = el('i'); p.style.width = p.style.height = `${Math.max(4, px / 2)}px`; b.append(p); b.onclick = () => { grosor = i; herramientas.querySelectorAll('.dj-grosor').forEach((x, k) => x.classList.toggle('sel', k === i)); }; herramientas.append(b); });
        herramientas.append(boton('↶', () => ctx.enviar({ tipo: 'deshacer' }), 'mini'), boton('🗑 Borrar', () => ctx.enviar({ tipo: 'borrar' }), 'mini flojo'));
      }
      // intentos y aciertos
      const feed = el('div', 'dj-feed');
      for (const m of v.feed) {
        const p = el('p', m.sistema ? 'sistema' : m.acierto ? 'acierto' : '');
        const texto = m.texto.replace(/\{(\d+)\}/g, (_, i) => ctx.nombre(+i));
        if (m.j !== undefined) p.append(el('b', null, ctx.nombre(m.j) + ' '));
        p.append(document.createTextNode(texto));
        feed.append(p);
      }
      requestAnimationFrame(() => { feed.scrollTop = feed.scrollHeight; });
      const f = el('form', 'fila');
      if (!dibujo && v.fase === 'dibujar' && !v.aciertan.includes(yo) && yo >= 0) {
        const i = el('input'); i.className = 'grow'; i.maxLength = 40; i.placeholder = 'Escribe lo que crees que es'; i.value = borrador; i.oninput = () => { borrador = i.value; };
        const b = boton('Probar', null, 'oro'); b.type = 'submit';
        f.append(i, b);
        f.onsubmit = (e) => { e.preventDefault(); if (i.value.trim()) { ctx.enviar({ tipo: 'adivinar', texto: i.value }); borrador = ''; i.value = ''; } };
        requestAnimationFrame(() => { if (!document.activeElement || document.activeElement === document.body) i.focus(); });
      }
      if (v.casi && v.fase === 'dibujar' && !v.aciertan.includes(yo)) f.append(el('span', 'dj-casi', `«${v.casi}»: ¡casi!`));
      const lado = el('div', 'dj-lado'); lado.append(feed, f);
      const marcador = el('div', 'fi-marcador');
      v.puntos.forEach((p, j) => marcador.append(el('span', v.aciertan.includes(j) ? 'acierto' : j === v.dibuja ? 'dibuja' : '', `${j === v.dibuja ? '✏️ ' : ''}${ctx.nombre(j)}: ${p}`)));
      const cuerpo = el('div', 'dj-cuerpo'); cuerpo.append(marco, lado);
      zona.append(cab, palabra, estado, cuerpo, herramientas, marcador);
      if (v.fase === 'finTurno') { const t = el('p', 'suave'); t.dataset.cuentaAtras = v.hasta; t.dataset.texto = 'Siguiente turno en {s} s'; zona.append(t); }
    },
  };
})();
