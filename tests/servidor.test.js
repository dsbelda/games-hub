'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { io } = require('socket.io-client');
const { start } = require('../server');

async function cliente(base) {
  const r = await fetch(base + '/');
  const cookie = r.headers.get('set-cookie').split(';')[0];
  const s = io(base, { transports: ['websocket'], extraHeaders: { cookie }, forceNew: true });
  s.ultima = null;
  s.on('sala', (v) => { s.ultima = v; });
  await new Promise((ok) => s.on('connect', ok));
  s.pedir = (ev, d = {}) => new Promise((ok) => s.emit(ev, d, ok));
  return s;
}
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

test('sala de Brisca con dos personas y dos CPUs hasta el final', async () => {
  const { server, io: srv, port } = await start({ baseDatos: ':memory:', port: 0, retardoCpu: 0 });
  const base = `http://127.0.0.1:${port}`;
  const a = await cliente(base), b = await cliente(base);
  try {
    assert.equal((await a.pedir('crear', { juego: 'brisca' })).ok, false, 'sin apodo no se crea');
    assert.ok((await a.pedir('hola', { nombre: 'Ana' })).ok);
    assert.ok((await b.pedir('hola', { nombre: 'Berto' })).ok);
    const { code } = await a.pedir('crear', { juego: 'brisca' });
    assert.match(code, /^[A-Z]{4}$/);
    assert.equal((await b.pedir('lista', { juego: 'brisca' })).salas[0].code, code);
    assert.ok((await b.pedir('unirse', { code })).ok);
    assert.equal((await b.pedir('cpu', { nivel: 'normal' })).ok, false, 'solo el anfitrión añade CPUs');
    assert.ok((await a.pedir('cpu', { nivel: 'dificil' })).ok);
    assert.ok((await a.pedir('cpu', {})).ok);
    assert.equal((await a.pedir('cpu', {})).ok, false, 'la sala está llena');
    assert.ok((await a.pedir('empezar')).ok);
    await espera(50);
    assert.equal(a.ultima.fase, 'juego');
    assert.equal(a.ultima.partida.mano.length, 3);
    assert.ok(!JSON.stringify(b.ultima).includes(JSON.stringify(a.ultima.partida.mano[0])) || a.ultima.partida.triunfo, 'B no ve la mano de A');
    // las dos personas juegan siempre su primera carta; las CPUs juegan solas
    for (let n = 0; n < 200 && a.ultima.fase === 'juego'; n++) {
      for (const s of [a, b]) {
        const v = s.ultima;
        if (v.fase === 'juego' && v.partida.turno === v.yo) await s.pedir('accion', { tipo: 'jugar', carta: `${v.partida.mano[0].p}-${v.partida.mano[0].n}` });
      }
      await espera(5);
    }
    assert.equal(a.ultima.fase, 'fin');
    assert.equal(a.ultima.partida.puntos.reduce((x, y) => x + y, 0), 120);
    // revancha
    assert.ok((await a.pedir('empezar')).ok);
    await espera(20);
    assert.equal(b.ultima.fase, 'juego');
  } finally { a.close(); b.close(); srv.close(); server.close(); }
});

test('quien sale en plena partida deja a la CPU y puede volver con el código', async () => {
  const { server, io: srv, port } = await start({ baseDatos: ':memory:', port: 0, retardoCpu: 0 });
  const base = `http://127.0.0.1:${port}`;
  const a = await cliente(base), b = await cliente(base);
  try {
    await a.pedir('hola', { nombre: 'Ana' }); await b.pedir('hola', { nombre: 'Berto' });
    const { code } = await a.pedir('crear', { juego: 'unidad', publica: false });
    assert.equal((await b.pedir('lista', { juego: 'unidad' })).salas.length, 0, 'las privadas no salen en la lista');
    await b.pedir('unirse', { code });
    await a.pedir('empezar');
    await b.pedir('salir');
    await espera(30);
    assert.ok(a.ultima.asientos[1].sustituto);
    assert.ok((await b.pedir('unirse', { code })).ok);
    await espera(30);
    assert.equal(a.ultima.asientos[1].sustituto, false);
    assert.equal(b.ultima.yo, 1);
  } finally { a.close(); b.close(); srv.close(); server.close(); }
});

test('las páginas de juego solo existen para juegos listos', async () => {
  const { server, io: srv, port } = await start({ baseDatos: ':memory:', port: 0 });
  const base = `http://127.0.0.1:${port}`;
  try {
    assert.equal((await fetch(base + '/j/brisca')).status, 200);
    assert.equal((await fetch(base + '/j/parchis')).status, 404);
    assert.equal((await fetch(base + '/j/catan')).status, 404);
  } finally { srv.close(); server.close(); }
});
