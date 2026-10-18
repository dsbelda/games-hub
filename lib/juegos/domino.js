'use strict';
// Dominó por parejas (4: 0 y 2 contra 1 y 3), doble seis, 7 fichas cada uno, sin pozo. La primera mano la abre
// quien tiene el seis doble; las siguientes, quien ganó la anterior (con la ficha que quiera). Se pone en
// cualquiera de los dos extremos; quien no puede, pasa (el servidor pasa solo). Si alguien se queda sin
// fichas («¡dominó!»), su pareja se apunta los puntos de las fichas de la pareja contraria. Si se tranca
// (nadie puede), gana la pareja con menos puntos en la mano y se apunta los de la otra. A 100 puntos.
const META = 100;
const FICHAS = []; for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) FICHAS.push([a, b]);
const pareja = (j) => j % 2;
const suma = (mano) => mano.reduce((s, [a, b]) => s + a + b, 0);

function nuevo(n, rnd = Math.random) { const e = { n: 4, rnd, puntos: [0, 0], mano: 0, ganadorMano: null, ganador: null, log: [] }; repartir(e); return e; }
function repartir(e) {
  const f = FICHAS.map((x) => [...x]);
  for (let i = f.length - 1; i > 0; i--) { const k = Math.floor(e.rnd() * (i + 1)); [f[i], f[k]] = [f[k], f[i]]; }
  e.manos = [0, 1, 2, 3].map((j) => f.slice(j * 7, j * 7 + 7));
  e.linea = []; e.extremos = null; e.pases = 0; e.mano++; e.resultado = null; e.pasaron = [[], [], [], []];
  e.turno = e.ganadorMano ?? e.manos.findIndex((m) => m.some(([a, b]) => a === 6 && b === 6));
  e.abreSeis = e.ganadorMano == null;
}
const encaja = (e, [a, b]) => (!e.extremos ? [] : [...(a === e.extremos[0] || b === e.extremos[0] ? ['izq'] : []), ...(a === e.extremos[1] || b === e.extremos[1] ? ['der'] : [])]);
function jugables(e, j) {
  return e.manos[j].map((f, i) => [i, e.extremos ? encaja(e, f) : (e.abreSeis ? (f[0] === 6 && f[1] === 6 ? ['izq'] : []) : ['izq'])]).filter(([, l]) => l.length);
}
function poner(e, j, i, lado) {
  const f = e.manos[j].splice(i, 1)[0];
  if (!e.extremos) { e.linea.push({ f, j }); e.extremos = [f[0], f[1]]; }
  else if (lado === 'izq') { const g = f[1] === e.extremos[0] ? f : [f[1], f[0]]; e.linea.unshift({ f: g, j }); e.extremos[0] = g[0]; }
  else { const g = f[0] === e.extremos[1] ? f : [f[1], f[0]]; e.linea.push({ f: g, j }); e.extremos[1] = g[1]; }
  e.abreSeis = false; e.pases = 0;
  e.log.push({ j, f, lado });
  if (!e.manos[j].length) return cerrar(e, pareja(j), j, 'domino');
  avanzar(e);
}
// pasa al siguiente; los que no pueden poner pasan solos; si pasan los cuatro, tranque
function avanzar(e) {
  for (let k = 0; k < 4; k++) {
    e.turno = (e.turno + 1) % 4;
    if (jugables(e, e.turno).length) return;
    e.pases++; e.pasaron[e.turno].push(...e.extremos); e.log.push({ j: e.turno, pasa: true });
    if (e.pases >= 4) {
      const p = [suma(e.manos[0]) + suma(e.manos[2]), suma(e.manos[1]) + suma(e.manos[3])];
      return cerrar(e, p[0] < p[1] ? 0 : p[1] < p[0] ? 1 : -1, -1, 'tranque');
    }
  }
}
function cerrar(e, gana, quien, como) {
  const pts = gana < 0 ? 0 : suma(e.manos[1 - gana]) + suma(e.manos[3 - gana]) + (como === 'tranque' ? 0 : 0);
  if (gana >= 0) e.puntos[gana] += pts;
  e.resultado = { gana, quien, como, pts, manos: e.manos.map((m) => m.map((f) => [...f])) };
  e.log = e.log.slice(-12);
  // la siguiente mano la abre quien dominó (o, en tranque, el de la pareja ganadora con menos puntos)
  e.ganadorMano = quien >= 0 ? quien : gana >= 0 ? (suma(e.manos[gana]) <= suma(e.manos[gana + 2]) ? gana : gana + 2) : e.turno;
  if (e.puntos.some((p) => p >= META)) { const g = e.puntos[0] >= e.puntos[1] ? 0 : 1; e.ganador = [g, g + 2]; }
}
function accion(e, yo, a) {
  if (e.ganador) return { ok: false, error: 'La partida ha terminado' };
  if (a.tipo === 'seguir') { if (!e.resultado) return { ok: false, error: 'Ahora no' }; repartir(e); if (!jugables(e, e.turno).length) avanzar(e); return { ok: true }; }
  if (e.resultado) return { ok: false, error: 'La mano ha terminado' };
  if (a.tipo !== 'poner') return { ok: false, error: 'Acción desconocida' };
  if (yo !== e.turno) return { ok: false, error: 'No es tu turno' };
  const i = Number(a.i), op = jugables(e, yo).find(([k]) => k === i);
  if (!op) return { ok: false, error: e.abreSeis ? 'Se empieza con el seis doble' : 'Esa ficha no encaja' };
  const lado = op[1].includes(a.lado) ? a.lado : op[1][0];
  poner(e, yo, i, lado);
  return { ok: true };
}
// CPU: normal, la ficha que más pesa; difícil, además dobles pronto, guardar variedad y cerrar los números
// que le faltan a los rivales (los que tenían los extremos cuando pasaron)
function bot(e, yo, nivel, rnd) {
  if (e.ganador) return null;
  if (e.resultado) return yo === 0 ? { tipo: 'seguir' } : null;
  if (yo !== e.turno) return null;
  const ops = jugables(e, yo); if (!ops.length) return null;
  const mano = e.manos[yo];
  let mejor = null, mv = -Infinity;
  for (const [i, lados] of ops) for (const lado of lados) {
    const [a, b] = mano[i];
    let v = a + b + rnd() * (nivel === 'dificil' ? 0.5 : 4);
    if (nivel === 'dificil') {
      if (a === b) v += 4;
      const queda = !e.extremos ? null : lado === 'izq' ? (b === e.extremos[0] ? a : b) : (a === e.extremos[1] ? b : a);
      if (queda != null) {
        v += mano.filter((f, k) => k !== i && (f[0] === queda || f[1] === queda)).length * 2; // podré seguir
        for (const r of [(yo + 1) % 4, (yo + 3) % 4]) if (e.pasaron[r].includes(queda)) v += 5; // al rival le falta
        if (e.pasaron[(yo + 2) % 4].includes(queda)) v -= 4; // a mi pareja también
      }
    }
    if (v > mv) { mv = v; mejor = { tipo: 'poner', i, lado }; }
  }
  return mejor;
}
const vista = (e, yo) => ({
  n: 4, mano: e.mano, puntos: e.puntos, meta: META, turno: e.turno, linea: e.linea, extremos: e.extremos, abreSeis: e.abreSeis,
  mia: yo >= 0 ? e.manos[yo] : [], cuantas: e.manos.map((m) => m.length), jugables: yo >= 0 && !e.resultado && yo === e.turno ? jugables(e, yo) : [],
  log: e.log.slice(-6), resultado: e.resultado, ganadores: e.ganador,
});
const turno = (e) => (e.ganador || e.resultado ? -1 : e.turno);
const fin = (e) => (e.ganador ? { ganadores: e.ganador, texto: `${Math.max(...e.puntos)} a ${Math.min(...e.puntos)}` } : null);
module.exports = { id: 'domino', min: 4, max: 4, nuevo, vista, accion, turno, fin, bot };
