#!/usr/bin/env node
'use strict';
// Une las traducciones de i18n/trad/*.txt (idx<TAB>en<TAB>fr) con i18n/lista.json y escribe
// app/client/i18n/en.json y fr.json ({ texto en castellano: traducción }). "=" = sin traducir.
// Comprueba que cada traducción conserva los mismos marcadores {0}, {1}… y las mismas etiquetas HTML.
const fs = require('fs'), path = require('path');
const RAIZ = path.join(__dirname, '..');
const lista = require('../i18n/lista.json');
const dic = { en: {}, fr: {} };
const vistos = new Set();
let errores = 0;
const marcas = (t) => (t.match(/\{[0-9s]\}/g) || []).sort().join(',');
const tags = (t) => (t.match(/<\/?[a-z]+[^>]*>/gi) || []).map((x) => x.replace(/\s.*>/, '>')).sort().join(',');
for (const f of fs.readdirSync(path.join(RAIZ, 'i18n/trad')).filter((x) => x.endsWith('.txt')).sort()) {
  for (const linea of fs.readFileSync(path.join(RAIZ, 'i18n/trad', f), 'utf8').split('\n')) {
    if (!linea.trim()) continue;
    const [idx, en, fr] = linea.split('\t');
    const n = +idx, es = lista[n];
    if (es === undefined || fr === undefined) { console.error('línea mal formada', f, linea.slice(0, 60)); errores++; continue; }
    vistos.add(n);
    for (const [l, t] of [['en', en], ['fr', fr]]) {
      if (t === '=') continue;
      const tv = t.replace(/^<h>/, '');
      const origen = es.replace(/^<h>/, '');
      if (marcas(origen) !== marcas(tv)) { console.error(`marcadores distintos [${l}] ${n}: ${es.slice(0, 50)} → ${t.slice(0, 50)}`); errores++; }
      if (tags(origen) !== tags(tv)) { console.error(`etiquetas distintas [${l}] ${n}: ${es.slice(0, 50)}`); errores++; }
      dic[l][es] = tv;
    }
  }
}
// textos nuevos o retocados a mano: i18n/extra.tsv (castellano<TAB>inglés<TAB>francés); mandan sobre lo anterior
const extra = path.join(RAIZ, 'i18n/extra.tsv');
if (fs.existsSync(extra)) for (const linea of fs.readFileSync(extra, 'utf8').split('\n')) {
  if (!linea.trim() || linea.startsWith('#')) continue;
  const [es, en, fr] = linea.split('\t');
  if (fr === undefined) { console.error('extra.tsv mal formada:', linea.slice(0, 60)); errores++; continue; }
  const origen = es.replace(/^<h>/, '');
  for (const [l, t] of [['en', en], ['fr', fr]]) {
    const tv = t.replace(/^<h>/, '');
    if (marcas(origen) !== marcas(tv) || tags(origen) !== tags(tv)) { console.error(`extra.tsv [${l}] marcadores o etiquetas distintos:`, es.slice(0, 50)); errores++; }
    dic[l][es] = tv;
  }
}
for (let i = 0; i < lista.length; i++) if (!vistos.has(i)) { console.error('sin traducir', i, lista[i].slice(0, 60)); errores++; }
for (const l of ['en', 'fr']) fs.writeFileSync(path.join(RAIZ, `app/client/i18n/${l}.json`), JSON.stringify(dic[l]));
console.log(Object.keys(dic.en).length, 'textos en en.json,', Object.keys(dic.fr).length, 'en fr.json;', errores, 'errores');
process.exit(errores ? 1 : 0);
