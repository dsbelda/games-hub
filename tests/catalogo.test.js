'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { CATALOGO } = require('../lib/catalogo');
const { start } = require('../server');

test('el catálogo es coherente', () => {
  const ids = new Set();
  for (const j of CATALOGO) {
    assert.ok(!ids.has(j.id), `id repetido: ${j.id}`); ids.add(j.id);
    assert.ok(['cartas', 'tablero', 'dibujo', 'habilidad', 'casino', 'rol'].includes(j.tipo), j.id);
    assert.ok(['rapido', 'medio', 'largo'].includes(j.duracion), j.id);
    assert.ok(j.jugadores[0] >= 1 && j.jugadores[1] >= j.jugadores[0], j.id);
    assert.ok(j.modo.length && j.modo.every((m) => ['solo', 'amigos', 'cpu'].includes(m)), j.id);
    if (j.estado === 'listo') assert.ok(j.url, `${j.id} listo sin url`);
  }
  assert.ok(!CATALOGO.some((j) => /\buno\b/i.test(j.nombre)), 'Uno es marca de Mattel');
});

test('el servidor sirve portada, catálogo y healthz', async () => {
  const { server, port } = await start({ port: 0 });
  try {
    const base = `http://127.0.0.1:${port}`;
    assert.equal((await fetch(base + '/healthz')).status, 200);
    assert.equal((await fetch(base + '/')).status, 200);
    const d = await (await fetch(base + '/api/juegos')).json();
    assert.equal(d.length, CATALOGO.length);
  } finally { server.close(); }
});
