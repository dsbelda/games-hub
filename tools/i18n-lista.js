#!/usr/bin/env node
'use strict';
// Prepara i18n/lista.txt (una línea por texto, con su número) a partir de i18n/base.json, quitando lo que no hace
// falta traducir: lo que ya cubre una plantilla con {0}, secuencias de letras y cosas sin palabras.
const fs = require('fs'), path = require('path');
const base = require('../i18n/base.json');
const claves = Object.keys(base);
const reg = (t) => new RegExp('^' + t.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\d\}/g, '(.+?)').replace(/\{s\}/g, '(.+?)') + '$');
const plantillas = claves.filter((k) => /\{[0-9s]\}/.test(k)).map((k) => [k, reg(k.replace(/^<h>/, ''))]);
const util = claves.filter((k) => {
  if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]{2}/.test(k.replace(/<[^>]+>/g, ''))) return false;
  if (/^[a-zñ]{12,}$/.test(k)) return false;
  if (!/\{[0-9s]\}/.test(k) && plantillas.some(([p, r]) => p !== k && r.test(k))) return false;
  return true;
});
fs.writeFileSync(path.join(__dirname, '../i18n/lista.txt'), util.map((t, i) => `${i}\t${t}`).join('\n'));
fs.writeFileSync(path.join(__dirname, '../i18n/lista.json'), JSON.stringify(util));
console.log(util.length, 'textos para traducir');
