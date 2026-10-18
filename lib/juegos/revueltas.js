'use strict';
// Letras revueltas (2-8): tablero de 4×4 letras; todos a la vez durante 90 s, uniendo letras vecinas
// (también en diagonal, sin repetir casilla) para formar palabras de 3 o más. Cada letra vale lo que en
// los juegos de fichas y las palabras largas llevan premio. 3 rondas; gana quien más puntos sume.
// Las CPUs «encuentran» palabras poco a poco desde tiempo(); la lista completa solo se ve al acabar la ronda.
const D = require('../diccionario');
const T_RONDA = 90000, T_RESULTADO = 12000, RONDAS = 3, MIN_PALABRAS = 60;
// letras con su peso (frecuencia aproximada en castellano) y valor
const LETRAS = { a: [12, 1], e: [12, 1], o: [9, 1], i: [6, 1], u: [4, 1], s: [7, 1], r: [7, 1], n: [7, 1], l: [5, 1], d: [5, 2], t: [5, 1], c: [5, 3], m: [3, 3], p: [3, 3], b: [2, 3], g: [2, 2], v: [1, 4], f: [1, 4], h: [1, 4], j: [1, 8], z: [1, 10], ñ: [1, 8], y: [1, 4], x: [0.5, 8] };
const BOLSA = Object.entries(LETRAS).flatMap(([l, [p]]) => Array(Math.round(p * 2)).fill(l));
const VOCALES = new Set(['a', 'e', 'i', 'o', 'u']);
const VECINOS = Array.from({ length: 16 }, (_, i) => { const out = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = (i % 4) + dx, y = Math.floor(i / 4) + dy; if ((dx || dy) && x >= 0 && x < 4 && y >= 0 && y < 4) out.push(y * 4 + x); } return out; });
const puntos = (w) => [...w].reduce((s, l) => s + (LETRAS[l]?.[1] || 1), 0) + [0, 0, 0, 0, 0, 3, 6, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55][w.length];

// todas las palabras del tablero (búsqueda en profundidad cortando por prefijos)
function resolver(t) {
  const halladas = new Map(); // palabra → una ruta
  const usado = Array(16).fill(false);
  const dfs = (i, pre, ruta) => {
    const w = pre + t[i];
    if (!D.esPrefijo(w)) return;
    usado[i] = true; ruta.push(i);
    if (w.length >= 3 && !halladas.has(w) && D.existe(w)) halladas.set(w, [...ruta]);
    if (w.length < 12) for (const j of VECINOS[i]) if (!usado[j]) dfs(j, w, ruta);
    usado[i] = false; ruta.pop();
  };
  for (let i = 0; i < 16; i++) dfs(i, '', []);
  return halladas;
}
function tablero(rnd) {
  for (let intento = 0; ; intento++) {
    const t = Array.from({ length: 16 }, () => BOLSA[Math.floor(rnd() * BOLSA.length)]);
    const v = t.filter((l) => VOCALES.has(l)).length;
    if (v < 5 || v > 8) continue;
    if (t.filter((l) => 'jzñx'.includes(l)).length > 2) continue;
    const sol = resolver(t);
    if (sol.size >= MIN_PALABRAS || intento > 40) return { t, sol };
  }
}

function nuevo(n, rnd = Math.random) {
  const e = { n, rnd, puntos: Array(n).fill(0), ronda: 0, ganador: null, bots: Array(n).fill(null) };
  nuevaRonda(e);
  return e;
}
function configurar(e, asientos) { e.bots = asientos.map((a) => (a.bot ? a.nivel : null)); planCpu(e); }
// cada CPU tiene un plan: qué palabras encontrará y cuándo (normal ≈ 20 % de las cortas; difícil ≈ 40 %)
function planCpu(e) {
  const todas = [...e.sol.keys()];
  e.plan = e.bots.map((nivel) => {
    if (!nivel) return [];
    const p = nivel === 'dificil' ? 0.4 : 0.2;
    return todas.filter((w) => e.rnd() < p * (w.length <= 4 ? 1.3 : w.length <= 6 ? 0.8 : 0.4))
      .map((w) => ({ w, t: e.inicio + 4000 + e.rnd() * (T_RONDA - 8000) })).sort((a, b) => a.t - b.t);
  });
}
function nuevaRonda(e) {
  e.ronda++;
  const { t, sol } = tablero(e.rnd);
  Object.assign(e, { t, sol, fase: 'jugar', inicio: Date.now(), hasta: Date.now() + T_RONDA, halladas: Array.from({ length: e.n }, () => []), ptsRonda: Array(e.n).fill(0), resumen: null });
  planCpu(e);
}
function anotar(e, j, w) {
  if (e.halladas[j].includes(w)) return 0;
  const p = puntos(w);
  e.halladas[j].push(w); e.ptsRonda[j] += p; e.puntos[j] += p;
  return p;
}
function cerrarRonda(e) {
  const quien = {};
  e.halladas.forEach((ws, j) => ws.forEach((w) => { (quien[w] ||= []).push(j); }));
  const todas = [...e.sol.keys()].sort((a, b) => b.length - a.length || a.localeCompare(b));
  e.resumen = { todas: todas.slice(0, 400).map((w) => [w, puntos(w), quien[w] || []]), total: todas.length, mejor: todas[0] };
  e.fase = 'resultado'; e.hasta = Date.now() + T_RESULTADO;
  if (e.ronda >= RONDAS) { const max = Math.max(...e.puntos); e.ganador = e.puntos.map((p, i) => (p === max ? i : -1)).filter((i) => i >= 0); e.hasta = 0; }
}
function accion(e, yo, a) {
  if (e.ganador) return { ok: false, error: 'La partida ha terminado' };
  if (a.tipo === 'palabra') {
    if (e.fase !== 'jugar') return { ok: false, error: 'Se acabó el tiempo' };
    const ruta = Array.isArray(a.ruta) ? a.ruta.slice(0, 16).map(Number) : [];
    if (ruta.length < 3 || ruta.some((i) => !Number.isInteger(i) || i < 0 || i > 15) || new Set(ruta).size !== ruta.length) return { ok: false, error: 'Ruta no válida' };
    for (let k = 1; k < ruta.length; k++) if (!VECINOS[ruta[k - 1]].includes(ruta[k])) return { ok: false, error: 'Las letras tienen que estar juntas' };
    const w = ruta.map((i) => e.t[i]).join('');
    if (e.halladas[yo].includes(w)) return { ok: false, error: `«${w}» ya la tienes` };
    if (!D.existe(w)) return { ok: false, error: `«${w}» no está en el diccionario` };
    return { ok: true, evento: { tipo: 'acierto', j: yo, w, p: anotar(e, yo, w) } };
  }
  if (a.tipo === 'seguir') { if (e.fase !== 'resultado') return { ok: false, error: 'Ahora no' }; nuevaRonda(e); return { ok: true }; }
  return { ok: false, error: 'Acción desconocida' };
}
function tiempo(e, ahora) {
  if (e.ganador || !e.hasta) return false;
  if (e.fase === 'jugar') {
    let cambio = false;
    e.plan.forEach((p, j) => { while (p.length && p[0].t <= ahora) { anotar(e, j, p.shift().w); cambio = true; } });
    if (ahora >= e.hasta) { cerrarRonda(e); return true; }
    return cambio;
  }
  if (e.fase === 'resultado' && ahora >= e.hasta) { nuevaRonda(e); return true; }
  return false;
}
function vista(e, yo) {
  return {
    n: e.n, ronda: e.ronda, rondas: RONDAS, fase: e.fase, hasta: e.hasta, t: e.t, puntos: e.puntos, ptsRonda: e.ptsRonda,
    cuantas: e.halladas.map((h) => h.length), mias: yo >= 0 ? e.halladas[yo] : [],
    total: e.fase === 'jugar' ? null : e.sol.size, resumen: e.resumen, ganadores: e.ganador,
  };
}
const turno = () => -1;
const fin = (e) => (e.ganador ? { ganadores: e.ganador, texto: `${Math.max(...e.puntos)} puntos en ${RONDAS} rondas` } : null);
const bot = () => null;
module.exports = { id: 'revueltas', min: 1, max: 8, nuevo, configurar, vista, accion, turno, fin, bot, tiempo, _: { resolver, puntos, VECINOS } };
