'use strict';
// El juego de la Unidad: cartas de 4 colores con números 0-9, «salta», «gira», «+2», comodín y comodín +4.
// Se tira una carta del mismo color o número/símbolo. Si no puedes, robas una; si esa sirve, puedes tirarla.
// Quien se queda con una carta debe decir «¡Unidad!» antes; si no, cualquiera puede pillarle (+2 cartas).
// +2 y +4: el siguiente roba y pierde el turno (no se acumulan). Gana quien se quede sin cartas.
const COLORES = ['rojo', 'amarillo', 'verde', 'azul'];

function barajar(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function nuevo(n, rnd) {
  const mazo = [];
  let k = 0;
  for (const c of COLORES) {
    mazo.push({ id: k++, c, v: '0' });
    for (const v of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'salta', 'gira', '+2']) { mazo.push({ id: k++, c, v }); mazo.push({ id: k++, c, v }); }
  }
  for (let i = 0; i < 4; i++) { mazo.push({ id: k++, c: null, v: 'comodin' }); mazo.push({ id: k++, c: null, v: '+4' }); }
  barajar(mazo, rnd);
  const manos = Array.from({ length: n }, () => []);
  for (let r = 0; r < 7; r++) for (let j = 0; j < n; j++) manos[j].push(mazo.pop());
  // la primera carta boca arriba ha de ser un número
  let i = mazo.findIndex((c) => /^\d$/.test(c.v));
  const primera = mazo.splice(i, 1)[0];
  return { n, manos, mazo, descarte: [primera], color: primera.c, turno: 0, dir: 1, robada: null, dijo: Array(n).fill(false), pillable: -1, ganador: -1, aviso: null };
}

const arriba = (e) => e.descarte[e.descarte.length - 1];
const sirve = (e, c) => c.c === null || c.c === e.color || c.v === arriba(e).v;
const sig = (e, desde, pasos = 1) => (((desde + e.dir * pasos) % e.n) + e.n) % e.n;

function robarUna(e, j) {
  if (!e.mazo.length) {
    const top = e.descarte.pop();
    e.mazo = e.descarte; e.descarte = [top];
    for (let i = e.mazo.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [e.mazo[i], e.mazo[k]] = [e.mazo[k], e.mazo[i]]; }
  }
  const c = e.mazo.pop();
  if (c) { e.manos[j].push(c); if (e.manos[j].length > 1) e.dijo[j] = false; }
  return c;
}

function accion(e, yo, a) {
  if (e.ganador >= 0) return { ok: false, error: 'La partida ha terminado' };
  const mano = e.manos[yo];
  if (a.tipo === 'unidad') {
    if (mano.length > 2) return { ok: false, error: 'Solo con dos cartas o menos' };
    e.dijo[yo] = true;
    if (e.pillable === yo) e.pillable = -1; // lo dijo a tiempo
    e.aviso = { j: yo, texto: '¡Unidad!' };
    return { ok: true };
  }
  if (a.tipo === 'pillar') {
    if (e.pillable < 0 || e.pillable === yo) return { ok: false, error: 'No hay nadie a quien pillar' };
    const v = e.pillable;
    robarUna(e, v); robarUna(e, v);
    e.pillable = -1;
    e.aviso = { j: yo, texto: `¡pilla a quien no dijo «Unidad»! (+2)`, victima: v };
    return { ok: true };
  }
  if (e.turno !== yo) return { ok: false, error: 'No es tu turno' };
  if (a.tipo === 'robar') {
    if (e.robada !== null) return { ok: false, error: 'Ya has robado' };
    e.pillable = -1;
    const c = robarUna(e, yo);
    e.aviso = { j: yo, texto: 'roba' };
    if (c && sirve(e, c)) e.robada = c.id;
    else { e.turno = sig(e, yo); }
    return { ok: true };
  }
  if (a.tipo === 'pasar') {
    if (e.robada === null) return { ok: false, error: 'Antes tienes que robar' };
    e.robada = null;
    e.turno = sig(e, yo);
    return { ok: true };
  }
  if (a.tipo !== 'jugar') return { ok: false, error: 'Acción desconocida' };
  const i = mano.findIndex((c) => c.id === Number(a.carta));
  if (i < 0) return { ok: false, error: 'No tienes esa carta' };
  const c = mano[i];
  if (e.robada !== null && c.id !== e.robada) return { ok: false, error: 'Solo puedes tirar la carta que has robado' };
  if (!sirve(e, c)) return { ok: false, error: 'Esa carta no sirve ahora' };
  if (c.c === null && !COLORES.includes(a.color)) return { ok: false, error: 'Elige un color' };
  mano.splice(i, 1);
  e.descarte.push(c);
  e.color = c.c || a.color;
  e.robada = null;
  e.pillable = mano.length === 1 && !e.dijo[yo] ? yo : -1;
  e.aviso = { j: yo, texto: c.c === null ? `cambia a ${e.color}` : null };
  if (!mano.length) { e.ganador = yo; e.turno = -1; return { ok: true }; }
  let t = sig(e, yo);
  if (c.v === 'gira') { e.dir = -e.dir; t = e.n === 2 ? yo : sig(e, yo); }
  else if (c.v === 'salta') t = sig(e, yo, 2);
  else if (c.v === '+2' || c.v === '+4') {
    const v = sig(e, yo);
    for (let k = 0; k < (c.v === '+2' ? 2 : 4); k++) robarUna(e, v);
    t = sig(e, yo, 2);
  }
  e.turno = t;
  return { ok: true };
}

function vista(e, yo) {
  return {
    n: e.n, mano: yo >= 0 ? e.manos[yo] : [], cartas: e.manos.map((m) => m.length),
    arriba: arriba(e), color: e.color, turno: e.turno, dir: e.dir, robada: e.robada,
    quedan: e.mazo.length, dijo: e.dijo, pillable: e.pillable, ganador: e.ganador, aviso: e.aviso,
  };
}
const turno = (e) => (e.ganador >= 0 ? -1 : e.turno);
const fin = (e) => (e.ganador >= 0 ? { ganadores: [e.ganador], texto: 'Se ha quedado sin cartas' } : null);

function bot(e, yo, nivel, rnd) {
  if (e.ganador >= 0) return null;
  const mano = e.manos[yo];
  // pillar a quien se olvidó (no siempre se dan cuenta)
  if (e.pillable >= 0 && e.pillable !== yo && rnd() < (nivel === 'dificil' ? 0.7 : 0.35)) return { tipo: 'pillar' };
  if (e.turno !== yo) return null;
  if (mano.length === 2 && !e.dijo[yo] && rnd() < (nivel === 'dificil' ? 1 : 0.9)) return { tipo: 'unidad' };
  const colorPreferido = () => {
    const cuenta = {}; for (const c of mano) if (c.c) cuenta[c.c] = (cuenta[c.c] || 0) + 1;
    return COLORES.reduce((a, b) => ((cuenta[b] || 0) > (cuenta[a] || 0) ? b : a), COLORES[Math.floor(rnd() * 4)]);
  };
  if (e.robada !== null) { const c = mano.find((x) => x.id === e.robada); return { tipo: 'jugar', carta: c.id, color: colorPreferido() }; }
  const validas = mano.filter((c) => sirve(e, c));
  if (!validas.length) return { tipo: 'robar' };
  let elegida;
  const siguiente = sig(e, yo);
  if (nivel === 'dificil') {
    const ataque = validas.filter((c) => ['+2', '+4', 'salta'].includes(c.v));
    const normales = validas.filter((c) => c.c !== null);
    if (e.manos[siguiente].length <= 2 && ataque.length) elegida = ataque[0];
    else if (normales.length) {
      // deshacerse primero de lo que más puntos «pesa» y del color que más tengo
      const pref = colorPreferido();
      elegida = normales.sort((a, b) => (b.c === pref) - (a.c === pref) || (isNaN(b.v) ? 20 : +b.v) - (isNaN(a.v) ? 20 : +a.v))[0];
    } else elegida = validas[0];
  } else {
    const normales = validas.filter((c) => c.c !== null);
    const pool = normales.length && rnd() < 0.8 ? normales : validas;
    elegida = pool[Math.floor(rnd() * pool.length)];
  }
  return { tipo: 'jugar', carta: elegida.id, color: colorPreferido() };
}

module.exports = { id: 'unidad', min: 2, max: 8, nuevo, vista, accion, turno, fin, bot, COLORES };
