#!/usr/bin/env node
'use strict';
// Saca todos los textos en castellano de la interfaz (HTML, JS del navegador, catálogo y mensajes del servidor)
// para traducirlos. Escribe i18n/base.json: { clave: { donde: [ficheros] } }. Las claves con ${…} se convierten en
// plantillas con {0}, {1}… en el orden en que aparecen.
const fs = require('fs'), path = require('path');
const RAIZ = path.join(__dirname, '..');
const salida = {};
const guarda = (t, f) => { t = t.replace(/\s+/g, ' ').trim(); if (!t) return; (salida[t] ||= new Set()).add(path.relative(RAIZ, f)); };
const ES = /[áéíóúñ¿¡ÁÉÍÓÚÑ]|\b(el|la|los|las|de|del|un|una|tu|tus|que|con|para|por|en|se|no|es|y|o|te|me|su|sus|al|más|ya|si|como|hay|pero|está|son|has|han|solo|sin|muy|todo|todos|cada|hasta|donde|cuando|puedes|toca|juega|partida|sala|turno|ronda|carta|cartas|puntos|jugador|jugadores)\b/i;
const CODIGO = /[{}<>=;]|=>|\\n|^\/|^\.|^#|\.(js|css|svg|png|woff2|json|html)\b|^[a-z]+(-[a-z0-9]+)+$|^[a-z0-9_]+$|https?:|^\s*$/;
function candidato(s) {
  if (s.length < 2 || s.length > 600) return false;
  if (CODIGO.test(s) && !/[áéíóúñ¿¡]/.test(s)) return false;
  if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(s)) return false;
  if (/^[a-z]+ [a-z]+( [a-z]+)*$/.test(s) && !ES.test(s)) return false; // listas de clases CSS
  const palabras = s.split(/\s+/).length;
  if (palabras === 1) return /^[A-ZÁÉÍÓÚÑ¿¡][a-záéíóúñ]+[.!?…:]?$/.test(s) || /[áéíóúñ]/.test(s);
  return ES.test(s);
}
function literales(src) {
  const out = []; let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2) + 2 || src.length; continue; }
    if (c === '\'' || c === '"') {
      let j = i + 1, t = '';
      while (j < src.length && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') { t += src[j + 1] === 'n' ? '\n' : src[j + 1]; j += 2; } else t += src[j++]; }
      out.push(t); i = j + 1; continue;
    }
    if (c === '`') {
      let j = i + 1, t = '', n = 0;
      while (j < src.length && src[j] !== '`') {
        if (src[j] === '\\') { t += src[j + 1]; j += 2; continue; }
        if (src[j] === '$' && src[j + 1] === '{') { let d = 1, k = j + 2; while (k < src.length && d) { if (src[k] === '{') d++; else if (src[k] === '}') d--; k++; } t += `{${n++}}`; j = k; continue; }
        t += src[j++];
      }
      out.push(t); i = j + 1; continue;
    }
    i++;
  }
  return out;
}
function recorre(dir, ext, fn) { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) { if (!['node_modules', 'fonts', 'img'].includes(f.name)) recorre(p, ext, fn); } else if (ext.some((e) => f.name.endsWith(e))) fn(p); } }
// JS del navegador
recorre(path.join(RAIZ, 'app/client/js'), ['.js'], (f) => { if (/juegos[\\/]test\.js$/.test(f)) return; /* las preguntas trampa son juegos de palabras en castellano */ for (const s of literales(fs.readFileSync(f, 'utf8'))) if (candidato(s)) guarda(s, f); });
// mensajes del servidor y de los motores: error: '…', texto: '…'
recorre(path.join(RAIZ, 'lib'), ['.js'], (f) => {
  if (/preguntas|fiesta2|palabras-fiesta|catalogo/.test(f)) return; // contenido del juego, no de la interfaz
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/(?:error|error2|texto|aviso)\s*:\s*(['"`])((?:\\.|(?!\1).)*)\1/g)) { const t = m[1] === '`' ? m[2].replace(/\$\{[^}]*\}/g, (x, o, s) => `{${(s.slice(0, s.indexOf(x)).match(/\$\{/g) || []).length}}`) : m[2].replace(/\\(.)/g, '$1'); if (candidato(t)) guarda(t, f); }
  for (const m of src.matchAll(/res\.status\(\d+\)\.json\(\{[^}]*error: '([^']+)'/g)) if (candidato(m[1])) guarda(m[1], f);
});
// el catálogo: nombre, descripción y cómo se juega
const { CATALOGO } = require(path.join(RAIZ, 'lib/catalogo'));
for (const j of CATALOGO) for (const k of ['nombre', 'descripcion', 'comoSeJuega']) if (j[k]) guarda(j[k], path.join(RAIZ, 'lib/catalogo.js'));
// HTML y páginas pintadas: los recoge tools/i18n-cosechar.js (se ejecuta después y añade a este fichero)
fs.mkdirSync(path.join(RAIZ, 'i18n'), { recursive: true });
const obj = Object.fromEntries(Object.entries(salida).sort(([a], [b]) => a.localeCompare(b, 'es')).map(([k, v]) => [k, [...v]]));
fs.writeFileSync(path.join(RAIZ, 'i18n/base.json'), JSON.stringify(obj, null, 1));
const total = Object.keys(obj).length, plantillas = Object.keys(obj).filter((k) => /\{\d\}/.test(k)).length;
console.log(`${total} textos (${plantillas} plantillas), ${Object.keys(obj).reduce((s, k) => s + k.length, 0)} caracteres`);
const porFichero = {}; for (const [k, v] of Object.entries(obj)) for (const f of v) porFichero[f] = (porFichero[f] || 0) + 1;
console.log(Object.entries(porFichero).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([f, n]) => `${n} ${f}`).join('\n'));
