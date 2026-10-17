'use strict';
// Cuatro en raya: 7 columnas × 6 filas. tablero[f][c], fila 0 = arriba. -1 vacío, 0/1 jugador.
const F = 6, C = 7;

function nuevo() {
  return { tablero: Array.from({ length: F }, () => Array(C).fill(-1)), turno: 0, ganador: -1, linea: [], ultima: null, lleno: false };
}

function filaLibre(t, c) { for (let f = F - 1; f >= 0; f--) if (t[f][c] < 0) return f; return -1; }

function lineaGanadora(t, f, c) {
  const j = t[f][c];
  for (const [df, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const celdas = [[f, c]];
    for (const s of [1, -1]) {
      let y = f + df * s, x = c + dc * s;
      while (y >= 0 && y < F && x >= 0 && x < C && t[y][x] === j) { celdas.push([y, x]); y += df * s; x += dc * s; }
    }
    if (celdas.length >= 4) return celdas;
  }
  return null;
}

function accion(e, yo, a) {
  if (a.tipo !== 'soltar') return { ok: false, error: 'Acción desconocida' };
  if (e.ganador >= 0 || e.lleno) return { ok: false, error: 'La partida ha terminado' };
  if (e.turno !== yo) return { ok: false, error: 'No es tu turno' };
  const c = Number(a.col);
  if (!Number.isInteger(c) || c < 0 || c >= C) return { ok: false, error: 'Columna no válida' };
  const f = filaLibre(e.tablero, c);
  if (f < 0) return { ok: false, error: 'Esa columna está llena' };
  e.tablero[f][c] = yo;
  e.ultima = [f, c];
  const l = lineaGanadora(e.tablero, f, c);
  if (l) { e.ganador = yo; e.linea = l; }
  else if (e.tablero[0].every((x) => x >= 0)) e.lleno = true;
  else e.turno = 1 - yo;
  return { ok: true };
}

const vista = (e) => ({ tablero: e.tablero, turno: e.turno, ganador: e.ganador, linea: e.linea, ultima: e.ultima, lleno: e.lleno });
const turno = (e) => (e.ganador >= 0 || e.lleno ? -1 : e.turno);
const fin = (e) => (e.ganador >= 0 ? { ganadores: [e.ganador], texto: '¡Cuatro en línea!' } : e.lleno ? { ganadores: [], texto: 'Empate: tablero lleno' } : null);

// --- CPU: negamax con poda alfa-beta ---------------------------------------------------------
const ORDEN = [3, 2, 4, 1, 5, 0, 6];
function puntuarVentana(v, j) {
  let mias = 0, suyas = 0;
  for (const x of v) { if (x === j) mias++; else if (x >= 0) suyas++; }
  if (mias && suyas) return 0;
  if (mias === 3) return 5; if (mias === 2) return 2;
  if (suyas === 3) return -4; if (suyas === 2) return -1;
  return 0;
}
function heuristica(t, j) {
  let s = 0;
  for (let f = 0; f < F; f++) if (t[f][3] === j) s += 3;
  for (let f = 0; f < F; f++) for (let c = 0; c < C; c++)
    for (const [df, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const ef = f + 3 * df, ec = c + 3 * dc;
      if (ef < 0 || ef >= F || ec < 0 || ec >= C) continue;
      s += puntuarVentana([0, 1, 2, 3].map((k) => t[f + k * df][c + k * dc]), j);
    }
  return s;
}
function negamax(t, j, prof, alfa, beta) {
  if (t[0].every((x) => x >= 0)) return 0;
  if (prof === 0) return heuristica(t, j);
  let mejor = -Infinity;
  for (const c of ORDEN) {
    const f = filaLibre(t, c);
    if (f < 0) continue;
    t[f][c] = j;
    const v = lineaGanadora(t, f, c) ? 10000 + prof : -negamax(t, 1 - j, prof - 1, -beta, -alfa);
    t[f][c] = -1;
    if (v > mejor) mejor = v;
    if (mejor > alfa) alfa = mejor;
    if (alfa >= beta) break;
  }
  return mejor;
}
function bot(e, yo, nivel, rnd) {
  if (turno(e) !== yo) return null;
  const t = e.tablero.map((r) => r.slice());
  const prof = nivel === 'dificil' ? 5 : 3; // 5 ≈ 70 ms por jugada: más bloquearía el servidor
  let mejores = [], mejor = -Infinity;
  for (const c of ORDEN) {
    const f = filaLibre(t, c);
    if (f < 0) continue;
    t[f][c] = yo;
    const v = lineaGanadora(t, f, c) ? 100000 : -negamax(t, 1 - yo, prof - 1, -Infinity, Infinity);
    t[f][c] = -1;
    if (v > mejor) { mejor = v; mejores = [c]; } else if (v === mejor) mejores.push(c);
  }
  // en normal, a veces se despista (pero nunca deja pasar una victoria propia)
  if (nivel !== 'dificil' && mejor < 100000 && rnd() < 0.15) {
    const libres = ORDEN.filter((c) => filaLibre(t, c) >= 0);
    return { tipo: 'soltar', col: libres[Math.floor(rnd() * libres.length)] };
  }
  return { tipo: 'soltar', col: mejores[Math.floor(rnd() * mejores.length)] };
}

module.exports = { id: 'cuatro', min: 2, max: 2, nuevo, vista, accion, turno, fin, bot };
