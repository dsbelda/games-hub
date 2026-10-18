'use strict';
// La Oca (2-6). Un dado; se gana llegando justo a la 63 (lo que sobra, se retrocede).
// De oca a oca y tiro porque me toca · de puente a puente (6 ↔ 12) · de dado a dado (26 ↔ 53) · posada (19):
// un turno sin tirar · pozo (31): hasta que otro caiga y te rescate · laberinto (42): vuelves a la 30 ·
// cárcel (52): dos turnos sin tirar · la muerte (58): vuelta a empezar.
const OCAS = [5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59];
const META = 63;
const CASILLAS = { 6: 'puente', 12: 'puente', 19: 'posada', 26: 'dado', 31: 'pozo', 42: 'laberinto', 52: 'carcel', 53: 'dado', 58: 'muerte', 63: 'jardin' };
for (const o of OCAS) CASILLAS[o] = 'oca';

function nuevo(n) { return { n, pos: Array(n).fill(0), turno: 0, castigo: Array(n).fill(0), pozo: -1, ultima: null, ganador: null, tiradas: 0 }; }
function siguiente(e) {
  for (let k = 0; k < e.n * 3; k++) {
    e.turno = (e.turno + 1) % e.n;
    const j = e.turno;
    if (e.pozo === j) continue; // en el pozo no se tira
    if (e.castigo[j] > 0) { e.castigo[j]--; continue; }
    return;
  }
}
function tirar(e, j, dado) {
  const pasos = [e.pos[j]];
  let p = e.pos[j] + dado;
  if (p > META) p = META - (p - META); // rebote
  pasos.push(p);
  const textos = [];
  let otra = false;
  const tipo = CASILLAS[p];
  if (tipo === 'oca') { const sig = OCAS.find((o) => o > p) || META; textos.push('¡De oca a oca y tiro porque me toca!'); p = sig; pasos.push(p); otra = p !== META; }
  else if (tipo === 'puente') { p = p === 6 ? 12 : 6; textos.push('¡De puente a puente y tiro porque me lleva la corriente!'); pasos.push(p); otra = true; }
  else if (tipo === 'dado') { p = p === 26 ? 53 : 26; textos.push('¡De dado a dado y tiro porque me ha tocado!'); pasos.push(p); otra = true; }
  else if (tipo === 'posada') { e.castigo[j] = 1; textos.push('A la posada: un turno sin tirar.'); }
  else if (tipo === 'pozo') { if (e.pozo >= 0 && e.pozo !== j) textos.push('¡Cae al pozo y rescata a quien estaba!'); else textos.push('¡Al pozo! Hasta que otro caiga.'); e.pozo = j; }
  else if (tipo === 'laberinto') { p = 30; textos.push('¡El laberinto! Vuelve a la 30.'); pasos.push(p); }
  else if (tipo === 'carcel') { e.castigo[j] = 2; textos.push('¡A la cárcel! Dos turnos sin tirar.'); }
  else if (tipo === 'muerte') { p = 0; textos.push('¡La muerte! Vuelta a empezar.'); pasos.push(p); }
  if (e.pozo === j && CASILLAS[p] !== 'pozo') e.pozo = -1;
  e.pos[j] = p; e.tiradas++;
  e.ultima = { id: e.tiradas, j, dado, pasos, textos };
  if (p === META) { e.ganador = [j]; e.ultima.textos.push('¡Ha llegado al jardín de la oca!'); return; }
  if (!otra) siguiente(e);
}
function accion(e, yo, a, rnd = Math.random) {
  if (e.ganador) return { ok: false, error: 'La partida ha terminado' };
  if (a.tipo !== 'tirar') return { ok: false, error: 'Acción desconocida' };
  if (yo !== e.turno) return { ok: false, error: 'No es tu turno' };
  tirar(e, yo, 1 + Math.floor(rnd() * 6));
  return { ok: true };
}
const vista = (e) => ({ n: e.n, pos: e.pos, turno: e.turno, castigo: e.castigo, pozo: e.pozo, ultima: e.ultima, casillas: CASILLAS, ganadores: e.ganador });
const turno = (e) => (e.ganador ? -1 : e.turno);
const fin = (e) => (e.ganador ? { ganadores: e.ganador, texto: '¡Al jardín de la oca!' } : null);
const bot = (e, yo) => (!e.ganador && yo === e.turno ? { tipo: 'tirar' } : null);
module.exports = { id: 'oca', min: 2, max: 6, nuevo, vista, accion, turno, fin, bot, _: { tirar, CASILLAS } };
