'use strict';
// Ruleta del saber (2-6). En tu turno giras la ruleta: sale una categoría (o la corona) y contestas en 20 s.
// Si aciertas, sigues; si fallas o se acaba el tiempo, pasa el turno. Cada acierto llena la barra; con
// 3 aciertos (o si cae en la corona) eliges una categoría de las que te faltan y, si aciertas, ganas su
// personaje. Gana quien junte los 6. Si tras 15 vueltas nadie lo ha logrado, gana quien tenga más.
// La respuesta correcta nunca viaja al navegador antes de contestar: las opciones se barajan aquí.
const PREGUNTAS = require('./preguntas');
const CATS = Object.keys(PREGUNTAS);
const T_RESPONDER = 20000, VUELTAS = 15, ACIERTO = { normal: 0.62, dificil: 0.82 };

function nuevo(n, rnd = Math.random) {
  return { n, rnd, turno: 0, fase: 'girar', personajes: Array.from({ length: n }, () => []), barra: Array(n).fill(0), aciertos: Array(n).fill(0),
    turnos: Array(n).fill(0), usadas: {}, preg: null, ultima: null, giro: null, nGiro: 0, ganador: null, hasta: 0 };
}
const faltan = (e, j) => CATS.filter((c) => !e.personajes[j].includes(c));
function sacar(e, cat) {
  const usadas = (e.usadas[cat] ||= []);
  if (usadas.length >= PREGUNTAS[cat].length) usadas.length = 0;
  let i; do { i = Math.floor(e.rnd() * PREGUNTAS[cat].length); } while (usadas.includes(i));
  usadas.push(i);
  const [texto, ...ops] = PREGUNTAS[cat][i];
  const orden = [0, 1, 2, 3].sort(() => e.rnd() - 0.5);
  e.preg = { cat, texto, opciones: orden.map((k) => ops[k]), correcta: orden.indexOf(0) };
  e.hasta = Date.now() + T_RESPONDER;
}
function pasarTurno(e) {
  e.turnos[e.turno]++;
  e.turno = (e.turno + 1) % e.n;
  e.fase = 'girar'; e.preg = null; e.hasta = 0;
  if (e.turnos.every((t) => t >= VUELTAS)) terminar(e);
}
function terminar(e) {
  const clave = (j) => e.personajes[j].length * 1000 + e.aciertos[j];
  const max = Math.max(...e.personajes.map((_, j) => clave(j)));
  e.ganador = e.personajes.map((_, j) => (clave(j) === max ? j : -1)).filter((j) => j >= 0);
  e.fase = 'fin'; e.hasta = 0;
}
function responder(e, yo, op) {
  const p = e.preg, bien = op === p.correcta, corona = e.fase === 'corona-responder';
  e.ultima = { id: (e.ultima?.id || 0) + 1, j: yo, cat: p.cat, texto: p.texto, opciones: p.opciones, correcta: p.correcta, elegida: op, bien, corona };
  if (bien) {
    e.aciertos[yo]++;
    if (corona) { e.personajes[yo].push(p.cat); e.barra[yo] = 0; if (!faltan(e, yo).length) { e.ganador = [yo]; e.fase = 'fin'; e.preg = null; return; } }
    else e.barra[yo]++;
    e.preg = null; e.hasta = 0;
    e.fase = e.barra[yo] >= 3 ? 'corona' : 'girar';
  } else {
    if (corona) e.barra[yo] = 0;
    pasarTurno(e);
  }
}
function accion(e, yo, a) {
  if (e.ganador) return { ok: false, error: 'La partida ha terminado' };
  if (yo !== e.turno) return { ok: false, error: 'No es tu turno' };
  if (a.tipo === 'girar') {
    if (e.fase !== 'girar') return { ok: false, error: 'Ahora no toca girar' };
    const s = Math.floor(e.rnd() * 7); // 6 categorías + corona
    e.nGiro++;
    if (s === 6) { e.giro = { n: e.nGiro, sector: 'corona' }; e.fase = 'corona'; return { ok: true }; }
    e.giro = { n: e.nGiro, sector: CATS[s] };
    e.fase = 'responder'; sacar(e, CATS[s]);
    return { ok: true };
  }
  if (a.tipo === 'corona') {
    if (e.fase !== 'corona') return { ok: false, error: 'Ahora no' };
    if (!faltan(e, yo).includes(a.cat)) return { ok: false, error: 'Elige una categoría que te falte' };
    e.fase = 'corona-responder'; sacar(e, a.cat);
    return { ok: true };
  }
  if (a.tipo === 'responder') {
    if (e.fase !== 'responder' && e.fase !== 'corona-responder') return { ok: false, error: 'Ahora no hay pregunta' };
    const op = Number(a.op);
    if (!Number.isInteger(op) || op < 0 || op > 3) return { ok: false, error: 'Respuesta no válida' };
    responder(e, yo, op);
    return { ok: true };
  }
  return { ok: false, error: 'Acción desconocida' };
}
function tiempo(e, ahora) {
  if (e.ganador || !e.hasta || ahora < e.hasta) return false;
  if (e.fase === 'responder' || e.fase === 'corona-responder') { responder(e, e.turno, -1); return true; }
  return false;
}
function vista(e, yo) {
  return {
    n: e.n, turno: e.turno, fase: e.fase, cats: CATS, personajes: e.personajes, barra: e.barra, aciertos: e.aciertos,
    vuelta: Math.min(VUELTAS, Math.min(...e.turnos) + 1), vueltas: VUELTAS, giro: e.giro, hasta: e.hasta,
    preg: e.preg ? { cat: e.preg.cat, texto: e.preg.texto, opciones: e.preg.opciones } : null, ultima: e.ultima,
    faltan: yo >= 0 ? faltan(e, yo) : [], ganadores: e.ganador,
  };
}
const turno = (e) => (e.ganador ? -1 : e.turno);
const fin = (e) => (e.ganador ? { ganadores: e.ganador, texto: e.ganador.length === 1 && e.personajes[e.ganador[0]].length === 6 ? '¡Los 6 personajes!' : `${Math.max(...e.personajes.map((p) => p.length))} personajes` } : null);
function bot(e, yo, nivel, rnd) {
  if (e.ganador || yo !== e.turno) return null;
  if (e.fase === 'girar') return { tipo: 'girar' };
  if (e.fase === 'corona') { const f = faltan(e, yo); return { tipo: 'corona', cat: f[Math.floor(rnd() * f.length)] }; }
  if (e.fase === 'responder' || e.fase === 'corona-responder') {
    const bien = rnd() < (ACIERTO[nivel] || ACIERTO.normal);
    return { tipo: 'responder', op: bien ? e.preg.correcta : (e.preg.correcta + 1 + Math.floor(rnd() * 3)) % 4 };
  }
  return null;
}
module.exports = { id: 'saber', min: 2, max: 6, nuevo, vista, accion, turno, fin, bot, tiempo, _: { CATS } };
