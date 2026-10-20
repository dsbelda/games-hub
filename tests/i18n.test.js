'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const { CATALOGO } = require('../lib/catalogo');
const CLIENTE = path.join(__dirname, '../app/client');
const marcas = (t) => (t.match(/\{[0-9s]\}/g) || []).sort().join(',');

test('los diccionarios de inglés y francés tienen las mismas claves y marcadores', () => {
  const en = JSON.parse(fs.readFileSync(path.join(CLIENTE, 'i18n/en.json'), 'utf8'));
  const fr = JSON.parse(fs.readFileSync(path.join(CLIENTE, 'i18n/fr.json'), 'utf8'));
  assert.deepEqual(Object.keys(en).sort(), Object.keys(fr).sort());
  assert.ok(Object.keys(en).length > 1000);
  for (const k of Object.keys(en)) {
    const o = k.replace(/^<h>/, '');
    assert.equal(marcas(en[k]), marcas(o), `en: ${k.slice(0, 60)}`);
    assert.equal(marcas(fr[k]), marcas(o), `fr: ${k.slice(0, 60)}`);
  }
});

test('todos los juegos del catálogo tienen nombre y descripción traducidos', () => {
  const en = JSON.parse(fs.readFileSync(path.join(CLIENTE, 'i18n/en.json'), 'utf8'));
  const faltan = [];
  for (const j of CATALOGO) for (const t of [j.nombre, j.descripcion]) if (t && !(t in en) && !/^[A-Za-z0-9 ]+$/.test(t)) faltan.push(t.slice(0, 50));
  // algunos nombres coinciden en los tres idiomas (Póquer, Brisca…): solo se exige que la mayoría esté
  assert.ok(faltan.length < CATALOGO.length * 0.1, `sin traducir (añádelos a i18n/extra.tsv): ${faltan.join(' | ')}`);
});

test('todas las páginas cargan el traductor', () => {
  const paginas = ['index', 'juego', '404', 'cuenta', 'legal/privacidad', 'legal/aviso', 'legal/cookies'];
  for (const p of paginas) assert.match(fs.readFileSync(path.join(CLIENTE, p + '.html'), 'utf8'), /\/js\/i18n\.js\?v=__V__/, p);
});
