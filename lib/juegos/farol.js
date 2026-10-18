'use strict';
// Farol (3-10). Sale una palabra rara; cada uno se inventa una definición que parezca verdadera. Luego se
// mezclan con la de verdad y cada uno vota la que cree auténtica. Aciertas: +2. Por cada voto a tu
// invención: +1. 6 rondas (o una por persona si sois más). Los autores no se ven hasta el resultado.
const { FAROL } = require('./fiesta2');
const { normalizar } = require('./palabras-fiesta');
const T_ESCRIBIR = 90000, T_VOTAR = 45000, T_RESULTADO = 10000;
function nuevo(n, rnd = Math.random) {
  const e = { n, rnd, puntos: Array(n).fill(0), ronda: 0, total: Math.max(6, Math.min(n, 8)), orden: [...FAROL.keys()].sort(() => rnd() - 0.5), ganador: null };
  ronda(e); return e;
}
function ronda(e) {
  e.ronda++;
  e.palabra = FAROL[e.orden[(e.ronda - 1) % e.orden.length]];
  Object.assign(e, { fase: 'escribir', inventos: Array(e.n).fill(null), votos: Array(e.n).fill(null), opciones: null, resultado: null, hasta: Date.now() + T_ESCRIBIR });
}
function abrirVotacion(e) {
  const ops = [{ autor: -1, texto: e.palabra[1] }];
  e.inventos.forEach((t, j) => { if (t && normalizar(t) !== normalizar(e.palabra[1])) ops.push({ autor: j, texto: t }); });
  for (let i = ops.length - 1; i > 0; i--) { const k = Math.floor(e.rnd() * (i + 1)); [ops[i], ops[k]] = [ops[k], ops[i]]; }
  e.opciones = ops; e.fase = 'votar'; e.hasta = Date.now() + T_VOTAR;
}
function puntuar(e) {
  const pts = Array(e.n).fill(0);
  e.votos.forEach((o, j) => { if (o === null) return; const op = e.opciones[o]; if (op.autor < 0) pts[j] += 2; else if (op.autor !== j) pts[op.autor] += 1; });
  pts.forEach((p, j) => { e.puntos[j] += p; });
  e.resultado = { opciones: e.opciones, votos: [...e.votos], pts };
  e.fase = 'resultado'; e.hasta = Date.now() + T_RESULTADO;
  if (e.ronda >= e.total) { const m = Math.max(...e.puntos); e.ganador = e.puntos.map((p, j) => (p === m ? j : -1)).filter((j) => j >= 0); e.hasta = 0; }
}
function accion(e, yo, a) {
  if (e.ganador) return { ok: false, error: 'La partida ha terminado' };
  if (a.tipo === 'inventar') {
    if (e.fase !== 'escribir') return { ok: false, error: 'Ya no se escribe' };
    const t = String(a.texto ?? '').replace(/\s+/g, ' ').trim().slice(0, 140);
    if (t.length < 3) return { ok: false, error: 'Escribe una definición' };
    e.inventos[yo] = t;
    if (e.inventos.every(Boolean)) abrirVotacion(e);
    return { ok: true };
  }
  if (a.tipo === 'votar') {
    if (e.fase !== 'votar') return { ok: false, error: 'Ahora no se vota' };
    const o = Number(a.o);
    if (!Number.isInteger(o) || !e.opciones[o]) return { ok: false, error: 'Opción no válida' };
    if (e.opciones[o].autor === yo) return { ok: false, error: '¡No puedes votar la tuya!' };
    e.votos[yo] = o;
    if (e.votos.every((v) => v !== null)) puntuar(e);
    return { ok: true };
  }
  if (a.tipo === 'seguir') { if (e.fase !== 'resultado') return { ok: false, error: 'Ahora no' }; ronda(e); return { ok: true }; }
  return { ok: false, error: 'Acción desconocida' };
}
function tiempo(e, ahora) {
  if (e.ganador || !e.hasta || ahora < e.hasta) return false;
  if (e.fase === 'escribir') { abrirVotacion(e); return true; }
  if (e.fase === 'votar') { puntuar(e); return true; }
  if (e.fase === 'resultado') { ronda(e); return true; }
  return false;
}
function vista(e, yo) {
  return {
    n: e.n, puntos: e.puntos, ronda: e.ronda, total: e.total, palabra: e.palabra[0], fase: e.fase, hasta: e.hasta,
    escrito: e.inventos.map(Boolean), mio: yo >= 0 ? e.inventos[yo] : null,
    opciones: e.opciones && e.fase === 'votar' ? e.opciones.map((o) => ({ texto: o.texto, mia: o.autor === yo && yo >= 0 })) : null,
    votado: e.votos.map((v) => v !== null), miVoto: yo >= 0 ? e.votos[yo] : null, resultado: e.resultado, ganadores: e.ganador,
  };
}
const turno = () => -1;
const fin = (e) => (e.ganador ? { ganadores: e.ganador, texto: `${Math.max(...e.puntos)} puntos` } : null);
const bot = () => null;
module.exports = { id: 'farol', min: 3, max: 10, sinCpu: true, nuevo, vista, accion, turno, fin, bot, tiempo };
