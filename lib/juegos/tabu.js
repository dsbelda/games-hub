'use strict';
// Tabú (4-10, dos equipos por asientos pares e impares). Por turnos, alguien de un equipo describe palabras sin
// decir la palabra ni las cinco prohibidas, en 60 s, para que su equipo las adivine. Se puede jugar en persona
// (quien describe marca «Acertada») u online (escribiendo pistas: si llevan una palabra prohibida, ¡tabú!; los de
// su equipo escriben lo que creen que es). El otro equipo ve la tarjeta y puede pitar «¡Tabú!».
// Acierto +1, tabú −1, pasar 0. Cada uno describe una vez (dos, si sois 4 o 5); gana el equipo con más puntos.
const { TABU } = require('./fiesta2');
const { normalizar } = require('./palabras-fiesta');
const T_TURNO = 60000, T_PAUSA = 6000;
const equipo = (j) => j % 2;
function nuevo(n, rnd = Math.random) {
  const orden = [...TABU.keys()].sort(() => rnd() - 0.5);
  const e = { n, rnd, orden, puntos: [0, 0], turnoN: 0, total: n * (n <= 5 ? 2 : 1), fase: 'listo', feed: [], ganador: null, hasta: 0 };
  prepararTurno(e);
  return e;
}
function prepararTurno(e) {
  // alternan equipos; dentro de cada equipo, por orden
  const t = e.turnoN % 2, miembros = Array.from({ length: e.n }, (_, j) => j).filter((j) => equipo(j) === t);
  e.equipoTurno = t; e.describe = miembros[Math.floor(e.turnoN / 2) % miembros.length];
  e.fase = 'listo'; e.carta = null; e.hasta = 0; e.cuentaTurno = { aciertos: 0, tabus: 0, pasadas: 0 };
}
function sacar(e) { e.carta = e.orden.shift(); if (!e.orden.length) e.orden = [...TABU.keys()].sort(() => e.rnd() - 0.5); }
const prohibida = (e, texto) => {
  const [w, r] = TABU[e.carta];
  const ts = normalizar(texto).split(' '), ps = [w, ...r].map(normalizar).flatMap((x) => x.split(' '));
  return ps.find((p) => ts.some((t) => t === p || (t.length >= 5 && p.length >= 5 && t.slice(0, 5) === p.slice(0, 5))));
};
function siguienteCarta(e, tipo, j, extra) { e.feed.push({ tipo, j, palabra: TABU[e.carta][0], extra }); e.feed = e.feed.slice(-30); sacar(e); }
function acabarTurno(e) {
  e.fase = 'pausa'; e.hasta = Date.now() + T_PAUSA; e.carta = null; e.turnoN++;
  if (e.turnoN >= e.total) { const [a, b] = e.puntos; e.ganador = Array.from({ length: e.n }, (_, j) => j).filter((j) => (a === b ? true : equipo(j) === (a > b ? 0 : 1))); e.hasta = 0; }
}
function accion(e, yo, a) {
  if (e.ganador) return { ok: false, error: 'La partida ha terminado' };
  if (a.tipo === 'empezar') {
    if (e.fase !== 'listo' || yo !== e.describe) return { ok: false, error: 'Ahora no' };
    e.fase = 'jugando'; e.hasta = Date.now() + T_TURNO; sacar(e); return { ok: true };
  }
  if (a.tipo === 'seguir') { if (e.fase !== 'pausa') return { ok: false, error: 'Ahora no' }; prepararTurno(e); return { ok: true }; }
  if (e.fase !== 'jugando') return { ok: false, error: 'El turno no ha empezado' };
  const mismo = equipo(yo) === e.equipoTurno;
  if (a.tipo === 'acierto' || a.tipo === 'pasar') {
    if (yo !== e.describe) return { ok: false, error: 'Solo quien describe' };
    if (a.tipo === 'acierto') { e.puntos[e.equipoTurno]++; e.cuentaTurno.aciertos++; } else e.cuentaTurno.pasadas++;
    siguienteCarta(e, a.tipo, yo); return { ok: true };
  }
  if (a.tipo === 'tabu') {
    if (mismo) return { ok: false, error: 'Solo el otro equipo pita' };
    e.puntos[e.equipoTurno]--; e.cuentaTurno.tabus++; siguienteCarta(e, 'tabu', yo); return { ok: true };
  }
  if (a.tipo === 'pista') {
    if (yo !== e.describe) return { ok: false, error: 'Solo quien describe' };
    const texto = String(a.texto ?? '').replace(/\s+/g, ' ').trim().slice(0, 80); if (!texto) return { ok: false };
    const mala = prohibida(e, texto);
    if (mala) { e.puntos[e.equipoTurno]--; e.cuentaTurno.tabus++; siguienteCarta(e, 'tabu', yo, `dijo «${mala}»`); return { ok: true }; }
    e.feed.push({ tipo: 'pista', j: yo, texto }); e.feed = e.feed.slice(-30); return { ok: true };
  }
  if (a.tipo === 'adivinar') {
    if (!mismo || yo === e.describe) return { ok: false, error: 'Adivina tu equipo' };
    const texto = String(a.texto ?? '').replace(/\s+/g, ' ').trim().slice(0, 40); if (!texto) return { ok: false };
    if (normalizar(texto) === normalizar(TABU[e.carta][0])) { e.puntos[e.equipoTurno]++; e.cuentaTurno.aciertos++; siguienteCarta(e, 'acierto', yo); }
    else { e.feed.push({ tipo: 'intento', j: yo, texto }); e.feed = e.feed.slice(-30); }
    return { ok: true };
  }
  return { ok: false, error: 'Acción desconocida' };
}
function tiempo(e, ahora) {
  if (e.ganador || !e.hasta || ahora < e.hasta) return false;
  if (e.fase === 'jugando') { acabarTurno(e); return true; }
  if (e.fase === 'pausa') { prepararTurno(e); return true; }
  return false;
}
function vista(e, yo) {
  const ve = yo >= 0 && e.carta !== null && (yo === e.describe || equipo(yo) !== e.equipoTurno);
  return {
    n: e.n, puntos: e.puntos, fase: e.fase, hasta: e.hasta, describe: e.describe, equipoTurno: e.equipoTurno, turnoN: e.turnoN, total: e.total,
    carta: ve ? TABU[e.carta] : null, hayCarta: e.carta !== null, feed: e.feed.slice(-15), cuentaTurno: e.cuentaTurno, ganadores: e.ganador,
  };
}
const turno = (e) => (e.ganador ? -1 : e.fase === 'listo' || e.fase === 'jugando' ? e.describe : -1);
const fin = (e) => (e.ganador ? { ganadores: e.ganador, texto: `${e.puntos[0]} a ${e.puntos[1]}` } : null);
const bot = () => null;
module.exports = { id: 'tabu', min: 4, max: 10, sinCpu: true, nuevo, vista, accion, turno, fin, bot, tiempo, _: { prohibida } };
