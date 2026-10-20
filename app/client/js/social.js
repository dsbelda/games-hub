'use strict';
// Parte social (solo con cuenta): botón 👥 en la cabecera con lo pendiente, panel lateral con amigos,
// solicitudes y chat privado, y avisos en directo (mensajes, solicitudes, invitaciones a una sala).
(() => {
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const post = window.Cuenta.post;
  const get = (u) => fetch(u, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ ok: false }));
  const boton = (txt, fn, cls = '') => { const b = el('button', 'btn ' + cls, txt); b.type = 'button'; b.onclick = fn; return b; };
  const hace = (t) => { const s = (Date.now() - t) / 1000; return s < 3600 ? 'hace un rato' : s < 86400 ? `hace ${Math.floor(s / 3600)} h` : `hace ${Math.floor(s / 86400)} d`; };
  let datos = { amigos: [], noLeidos: {}, bloqueados: [] }, abierto = false, chatCon = null, mensajes = [], yo = null;
  const sock = window.io({ transports: ['websocket', 'polling'] });

  // --- botón de la cabecera ---
  const btn = el('button', 'so-btn'); btn.type = 'button'; btn.setAttribute('aria-label', 'Amigos y mensajes'); btn.title = 'Amigos y mensajes';
  btn.append(el('span', null, '👥'), el('b', 'so-insignia'));
  btn.onclick = () => (abierto ? cerrar() : abrir());
  const hueco = document.querySelector('.top .cuenta-hueco');
  if (hueco) hueco.before(btn);
  const pendientes = () => Object.values(datos.noLeidos).reduce((s, n) => s + n, 0) + datos.amigos.filter((a) => a.estado === 'recibida').length;
  function insignia() { const n = pendientes(); const b = btn.querySelector('.so-insignia'); b.textContent = n ? String(n > 9 ? '9+' : n) : ''; b.hidden = !n; }

  // --- panel ---
  const panel = el('aside', 'so-panel'); panel.setAttribute('aria-label', 'Amigos'); panel.hidden = true;
  const fondo = el('div', 'so-fondo'); fondo.hidden = true; fondo.onclick = () => cerrar();
  document.body.append(fondo, panel);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && abierto) cerrar(); });
  function abrir(conId) { abierto = true; panel.hidden = false; fondo.hidden = false; requestAnimationFrame(() => panel.classList.add('abierto')); if (conId !== undefined) chatCon = conId; pintar(); if (chatCon !== null) cargarChat(); else cargar(); }
  // con el panel abierto, se refresca quién está conectado y a qué juega
  setInterval(() => { if (abierto && chatCon === null && !document.hidden) cargar(); }, 30000);
  function cerrar() { abierto = false; panel.classList.remove('abierto'); fondo.hidden = true; setTimeout(() => { if (!abierto) panel.hidden = true; }, 250); }
  async function cargar() { const r = await get('/api/social'); if (r.ok) datos = r; insignia(); if (abierto && chatCon === null) pintar(); window.dispatchEvent(new Event('social-cambio')); }
  async function cargarChat() { const r = await get(`/api/social/chat/${chatCon}`); if (r.ok) { mensajes = r.mensajes; datos.noLeidos[chatCon] = 0; insignia(); pintar(); } }
  const amigo = (id) => datos.amigos.find((a) => a.id === id);
  function estadoTexto(a) { if (a.jugando) return `🎮 ${a.jugando.fase === 'espera' ? 'En la sala de' : 'Jugando a'} ${a.jugando.nombre}`; if (a.conectado) return '🟢 Conectado'; return `Visto ${hace(a.visto)}`; }
  function avatar(a) { const i = el('img', 'px so-av'); i.src = window.Cuenta.avatarUrl(a.avatar); i.alt = ''; i.width = 32; i.height = 32; return i; }

  function pintar() {
    if (!abierto) return;
    panel.replaceChildren();
    const cab = el('div', 'so-cab');
    if (chatCon !== null && amigo(chatCon)) {
      const a = amigo(chatCon);
      cab.append(boton('←', () => { chatCon = null; pintar(); }, 'mini flojo'), avatar(a), el('b', null, a.nombre), el('small', 'so-estado', estadoTexto(a)));
      panel.append(cab, chat(a));
      return;
    }
    cab.append(el('h2', null, 'Amigos'), boton('✕', cerrar, 'mini flojo so-cerrar'));
    panel.append(cab);
    // añadir
    const f = el('form', 'fila so-anadir'); const i = el('input', 'grow'); i.placeholder = 'Nombre de usuario de tu amigo'; i.maxLength = 16; i.autocomplete = 'off';
    const b = el('button', 'btn oro mini', 'Añadir'); b.type = 'submit'; f.append(i, b);
    f.onsubmit = async (e) => { e.preventDefault(); if (!i.value.trim()) return; const r = await post('/api/social/solicitar', { nombre: i.value.trim() }); if (r.ok) { window.Avisar(r.aceptada ? '¡Ya sois amigos!' : `Solicitud enviada a ${r.nombre}`, 'bien'); i.value = ''; cargar().then(pintar); } else window.Avisar(r.error, 'mal'); };
    panel.append(f);
    const recibidas = datos.amigos.filter((a) => a.estado === 'recibida'), enviadas = datos.amigos.filter((a) => a.estado === 'enviada'), amigos = datos.amigos.filter((a) => a.estado === 'amigo');
    if (recibidas.length) {
      panel.append(el('h3', null, `Solicitudes (${recibidas.length})`));
      for (const a of recibidas) { const fila = el('div', 'so-fila'); fila.append(avatar(a), el('b', 'grow', a.nombre), boton('Aceptar', async () => { const r = await post('/api/social/aceptar', { id: a.id }); if (r.ok) { window.Avisar(`¡${a.nombre} y tú ya sois amigos!`, 'bien'); window.Confeti?.(40); } cargar().then(pintar); }, 'mini oro'), boton('Rechazar', async () => { await post('/api/social/quitar', { id: a.id }); cargar().then(pintar); }, 'mini flojo')); panel.append(fila); }
    }
    panel.append(el('h3', null, `Tus amigos (${amigos.length})`));
    if (!amigos.length) panel.append(el('p', 'suave', 'Aún no tienes amigos aquí. Pídele a alguien su nombre de usuario y añádelo arriba.'));
    const orden = [...amigos].sort((x, y) => (y.conectado ? 1 : 0) - (x.conectado ? 1 : 0) || x.nombre.localeCompare(y.nombre));
    for (const a of orden) {
      const fila = el('button', 'so-fila so-amigo' + (a.conectado ? ' en-linea' : '')); fila.type = 'button';
      const txt = el('span', 'grow'); txt.append(el('b', null, a.nombre), el('small', null, estadoTexto(a)));
      fila.append(avatar(a), txt);
      const n = datos.noLeidos[a.id]; if (n) fila.append(el('i', 'so-n', String(n)));
      fila.onclick = () => { chatCon = a.id; mensajes = []; pintar(); cargarChat(); };
      panel.append(fila);
    }
    if (enviadas.length) {
      panel.append(el('h3', null, 'Solicitudes enviadas'));
      for (const a of enviadas) { const fila = el('div', 'so-fila'); fila.append(avatar(a), el('span', 'grow', a.nombre), boton('Cancelar', async () => { await post('/api/social/quitar', { id: a.id }); cargar().then(pintar); }, 'mini flojo')); panel.append(fila); }
    }
    if (datos.bloqueados.length) {
      panel.append(el('h3', null, 'Bloqueados'));
      for (const x of datos.bloqueados) { const fila = el('div', 'so-fila'); fila.append(el('span', 'grow', x.nombre), boton('Desbloquear', async () => { await post('/api/social/bloquear', { id: x.id, on: false }); cargar().then(pintar); }, 'mini flojo')); panel.append(fila); }
    }
  }
  function burbuja(m) {
    const mio = m.de !== chatCon;
    const d = el('div', 'so-msg' + (mio ? ' mio' : ''));
    d.append(el('p', null, m.texto));
    if (m.juego && m.sala) { const a = el('a', 'btn mini oro', mio ? `Invitación a la sala ${m.sala}` : '▶ Unirme a la partida'); a.href = `/j/${m.juego}?sala=${m.sala}`; d.append(a); }
    if (!mio) { const x = el('button', 'denunciar', '⚑ Denunciar'); x.type = 'button'; x.onclick = () => window.Denunciar({ quien: amigo(chatCon)?.nombre || '', texto: m.texto, enviar: (motivo) => post('/api/social/denunciar', { id: m.id, motivo }) }); d.append(x); }
    d.append(el('small', null, new Date(m.fecha).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })));
    return d;
  }
  let lista = null;
  function chat(a) {
    const caja = el('div', 'so-chat');
    lista = el('div', 'so-mensajes');
    if (!mensajes.length) lista.append(el('p', 'suave', `Escribe a ${a.nombre}. Solo vosotros dos veis esta conversación.`));
    for (const m of mensajes) lista.append(burbuja(m));
    const f = el('form', 'fila so-escribir'); const i = el('input', 'grow'); i.maxLength = 500; i.placeholder = 'Escribe un mensaje…'; i.autocomplete = 'off';
    const b = el('button', 'btn oro mini', 'Enviar'); b.type = 'submit'; f.append(i, b);
    f.onsubmit = async (e) => { e.preventDefault(); if (!i.value.trim()) return; const t = i.value; i.value = ''; const r = await post('/api/social/enviar', { id: a.id, texto: t }); if (!r.ok) { window.Avisar(r.error, 'mal'); i.value = t; } };
    const mas = el('div', 'fila so-opciones');
    if (window.Social.puedeInvitar()) mas.append(boton('🎮 Invitar a mi sala', () => window.Social.invitar(a.id), 'mini'));
    if (a.jugando) { const l = el('a', 'btn mini oro', a.jugando.fase === 'espera' ? '➡ Unirme a su sala' : '👁 Mirar su partida'); l.href = `/j/${a.jugando.juego}?${a.jugando.fase === 'espera' ? 'sala' : 'mirar'}=${a.jugando.code}`; mas.append(l); }
    mas.append(boton('Eliminar amigo', async () => { if (mas.dataset.seguro !== 'q') { mas.dataset.seguro = 'q'; window.Avisar('Pulsa otra vez para eliminarlo'); return; } await post('/api/social/quitar', { id: a.id }); chatCon = null; cargar().then(pintar); }, 'mini flojo'),
      boton('Bloquear', async () => { if (mas.dataset.seguro !== 'b') { mas.dataset.seguro = 'b'; window.Avisar('Pulsa otra vez para bloquearlo: dejará de ser tu amigo y no podrá escribirte'); return; } await post('/api/social/bloquear', { id: a.id, on: true }); chatCon = null; cargar().then(pintar); }, 'mini flojo'));
    caja.append(lista, f, mas);
    requestAnimationFrame(() => { lista.scrollTop = lista.scrollHeight; i.focus(); });
    return caja;
  }
  // aviso con botón (invitaciones y mensajes)
  function avisoGrande(texto, accion, etiqueta) {
    const t = el('div', 'so-toast'); t.append(el('p', null, texto));
    if (accion) { const b = typeof accion === 'string' ? el('a', 'btn mini oro', etiqueta) : boton(etiqueta, () => { t.remove(); accion(); }, 'mini oro'); if (typeof accion === 'string') b.href = accion; t.append(b); }
    const x = boton('✕', () => t.remove(), 'mini flojo'); t.append(x);
    document.body.append(t);
    setTimeout(() => t.classList.add('sale'), 9000); setTimeout(() => t.remove(), 9400);
  }
  sock.on('social', async (d) => {
    if (d.tipo === 'mensaje') {
      const m = d.mensaje;
      if (abierto && chatCon === m.de) { mensajes.push(m); lista?.append(burbuja(m)); if (lista) lista.scrollTop = lista.scrollHeight; get(`/api/social/chat/${m.de}`); return; }
      datos.noLeidos[m.de] = (datos.noLeidos[m.de] || 0) + 1; insignia();
      if (m.juego) avisoGrande(`🎮 ${d.nombre} te invita a jugar`, `/j/${m.juego}?sala=${m.sala}`, 'Unirme');
      else avisoGrande(`💬 ${d.nombre}: ${m.texto.slice(0, 80)}`, () => abrir(m.de), 'Responder');
      return;
    }
    if (d.tipo === 'enviado') { if (abierto && chatCon === d.mensaje.para) { mensajes.push(d.mensaje); lista?.append(burbuja(d.mensaje)); if (lista) lista.scrollTop = lista.scrollHeight; } return; }
    const antes = new Set(datos.amigos.filter((a) => a.estado === 'recibida').map((a) => a.id));
    await cargar();
    if (d.tipo === 'amistad') { const nueva = datos.amigos.find((a) => a.estado === 'recibida' && !antes.has(a.id)); if (nueva) avisoGrande(`👋 ${nueva.nombre} quiere ser tu amigo`, () => abrir(null), 'Ver'); }
    if (d.tipo === 'aceptada') { const a = amigo(d.de); if (a) avisoGrande(`🤝 ${a.nombre} ha aceptado tu solicitud`); }
    if (abierto) pintar();
  });
  sock.on('connect', cargar);

  window.Social = {
    abrir,
    // invitar a la sala en la que estoy (sala.js lo hace disponible con Social.salaActual)
    puedeInvitar: () => !!window.Social.salaActual,
    async invitar(id) { const r = await post('/api/social/invitar', { id }); window.Avisar(r.ok ? `Invitación enviada a ${amigo(id)?.nombre || 'tu amigo'}` : r.error, r.ok ? 'bien' : 'mal'); },
    amigosConectados: () => datos.amigos.filter((a) => a.estado === 'amigo' && a.conectado),
    salaActual: null,
  };
  cargar();
  void yo;
})();
