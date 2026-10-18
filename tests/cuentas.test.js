'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { io } = require('socket.io-client');
const { start } = require('../server');

// cliente HTTP con su propio «tarro» de cookies
function navegador(base) {
  const tarro = {};
  const cookie = () => Object.entries(tarro).map(([k, v]) => `${k}=${v}`).join('; ');
  const guardar = (r) => { for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const [k, v] = kv.split('='); if (v) tarro[k] = v; else delete tarro[k]; } };
  return {
    tarro, cookie,
    async get(p) { const r = await fetch(base + p, { headers: { cookie: cookie() } }); guardar(r); return r; },
    async post(p, cuerpo, extra = {}) {
      const r = await fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json', cookie: cookie(), ...extra }, body: JSON.stringify(cuerpo) });
      guardar(r); return r.json();
    },
  };
}

test('crear cuenta, entrar, salir, cambiar contraseña y borrarla', async () => {
  const { server, io: srv, port } = await start({ baseDatos: ':memory:', port: 0 });
  const base = `http://127.0.0.1:${port}`;
  try {
    const a = navegador(base);
    await a.get('/');
    assert.equal((await a.post('/api/cuenta/registro', { nombre: 'Ana', clave: 'una-clave-buena' })).ok, false, 'sin aceptar normas');
    assert.match((await a.post('/api/cuenta/registro', { nombre: 'A', clave: 'una-clave-buena', acepto: true })).error, /3 a 16/);
    assert.match((await a.post('/api/cuenta/registro', { nombre: 'Ana', clave: '12345678', acepto: true })).error, /más usadas/);
    assert.ok((await a.post('/api/cuenta/registro', { nombre: 'Ana', clave: 'una-clave-buena', acepto: true })).ok);
    assert.ok(a.tarro.games_sesion, 'deja la cookie de sesión');
    let yo = await (await a.get('/api/cuenta')).json();
    assert.equal(yo.usuario.nombre, 'Ana');
    const b = navegador(base);
    assert.match((await b.post('/api/cuenta/registro', { nombre: 'ana', clave: 'otra-clave-buena', acepto: true })).error, /ya existe/);
    assert.equal((await b.post('/api/cuenta/entrar', { nombre: 'ANA', clave: 'mal' })).ok, false);
    assert.ok((await b.post('/api/cuenta/entrar', { nombre: 'ANA', clave: 'una-clave-buena' })).ok);
    // CSRF: otro origen o sin JSON → rechazado
    const r = await fetch(base + '/api/cuenta/salir', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://malo.example', cookie: b.cookie() }, body: '{}' });
    assert.equal(r.status, 403);
    const r2 = await fetch(base + '/api/cuenta/salir', { method: 'POST', headers: { 'content-type': 'text/plain', cookie: b.cookie() }, body: '{}' });
    assert.equal(r2.status, 415);
    assert.ok((await b.post('/api/cuenta/salir', {})).ok);
    assert.equal((await (await b.get('/api/cuenta')).json()).usuario, null);
    // avatar, favoritos y récords
    assert.ok((await a.post('/api/cuenta/avatar', { avatar: 3 })).ok);
    assert.ok((await a.post('/api/favorito', { juego: 'brisca', on: true })).ok);
    assert.equal((await a.post('/api/favorito', { juego: 'no-existe', on: true })).ok, false);
    assert.ok((await a.post('/api/record', { juego: 'serpiente', valor: 12 })).nuevo);
    assert.equal((await a.post('/api/record', { juego: 'serpiente', valor: 3 })).nuevo, false);
    assert.ok((await a.post('/api/record', { juego: 'memoria-facil', valor: 20 })).nuevo);
    assert.ok((await a.post('/api/record', { juego: 'memoria-facil', valor: 14 })).nuevo, 'en memoria, menos es mejor');
    yo = await (await a.get('/api/cuenta')).json();
    assert.deepEqual(yo.favoritos, ['brisca']);
    assert.equal(yo.records.serpiente, 12);
    assert.equal(yo.usuario.avatar, 3);
    // descarga de datos
    const d = await (await a.get('/api/cuenta/datos')).json();
    assert.equal(d.cuenta.nombre, 'Ana');
    assert.ok(!JSON.stringify(d).includes('hash'));
    // cambiar contraseña cierra las sesiones
    assert.equal((await a.post('/api/cuenta/clave', { actual: 'mal', nueva: 'nueva-clave-1' })).ok, false);
    assert.ok((await a.post('/api/cuenta/clave', { actual: 'una-clave-buena', nueva: 'nueva-clave-1' })).ok);
    assert.equal((await (await a.get('/api/cuenta')).json()).usuario, null);
    assert.ok((await a.post('/api/cuenta/entrar', { nombre: 'Ana', clave: 'nueva-clave-1' })).ok);
    // borrar la cuenta
    assert.equal((await a.post('/api/cuenta/borrar', { clave: 'mal' })).ok, false);
    assert.ok((await a.post('/api/cuenta/borrar', { clave: 'nueva-clave-1' })).ok);
    assert.equal((await (await a.get('/api/cuenta')).json()).usuario, null);
    assert.equal((await a.post('/api/cuenta/entrar', { nombre: 'Ana', clave: 'nueva-clave-1' })).ok, false);
  } finally { srv.close(); server.close(); }
});

test('cinco fallos bloquean la cuenta 15 minutos', async () => {
  const { server, io: srv, port, cuentas } = await start({ baseDatos: ':memory:', port: 0 });
  try {
    await cuentas.registrar('Berto', 'secreto-largo-9');
    for (let i = 0; i < 5; i++) assert.equal((await cuentas.entrar('Berto', 'mal')).ok, false);
    const r = await cuentas.entrar('Berto', 'secreto-largo-9');
    assert.match(r.error, /Demasiados intentos/);
  } finally { srv.close(); server.close(); }
});

test('en las salas se juega con el nombre de la cuenta, nadie más puede usarlo y se apuntan las partidas', async () => {
  const { server, io: srv, port, cuentas } = await start({ baseDatos: ':memory:', port: 0, retardoCpu: 0 });
  const base = `http://127.0.0.1:${port}`;
  try {
    const a = navegador(base);
    await a.get('/');
    await a.post('/api/cuenta/registro', { nombre: 'Carla', clave: 'secreto-largo-8', acepto: true });
    const sa = io(base, { transports: ['websocket'], extraHeaders: { cookie: a.cookie() }, forceNew: true });
    let ultima = null, yo = null;
    sa.on('sala', (v) => { ultima = v; }); sa.on('yo', (y) => { yo = y; });
    await new Promise((ok) => sa.on('connect', ok));
    const pedir = (s, ev, d = {}) => new Promise((ok) => s.emit(ev, d, ok));
    await new Promise((ok) => setTimeout(ok, 30));
    assert.equal(yo.nombre, 'Carla'); assert.equal(yo.cuenta, true);
    // un invitado no puede ponerse «carla»
    const b = navegador(base); await b.get('/');
    const sb = io(base, { transports: ['websocket'], extraHeaders: { cookie: b.cookie() }, forceNew: true });
    await new Promise((ok) => sb.on('connect', ok));
    assert.match((await pedir(sb, 'hola', { nombre: 'carla' })).error, /es de una cuenta/);
    sb.close();
    // partida contra la CPU hasta el final
    await pedir(sa, 'crear', { juego: 'cuatro' });
    await pedir(sa, 'cpu', { nivel: 'normal' });
    await pedir(sa, 'empezar');
    for (let n = 0; n < 60 && ultima.fase === 'juego'; n++) {
      if (ultima.partida.turno === ultima.yo) {
        const col = [3, 2, 4, 1, 5, 0, 6].find((c) => ultima.partida.tablero[0][c] < 0);
        await pedir(sa, 'accion', { tipo: 'soltar', col });
      }
      await new Promise((ok) => setTimeout(ok, 5));
    }
    assert.equal(ultima.fase, 'fin');
    const p = cuentas.perfil(1);
    assert.equal(p.estadisticas[0].juego, 'cuatro');
    assert.equal(p.estadisticas[0].partidas, 1);
    assert.equal(ultima.asientos[0].avatar, p.usuario.avatar);
    sa.close();
  } finally { srv.close(); server.close(); }
});

test('amigos: solicitud, aceptar, mensajes en directo, invitación a la sala y bloqueo', async () => {
  const { server, io: srv, port } = await start({ baseDatos: ':memory:', port: 0, retardoCpu: 0 });
  const base = `http://127.0.0.1:${port}`;
  try {
    const a = navegador(base), b = navegador(base);
    await a.get('/'); await b.get('/');
    await a.post('/api/cuenta/registro', { nombre: 'Lucia', clave: 'girasol-azul-77', acepto: true });
    await b.post('/api/cuenta/registro', { nombre: 'Mario', clave: 'tortuga-roja-33', acepto: true });
    const sb = io(base, { transports: ['websocket'], extraHeaders: { cookie: b.cookie() }, forceNew: true });
    const avisos = []; sb.on('social', (d) => avisos.push(d));
    await new Promise((ok) => sb.on('connect', ok));
    assert.equal((await a.post('/api/social/enviar', { id: 2, texto: 'hola' })).ok, false, 'sin ser amigos no se escribe');
    assert.match((await a.post('/api/social/solicitar', { nombre: 'nadie' })).error, /No hay nadie/);
    assert.ok((await a.post('/api/social/solicitar', { nombre: 'mario' })).ok);
    await new Promise((ok) => setTimeout(ok, 50));
    assert.ok(avisos.some((x) => x.tipo === 'amistad'), 'a Mario le llega el aviso');
    let sbd = await (await b.get('/api/social')).json();
    assert.equal(sbd.amigos[0].estado, 'recibida');
    assert.ok((await b.post('/api/social/aceptar', { id: 1 })).ok);
    const lu = await (await a.get('/api/social')).json();
    assert.equal(lu.amigos[0].estado, 'amigo'); assert.equal(lu.amigos[0].conectado, true, 'Mario está conectado');
    assert.ok((await a.post('/api/social/enviar', { id: 2, texto: '¿Echamos una brisca?' })).ok);
    await new Promise((ok) => setTimeout(ok, 50));
    assert.ok(avisos.some((x) => x.tipo === 'mensaje' && x.mensaje.texto === '¿Echamos una brisca?'));
    sbd = await (await b.get('/api/social')).json(); assert.equal(sbd.noLeidos[1], 1);
    const chat = await (await b.get('/api/social/chat/1')).json(); assert.equal(chat.mensajes.length, 1);
    assert.equal((await (await b.get('/api/social')).json()).noLeidos[1], undefined, 'leído al abrir la conversación');
    // invitar: solo desde una sala de verdad
    assert.match((await a.post('/api/social/invitar', { id: 2 })).error, /sala/);
    const sa = io(base, { transports: ['websocket'], extraHeaders: { cookie: a.cookie() }, forceNew: true });
    await new Promise((ok) => sa.on('connect', ok));
    const r = await new Promise((ok) => sa.emit('crear', { juego: 'brisca' }, ok));
    assert.ok(r.ok);
    const inv = await a.post('/api/social/invitar', { id: 2 });
    assert.ok(inv.ok); assert.equal(inv.mensaje.juego, 'brisca'); assert.equal(inv.mensaje.sala.length, 4);
    // bloquear: deja de ser amigo y no puede escribir ni pedir amistad
    assert.ok((await b.post('/api/social/bloquear', { id: 1, on: true })).ok);
    assert.equal((await a.post('/api/social/enviar', { id: 2, texto: 'eh' })).ok, false);
    assert.equal((await a.post('/api/social/solicitar', { nombre: 'Mario' })).ok, false);
    const datos = await (await a.get('/api/cuenta/datos')).json();
    assert.ok(datos.social.mensajes.length >= 2, 'la descarga de datos incluye los mensajes');
    sa.close(); sb.close();
  } finally { srv.close(); server.close(); }
});
