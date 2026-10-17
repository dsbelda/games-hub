'use strict';
// Hundir la flota: 10×10, flota de 5, 4, 3, 3 y 2. Los barcos no pueden tocarse (ni en diagonal).
// Primero cada uno coloca su flota; luego se dispara por turnos y, si aciertas, repites.
const N = 10;
const FLOTA = [5, 4, 3, 3, 2];
const clave = (f, c) => f * N + c;

function nuevo() {
  return { fase: 'colocar', flotas: [null, null], disparos: [new Map(), new Map()], turno: 0, ganador: -1, ultimo: null };
}

// barcos: [{ f, c, largo, vertical }] → celdas, o error
function validar(barcos) {
  if (!Array.isArray(barcos) || barcos.length !== FLOTA.length) return { error: 'La flota debe tener 5 barcos' };
  const largos = barcos.map((b) => b.largo).sort((a, b) => b - a);
  if (largos.join() !== FLOTA.join()) return { error: 'Los barcos deben medir 5, 4, 3, 3 y 2' };
  const ocupadas = new Map();
  const flota = [];
  for (const [i, b] of barcos.entries()) {
    const f = Number(b.f), c = Number(b.c), v = !!b.vertical;
    if (!Number.isInteger(f) || !Number.isInteger(c)) return { error: 'Posición no válida' };
    const celdas = [];
    for (let k = 0; k < b.largo; k++) {
      const y = f + (v ? k : 0), x = c + (v ? 0 : k);
      if (y < 0 || y >= N || x < 0 || x >= N) return { error: 'Un barco se sale del tablero' };
      celdas.push(clave(y, x));
    }
    for (const k of celdas) {
      const y = Math.floor(k / N), x = k % N;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const o = ocupadas.get(clave(y + dy, x + dx));
        if (y + dy >= 0 && y + dy < N && x + dx >= 0 && x + dx < N && o !== undefined && o !== i) return { error: 'Los barcos no pueden tocarse' };
      }
    }
    for (const k of celdas) ocupadas.set(k, i);
    flota.push({ celdas, tocadas: [] });
  }
  return { flota };
}

function aleatoria(rnd) {
  for (let intento = 0; intento < 500; intento++) {
    const barcos = [];
    let ok = true;
    for (const largo of FLOTA) {
      let puesto = false;
      for (let t = 0; t < 200 && !puesto; t++) {
        const vertical = rnd() < 0.5;
        const b = { largo, vertical, f: Math.floor(rnd() * (vertical ? N - largo + 1 : N)), c: Math.floor(rnd() * (vertical ? N : N - largo + 1)) };
        if (validarParcial([...barcos, b])) { barcos.push(b); puesto = true; }
      }
      if (!puesto) { ok = false; break; }
    }
    if (ok) return barcos;
  }
  return null;
}
// como validar, pero para una flota a medio colocar
function validarParcial(barcos) {
  const ocupadas = new Map();
  for (const [i, b] of barcos.entries()) {
    const celdas = [];
    for (let k = 0; k < b.largo; k++) {
      const y = b.f + (b.vertical ? k : 0), x = b.c + (b.vertical ? 0 : k);
      if (y < 0 || y >= N || x < 0 || x >= N) return false;
      celdas.push([y, x]);
    }
    for (const [y, x] of celdas) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const o = ocupadas.get(clave(y + dy, x + dx)); if (o !== undefined && o !== i) return false; }
    for (const [y, x] of celdas) ocupadas.set(clave(y, x), i);
  }
  return true;
}

function accion(e, yo, a) {
  if (e.ganador >= 0) return { ok: false, error: 'La partida ha terminado' };
  if (a.tipo === 'rendirse') { e.ganador = 1 - yo; e.rendido = yo; return { ok: true }; }
  if (a.tipo === 'colocar') {
    if (e.fase !== 'colocar') return { ok: false, error: 'Ya no se pueden colocar barcos' };
    if (e.flotas[yo]) return { ok: false, error: 'Ya has colocado tu flota' };
    const v = validar(a.barcos);
    if (v.error) return { ok: false, error: v.error };
    e.flotas[yo] = v.flota;
    if (e.flotas[0] && e.flotas[1]) e.fase = 'disparar';
    return { ok: true };
  }
  if (a.tipo !== 'disparar') return { ok: false, error: 'Acción desconocida' };
  if (e.fase !== 'disparar') return { ok: false, error: 'Aún no se dispara' };
  if (e.turno !== yo) return { ok: false, error: 'No es tu turno' };
  const f = Number(a.f), c = Number(a.c);
  if (!Number.isInteger(f) || !Number.isInteger(c) || f < 0 || f >= N || c < 0 || c >= N) return { ok: false, error: 'Casilla no válida' };
  const k = clave(f, c);
  const mios = e.disparos[yo];
  if (mios.has(k)) return { ok: false, error: 'Ya has disparado ahí' };
  const flota = e.flotas[1 - yo];
  const barco = flota.find((b) => b.celdas.includes(k));
  if (!barco) { mios.set(k, 'agua'); e.turno = 1 - yo; e.ultimo = { j: yo, f, c, r: 'agua' }; return { ok: true }; }
  barco.tocadas.push(k);
  if (barco.tocadas.length === barco.celdas.length) {
    for (const x of barco.celdas) mios.set(x, 'hundido');
    e.ultimo = { j: yo, f, c, r: 'hundido', largo: barco.celdas.length };
    if (flota.every((b) => b.tocadas.length === b.celdas.length)) e.ganador = yo;
  } else { mios.set(k, 'tocado'); e.ultimo = { j: yo, f, c, r: 'tocado' }; }
  return { ok: true }; // si aciertas, repites
}

function vista(e, yo) {
  const yoV = yo >= 0 ? yo : 0;
  const rival = 1 - yoV;
  const hundidosRival = (e.flotas[rival] || []).filter((b) => b.tocadas.length === b.celdas.length).map((b) => b.celdas);
  return {
    fase: e.fase, turno: e.turno, ganador: e.ganador, ultimo: e.ultimo, rendido: e.rendido,
    colocado: [!!e.flotas[0], !!e.flotas[1]],
    miFlota: yo >= 0 && e.flotas[yo] ? e.flotas[yo].map((b) => b.celdas) : null,
    recibidos: Object.fromEntries(e.disparos[rival]), // disparos del rival en mi tablero
    hechos: Object.fromEntries(e.disparos[yoV]), // mis disparos
    hundidosRival,
    // al acabar se ve la flota rival entera
    flotaRival: e.ganador >= 0 && e.flotas[rival] ? e.flotas[rival].map((b) => b.celdas) : null,
    quedan: [0, 1].map((j) => (e.flotas[j] || []).filter((b) => b.tocadas.length < b.celdas.length).map((b) => b.celdas.length)),
  };
}
const turno = (e) => (e.ganador >= 0 ? -1 : e.fase === 'colocar' ? -1 : e.turno);
const fin = (e) => (e.ganador >= 0 ? { ganadores: [e.ganador], texto: e.rendido >= 0 && e.rendido !== undefined ? 'El rival se ha rendido' : 'Toda la flota rival hundida' } : null);

// --- CPU ----------------------------------------------------------------------------------------
function bot(e, yo, nivel, rnd) {
  if (e.ganador >= 0) return null;
  if (e.fase === 'colocar') return e.flotas[yo] ? null : { tipo: 'colocar', barcos: aleatoria(rnd) };
  if (e.turno !== yo) return null;
  const hechos = e.disparos[yo];
  const libre = (f, c) => f >= 0 && f < N && c >= 0 && c < N && !hechos.has(clave(f, c));
  // casillas junto a un barco hundido no pueden tener barco (no se tocan)
  const vetadas = new Set();
  for (const [k, r] of hechos) if (r === 'hundido') { const f = Math.floor(k / N), c = k % N; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) vetadas.add(clave(f + dy, c + dx)); }
  const ok = (f, c) => libre(f, c) && !vetadas.has(clave(f, c));
  // modo «rematar»: hay tocados sin hundir
  const tocados = [...hechos].filter(([, r]) => r === 'tocado').map(([k]) => [Math.floor(k / N), k % N]);
  if (tocados.length) {
    const cand = [];
    if (tocados.length >= 2) {
      const vertical = tocados[0][1] === tocados[1][1];
      const fs = tocados.map((t) => (vertical ? t[0] : t[1]));
      const lo = Math.min(...fs) - 1, hi = Math.max(...fs) + 1;
      const fija = vertical ? tocados[0][1] : tocados[0][0];
      for (const x of [lo, hi]) { const [f, c] = vertical ? [x, fija] : [fija, x]; if (ok(f, c)) cand.push([f, c]); }
    }
    if (!cand.length) for (const [f, c] of tocados) for (const [df, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (ok(f + df, c + dc)) cand.push([f + df, c + dc]);
    if (cand.length) { const [f, c] = cand[Math.floor(rnd() * cand.length)]; return { tipo: 'disparar', f, c }; }
  }
  // modo «buscar»
  if (nivel === 'dificil') {
    // densidad: en cuántas posiciones posibles de los barcos que quedan entra cada casilla
    const quedan = e.flotas[1 - yo].filter((b) => b.tocadas.length < b.celdas.length).map((b) => b.celdas.length);
    const peso = new Array(N * N).fill(0);
    for (const largo of quedan) for (let f = 0; f < N; f++) for (let c = 0; c < N; c++) for (const v of [false, true]) {
      const cs = [];
      for (let k = 0; k < largo; k++) { const y = f + (v ? k : 0), x = c + (v ? 0 : k); if (!ok(y, x)) { cs.length = 0; break; } cs.push(clave(y, x)); }
      if (cs.length === largo) for (const k of cs) peso[k]++;
    }
    let mejor = -1, lista = [];
    peso.forEach((p, k) => { if (p > mejor) { mejor = p; lista = [k]; } else if (p === mejor) lista.push(k); });
    const k = lista[Math.floor(rnd() * lista.length)];
    return { tipo: 'disparar', f: Math.floor(k / N), c: k % N };
  }
  const opciones = [];
  for (let f = 0; f < N; f++) for (let c = 0; c < N; c++) if (ok(f, c) && (f + c) % 2 === 0) opciones.push([f, c]);
  if (!opciones.length) for (let f = 0; f < N; f++) for (let c = 0; c < N; c++) if (libre(f, c)) opciones.push([f, c]);
  const [f, c] = opciones[Math.floor(rnd() * opciones.length)];
  return { tipo: 'disparar', f, c };
}

module.exports = { id: 'hundir', min: 2, max: 2, nuevo, vista, accion, turno, fin, bot, _: { validar, aleatoria, validarParcial, FLOTA } };
