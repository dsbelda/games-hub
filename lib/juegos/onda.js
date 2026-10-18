'use strict';
// En la onda (2-10). Por turnos, una persona ve dónde está la aguja (0-100) en una escala entre dos opuestos
// («Frío — Caliente») y da una pista; los demás ponen su dial donde creen que está. Puntos según lo cerca:
// a 4 o menos, 4; a 10, 3; a 17, 2; a 25, 1. Quien da la pista gana la media de los demás. Cada uno da la pista
// una vez (dos si sois 3 o menos). La aguja no viaja al navegador hasta el final de la ronda.
const { ONDA } = require('./fiesta2');
const T_PISTA = 90000, T_ADIVINAR = 60000, T_RESULTADO = 9000;
const puntosPor = (d) => (d <= 4 ? 4 : d <= 10 ? 3 : d <= 17 ? 2 : d <= 25 ? 1 : 0);
function nuevo(n, rnd = Math.random) {
  const e = { n, rnd, puntos: Array(n).fill(0), ronda: 0, total: n * (n <= 3 ? 2 : 1), escalas: [...ONDA.keys()].sort(() => rnd() - 0.5), ganador: null };
  ronda(e); return e;
}
function ronda(e) {
  e.psiquico = e.ronda % e.n; e.ronda++;
  e.escala = ONDA[e.escalas[(e.ronda - 1) % e.escalas.length]];
  e.objetivo = 3 + Math.floor(e.rnd() * 95);
  Object.assign(e, { fase: 'pista', pista: null, diales: Array(e.n).fill(50), listos: Array(e.n).fill(false), resultado: null, hasta: Date.now() + T_PISTA });
}
function puntuar(e) {
  const pts = Array(e.n).fill(0), otros = [];
  for (let j = 0; j < e.n; j++) if (j !== e.psiquico) { pts[j] = puntosPor(Math.abs(e.diales[j] - e.objetivo)); otros.push(pts[j]); }
  pts[e.psiquico] = otros.length ? Math.round(otros.reduce((s, x) => s + x, 0) / otros.length) : 0;
  pts.forEach((p, j) => { e.puntos[j] += p; });
  e.resultado = { objetivo: e.objetivo, diales: [...e.diales], pts };
  e.fase = 'resultado'; e.hasta = Date.now() + T_RESULTADO;
  if (e.ronda >= e.total) { const m = Math.max(...e.puntos); e.ganador = e.puntos.map((p, j) => (p === m ? j : -1)).filter((j) => j >= 0); e.hasta = 0; }
}
function accion(e, yo, a) {
  if (e.ganador) return { ok: false, error: 'La partida ha terminado' };
  if (a.tipo === 'pista') {
    if (e.fase !== 'pista' || yo !== e.psiquico) return { ok: false, error: 'Ahora no' };
    const t = String(a.texto ?? '').replace(/\s+/g, ' ').trim().slice(0, 60); if (!t) return { ok: false, error: 'Escribe una pista' };
    e.pista = t; e.fase = 'adivinar'; e.hasta = Date.now() + T_ADIVINAR; return { ok: true };
  }
  if (a.tipo === 'dial') {
    if (e.fase !== 'adivinar' || yo === e.psiquico) return { ok: false, error: 'Ahora no' };
    e.diales[yo] = Math.max(0, Math.min(100, Math.round(Number(a.v) || 0)));
    if (a.listo !== undefined) e.listos[yo] = !!a.listo;
    if (e.listos.every((l, j) => l || j === e.psiquico)) puntuar(e);
    return { ok: true, sinVista: a.listo === undefined };
  }
  if (a.tipo === 'seguir') { if (e.fase !== 'resultado') return { ok: false, error: 'Ahora no' }; ronda(e); return { ok: true }; }
  return { ok: false, error: 'Acción desconocida' };
}
function tiempo(e, ahora) {
  if (e.ganador || !e.hasta || ahora < e.hasta) return false;
  if (e.fase === 'pista') { e.pista = '(no dio pista)'; e.fase = 'adivinar'; e.hasta = ahora + T_ADIVINAR; return true; }
  if (e.fase === 'adivinar') { puntuar(e); return true; }
  if (e.fase === 'resultado') { ronda(e); return true; }
  return false;
}
const vista = (e, yo) => ({
  n: e.n, puntos: e.puntos, ronda: e.ronda, total: e.total, psiquico: e.psiquico, escala: e.escala, fase: e.fase, pista: e.pista, hasta: e.hasta,
  objetivo: yo === e.psiquico || e.fase === 'resultado' ? e.objetivo : null, miDial: yo >= 0 ? e.diales[yo] : 50, listos: e.listos, resultado: e.resultado, ganadores: e.ganador,
});
const turno = (e) => (e.ganador ? -1 : e.fase === 'pista' ? e.psiquico : -1);
const fin = (e) => (e.ganador ? { ganadores: e.ganador, texto: `${Math.max(...e.puntos)} puntos` } : null);
const bot = () => null;
module.exports = { id: 'onda', min: 2, max: 10, sinCpu: true, nuevo, vista, accion, turno, fin, bot, tiempo };
