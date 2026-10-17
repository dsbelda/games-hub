'use strict';
// Tute. 2 jugadores (con robo, como la Brisca, 8 cartas), 3 (13 cartas, sin el 2 de oros) o 4 por parejas
// (10 cartas; asientos 0+2 contra 1+3). Puntos: As 11, Tres 10, Rey 4, Caballo 3, Sota 2 y 10 de últimas.
// Obligaciones (sin mazo, o desde el principio a 3 y 4): asistir al palo y montar (superar) si puedes;
// si no tienes del palo, fallar con triunfo y montar el triunfo si puedes. Si tu compañero va ganando,
// basta con asistir. Cantes: tras ganar una baza, quien tenga Rey y Caballo de un palo canta 20 (40 si es
// del triunfo). Tute: con los 4 reyes o los 4 caballos se gana la partida al cantarlo.
const { crear, barajar, id } = require('./baraja');
const FUERZA = [1, 3, 12, 11, 10, 7, 6, 5, 4, 2];
const PUNTOS = { 1: 11, 3: 10, 12: 4, 11: 3, 10: 2 };
const pts = (c) => PUNTOS[c.n] || 0;
const fuerza = (c) => 10 - FUERZA.indexOf(c.n);

function nuevo(n, rnd) {
  let mazo = barajar(crear(), rnd);
  if (n === 3) mazo = mazo.filter((c) => !(c.p === 'oros' && c.n === 2));
  const porJugador = n === 2 ? 8 : mazo.length / n;
  const manos = Array.from({ length: n }, () => []);
  for (let r = 0; r < porJugador; r++) for (let j = 0; j < n; j++) manos[j].push(mazo.pop());
  let triunfo;
  if (n === 2) triunfo = mazo.shift(); // boca arriba bajo el mazo
  else triunfo = manos[n - 1][manos[n - 1].length - 1]; // la última carta repartida (se queda en la mano)
  const equipos = n === 4 ? [0, 1, 0, 1] : Array.from({ length: n }, (_, i) => i);
  const ne = n === 4 ? 2 : n;
  return {
    n, manos, mazo, triunfo, triunfoTomado: n !== 2, palo: triunfo.p, equipos,
    puntos: Array(ne).fill(0), bazas: Array(ne).fill(0), cantes: Array(ne).fill(0), cantados: [],
    mesa: [], turno: 0, ultimaBaza: null, puedeCantar: -1, aviso: null, terminada: false, tute: -1,
  };
}
const conMazo = (e) => e.mazo.length > 0 || !e.triunfoTomado;
function ganadorMesa(e, mesa) {
  let g = mesa[0];
  for (const x of mesa.slice(1)) {
    const tg = g.carta.p === e.palo, tx = x.carta.p === e.palo;
    if (tx && !tg) g = x;
    else if (tx === tg && x.carta.p === g.carta.p && fuerza(x.carta) > fuerza(g.carta)) g = x;
  }
  return g;
}
// cartas que puede jugar `yo` ahora mismo
function legales(e, yo) {
  const mano = e.manos[yo];
  if (!e.mesa.length || (e.n === 2 && conMazo(e))) return mano;
  const salida = e.mesa[0].carta.p;
  const g = ganadorMesa(e, e.mesa);
  const companeroGana = e.n === 4 && e.equipos[g.j] === e.equipos[yo];
  const delPalo = mano.filter((c) => c.p === salida);
  if (delPalo.length) {
    if (companeroGana || (g.carta.p === e.palo && salida !== e.palo)) return delPalo;
    const superan = delPalo.filter((c) => fuerza(c) > fuerza(g.carta) || g.carta.p !== salida);
    return superan.length ? superan : delPalo;
  }
  if (companeroGana) return mano;
  const triunfos = mano.filter((c) => c.p === e.palo);
  if (triunfos.length) {
    if (g.carta.p === e.palo) { const montan = triunfos.filter((c) => fuerza(c) > fuerza(g.carta)); return montan.length ? montan : mano; }
    return triunfos;
  }
  return mano;
}
const cantesPosibles = (e, yo) => {
  if (e.puedeCantar !== yo) return [];
  const mano = e.manos[yo];
  const res = [];
  for (const p of ['oros', 'copas', 'espadas', 'bastos']) if (!e.cantados.includes(p) && mano.some((c) => c.p === p && c.n === 12) && mano.some((c) => c.p === p && c.n === 11)) res.push(p);
  return res;
};
const tieneTute = (mano) => mano.filter((c) => c.n === 12).length === 4 || mano.filter((c) => c.n === 11).length === 4;
function robar(e) { if (e.mazo.length) return e.mazo.pop(); if (!e.triunfoTomado) { e.triunfoTomado = true; return e.triunfo; } return null; }

function accion(e, yo, a) {
  if (e.terminada) return { ok: false, error: 'La partida ha terminado' };
  if (e.turno !== yo) return { ok: false, error: 'No es tu turno' };
  const mano = e.manos[yo];
  if (a.tipo === 'tute') {
    if (e.puedeCantar !== yo || !tieneTute(mano)) return { ok: false, error: 'No tienes tute' };
    e.tute = e.equipos[yo]; e.terminada = true; e.turno = -1;
    e.aviso = { j: yo, texto: '¡canta TUTE!' };
    return { ok: true };
  }
  if (a.tipo === 'cantar') {
    if (!cantesPosibles(e, yo).includes(a.palo)) return { ok: false, error: 'No puedes cantar eso ahora' };
    const v = a.palo === e.palo ? 40 : 20;
    e.cantes[e.equipos[yo]] += v; e.cantados.push(a.palo); e.puedeCantar = -1;
    e.aviso = { j: yo, texto: `canta las ${v} en ${a.palo}` };
    return { ok: true };
  }
  if (a.tipo === 'cambiar7') {
    const i = mano.findIndex((c) => c.p === e.palo && c.n === 7);
    if (e.n !== 2 || i < 0 || !e.mazo.length || e.triunfoTomado || e.triunfo.n === 7 || e.mesa.length) return { ok: false, error: 'Ahora no puedes cambiar el 7' };
    [mano[i], e.triunfo] = [e.triunfo, mano[i]];
    e.aviso = { j: yo, texto: 'cambia el 7 de triunfo' };
    return { ok: true };
  }
  if (a.tipo !== 'jugar') return { ok: false, error: 'Acción desconocida' };
  const i = mano.findIndex((c) => id(c) === a.carta);
  if (i < 0) return { ok: false, error: 'No tienes esa carta' };
  if (!legales(e, yo).includes(mano[i])) return { ok: false, error: 'Tienes que asistir al palo y montar si puedes (o fallar con triunfo)' };
  e.puedeCantar = -1;
  e.mesa.push({ j: yo, carta: mano.splice(i, 1)[0] });
  e.aviso = null;
  if (e.mesa.length < e.n) { e.turno = (yo + 1) % e.n; return { ok: true }; }
  const g = ganadorMesa(e, e.mesa).j;
  const eq = e.equipos[g];
  let suma = e.mesa.reduce((s, x) => s + pts(x.carta), 0);
  const ultima = e.manos.every((m) => !m.length) && !conMazo(e);
  if (ultima) suma += 10;
  e.puntos[eq] += suma; e.bazas[eq]++;
  e.ultimaBaza = { cartas: e.mesa, ganador: g, puntos: suma, ultimas: ultima };
  e.mesa = [];
  if (e.n === 2) for (let k = 0; k < 2; k++) { const c = robar(e); if (c) e.manos[(g + k) % 2].push(c); }
  e.turno = g;
  if (e.manos.every((m) => !m.length)) { e.terminada = true; e.turno = -1; }
  else e.puedeCantar = g; // quien gana la baza puede cantar antes de salir
  return { ok: true };
}

function vista(e, yo) {
  const mio = yo >= 0 && e.turno === yo;
  return {
    n: e.n, palo: e.palo, triunfo: e.triunfoTomado && e.n === 2 ? null : e.n === 2 ? e.triunfo : e.triunfo,
    triunfoDe: e.n === 2 ? null : e.n - 1, quedan: e.mazo.length + (e.triunfoTomado ? 0 : 1),
    mano: yo >= 0 ? e.manos[yo] : [], cartas: e.manos.map((m) => m.length), mesa: e.mesa, turno: e.turno, equipos: e.equipos,
    bazas: e.bazas, cantes: e.cantes, cantados: e.cantados, puntos: e.terminada ? e.puntos.map((p, i) => p + e.cantes[i]) : null,
    ultimaBaza: e.ultimaBaza, aviso: e.aviso, obligado: e.n !== 2 || !conMazo(e),
    jugables: mio ? legales(e, yo).map(id) : [],
    cantes2: mio ? cantesPosibles(e, yo) : [], tute: mio && e.puedeCantar === yo && tieneTute(e.manos[yo]),
    puedeCambiar7: mio && e.n === 2 && !e.mesa.length && !e.triunfoTomado && e.mazo.length > 0 && e.triunfo.n !== 7 && e.manos[yo].some((c) => c.p === e.palo && c.n === 7),
  };
}
const turno = (e) => (e.terminada ? -1 : e.turno);
function fin(e) {
  if (!e.terminada) return null;
  const quien = (eq) => e.equipos.map((q, j) => (q === eq ? j : -1)).filter((j) => j >= 0);
  if (e.tute >= 0) return { ganadores: quien(e.tute), texto: '¡Tute! (4 reyes o 4 caballos)' };
  const tot = e.puntos.map((p, i) => p + e.cantes[i]);
  const max = Math.max(...tot);
  const eqs = tot.map((p, i) => (p === max ? i : -1)).filter((i) => i >= 0);
  return { ganadores: eqs.length > 1 ? [] : quien(eqs[0]), texto: eqs.length > 1 ? `Empate a ${max}` : `${max} puntos (cantes incluidos)` };
}

// --- CPU ----------------------------------------------------------------------------------------
const coste = (e, c) => pts(c) * 2 + (c.p === e.palo ? 15 + fuerza(c) : fuerza(c) * 0.3) + (c.n === 12 || c.n === 11 ? 3 : 0);
function bot(e, yo, nivel, rnd) {
  if (turno(e) !== yo) return null;
  const v = vista(e, yo);
  if (v.tute) return { tipo: 'tute' };
  if (v.cantes2.length) return { tipo: 'cantar', palo: v.cantes2.includes(e.palo) ? e.palo : v.cantes2[0] };
  if (v.puedeCambiar7) return { tipo: 'cambiar7' };
  const ops = legales(e, yo);
  const jugar = (c) => ({ tipo: 'jugar', carta: id(c) });
  if (nivel !== 'dificil' && rnd() < 0.1) return jugar(ops[Math.floor(rnd() * ops.length)]);
  const barata = () => ops.reduce((a, b) => (coste(e, b) < coste(e, a) ? b : a));
  if (!e.mesa.length) return jugar(barata());
  const g = ganadorMesa(e, e.mesa);
  if (e.n === 4 && e.equipos[g.j] === e.equipos[yo]) {
    const cargas = ops.filter((c) => c.p !== e.palo && pts(c) > 0 && c.n !== 12 && c.n !== 11);
    if (cargas.length && (e.mesa.length === e.n - 1 || fuerza(g.carta) >= 8)) return jugar(cargas.reduce((a, b) => (pts(b) > pts(a) ? b : a)));
    return jugar(barata());
  }
  const ganan = ops.filter((c) => ganadorMesa(e, [...e.mesa, { j: yo, carta: c }]).j === yo);
  const enMesa = e.mesa.reduce((s, x) => s + pts(x.carta), 0);
  if (ganan.length && (enMesa >= (nivel === 'dificil' ? 3 : 8) || ganan.some((c) => c.p !== e.palo))) return jugar(ganan.reduce((a, b) => (coste(e, b) < coste(e, a) ? b : a)));
  return jugar(barata());
}

module.exports = { id: 'tute', min: 2, max: 4, nuevo, vista, accion, turno, fin, bot, _: { legales, ganadorMesa } };
