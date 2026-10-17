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

test('textos legales y página 404 propia', async () => {
  const { server, io: srv, port } = await start({ port: 0 });
  try {
    const base = `http://127.0.0.1:${port}`;
    for (const p of ['aviso', 'privacidad', 'cookies']) {
      const r = await fetch(`${base}/legal/${p}`);
      assert.equal(r.status, 200, p);
      assert.match(await r.text(), /David Sánchez Belda/);
    }
    const r = await fetch(`${base}/no-existe`);
    assert.equal(r.status, 404);
    assert.match(await r.text(), /Aquí no hay nada/);
    // todas las miniaturas existen
    for (const j of CATALOGO) assert.equal((await fetch(`${base}/img/juegos/${j.id}.svg`)).status, 200, j.id);
  } finally { srv.close(); server.close(); }
});

test('las páginas piden CSS, JS e imágenes con versión y no se guardan en caché', async () => {
  const { server, io: srv, port } = await start({ port: 0 });
  try {
    const base = `http://127.0.0.1:${port}`;
    for (const p of ['/', '/j/brisca', '/legal/cookies', '/no-existe']) {
      const r = await fetch(base + p);
      const t = await r.text();
      assert.equal(r.headers.get('cache-control'), 'no-cache', p);
      assert.ok(!t.includes('__V__'), `${p}: queda __V__ sin sustituir`);
      const refs = [...t.matchAll(/(?:href|src)="(\/[^"]+\.(?:css|js|svg))(\?v=[0-9a-f]{10})?"/g)];
      assert.ok(refs.length >= 3, p);
      for (const [, url, v] of refs) assert.ok(v, `${p}: ${url} sin ?v=`);
    }
    const css = await fetch(base + '/style.css?v=x');
    assert.match(css.headers.get('cache-control'), /immutable/);
  } finally { srv.close(); server.close(); }
});
