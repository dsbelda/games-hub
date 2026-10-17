'use strict';
// Ajedrez con reglas completas: enroque, al paso, coronación (a elegir), jaque mate, ahogado,
// 50 jugadas, triple repetición y material insuficiente. Blancas = jugador 0.
// Tablero: 64 casillas, índice = fila * 8 + columna, fila 0 = octava (arriba). Mayúsculas = blancas.
const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const LETRA = { p: '', n: 'C', b: 'A', r: 'T', q: 'D', k: 'R' }; // notación española
const blanca = (x) => x && x === x.toUpperCase();
const lado = (x) => (!x ? -1 : blanca(x) ? 0 : 1);
const nombre = (i) => 'abcdefgh'[i % 8] + (8 - Math.floor(i / 8));
const CAB = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const REY = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const ALF = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const TOR = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function nuevo() {
  const b = Array(64).fill(null);
  'rnbqkbnr'.split('').forEach((p, c) => { b[c] = p; b[56 + c] = p.toUpperCase(); b[8 + c] = 'p'; b[48 + c] = 'P'; });
  const e = { b, turno: 0, enroque: { K: true, Q: true, k: true, q: true }, ep: -1, medio: 0, ganador: -1, tablas: null, jugadas: [], ultima: null, capturadas: [[], []], reps: {} };
  e.reps[clave(e)] = 1;
  return e;
}
const clave = (e) => e.b.map((x) => x || '.').join('') + e.turno + Object.entries(e.enroque).filter(([, v]) => v).map(([k]) => k).join('') + e.ep;

function atacada(b, sq, porJ) {
  const f = Math.floor(sq / 8), c = sq % 8;
  const es = (y, x, tipos) => { if (y < 0 || y > 7 || x < 0 || x > 7) return false; const p = b[y * 8 + x]; return p && lado(p) === porJ && tipos.includes(p.toLowerCase()); };
  const dp = porJ === 0 ? 1 : -1; // los peones blancos atacan hacia arriba (desde una fila más abajo)
  if (es(f + dp, c - 1, 'p') || es(f + dp, c + 1, 'p')) return true;
  for (const [df, dc] of CAB) if (es(f + df, c + dc, 'n')) return true;
  for (const [df, dc] of REY) if (es(f + df, c + dc, 'k')) return true;
  for (const [dirs, tipos] of [[ALF, 'bq'], [TOR, 'rq']]) for (const [df, dc] of dirs) {
    let y = f + df, x = c + dc;
    while (y >= 0 && y < 8 && x >= 0 && x < 8) { const p = b[y * 8 + x]; if (p) { if (lado(p) === porJ && tipos.includes(p.toLowerCase())) return true; break; } y += df; x += dc; }
  }
  return false;
}
const reyDe = (b, j) => b.indexOf(j === 0 ? 'K' : 'k');
const enJaque = (e, j = e.turno) => atacada(e.b, reyDe(e.b, j), 1 - j);

function pseudo(e, j, soloCapturas = false) {
  const b = e.b, ms = [];
  for (let i = 0; i < 64; i++) {
    const p = b[i]; if (!p || lado(p) !== j) continue;
    const t = p.toLowerCase(), f = Math.floor(i / 8), c = i % 8;
    const anadir = (a, extra = {}) => { const cap = b[a]; if (cap && lado(cap) === j) return; if (soloCapturas && !cap && !extra.ep && !extra.promo) return; ms.push({ de: i, a, cap: cap || (extra.ep ? (j === 0 ? 'p' : 'P') : null), ...extra }); };
    if (t === 'p') {
      const d = j === 0 ? -1 : 1, ini = j === 0 ? 6 : 1, ult = j === 0 ? 0 : 7;
      const promo = (a, cap) => { if (Math.floor(a / 8) === ult) for (const q of 'qrbn') ms.push({ de: i, a, cap, promo: q }); else if (!soloCapturas || cap) ms.push({ de: i, a, cap }); };
      const y = f + d;
      if (y >= 0 && y < 8 && !b[y * 8 + c]) { promo(y * 8 + c, null); if (f === ini && !b[(f + 2 * d) * 8 + c] && !soloCapturas) ms.push({ de: i, a: (f + 2 * d) * 8 + c, doble: true }); }
      for (const dc of [-1, 1]) {
        const x = c + dc; if (x < 0 || x > 7 || y < 0 || y > 7) continue;
        const a = y * 8 + x;
        if (b[a] && lado(b[a]) !== j) promo(a, b[a]);
        else if (a === e.ep) ms.push({ de: i, a, cap: j === 0 ? 'p' : 'P', ep: true });
      }
    } else if (t === 'n' || t === 'k') {
      for (const [df, dc] of t === 'n' ? CAB : REY) { const y = f + df, x = c + dc; if (y >= 0 && y < 8 && x >= 0 && x < 8) anadir(y * 8 + x); }
      if (t === 'k' && !soloCapturas) {
        const fila = j === 0 ? 56 : 0, [K, Q] = j === 0 ? ['K', 'Q'] : ['k', 'q'];
        if (i === fila + 4 && !atacada(b, i, 1 - j)) {
          if (e.enroque[K] && !b[fila + 5] && !b[fila + 6] && b[fila + 7] === (j === 0 ? 'R' : 'r') && !atacada(b, fila + 5, 1 - j) && !atacada(b, fila + 6, 1 - j)) ms.push({ de: i, a: fila + 6, enroque: 'corto' });
          if (e.enroque[Q] && !b[fila + 3] && !b[fila + 2] && !b[fila + 1] && b[fila] === (j === 0 ? 'R' : 'r') && !atacada(b, fila + 3, 1 - j) && !atacada(b, fila + 2, 1 - j)) ms.push({ de: i, a: fila + 2, enroque: 'largo' });
        }
      }
    } else {
      const dirs = t === 'b' ? ALF : t === 'r' ? TOR : [...ALF, ...TOR];
      for (const [df, dc] of dirs) {
        let y = f + df, x = c + dc;
        while (y >= 0 && y < 8 && x >= 0 && x < 8) { const a = y * 8 + x; if (b[a]) { if (lado(b[a]) !== j) anadir(a); break; } anadir(a); y += df; x += dc; }
      }
    }
  }
  return ms;
}

// aplica una jugada sobre el estado (sin comprobar legalidad). Devuelve lo necesario para deshacerla.
function hacer(e, m) {
  const b = e.b, j = e.turno, p = b[m.de];
  const deshacer = { m, p, cap: b[m.a], ep: e.ep, enroque: { ...e.enroque }, medio: e.medio };
  b[m.a] = m.promo ? (j === 0 ? m.promo.toUpperCase() : m.promo) : p;
  b[m.de] = null;
  if (m.ep) { const capSq = m.a + (j === 0 ? 8 : -8); deshacer.epSq = capSq; deshacer.epP = b[capSq]; b[capSq] = null; }
  if (m.enroque) { const fila = j === 0 ? 56 : 0; if (m.enroque === 'corto') { b[fila + 5] = b[fila + 7]; b[fila + 7] = null; } else { b[fila + 3] = b[fila]; b[fila] = null; } }
  e.ep = m.doble ? (m.de + m.a) / 2 : -1;
  const t = p.toLowerCase();
  if (t === 'k') { if (j === 0) e.enroque.K = e.enroque.Q = false; else e.enroque.k = e.enroque.q = false; }
  for (const [sq, k] of [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']]) if (m.de === sq || m.a === sq) e.enroque[k] = false;
  e.medio = t === 'p' || m.cap ? 0 : e.medio + 1;
  e.turno = 1 - j;
  return deshacer;
}
function deshacerJugada(e, d) {
  const b = e.b, m = d.m;
  e.turno = 1 - e.turno;
  const j = e.turno;
  b[m.de] = d.p; b[m.a] = d.cap;
  if (m.ep) b[d.epSq] = d.epP;
  if (m.enroque) { const fila = j === 0 ? 56 : 0; if (m.enroque === 'corto') { b[fila + 7] = b[fila + 5]; b[fila + 5] = null; } else { b[fila] = b[fila + 3]; b[fila + 3] = null; } }
  e.ep = d.ep; e.enroque = d.enroque; e.medio = d.medio;
}
function legales(e, soloCapturas = false) {
  const j = e.turno, out = [];
  for (const m of pseudo(e, j, soloCapturas)) { const d = hacer(e, m); if (!enJaque(e, j)) out.push(m); deshacerJugada(e, d); }
  return out;
}
function materialInsuficiente(b) {
  const resto = b.filter((p) => p && p.toLowerCase() !== 'k');
  if (!resto.length) return true;
  if (resto.length === 1 && 'nb'.includes(resto[0].toLowerCase())) return true;
  if (resto.length === 2 && resto.every((p) => p.toLowerCase() === 'b')) {
    const cols = b.map((p, i) => (p && p.toLowerCase() === 'b' ? (Math.floor(i / 8) + i % 8) % 2 : -1)).filter((x) => x >= 0);
    return cols[0] === cols[1];
  }
  return false;
}
function notacion(e, m, legalesAntes) {
  const p = e.b[m.de].toLowerCase();
  if (m.enroque) return m.enroque === 'corto' ? 'O-O' : 'O-O-O';
  const amb = legalesAntes.filter((x) => x.a === m.a && x.de !== m.de && e.b[x.de] === e.b[m.de]);
  let s = LETRA[p];
  if (p === 'p' && m.cap) s += nombre(m.de)[0];
  else if (amb.length) s += amb.some((x) => x.de % 8 === m.de % 8) ? nombre(m.de)[1] : nombre(m.de)[0];
  s += (m.cap ? 'x' : '') + nombre(m.a);
  if (m.promo) s += '=' + LETRA[m.promo];
  return s;
}

function accion(e, yo, a) {
  if (e.ganador >= 0 || e.tablas) return { ok: false, error: 'La partida ha terminado' };
  if (a.tipo === 'rendirse') { e.ganador = 1 - yo; e.rendido = yo; return { ok: true }; }
  if (a.tipo !== 'mover') return { ok: false, error: 'Acción desconocida' };
  if (e.turno !== yo) return { ok: false, error: 'No es tu turno' };
  const ls = legales(e);
  const m = ls.find((x) => x.de === a.de && x.a === a.a && (!x.promo || x.promo === (a.promo || 'q')));
  if (!m) return { ok: false, error: 'Esa jugada no vale' };
  const txt = notacion(e, m, ls);
  hacer(e, m);
  if (m.cap) e.capturadas[yo].push(m.cap.toLowerCase());
  e.ultima = { de: m.de, a: m.a };
  const k = clave(e); e.reps[k] = (e.reps[k] || 0) + 1;
  const quedan = legales(e);
  const jaque = enJaque(e);
  e.jugadas.push(txt + (jaque ? (quedan.length ? '+' : '#') : ''));
  if (!quedan.length) { if (jaque) e.ganador = yo; else e.tablas = 'Rey ahogado'; }
  else if (e.medio >= 100) e.tablas = '50 jugadas sin comer ni mover peón';
  else if (e.reps[k] >= 3) e.tablas = 'Triple repetición';
  else if (materialInsuficiente(e.b)) e.tablas = 'Material insuficiente';
  return { ok: true };
}

function vista(e, yo) {
  const mov = {};
  if (yo >= 0 && yo === e.turno && e.ganador < 0 && !e.tablas) for (const m of legales(e)) (mov[m.de] ||= []).includes(m.a) || mov[m.de].push(m.a);
  return {
    b: e.b, turno: e.turno, ganador: e.ganador, tablas: e.tablas, ultima: e.ultima, rendido: e.rendido,
    jaque: e.ganador < 0 && enJaque(e) ? reyDe(e.b, e.turno) : -1, jugadas: e.jugadas, capturadas: e.capturadas, legales: mov,
  };
}
const turno = (e) => (e.ganador >= 0 || e.tablas ? -1 : e.turno);
const fin = (e) => (e.ganador >= 0 ? { ganadores: [e.ganador], texto: e.rendido !== undefined ? 'El rival se ha rendido' : '¡Jaque mate!' } : e.tablas ? { ganadores: [], texto: `Tablas: ${e.tablas.toLowerCase()}` } : null);

// --- CPU: alfa-beta con quiescencia y profundización iterativa por tiempo -----------------------------
// tablas de posición (desde el lado blanco; para las negras se refleja la fila)
const PST = {
  p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
};
function evaluar(e) { // desde el punto de vista del que mueve
  let s = 0;
  for (let i = 0; i < 64; i++) {
    const p = e.b[i]; if (!p) continue;
    const t = p.toLowerCase(), j = lado(p);
    const v = VAL[t] + PST[t][j === 0 ? i : (7 - Math.floor(i / 8)) * 8 + i % 8];
    s += j === e.turno ? v : -v;
  }
  return s;
}
class Tiempo extends Error {}
function buscar(e, prof, a, b, limite, nodos) {
  if (++nodos.n % 512 === 0 && Date.now() > limite) throw new Tiempo();
  if (prof <= 0) return quiescencia(e, a, b, limite, nodos, 0);
  const ms = legales(e);
  if (!ms.length) return enJaque(e) ? -100000 - prof : 0;
  ms.sort((x, y) => (y.cap ? VAL[y.cap.toLowerCase()] * 10 - VAL[e.b[y.de].toLowerCase()] : 0) - (x.cap ? VAL[x.cap.toLowerCase()] * 10 - VAL[e.b[x.de].toLowerCase()] : 0) + (y.promo ? 800 : 0) - (x.promo ? 800 : 0));
  for (const m of ms) {
    const d = hacer(e, m);
    let v;
    try { v = -buscar(e, prof - 1, -b, -a, limite, nodos); } finally { deshacerJugada(e, d); }
    if (v >= b) return b;
    if (v > a) a = v;
  }
  return a;
}
function quiescencia(e, a, b, limite, nodos, d) {
  if (++nodos.n % 512 === 0 && Date.now() > limite) throw new Tiempo();
  const quieta = evaluar(e);
  if (quieta >= b) return b;
  if (quieta > a) a = quieta;
  if (d > 6) return a;
  const ms = legales(e, true).sort((x, y) => VAL[y.cap ? y.cap.toLowerCase() : 'p'] - VAL[x.cap ? x.cap.toLowerCase() : 'p']);
  for (const m of ms) {
    const dd = hacer(e, m);
    let v;
    try { v = -quiescencia(e, -b, -a, limite, nodos, d + 1); } finally { deshacerJugada(e, dd); }
    if (v >= b) return b;
    if (v > a) a = v;
  }
  return a;
}
function bot(e, yo, nivel, rnd) {
  if (turno(e) !== yo) return null;
  const copia = { ...e, b: [...e.b], enroque: { ...e.enroque } };
  const ms = legales(copia);
  const dificil = nivel === 'dificil';
  const limite = Date.now() + (dificil ? 180 : 70); // más tiempo bloquearía el servidor
  const maxProf = dificil ? 5 : 3;
  let mejor = ms[Math.floor(rnd() * ms.length)];
  const nodos = { n: 0 };
  try {
    for (let prof = 1; prof <= maxProf; prof++) {
      let a = -Infinity, elegida = null, empatadas = [];
      // la mejor de la vuelta anterior se mira primero
      const orden = [mejor, ...ms.filter((m) => m !== mejor)];
      for (const m of orden) {
        const d = hacer(copia, m);
        let v;
        try { v = -buscar(copia, prof - 1, -Infinity, -a + 1, limite, nodos); } finally { deshacerJugada(copia, d); }
        if (!dificil) v += Math.floor(rnd() * 25); // la normal se equivoca de vez en cuando
        if (v > a) { a = v; elegida = m; empatadas = [m]; } else if (v === a) empatadas.push(m);
      }
      mejor = empatadas.length > 1 ? empatadas[Math.floor(rnd() * empatadas.length)] : elegida;
    }
  } catch (err) { if (!(err instanceof Tiempo)) throw err; }
  return { tipo: 'mover', de: mejor.de, a: mejor.a, promo: mejor.promo };
}

module.exports = { id: 'ajedrez', min: 2, max: 2, nuevo, vista, accion, turno, fin, bot, _: { legales, hacer, deshacerJugada, nombre } };
