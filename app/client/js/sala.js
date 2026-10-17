'use strict';
// Vestíbulo y sala de los juegos multijugador: apodo → crear/unirse → sala de espera → partida → revancha.
// El juego concreto (window.JUEGO) solo dibuja la partida: JUEGO.render(contenedor, partida, ctx).
(() => {
  const { el, boton, aviso } = UI;
  const JID = window.FICHA.id;
  const raiz = document.getElementById('raiz');
  const sock = io({ transports: ['websocket', 'polling'] });
  const est = { yo: null, sala: undefined, publicas: [], conectado: false };
  const pedir = (ev, d = {}) => new Promise((ok) => sock.emit(ev, d, (r) => { if (r && r.ok === false && r.error) aviso(r.error); ok(r || {}); }));
  const enviar = (a) => pedir('accion', a);
  const paramSala = new URLSearchParams(location.search).get('sala');
  let intentoUnirse = !!paramSala;

  sock.on('connect', () => { est.conectado = true; pedir('lista', { juego: JID }).then((r) => { est.publicas = r.salas || []; pintar(); }); });
  sock.on('disconnect', () => { est.conectado = false; pintar(); });
  sock.on('connect_error', () => aviso('Sin conexión con el servidor; reintentando…'));
  sock.on('yo', (y) => { est.yo = y; pintar(); });
  sock.on('salas', (l) => { est.publicas = l; if (!est.sala && !document.activeElement?.matches('input')) pintar(); });
  sock.on('sala', async (s) => {
    if (s && s.juego !== JID) { location.href = `/j/${s.juego}?sala=${s.code}`; return; }
    est.sala = s;
    if (!s && intentoUnirse && est.yo?.nombre) { intentoUnirse = false; await pedir('unirse', { code: paramSala }); return; }
    pintar();
  });

  // --- pantallas -----------------------------------------------------------------------------
  function pintar() {
    if (est.sala === undefined || est.yo === null) { raiz.replaceChildren(el('p', 'suave centro', 'Conectando…')); return; }
    if (!est.yo.nombre) return pantallaApodo();
    if (!est.sala) return pantallaVestibulo();
    if (est.sala.fase === 'espera') return pantallaEspera();
    return pantallaPartida();
  }

  function pantallaApodo() {
    const f = el('form', 'panel');
    f.append(el('h2', null, '¿Cómo te llamas?'), el('p', 'suave', 'Solo es un apodo para la partida. Sin cuentas ni contraseñas.'));
    const normas = el('p', 'suave'); const an = el('a', null, 'normas'); an.href = '/legal/aviso'; an.target = '_blank';
    normas.append('Al jugar aceptas las ', an, ' (sé majo en el chat).');
    const i = el('input'); i.maxLength = 16; i.placeholder = 'Tu apodo'; i.autocomplete = 'nickname'; i.required = true; i.minLength = 2;
    i.value = UI.leer('apodo', '');
    f.append(i, normas, boton('Entrar', null, 'oro'));
    f.lastChild.type = 'submit';
    f.onsubmit = async (e) => { e.preventDefault(); const r = await pedir('hola', { nombre: i.value }); if (r.ok) UI.guardar('apodo', i.value.trim()); };
    raiz.replaceChildren(f);
    i.focus();
  }

  async function jugarYaCpu() {
    const r = await pedir('crear', { juego: JID, publica: false });
    if (!r.ok) return;
    const n = { cuatro: 1, brisca: 1, unidad: 3 }[JID] || 1;
    for (let k = 0; k < n; k++) await pedir('cpu', { nivel: UI.leer('nivel', 'normal') });
    await pedir('empezar');
  }

  function pantallaVestibulo() {
    const c = el('div', 'vestibulo');
    const a = el('section', 'panel');
    a.append(el('h2', null, `Hola, ${est.yo.nombre}`), el('p', 'suave', window.FICHA.descripcion));
    const nivel = el('select'); nivel.setAttribute('aria-label', 'Nivel de la CPU');
    for (const [v, t] of [['normal', 'CPU normal'], ['dificil', 'CPU difícil']]) { const o = el('option', null, t); o.value = v; nivel.append(o); }
    nivel.value = UI.leer('nivel', 'normal'); nivel.onchange = () => UI.guardar('nivel', nivel.value);
    const fila = el('div', 'fila');
    fila.append(boton('Jugar ya contra la CPU', jugarYaCpu, 'oro'), nivel);
    const pub = el('label', 'check'); const cb = el('input'); cb.type = 'checkbox'; cb.checked = true; pub.append(cb, ' Que salga en la lista de salas');
    const fila2 = el('div', 'fila');
    fila2.append(boton('Crear sala para amigos', () => pedir('crear', { juego: JID, publica: cb.checked })), pub);
    const f = el('form', 'fila');
    const code = el('input'); code.placeholder = 'Código'; code.maxLength = 4; code.size = 6; code.setAttribute('aria-label', 'Código de sala'); code.autocapitalize = 'characters';
    f.append(code, boton('Unirse'));
    f.lastChild.type = 'submit';
    f.onsubmit = (e) => { e.preventDefault(); if (code.value.trim()) pedir('unirse', { code: code.value.trim() }); };
    a.append(fila, fila2, el('h3', null, 'Tengo un código'), f);
    const b = el('section', 'panel');
    b.append(el('h2', null, 'Salas abiertas'));
    if (!est.publicas.length) b.append(el('p', 'suave', 'Ahora mismo no hay ninguna. ¡Crea tú una!'));
    for (const s of est.publicas) {
      const r = el('div', 'fila sala-pub');
      r.append(el('span', 'grow', `Sala de ${s.anfitrion} · ${s.jugadores}/${s.max}`), boton('Entrar', () => pedir('unirse', { code: s.code })));
      b.append(r);
    }
    const cambiar = boton(`Cambiar apodo (${est.yo.nombre})`, () => { est.yo = { nombre: null }; pintar(); }, 'flojo');
    c.append(a, b, cambiar);
    raiz.replaceChildren(c);
  }

  function listaAsientos(s, editable) {
    const ul = el('ol', 'asientos');
    s.asientos.forEach((a, i) => {
      const li = el('li', a.conectado ? '' : 'desconectado');
      li.append(el('span', 'grow', `${a.anfitrion ? '👑 ' : ''}${a.bot ? '🤖 ' : ''}${a.nombre}${a.bot && !a.sustituto ? ` (${a.nivel === 'dificil' ? 'difícil' : 'normal'})` : ''}${a.sustituto ? ' (le sustituye la CPU)' : ''}${i === s.yo ? ' · tú' : ''}${!a.conectado ? ' · desconectado' : ''}`));
      if (editable) {
        if (i > 0) li.append(boton('↑', () => pedir('mover', { i, dir: -1 }), 'mini'));
        if (i < s.asientos.length - 1) li.append(boton('↓', () => pedir('mover', { i, dir: 1 }), 'mini'));
        if (i !== s.yo) li.append(boton('✕', () => pedir('quitar', { i }), 'mini'));
      }
      ul.append(li);
    });
    return ul;
  }

  function pantallaEspera() {
    const s = est.sala;
    const c = el('div', 'vestibulo');
    const a = el('section', 'panel');
    const enlace = `${location.origin}/j/${JID}?sala=${s.code}`;
    a.append(el('h2', null, 'Sala de espera'), el('p', 'codigo', s.code));
    a.append(el('p', 'suave', 'Pasa este enlace a tus amigos:'));
    const fe = el('div', 'fila');
    const inp = el('input'); inp.readOnly = true; inp.value = enlace; inp.className = 'grow'; inp.setAttribute('aria-label', 'Enlace de invitación');
    fe.append(inp, boton('Copiar', () => { navigator.clipboard?.writeText(enlace).then(() => aviso('Enlace copiado'), () => inp.select()); }));
    a.append(fe);
    a.append(el('h3', null, `Jugadores (${s.asientos.length}/${s.max})`), listaAsientos(s, s.soyAnfitrion));
    if (JID === 'brisca' && s.asientos.length === 4) a.append(el('p', 'suave', 'A cuatro se juega por parejas: 1.º y 3.º contra 2.º y 4.º. Usa las flechas para cambiar las parejas.'));
    if (s.soyAnfitrion) {
      const f = el('div', 'fila');
      if (s.asientos.length < s.max) { f.append(boton('+ CPU normal', () => pedir('cpu', { nivel: 'normal' })), boton('+ CPU difícil', () => pedir('cpu', { nivel: 'dificil' }))); }
      a.append(f);
      const listo = s.asientos.length >= s.min;
      const emp = boton(listo ? 'Empezar partida' : `Faltan jugadores (mínimo ${s.min})`, () => pedir('empezar'), 'oro');
      emp.disabled = !listo;
      a.append(emp);
    } else a.append(el('p', 'suave', 'Esperando a que el anfitrión empiece…'));
    a.append(boton('Salir de la sala', () => pedir('salir'), 'flojo'));
    c.append(a, panelChat(s));
    raiz.replaceChildren(c);
  }

  function panelChat(s) {
    const box = el('section', 'panel chat');
    box.append(el('h3', null, 'Chat'));
    const log = el('div', 'chat-log');
    for (const m of s.chat.slice(-40)) { const p = el('p'); p.append(el('b', null, m.nombre + ': '), document.createTextNode(m.texto)); log.append(p); }
    const f = el('form', 'fila');
    const i = el('input'); i.className = 'grow'; i.maxLength = 200; i.placeholder = 'Escribe…'; i.setAttribute('aria-label', 'Mensaje');
    f.append(i, boton('Enviar')); f.lastChild.type = 'submit';
    f.onsubmit = (e) => { e.preventDefault(); if (i.value.trim()) { pedir('chat', { texto: i.value }); i.value = ''; } };
    box.append(log, f);
    requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });
    return box;
  }

  let chatAbierto = false;
  function pantallaPartida() {
    const s = est.sala;
    // conservar lo que se esté escribiendo en el chat al repintar
    const activo = document.activeElement;
    const borrador = activo && activo.closest?.('.chat') ? activo.value : null;
    const c = el('div', 'partida');
    const zona = el('section', 'zona');
    const ctx = {
      yo: s.yo, asientos: s.asientos, fase: s.fase, resultado: s.resultado, enviar,
      nombre: (i) => (s.asientos[i] ? s.asientos[i].nombre : '?'),
    };
    window.JUEGO.render(zona, s.partida, ctx);
    if (s.fase === 'fin') zona.append(panelFin(s));
    const lado = el('aside', 'lado' + (chatAbierto ? ' abierto' : ''));
    const jug = el('section', 'panel');
    jug.append(el('h3', null, `Sala ${s.code}`), listaAsientos(s, false));
    const salir = boton('Salir', () => { if (s.fase === 'fin' || confirmar()) pedir('salir'); }, 'flojo mini');
    jug.append(salir);
    lado.append(jug, panelChat(s));
    const toggle = boton(chatAbierto ? 'Ocultar chat' : `Chat (${s.chat.length})`, () => { chatAbierto = !chatAbierto; pintar(); }, 'toggle-chat');
    c.append(zona, toggle, lado);
    raiz.replaceChildren(c);
    if (borrador !== null) { const i = raiz.querySelector('.chat input'); i.value = borrador; i.focus(); }
  }
  // sin ventanas del navegador: confirmación en dos pulsaciones
  let confirmarHasta = 0;
  function confirmar() {
    if (Date.now() < confirmarHasta) return true;
    confirmarHasta = Date.now() + 3000;
    aviso('Pulsa «Salir» otra vez para dejar la partida (te sustituirá la CPU)');
    return false;
  }

  function panelFin(s) {
    const r = s.resultado;
    const p = el('div', 'panel fin');
    const gano = r.ganadores.includes(s.yo);
    p.append(el('h2', null, !r.ganadores.length ? 'Empate' : gano ? '¡Has ganado!' : `Gana ${r.ganadores.map((i) => s.asientos[i]?.nombre).join(' y ')}`));
    p.append(el('p', 'suave', r.texto));
    const f = el('div', 'fila');
    if (s.soyAnfitrion) f.append(boton('Revancha', () => pedir('empezar'), 'oro'));
    else f.append(el('span', 'suave', 'El anfitrión puede pedir la revancha.'));
    f.append(boton('Salir', () => pedir('salir'), 'flojo'));
    p.append(f);
    return p;
  }

  pintar();
})();
