'use strict';
// Brisca con baraja española de 40 cartas. 2 o 3 jugadores individuales; 4 por parejas (asientos 0+2 contra 1+3).
// Sin obligación de asistir ni de matar. El 7 del triunfo se puede cambiar por la carta de triunfo en tu turno
// mientras quede mazo. Gana quien pase de 60 puntos (de 120).
const PALOS = ['oros', 'copas', 'espadas', 'bastos'];
const NUMS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
const FUERZA = [1, 3, 12, 11, 10, 7, 6, 5, 4, 2]; // de más a menos
const PUNTOS = { 1: 11, 3: 10, 12: 4, 11: 3, 10: 2 };
const pts = (c) => PUNTOS[c.n] || 0;
const fuerza = (c) => 10 - FUERZA.indexOf(c.n);
const id = (c) => `${c.p}-${c.n}`;

function barajar(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function nuevo(n, rnd) {
  let mazo = [];
  for (const p of PALOS) for (const x of NUMS) mazo.push({ p, n: x });
  if (n === 3) mazo = mazo.filter((c) => !(c.p === 'oros' && c.n === 2)); // 39 cartas, reparto exacto
  barajar(mazo, rnd);
  const manos = Array.from({ length: n }, () => []);
  for (let r = 0; r < 3; r++) for (let j = 0; j < n; j++) manos[j].push(mazo.pop());
  const triunfo = mazo.shift(); // boca arriba bajo el mazo: es la última que se roba
  return {
    n, manos, mazo, triunfo, triunfoTomado: false, palo: triunfo.p,
    equipos: n === 4 ? [0, 1, 0, 1] : Array.from({ length: n }, (_, i) => i),
    puntos: Array(n === 4 ? 2 : n).fill(0), bazas: Array(n === 4 ? 2 : n).fill(0),
    mesa: [], mano: 0, turno: 0, ultimaBaza: null, aviso: null, terminada: false,
  };
}

function ganadorMesa(e, mesa) {
  let g = mesa[0];
  for (const x of mesa.slice(1)) {
    const tg = g.carta.p === e.palo, tx = x.carta.p === e.palo;
    if (tx && !tg) g = x;
    else if (tx === tg && x.carta.p === g.carta.p && fuerza(x.carta) > fuerza(g.carta)) g = x;
  }
  return g.j;
}

function robar(e) {
  if (e.mazo.length) return e.mazo.pop();
  if (!e.triunfoTomado) { e.triunfoTomado = true; return e.triunfo; }
  return null;
}

function accion(e, yo, a) {
  if (e.terminada) return { ok: false, error: 'La partida ha terminado' };
  if (e.turno !== yo) return { ok: false, error: 'No es tu turno' };
  const mano = e.manos[yo];
  if (a.tipo === 'cambiar7') {
    const i = mano.findIndex((c) => c.p === e.palo && c.n === 7);
    if (i < 0 || !e.mazo.length || e.triunfoTomado || e.triunfo.n === 7) return { ok: false, error: 'Ahora no puedes cambiar el 7' };
    [mano[i], e.triunfo] = [e.triunfo, mano[i]];
    e.aviso = { j: yo, texto: 'cambia el 7 de triunfo' };
    return { ok: true };
  }
  if (a.tipo !== 'jugar') return { ok: false, error: 'Acción desconocida' };
  const i = mano.findIndex((c) => id(c) === a.carta);
  if (i < 0) return { ok: false, error: 'No tienes esa carta' };
  e.mesa.push({ j: yo, carta: mano.splice(i, 1)[0] });
  e.aviso = null;
  if (e.mesa.length < e.n) { e.turno = (yo + 1) % e.n; return { ok: true }; }
  // baza completa
  const g = ganadorMesa(e, e.mesa);
  const eq = e.equipos[g];
  const suma = e.mesa.reduce((s, x) => s + pts(x.carta), 0);
  e.puntos[eq] += suma;
  e.bazas[eq]++;
  e.ultimaBaza = { cartas: e.mesa, ganador: g, puntos: suma };
  e.mesa = [];
  for (let k = 0; k < e.n; k++) { const c = robar(e); if (c) e.manos[(g + k) % e.n].push(c); }
  e.mano = e.turno = g;
  if (e.manos.every((m) => !m.length)) { e.terminada = true; e.turno = -1; }
  return { ok: true };
}

function vista(e, yo) {
  return {
    n: e.n, palo: e.palo,
    triunfo: e.triunfoTomado ? null : e.triunfo,
    quedan: e.mazo.length + (e.triunfoTomado ? 0 : 1),
    mano: yo >= 0 ? e.manos[yo] : [],
    cartas: e.manos.map((m) => m.length),
    mesa: e.mesa, turno: e.turno, equipos: e.equipos,
    bazas: e.bazas,
    puntos: e.terminada ? e.puntos : null, // los puntos se cuentan al final, como en la mesa de verdad
    ultimaBaza: e.ultimaBaza, aviso: e.aviso,
    puedeCambiar7: yo >= 0 && e.turno === yo && !e.triunfoTomado && e.mazo.length > 0 && e.triunfo.n !== 7 && e.manos[yo].some((c) => c.p === e.palo && c.n === 7),
  };
}

const turno = (e) => (e.terminada ? -1 : e.turno);
function fin(e) {
  if (!e.terminada) return null;
  const max = Math.max(...e.puntos);
  const eqs = e.puntos.map((p, i) => (p === max ? i : -1)).filter((i) => i >= 0);
  const ganadores = eqs.length > 1 ? [] : e.equipos.map((q, j) => (q === eqs[0] ? j : -1)).filter((j) => j >= 0);
  return { ganadores, texto: eqs.length > 1 ? `Empate a ${max}` : `${max} puntos`, puntos: e.puntos, equipos: e.equipos };
}

// --- CPU ------------------------------------------------------------------------------------
// coste de soltar una carta: puntos que regala + lo que vale como triunfo
function coste(e, c) { return pts(c) * 2 + (c.p === e.palo ? 15 + fuerza(c) : fuerza(c) * 0.3); }

function bot(e, yo, nivel, rnd) {
  if (turno(e) !== yo) return null;
  const mano = e.manos[yo];
  const v = vista(e, yo);
  if (v.puedeCambiar7 && pts(e.triunfo) + fuerza(e.triunfo) > 8) return { tipo: 'cambiar7' };
  if (nivel !== 'dificil' && rnd() < 0.12) return { tipo: 'jugar', carta: id(mano[Math.floor(rnd() * mano.length)]) };
  const barata = () => mano.reduce((a, b) => (coste(e, b) < coste(e, a) ? b : a));
  if (!e.mesa.length) return { tipo: 'jugar', carta: id(barata()) };

  const enMesa = e.mesa.reduce((s, x) => s + pts(x.carta), 0);
  const ultimo = e.mesa.length === e.n - 1;
  const g = ganadorMesa(e, e.mesa);
  // compañero ganando: si soy el último (o su carta es muy alta), cargar puntos que no sean triunfo
  if (e.n === 4 && e.equipos[g] === e.equipos[yo]) {
    const cg = e.mesa.find((x) => x.j === g).carta;
    const segura = ultimo || (cg.p === e.palo && fuerza(cg) >= 8) || (cg.p !== e.palo && cg.n === 1);
    const cargas = mano.filter((c) => c.p !== e.palo && pts(c) > 0);
    if (segura && cargas.length) return { tipo: 'jugar', carta: id(cargas.reduce((a, b) => (pts(b) > pts(a) ? b : a))) };
    return { tipo: 'jugar', carta: id(barata()) };
  }
  // ¿qué cartas ganan la baza?
  const ganan = mano.filter((c) => ganadorMesa(e, [...e.mesa, { j: yo, carta: c }]) === yo);
  const sinTriunfo = ganan.filter((c) => c.p !== e.palo);
  const umbral = nivel === 'dificil' ? (ultimo ? 2 : 4) : 10;
  if (sinTriunfo.length) {
    // ganar sin gastar triunfo: con la que más puntos sume si soy el último; si no, con la más baja que gane
    const c = ultimo ? sinTriunfo.reduce((a, b) => (pts(b) > pts(a) ? b : a)) : sinTriunfo.reduce((a, b) => (fuerza(b) < fuerza(a) ? b : a));
    return { tipo: 'jugar', carta: id(c) };
  }
  if (ganan.length && enMesa >= umbral) return { tipo: 'jugar', carta: id(ganan.reduce((a, b) => (coste(e, b) < coste(e, a) ? b : a))) };
  return { tipo: 'jugar', carta: id(barata()) };
}

module.exports = { id: 'brisca', min: 2, max: 4, nuevo, vista, accion, turno, fin, bot, _: { ganadorMesa, pts, id } };
