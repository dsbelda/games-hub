'use strict';
// Sin palabras (2-4, cooperativo; puede haber CPUs). Cartas del 1 al 100. En el nivel N cada uno tiene N cartas
// y entre todos hay que jugarlas en orden ascendente sin hablar: cada cual juega su carta más baja cuando cree
// que le toca. Si alguien tenía una más baja que la jugada, se pierde una vida (y esas cartas se descartan).
// Estrella: si todos la piden, cada uno descarta su carta más baja. Hay vidas y estrellas de premio al pasar
// ciertos niveles. Se gana superando el último nivel (12 con 2, 10 con 3, 8 con 4).
// Las CPUs juegan desde tiempo(): esperan más cuanto más lejos esté su carta de la última jugada.
const NIVELES = { 1: 12, 2: 12, 3: 10, 4: 8 };
const PREMIO_ESTRELLA = [2, 5, 8], PREMIO_VIDA = [3, 6, 9];
function nuevo(n, rnd = Math.random) {
  const e = { n, rnd, nivel: 0, maxNivel: NIVELES[n] || 8, vidas: n, estrellas: 1, ganador: null, perdido: false, bots: Array(n).fill(null), log: [] };
  siguienteNivel(e); return e;
}
function configurar(e, asientos) { e.bots = asientos.map((a) => (a.bot ? a.nivel : null)); }
function siguienteNivel(e) {
  e.nivel++;
  const mazo = Array.from({ length: 100 }, (_, i) => i + 1);
  for (let i = 99; i > 0; i--) { const k = Math.floor(e.rnd() * (i + 1)); [mazo[i], mazo[k]] = [mazo[k], mazo[i]]; }
  e.manos = Array.from({ length: e.n }, (_, j) => mazo.slice(j * e.nivel, (j + 1) * e.nivel).sort((a, b) => a - b));
  Object.assign(e, { mesa: [], fase: 'preparados', listos: Array(e.n).fill(false), pideEstrella: Array(e.n).fill(false), ultimaJugada: Date.now(), fallo: null });
}
const quedan = (e) => e.manos.reduce((s, m) => s + m.length, 0);
function empezar(e, ahora = Date.now()) { e.fase = 'jugando'; e.ultimaJugada = ahora; sortearRuido(e); }
function jugar(e, j, ahora = Date.now()) {
  const c = e.manos[j].shift();
  e.mesa.push({ c, j }); e.ultimaJugada = ahora; e.pideEstrella.fill(false); sortearRuido(e);
  // ¿alguien tenía una más baja?
  const bajas = [];
  e.manos.forEach((m, k) => { while (m.length && m[0] < c) bajas.push({ c: m.shift(), j: k }); });
  if (bajas.length) {
    e.vidas--; e.fallo = { c, j, bajas }; e.log.push({ tipo: 'fallo', c, j, bajas }); e.log = e.log.slice(-8);
    if (e.vidas <= 0) { e.perdido = true; e.ganador = []; return; }
  }
  if (!quedan(e)) {
    e.log.push({ tipo: 'nivel', nivel: e.nivel }); e.log = e.log.slice(-8);
    if (e.nivel >= e.maxNivel) { e.ganador = Array.from({ length: e.n }, (_, k) => k); return; }
    if (PREMIO_ESTRELLA.includes(e.nivel)) e.estrellas++;
    if (PREMIO_VIDA.includes(e.nivel)) e.vidas++;
    e.fase = 'superado';
  }
}
function estrella(e) {
  e.estrellas--; e.pideEstrella.fill(false);
  const tiradas = e.manos.map((m, j) => (m.length ? { c: m.shift(), j } : null)).filter(Boolean);
  e.log.push({ tipo: 'estrella', tiradas }); e.log = e.log.slice(-8);
  e.ultimaJugada = Date.now(); sortearRuido(e);
  if (!quedan(e)) { if (e.nivel >= e.maxNivel) { e.ganador = Array.from({ length: e.n }, (_, k) => k); return; } e.fase = 'superado'; }
}
function accion(e, yo, a) {
  if (e.ganador) return { ok: false, error: 'La partida ha terminado' };
  if (a.tipo === 'listo') {
    if (e.fase === 'superado') { siguienteNivel(e); }
    if (e.fase !== 'preparados') return { ok: false, error: 'Ahora no' };
    e.listos[yo] = true;
    if (e.listos.every((l, j) => l || e.bots[j])) empezar(e);
    return { ok: true };
  }
  if (e.fase !== 'jugando') return { ok: false, error: 'Aún no se juega' };
  if (a.tipo === 'jugar') { if (!e.manos[yo].length) return { ok: false, error: 'No te quedan cartas' }; jugar(e, yo); return { ok: true }; }
  if (a.tipo === 'estrella') {
    if (e.estrellas <= 0) return { ok: false, error: 'No quedan estrellas' };
    e.pideEstrella[yo] = !e.pideEstrella[yo];
    // las CPUs aceptan si tienen cartas
    e.pideEstrella.forEach((_, j) => { if (e.bots[j]) e.pideEstrella[j] = e.pideEstrella.some((p, k) => p && !e.bots[k]); });
    if (e.pideEstrella.every((p, j) => p || !e.manos[j].length)) estrella(e);
    return { ok: true };
  }
  return { ok: false, error: 'Acción desconocida' };
}
// Cada CPU decide sola, sin ver las cartas de las demás: espera unos 0,3 s por cada número de diferencia con la
// última carta jugada, con un error propio que se sortea cada vez que cambia la mesa (la difícil se equivoca menos).
// Juega la primera a la que se le cumpla su espera.
function sortearRuido(e) { e.ruido = e.bots.map((b) => (b ? 1 + (e.rnd() + e.rnd() + e.rnd() - 1.5) * (b === 'dificil' ? 0.35 : 0.7) : 1)); }
function espera(e, j) {
  const ultima = e.mesa.length ? e.mesa[e.mesa.length - 1].c : 0;
  return Math.max(0.6, (e.manos[j][0] - ultima) * 0.3 * (e.ruido ? e.ruido[j] : 1));
}
function tiempo(e, ahora) {
  if (e.ganador) return false;
  if (e.fase === 'superado') { if (e.bots.every(Boolean)) { siguienteNivel(e); return true; } return false; }
  if (e.fase === 'preparados') { if (e.listos.every((l, j) => l || e.bots[j])) { empezar(e, ahora); return true; } return false; }
  if (e.fase !== 'jugando') return false;
  const pasado = (ahora - e.ultimaJugada) / 1000;
  let mejor = -1, menor = Infinity;
  e.bots.forEach((b, j) => { if (!b || !e.manos[j].length) return; const w = espera(e, j); if (pasado >= w && w < menor) { menor = w; mejor = j; } });
  if (mejor >= 0) { jugar(e, mejor, ahora); return true; }
  return false;
}
function vista(e, yo) {
  return {
    n: e.n, nivel: e.nivel, maxNivel: e.maxNivel, vidas: e.vidas, estrellas: e.estrellas, fase: e.fase, listos: e.listos, pideEstrella: e.pideEstrella,
    mia: yo >= 0 ? e.manos[yo] : [], cuantas: e.manos.map((m) => m.length), mesa: e.mesa.slice(-6), ultima: e.mesa.length ? e.mesa[e.mesa.length - 1] : null,
    fallo: e.fallo, log: e.log, perdido: e.perdido, ganadores: e.ganador,
  };
}
const turno = () => -1;
const fin = (e) => (e.ganador ? { ganadores: e.ganador, texto: e.perdido ? `Sin vidas en el nivel ${e.nivel}` : `¡${e.maxNivel} niveles superados!` } : null);
const bot = () => null;
module.exports = { id: 'mente', min: 2, max: 4, nuevo, configurar, vista, accion, turno, fin, bot, tiempo, _: { espera, jugar } };
