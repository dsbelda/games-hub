'use strict';
// Damas españolas. 8×8, se juega en las casillas oscuras ((f + c) impar). Blancas (jugador 0) abajo, empiezan.
// Peón: avanza y come solo hacia delante, en diagonal. Dama: vuela por las diagonales, también al comer.
// Comer es obligatorio: hay que hacer la jugada que más piezas come (ley de cantidad) y, si hay empate,
// la que más damas come (ley de calidad). Las piezas comidas se quitan al terminar la jugada.
// Se pierde si no puedes mover. Tablas tras 40 jugadas seguidas sin comer ni mover un peón.
const N = 8;
// tablero[f][c]: null o { j: 0|1, dama: bool }
function nuevo() {
  const t = Array.from({ length: N }, () => Array(N).fill(null));
  for (let f = 0; f < N; f++) for (let c = 0; c < N; c++) if ((f + c) % 2 === 1) {
    if (f < 3) t[f][c] = { j: 1, dama: false };
    else if (f > 4) t[f][c] = { j: 0, dama: false };
  }
  return { t, turno: 0, ganador: -1, tablas: false, sinAvance: 0, ultima: null, comidas: [0, 0] };
}
const dentro = (f, c) => f >= 0 && f < N && c >= 0 && c < N;
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const adelante = (j) => (j === 0 ? -1 : 1);

// todas las capturas desde (f,c) con la pieza p; devuelve rutas [{ ruta: [[f,c]...], comidas: [[f,c]...], damas }]
function capturas(t, f, c, p, ruta = [[f, c]], comidas = [], damas = 0) {
  const res = [];
  const comida = (y, x) => comidas.some(([a, b]) => a === y && b === x);
  for (const [df, dc] of DIAG) {
    if (!p.dama && df !== adelante(p.j)) continue;
    if (p.dama) {
      // avanzar por casillas vacías hasta una pieza rival, saltarla y caer en cualquier vacía detrás
      let y = f + df, x = c + dc;
      while (dentro(y, x) && !t[y][x]) { y += df; x += dc; }
      if (!dentro(y, x) || t[y][x].j === p.j || comida(y, x)) continue;
      let ly = y + df, lx = x + dc;
      while (dentro(ly, lx) && !t[ly][lx]) {
        const sub = capturas(t, ly, lx, p, [...ruta, [ly, lx]], [...comidas, [y, x]], damas + (t[y][x].dama ? 1 : 0));
        res.push(...sub);
        ly += df; lx += dc;
      }
    } else {
      const y = f + df, x = c + dc, ly = f + 2 * df, lx = c + 2 * dc;
      if (!dentro(ly, lx) || !t[y][x] || t[y][x].j === p.j || comida(y, x) || t[ly][lx]) continue;
      res.push(...capturas(t, ly, lx, p, [...ruta, [ly, lx]], [...comidas, [y, x]], damas + (t[y][x].dama ? 1 : 0)));
    }
  }
  if (!res.length && comidas.length) return [{ ruta, comidas, damas }];
  return res;
}

function legales(e, j = e.turno) {
  const t = e.t;
  let caps = [];
  const simples = [];
  for (let f = 0; f < N; f++) for (let c = 0; c < N; c++) {
    const p = t[f][c];
    if (!p || p.j !== j) continue;
    // durante la búsqueda la pieza que se mueve deja su casilla libre
    t[f][c] = null;
    caps.push(...capturas(t, f, c, p).map((x) => ({ ...x, dama: p.dama })));
    t[f][c] = p;
    for (const [df, dc] of DIAG) {
      if (!p.dama && df !== adelante(j)) continue;
      let y = f + df, x = c + dc;
      while (dentro(y, x) && !t[y][x]) { simples.push({ ruta: [[f, c], [y, x]], comidas: [], damas: 0, dama: p.dama }); if (!p.dama) break; y += df; x += dc; }
    }
  }
  if (caps.length) {
    const max = Math.max(...caps.map((x) => x.comidas.length));
    caps = caps.filter((x) => x.comidas.length === max);
    // calidad: comer con dama y comer más damas
    const conDama = caps.filter((x) => x.dama);
    if (conDama.length) caps = conDama;
    const maxD = Math.max(...caps.map((x) => x.damas));
    return caps.filter((x) => x.damas === maxD);
  }
  return simples;
}

function aplicar(e, m) {
  const [f0, c0] = m.ruta[0], [f1, c1] = m.ruta[m.ruta.length - 1];
  const p = e.t[f0][c0];
  e.t[f0][c0] = null;
  for (const [y, x] of m.comidas) e.t[y][x] = null;
  const corona = !p.dama && (p.j === 0 ? f1 === 0 : f1 === N - 1);
  e.t[f1][c1] = { j: p.j, dama: p.dama || corona };
  e.comidas[p.j] += m.comidas.length;
  e.sinAvance = m.comidas.length || !p.dama ? 0 : e.sinAvance + 1;
  e.ultima = { ruta: m.ruta, comidas: m.comidas, corona };
  e.turno = 1 - p.j;
  if (!legales(e).length) e.ganador = p.j;
  else if (e.sinAvance >= 80) e.tablas = true;
}

function accion(e, yo, a) {
  if (e.ganador >= 0 || e.tablas) return { ok: false, error: 'La partida ha terminado' };
  if (a.tipo === 'rendirse') { e.ganador = 1 - yo; e.rendido = yo; return { ok: true }; }
  if (a.tipo !== 'mover') return { ok: false, error: 'Acción desconocida' };
  if (e.turno !== yo) return { ok: false, error: 'No es tu turno' };
  if (!Array.isArray(a.ruta)) return { ok: false, error: 'Jugada no válida' };
  const txt = JSON.stringify(a.ruta);
  const m = legales(e).find((x) => JSON.stringify(x.ruta) === txt);
  if (!m) return { ok: false, error: legales(e).some((x) => x.comidas.length) ? 'Comer es obligatorio (y por donde más piezas comas)' : 'Esa jugada no vale' };
  aplicar(e, m);
  return { ok: true };
}

function vista(e, yo) {
  const ms = yo >= 0 && e.turno === yo && e.ganador < 0 && !e.tablas ? legales(e) : [];
  return {
    t: e.t, turno: e.turno, ganador: e.ganador, tablas: e.tablas, ultima: e.ultima, comidas: e.comidas, rendido: e.rendido,
    legales: ms.map((m) => m.ruta), obligaComer: ms.some((m) => m.comidas.length > 0),
  };
}
const turno = (e) => (e.ganador >= 0 || e.tablas ? -1 : e.turno);
const fin = (e) => (e.ganador >= 0 ? { ganadores: [e.ganador], texto: e.rendido !== undefined ? 'El rival se ha rendido' : 'El rival se ha quedado sin jugadas' } : e.tablas ? { ganadores: [], texto: 'Tablas: 40 jugadas sin comer ni mover peón' } : null);

// --- CPU: alfa-beta sobre material y avance -------------------------------------------------------
function evaluar(e, j) {
  let s = 0;
  for (let f = 0; f < N; f++) for (let c = 0; c < N; c++) {
    const p = e.t[f][c]; if (!p) continue;
    let v = p.dama ? 32 : 10 + (p.j === 0 ? 7 - f : f) * 0.6 + (c > 1 && c < 6 ? 0.5 : 0);
    s += p.j === j ? v : -v;
  }
  return s;
}
const clonar = (e) => ({ ...e, t: e.t.map((r) => r.map((p) => (p ? { ...p } : null))), comidas: [...e.comidas] });
function alfabeta(e, prof, a, b, j) {
  if (e.ganador >= 0) return e.ganador === j ? 1000 + prof : -1000 - prof;
  if (e.tablas) return 0;
  if (prof === 0) return evaluar(e, j);
  const ms = legales(e);
  const maxi = e.turno === j;
  let mejor = maxi ? -Infinity : Infinity;
  for (const m of ms) {
    const s = clonar(e); aplicar(s, m);
    const v = alfabeta(s, prof - 1, a, b, j);
    if (maxi) { mejor = Math.max(mejor, v); a = Math.max(a, v); } else { mejor = Math.min(mejor, v); b = Math.min(b, v); }
    if (a >= b) break;
  }
  return mejor;
}
function bot(e, yo, nivel, rnd) {
  if (turno(e) !== yo) return null;
  const ms = legales(e);
  if (nivel !== 'dificil' && rnd() < 0.15) return { tipo: 'mover', ruta: ms[Math.floor(rnd() * ms.length)].ruta };
  const prof = nivel === 'dificil' ? 5 : 2;
  let mejor = -Infinity, lista = [];
  for (const m of ms) {
    const s = clonar(e); aplicar(s, m);
    const v = alfabeta(s, prof - 1, -Infinity, Infinity, yo);
    if (v > mejor) { mejor = v; lista = [m]; } else if (v === mejor) lista.push(m);
  }
  return { tipo: 'mover', ruta: lista[Math.floor(rnd() * lista.length)].ruta };
}

module.exports = { id: 'damas', min: 2, max: 2, nuevo, vista, accion, turno, fin, bot, _: { legales } };
