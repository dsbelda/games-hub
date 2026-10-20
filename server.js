'use strict';
// Portal de juegos: Express (catálogo y estáticos) + Socket.IO (salas de los juegos multijugador).
// Un solo proceso: las salas viven en memoria (un reinicio corta las partidas en curso).
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const express = require('express');
const { Server } = require('socket.io');
const { CATALOGO } = require('./lib/catalogo');
const JUEGOS = require('./lib/juegos');
const { Salas } = require('./lib/salas');
const { Cuentas } = require('./lib/cuentas');
const { Social } = require('./lib/social');
const { Moderacion } = require('./lib/moderacion');

const COOKIE = 'games_id';
const SESION = 'games_sesion';
const ID_RE = /^[a-f0-9]{48}$/;
const CLIENTE = path.join(__dirname, 'app', 'client');

// Versión de los ficheros del cliente (hash de su contenido): las páginas piden style.css?v=VERSION, así que
// cada despliegue cambia las URLs y ni el navegador ni Cloudflare (que fuerza 4 h de caché) sirven lo viejo.
function versionCliente(dir) {
  const h = crypto.createHash('sha1');
  const recorrer = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) recorrer(p); else { h.update(p); h.update(fs.readFileSync(p)); }
  } };
  recorrer(dir);
  return h.digest('hex').slice(0, 10);
}
const LEGALES = new Set(['aviso', 'privacidad', 'cookies']);
// límite por IP: `max` intentos cada `ms`
function limitePorIp(max, ms) {
  const m = new Map();
  return (ip) => {
    const ahora = Date.now();
    const l = (m.get(ip) || []).filter((t) => ahora - t < ms);
    if (l.length >= max) { m.set(ip, l); return false; }
    l.push(ahora); m.set(ip, l);
    if (m.size > 5000) for (const [k, v] of m) if (!v.some((t) => ahora - t < ms)) m.delete(k);
    return true;
  };
}

function parseCookie(header = '') {
  const out = {};
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}
// cubo de fichas: `max` de golpe y `perSec` de recarga
function cubo(max, perSec) {
  let fichas = max, ultima = Date.now();
  return () => {
    const ahora = Date.now();
    fichas = Math.min(max, fichas + ((ahora - ultima) / 1000) * perSec);
    ultima = ahora;
    if (fichas < 1) return false;
    fichas--;
    return true;
  };
}

function start({ port = 3400, host = '127.0.0.1', retardoCpu = 700, baseDatos = path.join(__dirname, 'data', 'games.db') } = {}) {
  const cuentas = new Cuentas(baseDatos);
  const social = new Social(cuentas.db);
  const mod = new Moderacion(cuentas.db);
  social.silenciado = (uid) => mod.silenciadoHasta(Moderacion.clave(uid));
  const app = express();
  app.set('trust proxy', false);
  app.disable('x-powered-by');
  const server = http.createServer(app);
  const io = new Server(server, { maxHttpBufferSize: 20000, pingInterval: 25000, pingTimeout: 20000 });

  const sockets = new Map(); // id -> Set de sockets
  const conectado = (id) => (sockets.get(id)?.size || 0) > 0;
  const salas = new Salas({
    juegos: JUEGOS, retardoCpu, conectado, alCambiar: (s) => repartir(s),
    alEvento: (sala, ev) => { for (const a of sala.asientos) if (!a.bot) emitir(a.id, 'evento', ev); for (const id of sala.espectadores) emitir(id, 'evento', ev); },
    reservado: (n) => cuentas.existe(n),
    silenciado: (id) => mod.silenciadoHasta(Moderacion.clave(salas.jugadores.get(id)?.usuario?.id, id)),
    alTerminar: (sala) => sala.asientos.forEach((a, i) => {
      const u = !a.bot && salas.jugadores.get(a.id)?.usuario;
      if (u) cuentas.apuntarPartida(u.id, sala.juego, sala.resultado.ganadores.includes(i));
    }),
  });
  const emitir = (id, ev, d) => { for (const s of sockets.get(id) || []) s.emit(ev, d); };
  // --- parte social: sockets por cuenta, presencia y avisos ---
  const porUsuario = new Map(); // id de cuenta -> Set de sockets
  const avisarUsuario = (uid, d) => io.to('u:' + uid).emit('social', d);
  const NOMBRE_JUEGO = Object.fromEntries(CATALOGO.map((j) => [j.id, j.nombre]));
  function presencia(uid) {
    const conectado = (porUsuario.get(uid)?.size || 0) > 0;
    let jugando = null;
    for (const p of salas.jugadores.values()) {
      if (p.usuario?.id !== uid || !p.sala) continue;
      const s = salas.salas.get(p.sala); if (s && !p.mirando) jugando = { juego: s.juego, nombre: NOMBRE_JUEGO[s.juego], fase: s.fase, code: s.code };
    }
    return { conectado, jugando };
  }
  const avisarAmigos = (uid) => { for (const a of social.amigos(uid)) if (a.estado === 'amigo') avisarUsuario(a.id, { tipo: 'presencia', id: uid }); };
  function repartir(sala) {
    for (const a of sala.asientos) if (!a.bot || a.sustituto) emitir(a.id, 'sala', salas.vista(sala, a.id));
    for (const id of sala.espectadores) emitir(id, 'sala', salas.vista(sala, id));
  }
  const listas = (juego) => io.to('lista:' + juego).emit('salas', salas.lista(juego));
  const reloj = setInterval(() => salas.tick(), 1000); // también mueve los relojes de los juegos
  reloj.unref();
  // juegos en tiempo real: 30 pasos por segundo y una foto cada 50 ms (20 por segundo)
  let pasos = 0;
  const rapido = setInterval(() => { pasos++; salas.tickRapido(1 / 30, pasos % 3 !== 0); }, 1000 / 30);
  rapido.unref();
  cuentas.limpiar();
  social.limpiarViejos();
  mod.limpiar();
  setInterval(() => { cuentas.limpiar(); social.limpiarViejos(); mod.limpiar(); }, 86400000).unref();

  // --- HTTP --------------------------------------------------------------------------------
  app.use((req, res, next) => {
    res.set({
      'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    });
    next();
  });
  // identidad: cookie aleatoria, sin cuentas
  app.use((req, res, next) => {
    if (!ID_RE.test(parseCookie(req.headers.cookie)[COOKIE] || '')) {
      const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
      res.append('Set-Cookie', `${COOKIE}=${crypto.randomBytes(24).toString('hex')}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`);
    }
    next();
  });
  const V = versionCliente(CLIENTE);
  const paginas = new Map();
  const html = (res, fichero, estado = 200) => {
    if (!paginas.has(fichero)) paginas.set(fichero, fs.readFileSync(path.join(CLIENTE, fichero), 'utf8').replaceAll('__V__', V));
    res.status(estado).set('Cache-Control', 'no-cache').type('html').send(paginas.get(fichero));
  };
  app.get('/healthz', (req, res) => res.type('text').send('ok'));
  app.get('/api/juegos', (req, res) => res.set('Cache-Control', 'no-cache').json(CATALOGO));
  const listos = new Set(CATALOGO.filter((j) => j.estado === 'listo' && !j.externo).map((j) => j.id));
  app.get('/', (req, res) => html(res, 'index.html'));
  app.get('/cuenta', (req, res) => html(res, 'cuenta.html'));
  app.get('/j/:juego', (req, res, next) => (listos.has(req.params.juego) ? html(res, 'juego.html') : next()));
  app.get('/legal/:pagina', (req, res, next) => (LEGALES.has(req.params.pagina) ? html(res, `legal/${req.params.pagina}.html`) : next()));

  // --- cuentas ---------------------------------------------------------------------------------
  const ipDe = (req) => (['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) && req.headers['x-real-ip']) || req.socket.remoteAddress;
  const limAlta = limitePorIp(5, 3600000);
  const limEntrar = limitePorIp(20, 15 * 60000);
  const limApi = limitePorIp(120, 60000);
  const api = express.Router();
  api.use(express.json({ limit: '4kb' }));
  // contra CSRF: solo JSON y, si el navegador dice de dónde viene, que sea de este mismo dominio
  api.use((req, res, next) => {
    if (req.method !== 'GET') {
      if (!req.is('application/json')) return res.status(415).json({ ok: false, error: 'Formato no válido' });
      const o = req.headers.origin;
      if (o && o.replace(/^https?:\/\//, '') !== req.headers.host) return res.status(403).json({ ok: false, error: 'Origen no permitido' });
      if (!limApi(ipDe(req))) return res.status(429).json({ ok: false, error: 'Vas demasiado rápido' });
    }
    req.token = parseCookie(req.headers.cookie)[SESION];
    req.usuario = cuentas.usuarioDeSesion(req.token);
    res.set('Cache-Control', 'no-store');
    next();
  });
  const cookieSesion = (req, res, token, maxAge) => {
    const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
    res.append('Set-Cookie', `${SESION}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`);
  };
  const conCuenta = (fn) => async (req, res) => {
    if (!req.usuario) return res.status(401).json({ ok: false, error: 'Tienes que entrar con tu cuenta' });
    try { res.json(await fn(req)); } catch (e) { console.error('[cuentas]', e); res.status(500).json({ ok: false, error: 'Error interno' }); }
  };
  api.get('/cuenta', (req, res) => res.json(req.usuario ? { ok: true, ...cuentas.perfil(req.usuario.id) } : { ok: true, usuario: null }));
  api.post('/cuenta/registro', async (req, res) => {
    if (req.body.acepto !== true) return res.json({ ok: false, error: 'Tienes que aceptar las normas y la política de privacidad' });
    if (!limAlta(ipDe(req))) return res.status(429).json({ ok: false, error: 'Demasiadas cuentas nuevas desde tu conexión. Prueba más tarde' });
    const r = await cuentas.registrar(req.body.nombre, req.body.clave);
    if (!r.ok) return res.json(r);
    const s = cuentas.crearSesion(r.id);
    cookieSesion(req, res, s.token, s.maxAge);
    console.log('[cuentas] alta', r.id);
    res.json({ ok: true, codigos: cuentas.generarCodigos(r.id) }); // se enseñan una sola vez
  });
  api.post('/cuenta/entrar', async (req, res) => {
    if (!limEntrar(ipDe(req))) return res.status(429).json({ ok: false, error: 'Demasiados intentos. Espera unos minutos' });
    const r = await cuentas.entrar(req.body.nombre, req.body.clave);
    if (!r.ok) return res.json(r);
    const s = cuentas.crearSesion(r.id);
    cookieSesion(req, res, s.token, s.maxAge);
    res.json({ ok: true });
  });
  // recuperar la contraseña con un código de un solo uso (sin correo)
  api.post('/cuenta/recuperar', async (req, res) => {
    if (!limEntrar(ipDe(req))) return res.status(429).json({ ok: false, error: 'Demasiados intentos. Espera unos minutos' });
    const r = await cuentas.recuperar(req.body.nombre, req.body.codigo, req.body.nueva);
    if (!r.ok) return res.json(r);
    const s = cuentas.crearSesion(r.id);
    cookieSesion(req, res, s.token, s.maxAge);
    console.log('[cuentas] contraseña recuperada', r.id);
    res.json({ ok: true, quedan: r.quedan });
  });
  api.post('/cuenta/codigos', conCuenta(async (req) => {
    if (!limEntrar(ipDe(req))) return { ok: false, error: 'Demasiados intentos. Espera unos minutos' };
    const u = cuentas.db.prepare('SELECT nombre FROM usuarios WHERE id = ?').get(req.usuario.id);
    const r = await cuentas.entrar(u.nombre, req.body.clave);
    if (!r.ok) return { ok: false, error: 'La contraseña no es correcta' };
    return { ok: true, codigos: cuentas.generarCodigos(req.usuario.id) };
  }));
  api.post('/cuenta/salir', (req, res) => { cuentas.cerrarSesion(req.token); cookieSesion(req, res, '', 0); res.json({ ok: true }); });
  api.post('/cuenta/avatar', conCuenta((req) => cuentas.avatar(req.usuario.id, req.body.avatar)));
  api.post('/cuenta/clave', conCuenta(async (req) => {
    if (!limEntrar(ipDe(req))) return { ok: false, error: 'Demasiados intentos. Espera unos minutos' };
    return cuentas.cambiarClave(req.usuario.id, req.body.actual, req.body.nueva);
  }));
  api.post('/cuenta/borrar', conCuenta(async (req) => {
    if (!limEntrar(ipDe(req))) return { ok: false, error: 'Demasiados intentos. Espera unos minutos' };
    const r = await cuentas.borrar(req.usuario.id, req.body.clave);
    if (r.ok) console.log('[cuentas] baja', req.usuario.id);
    return r;
  }));
  api.get('/cuenta/datos', (req, res) => {
    if (!req.usuario) return res.status(401).json({ ok: false, error: 'Tienes que entrar con tu cuenta' });
    res.set('Content-Disposition', 'attachment; filename="mis-datos-dsbelda-games.json"').json({ ...cuentas.datos(req.usuario.id), social: social.datos(req.usuario.id) });
  });
  // --- amigos, mensajes e invitaciones ---
  const conAviso = (fn) => conCuenta((req) => { const r = fn(req); if (r.ok && r.para) { avisarUsuario(r.para, { tipo: r.aceptada ? 'aceptada' : 'amistad', de: req.usuario.id }); avisarUsuario(req.usuario.id, { tipo: 'amistad' }); } return r; });
  const idDe = (v) => (Number.isInteger(Number(v)) ? Number(v) : -1);
  api.get('/social', conCuenta((req) => {
    const yo = req.usuario.id;
    return { ok: true, amigos: social.amigos(yo).map((a) => ({ ...a, ...(a.estado === 'amigo' ? presencia(a.id) : {}) })), noLeidos: social.noLeidos(yo), bloqueados: social.bloqueados(yo) };
  }));
  api.post('/social/solicitar', conAviso((req) => social.solicitar(req.usuario.id, req.body.nombre)));
  api.post('/social/aceptar', conAviso((req) => social.aceptar(req.usuario.id, idDe(req.body.id))));
  api.post('/social/quitar', conAviso((req) => social.quitar(req.usuario.id, idDe(req.body.id))));
  api.post('/social/bloquear', conCuenta((req) => social.bloquear(req.usuario.id, idDe(req.body.id), req.body.on !== false)));
  api.get('/social/chat/:id', conCuenta((req) => { const r = { ok: true, mensajes: social.conversacion(req.usuario.id, idDe(req.params.id), req.query.antes) }; avisarUsuario(req.usuario.id, { tipo: 'leidos' }); return r; }));
  const entregar = (req, r) => { if (r.ok) { avisarUsuario(r.mensaje.para, { tipo: 'mensaje', mensaje: r.mensaje, nombre: req.usuario.nombre }); avisarUsuario(req.usuario.id, { tipo: 'enviado', mensaje: r.mensaje }); } return r; };
  api.post('/social/denunciar', conCuenta((req) => {
    const m = social.mensajeRecibido(req.usuario.id, req.body.id);
    if (!m) return { ok: false, error: 'No encuentro ese mensaje' };
    return mod.denunciar({ deUsuario: req.usuario.id, deIdentidad: '', contraNombre: m.nombre, contraUsuario: m.de, contexto: 'privado', texto: m.texto, motivo: String(req.body.motivo) });
  }));
  api.post('/social/enviar', conCuenta((req) => entregar(req, social.enviar(req.usuario.id, idDe(req.body.id), req.body.texto))));
  api.post('/social/invitar', conCuenta((req) => {
    // solo se invita a la sala en la que estás de verdad
    const s = salas.salaDe(parseCookie(req.headers.cookie)[COOKIE]);
    if (!s) return { ok: false, error: 'Tienes que estar en una sala para invitar' };
    return entregar(req, social.enviar(req.usuario.id, idDe(req.body.id), `¡Te invito a jugar a ${NOMBRE_JUEGO[s.juego]}!`, { juego: s.juego, sala: s.code }));
  }));
  api.post('/favorito', conCuenta((req) => (CATALOGO.some((j) => j.id === req.body.juego) ? cuentas.favorito(req.usuario.id, req.body.juego, !!req.body.on) : { ok: false, error: 'Ese juego no existe' })));
  api.post('/record', conCuenta((req) => cuentas.record(req.usuario.id, String(req.body.juego), req.body.valor)));
  app.use('/api', api);

  // con ?v= la URL cambia en cada versión: se puede guardar un año
  app.use(express.static(CLIENTE, { index: false, setHeaders: (res, f) => {
    if (f.endsWith('.html')) res.set('Cache-Control', 'no-cache');
    else res.set('Cache-Control', 'public, max-age=31536000, immutable');
  } }));
  app.use((req, res) => html(res, '404.html', 404));

  // --- Socket.IO ---------------------------------------------------------------------------
  io.use((sock, next) => {
    const id = parseCookie(sock.handshake.headers.cookie)[COOKIE];
    if (!ID_RE.test(id || '')) return next(new Error('sin identidad'));
    sock.data.id = id;
    sock.data.usuario = cuentas.usuarioDeSesion(parseCookie(sock.handshake.headers.cookie)[SESION]);
    next();
  });
  io.on('connection', (sock) => {
    const id = sock.data.id;
    if (!sockets.has(id)) sockets.set(id, new Set());
    sockets.get(id).add(sock);
    salas.identificar(id, sock.data.usuario);
    const uid = sock.data.usuario?.id;
    if (uid) {
      sock.join('u:' + uid);
      if (!porUsuario.has(uid)) porUsuario.set(uid, new Set());
      const era = porUsuario.get(uid).size; porUsuario.get(uid).add(sock);
      if (!era) avisarAmigos(uid);
      sock.on('disconnect', () => { const set = porUsuario.get(uid); set?.delete(sock); if (set && !set.size) { porUsuario.delete(uid); avisarAmigos(uid); } });
    }
    const permitido = cubo(60, 30); // trazos del dibujo y teclas de los juegos en tiempo real llegan seguidos
    const on = (ev, fn) => sock.on(ev, (d, cb) => {
      if (typeof cb !== 'function') cb = () => {};
      if (!permitido()) return cb({ ok: false, error: 'Vas demasiado rápido' });
      try { fn(d ?? {}, cb); } catch (e) { console.error('[socket]', ev, e); cb({ ok: false, error: 'Error interno' }); }
    });
    const enviarEstado = () => {
      const p = salas.jugadores.get(id);
      sock.emit('yo', { nombre: p ? p.nombre : null, cuenta: !!p?.usuario, avatar: p?.usuario?.avatar });
      const s = salas.salaDe(id);
      sock.emit('sala', s ? salas.vista(s, id) : null);
    };
    enviarEstado();
    const s0 = salas.salaDe(id); if (s0) repartir(s0); // los demás ven que ha vuelto

    on('hola', (d, cb) => { const r = salas.hola(id, d.nombre); cb(r); if (r.ok) enviarEstado(); });
    on('lista', (d, cb) => {
      if (!JUEGOS[d.juego]) return cb({ ok: false });
      for (const r of sock.rooms) if (r.startsWith('lista:')) sock.leave(r);
      sock.join('lista:' + d.juego);
      cb({ ok: true, salas: salas.lista(d.juego) });
    });
    on('crear', (d, cb) => {
      const r = salas.crear(id, d.juego, { publica: d.publica !== false });
      cb(r.ok ? { ok: true, code: r.sala.code } : r);
      if (r.ok) { enviarEstado(); listas(d.juego); }
    });
    const tras = (fn) => (d, cb) => {
      const antes = salas.salaDe(id);
      const r = fn(d);
      cb(r);
      const s = salas.salaDe(id);
      if (!s) sock.emit('sala', null);
      if (antes && antes !== s) { repartir(antes); listas(antes.juego); }
      if (s) listas(s.juego);
    };
    on('unirse', tras((d) => salas.unirse(id, d.code)));
    // mirar: salas públicas, o privadas si hay un amigo tuyo sentado
    on('mirar', tras((d) => {
      const s = salas.salas.get(String(d.code || '').toUpperCase());
      const uid = sock.data.usuario?.id;
      const amigo = !!uid && !!s && s.asientos.some((a) => { const u = !a.bot && salas.jugadores.get(a.id)?.usuario; return u && social.sonAmigos(uid, u.id); });
      return salas.mirar(id, d.code, !!s && (s.publica || amigo));
    }));
    on('enCurso', (d, cb) => cb({ ok: !!JUEGOS[d.juego], partidas: JUEGOS[d.juego] ? salas.partidasEnCurso(d.juego) : [] }));
    on('denunciar', (d, cb) => {
      const s = salas.salaDe(id), m = s && s.chat.find((x) => x.n === Number(d.n));
      if (!m) return cb({ ok: false, error: 'No encuentro ese mensaje' });
      const autor = salas.jugadores.get(m.de);
      cb(mod.denunciar({ deUsuario: sock.data.usuario?.id, deIdentidad: id, contraNombre: m.nombre, contraUsuario: autor?.usuario?.id, contraIdentidad: m.de, contexto: 'sala', sala: s.code, texto: m.texto, motivo: String(d.motivo) }));
    });
    on('salir', tras(() => salas.salir(id)));
    on('cpu', tras((d) => salas.anadirCpu(id, d.nivel)));
    on('quitar', tras((d) => {
      const r = salas.quitar(id, Number(d.i));
      if (r.expulsado) emitir(r.expulsado, 'sala', null);
      return r;
    }));
    on('mover', tras((d) => salas.mover(id, Number(d.i), Number(d.dir))));
    on('empezar', tras(() => salas.empezar(id)));
    on('accion', (d, cb) => cb(salas.accion(id, d)));
    on('chat', (d, cb) => cb(salas.chat(id, d.texto)));

    sock.on('disconnect', () => {
      const set = sockets.get(id);
      set.delete(sock);
      if (!set.size) { sockets.delete(id); const s = salas.salaDe(id); if (s) repartir(s); }
    });
  });

  server.on('close', () => { try { cuentas.db.close(); } catch (e) { /* ya cerrada */ } });
  return new Promise((resolve) => server.listen(port, host, () => resolve({ server, io, app, salas, cuentas, port: server.address().port })));
}

if (require.main === module) {
  start({ port: Number(process.env.PORT) || 3400, host: process.env.HOST || '127.0.0.1' })
    .then(({ port }) => console.log(`Portal de juegos en el puerto ${port}`));
  for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => process.exit(0));
}
module.exports = { start };
