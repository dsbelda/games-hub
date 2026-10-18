'use strict';
// Diccionario español para los juegos de palabras (Letras revueltas, Palabrería y sus CPUs).
// ~635.000 formas (con plurales y verbos conjugados), en minúsculas, sin tildes y con ñ, ordenadas.
// Para no gastar memoria se guarda como un único texto + posiciones (≈ 10 MB) y se busca por bisección.
// Se carga la primera vez que hace falta.
const fs = require('fs');
const path = require('path');

let texto = null, inicio = null, N = 0, mascaras = null;
function cargar() {
  if (texto) return;
  texto = fs.readFileSync(path.join(__dirname, 'datos', 'palabras-es.txt'), 'utf8');
  const pos = [0];
  for (let i = 0; i < texto.length; i++) if (texto.charCodeAt(i) === 10 && i + 1 < texto.length) pos.push(i + 1);
  inicio = Int32Array.from(pos); N = inicio.length;
}
const palabra = (i) => texto.slice(inicio[i], (i + 1 < N ? inicio[i + 1] : texto.length) - 1);
// primera posición cuya palabra es >= p (orden por código, el mismo con el que se ordenó la lista)
function cota(p) {
  cargar();
  let a = 0, b = N;
  while (a < b) { const m = (a + b) >> 1; if (palabra(m) < p) a = m + 1; else b = m; }
  return a;
}
const existe = (w) => { const i = cota(w); return i < N && palabra(i) === w; };
const esPrefijo = (p) => { const i = cota(p); return i < N && palabra(i).startsWith(p); };
// máscara de letras (bit por letra: a-z = 0-25, ñ = 26)
const bit = (ch) => (ch === 'ñ' ? 1 << 26 : 1 << (ch.charCodeAt(0) - 97));
const mascara = (w) => { let m = 0; for (const ch of w) m |= bit(ch); return m; };
function mascarasTodas() {
  cargar();
  if (!mascaras) { mascaras = new Int32Array(N); for (let i = 0; i < N; i++) mascaras[i] = mascara(palabra(i)); }
  return mascaras;
}
// recorre las palabras cuyas letras están todas en «permitidas» (máscara) y de largo entre min y max
function* candidatas(permitidas, min = 2, max = 15) {
  const m = mascarasTodas();
  for (let i = 0; i < N; i++) {
    if ((m[i] & ~permitidas) !== 0) continue;
    const l = (i + 1 < N ? inicio[i + 1] : texto.length) - 1 - inicio[i];
    if (l >= min && l <= max) yield palabra(i);
  }
}
const total = () => { cargar(); return N; };
module.exports = { existe, esPrefijo, mascara, candidatas, total };
