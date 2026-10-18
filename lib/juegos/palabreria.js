'use strict';
// Palabrería (2-4): el juego de las fichas de letras en un tablero de 15×15 con casillas que doblan o
// triplican letra o palabra. 100 fichas con el reparto del castellano (2 comodines), atril de 7.
// Las palabras se cruzan como en un crucigrama y todas las que se formen deben estar en el diccionario.
// Usar las 7 fichas de golpe da 50 puntos. Acaba cuando alguien se queda sin fichas con la bolsa vacía
// o tras 6 turnos seguidos sin puntos; a cada uno se le restan las fichas que le queden.
// La bolsa y los atriles ajenos nunca viajan al navegador.
const D = require('../diccionario');
const N = 15, C = 7, ATRIL = 7;
const REPARTO = { a: [12, 1], e: [12, 1], o: [9, 1], i: [6, 1], s: [6, 1], n: [5, 1], r: [6, 1], u: [5, 1], d: [5, 2], l: [5, 1], t: [4, 1], c: [5, 3], g: [2, 2], b: [2, 3], m: [2, 3], p: [2, 3], h: [2, 4], f: [1, 4], v: [1, 4], y: [1, 4], q: [1, 5], j: [1, 8], ñ: [1, 8], x: [1, 8], z: [1, 10], '?': [2, 0] };
const VALOR = Object.fromEntries(Object.entries(REPARTO).map(([l, [, v]]) => [l, v]));
const LETRAS = Object.keys(REPARTO).filter((l) => l !== '?');
// casillas especiales (las clásicas): TP triple palabra, DP doble palabra, TL triple letra, DL doble letra
const PREMIO = Array.from({ length: N }, () => Array(N).fill(''));
const sim = (f, c, t) => { for (const [a, b] of [[f, c], [c, f], [N - 1 - f, c], [f, N - 1 - c], [N - 1 - f, N - 1 - c], [c, N - 1 - f], [N - 1 - c, f], [N - 1 - c, N - 1 - f]]) PREMIO[a][b] = t; };
for (const [f, c] of [[0, 0], [0, 7]]) sim(f, c, 'TP');
for (let k = 1; k <= 4; k++) sim(k, k, 'DP');
sim(7, 7, 'DP');
for (const [f, c] of [[1, 5], [5, 5]]) sim(f, c, 'TL');
for (const [f, c] of [[0, 3], [2, 6], [3, 7], [6, 6]]) sim(f, c, 'DL');

function nuevo(n, rnd = Math.random) {
  const bolsa = Object.entries(REPARTO).flatMap(([l, [k]]) => Array(k).fill(l));
  for (let i = bolsa.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [bolsa[i], bolsa[j]] = [bolsa[j], bolsa[i]]; }
  const e = { n, rnd, tablero: Array.from({ length: N }, () => Array(N).fill(null)), bolsa, atriles: [], puntos: Array(n).fill(0), turno: 0, sinPuntos: 0, ultima: null, ganador: null, nJugadas: 0, limiteMs: 250 };
  for (let j = 0; j < n; j++) e.atriles.push(bolsa.splice(0, ATRIL));
  return e;
}
const vacio = (e) => !e.tablero[C][C];
const letraEn = (e, f, c, puestas) => (f < 0 || c < 0 || f >= N || c >= N ? null : e.tablero[f][c]?.l || puestas?.get(f * N + c)?.l || null);

// Comprueba una jugada (lista de fichas {f, c, l, comodin}) y calcula sus palabras y puntos. No cambia nada.
function validar(e, fichas) {
  if (!Array.isArray(fichas) || !fichas.length || fichas.length > ATRIL) return { error: 'Pon alguna ficha' };
  const puestas = new Map();
  for (const x of fichas) {
    const f = Number(x.f), c = Number(x.c), l = String(x.l || '').toLowerCase();
    if (!Number.isInteger(f) || !Number.isInteger(c) || f < 0 || c < 0 || f >= N || c >= N) return { error: 'Fuera del tablero' };
    if (!LETRAS.includes(l)) return { error: 'Letra no válida' };
    if (e.tablero[f][c] || puestas.has(f * N + c)) return { error: 'Esa casilla está ocupada' };
    puestas.set(f * N + c, { f, c, l, comodin: !!x.comodin });
  }
  const ps = [...puestas.values()];
  const misma = (k) => ps.every((p) => p[k] === ps[0][k]);
  const horizontal = ps.length === 1 ? (letraEn(e, ps[0].f, ps[0].c - 1) || letraEn(e, ps[0].f, ps[0].c + 1)) != null : misma('f');
  if (!horizontal && !misma('c')) return { error: 'Las fichas tienen que ir en la misma fila o columna' };
  const [df, dc] = horizontal ? [0, 1] : [1, 0];
  // la palabra principal: desde la primera hasta la última, sin huecos
  const ord = ps.sort((a, b) => (horizontal ? a.c - b.c : a.f - b.f));
  let f0 = ord[0].f, c0 = ord[0].c;
  while (letraEn(e, f0 - df, c0 - dc, puestas)) { f0 -= df; c0 -= dc; }
  const palabra = (f, c, df2, dc2) => { let w = '', pts = 0, mult = 1; const celdas = []; while (letraEn(e, f, c, puestas)) { const p = puestas.get(f * N + c), t = e.tablero[f][c]; const l = letraEn(e, f, c, puestas); let v = (p ? (p.comodin ? 0 : VALOR[l]) : (t.comodin ? 0 : VALOR[l])); if (p) { const pr = PREMIO[f][c]; if (pr === 'DL') v *= 2; if (pr === 'TL') v *= 3; if (pr === 'DP') mult *= 2; if (pr === 'TP') mult *= 3; } w += l; pts += v; celdas.push([f, c]); f += df2; c += dc2; } return { w, pts: pts * mult, celdas }; };
  const principal = palabra(f0, c0, df, dc);
  const ultima = ord[ord.length - 1];
  if (!principal.celdas.some(([f, c]) => f === ultima.f && c === ultima.c) || ps.some((p) => !principal.celdas.some(([f, c]) => f === p.f && c === p.c))) return { error: 'Las fichas tienen que quedar seguidas' };
  const palabras = [];
  if (principal.w.length >= 2) palabras.push(principal);
  for (const p of ps) {
    let f = p.f, c = p.c;
    while (letraEn(e, f - dc, c - df, puestas)) { f -= dc; c -= df; }
    const cruz = palabra(f, c, dc, df);
    if (cruz.w.length >= 2) palabras.push(cruz);
  }
  if (vacio(e)) {
    if (!puestas.has(C * N + C)) return { error: 'La primera palabra tiene que pasar por la estrella del centro' };
    if (ps.length < 2) return { error: 'La primera palabra necesita al menos 2 letras' };
  } else {
    const toca = ps.some((p) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => e.tablero[p.f + a]?.[p.c + b]));
    if (!toca) return { error: 'La palabra tiene que tocar alguna de las que ya están' };
  }
  if (!palabras.length) return { error: 'Forma al menos una palabra de 2 letras' };
  const malas = palabras.filter((p) => !D.existe(p.w)).map((p) => p.w.toUpperCase());
  if (malas.length) return { error: `${malas.join(', ')} no ${malas.length > 1 ? 'están' : 'está'} en el diccionario`, malas };
  const puntos = palabras.reduce((s, p) => s + p.pts, 0) + (ps.length === ATRIL ? 50 : 0);
  return { puntos, palabras: palabras.map((p) => p.w), puestas: ps, bingo: ps.length === ATRIL };
}
function tieneFichas(atril, ps) {
  const a = [...atril];
  for (const p of ps) { const i = a.indexOf(p.comodin ? '?' : p.l); if (i < 0) return false; a.splice(i, 1); }
  return a;
}
function siguiente(e) {
  if (e.sinPuntos >= 6 || (!e.bolsa.length && e.atriles.some((a) => !a.length))) return terminar(e);
  e.turno = (e.turno + 1) % e.n;
}
function terminar(e) {
  const resto = e.atriles.map((a) => a.reduce((s, l) => s + VALOR[l], 0));
  const vacio = e.atriles.findIndex((a) => !a.length);
  resto.forEach((r, j) => { e.puntos[j] -= r; if (vacio >= 0) e.puntos[vacio] += r; });
  const max = Math.max(...e.puntos);
  e.ganador = e.puntos.map((p, j) => (p === max ? j : -1)).filter((j) => j >= 0);
}
function accion(e, yo, a) {
  if (e.ganador) return { ok: false, error: 'La partida ha terminado' };
  if (a.tipo === 'probar') { const r = validar(e, a.fichas); return { ok: true, sinVista: true, respuesta: r.error ? { error2: r.error } : { puntos: r.puntos, palabras: r.palabras } }; }
  if (yo !== e.turno) return { ok: false, error: 'No es tu turno' };
  if (a.tipo === 'jugar') {
    const r = validar(e, a.fichas);
    if (r.error) return { ok: false, error: r.error };
    const resto = tieneFichas(e.atriles[yo], r.puestas);
    if (!resto) return { ok: false, error: 'No tienes esas fichas' };
    for (const p of r.puestas) e.tablero[p.f][p.c] = { l: p.l, comodin: p.comodin, j: yo };
    e.atriles[yo] = resto.concat(e.bolsa.splice(0, ATRIL - resto.length));
    e.puntos[yo] += r.puntos; e.sinPuntos = 0; e.nJugadas++;
    e.ultima = { j: yo, tipo: 'jugar', palabras: r.palabras, puntos: r.puntos, bingo: r.bingo, celdas: r.puestas.map((p) => [p.f, p.c]) };
    siguiente(e);
    return { ok: true };
  }
  if (a.tipo === 'cambiar') {
    if (e.bolsa.length < ATRIL) return { ok: false, error: 'Quedan menos de 7 fichas en la bolsa: ya no se puede cambiar' };
    const idx = [...new Set((Array.isArray(a.indices) ? a.indices : []).map(Number))].filter((i) => Number.isInteger(i) && i >= 0 && i < e.atriles[yo].length);
    if (!idx.length) return { ok: false, error: 'Elige qué fichas cambiar' };
    const fuera = idx.map((i) => e.atriles[yo][i]);
    e.atriles[yo] = e.atriles[yo].filter((_, i) => !idx.includes(i)).concat(e.bolsa.splice(0, idx.length));
    e.bolsa.push(...fuera);
    for (let i = e.bolsa.length - 1; i > 0; i--) { const j = Math.floor(e.rnd() * (i + 1)); [e.bolsa[i], e.bolsa[j]] = [e.bolsa[j], e.bolsa[i]]; }
    e.sinPuntos++; e.ultima = { j: yo, tipo: 'cambiar', n: idx.length };
    siguiente(e);
    return { ok: true };
  }
  if (a.tipo === 'pasar') { e.sinPuntos++; e.ultima = { j: yo, tipo: 'pasar' }; siguiente(e); return { ok: true }; }
  return { ok: false, error: 'Acción desconocida' };
}

// ---- CPU: generación de jugadas por anclas (Appel-Jacobson simplificado, sin árbol: los prefijos se
// comprueban por bisección en el diccionario), con tiempo límite. Busca en horizontal y en vertical.
function jugadasCpu(e, atril, limiteMs) {
  const t0 = Date.now(), jugadas = [];
  for (const horizontal of [true, false]) {
    const L = (f, c) => (horizontal ? e.tablero[f]?.[c] : e.tablero[c]?.[f])?.l || null; // f = línea, c = posición en la línea
    const enTab = (c) => c >= 0 && c < N;
    const cruces = new Map();
    const cruce = (f, c) => { // letras que caben en (f,c) según la palabra perpendicular
      const k = f * N + c; if (cruces.has(k)) return cruces.get(k);
      let arriba = '', abajo = '';
      for (let x = f - 1; x >= 0 && L(x, c); x--) arriba = L(x, c) + arriba;
      for (let x = f + 1; x < N && L(x, c); x++) abajo += L(x, c);
      const s = !arriba && !abajo ? null : new Set(LETRAS.filter((l) => D.existe(arriba + l + abajo)));
      cruces.set(k, s); return s;
    };
    const esAncla = (f, c) => !L(f, c) && (vacio(e) ? f === C && c === C : [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => L(f + a, c + b)));
    const anotar = (f, puestas) => { jugadas.push(puestas.map(([c, l, com]) => (horizontal ? { f, c, l, comodin: com } : { f: c, c: f, l, comodin: com }))); };
    for (let f = 0; f < N; f++) for (let c = 0; c < N; c++) {
      if (Date.now() - t0 > limiteMs) return jugadas;
      if (!esAncla(f, c)) continue;
      const extender = (parcial, col, resto, puestas, ancla) => {
        if (!enTab(col) || !L(f, col)) {
          if (ancla && puestas.length && parcial.length >= 2 && D.existe(parcial)) anotar(f, puestas);
          if (!enTab(col)) return;
          const cs = cruce(f, col);
          const probadas = new Set();
          for (let i = 0; i < resto.length; i++) {
            const t = resto[i]; if (probadas.has(t)) continue; probadas.add(t);
            for (const l of t === '?' ? LETRAS : [t]) {
              if (cs && !cs.has(l)) continue;
              if (!D.esPrefijo(parcial + l)) continue;
              const r2 = resto.slice(0, i).concat(resto.slice(i + 1));
              extender(parcial + l, col + 1, r2, puestas.concat([[col, l, t === '?']]), ancla || col === c);
            }
          }
        } else { const w = parcial + L(f, col); if (D.esPrefijo(w)) extender(w, col + 1, resto, puestas, ancla || col === c); }
      };
      if (c > 0 && L(f, c - 1)) { // a la izquierda ya hay letras: son el principio fijo
        let ini = c - 1; while (ini > 0 && L(f, ini - 1)) ini--;
        let pre = ''; for (let x = ini; x < c; x++) pre += L(f, x);
        if (D.esPrefijo(pre)) extender(pre, c, atril, [], false);
      } else { // parte izquierda con fichas del atril en casillas libres que no son anclas
        let k = 0; while (k < atril.length - 1 && c - k - 1 >= 0 && !L(f, c - k - 1) && !esAncla(f, c - k - 1)) k++;
        const izquierda = (parcial, resto, puestas, sitio) => {
          // colocar «parcial» terminando en c-1 y seguir desde el ancla
          const ini = c - parcial.length;
          extender(parcial, c, resto, puestas.map(([, l, com], i) => [ini + i, l, com]), false);
          if (parcial.length >= sitio) return;
          const probadas = new Set();
          for (let i = 0; i < resto.length; i++) {
            const t = resto[i]; if (probadas.has(t)) continue; probadas.add(t);
            for (const l of t === '?' ? LETRAS : [t]) {
              if (!D.esPrefijo(parcial + l)) continue;
              izquierda(parcial + l, resto.slice(0, i).concat(resto.slice(i + 1)), puestas.concat([[0, l, t === '?']]), sitio);
            }
            if (Date.now() - t0 > limiteMs) return;
          }
        };
        izquierda('', atril, [], k);
      }
    }
  }
  return jugadas;
}
function bot(e, yo, nivel, rnd) {
  if (e.ganador || yo !== e.turno) return null;
  const atril = e.atriles[yo];
  // la CPU normal reserva menos tiempo y no siempre elige la mejor
  const lim = nivel === 'dificil' ? e.limiteMs : Math.round(e.limiteMs * 0.5);
  const vistas = new Set(), buenas = [];
  for (const fichas of jugadasCpu(e, atril, lim)) {
    const k = fichas.map((p) => `${p.f},${p.c},${p.l}`).sort().join(';'); if (vistas.has(k)) continue; vistas.add(k);
    const r = validar(e, fichas); if (!r.error && tieneFichas(atril, r.puestas)) buenas.push({ fichas, puntos: r.puntos });
  }
  if (buenas.length) {
    buenas.sort((a, b) => b.puntos - a.puntos);
    const elegida = nivel === 'dificil' ? buenas[0] : buenas[Math.min(buenas.length - 1, Math.floor(rnd() * Math.min(buenas.length, 8)) + Math.floor(buenas.length * 0.25))];
    return { tipo: 'jugar', fichas: elegida.fichas };
  }
  if (e.bolsa.length >= ATRIL) { const malas = atril.map((l, i) => [l, i]).filter(([l]) => VALOR[l] >= 4 || l === 'q').map(([, i]) => i); return { tipo: 'cambiar', indices: malas.length ? malas : [0, 1, 2] }; }
  return { tipo: 'pasar' };
}
function vista(e, yo) {
  return {
    n: e.n, turno: e.turno, tablero: e.tablero, premio: PREMIO, valor: VALOR, atril: yo >= 0 ? e.atriles[yo] : [],
    fichas: e.atriles.map((a) => a.length), bolsa: e.bolsa.length, puntos: e.puntos, ultima: e.ultima, ganadores: e.ganador,
  };
}
const turno = (e) => (e.ganador ? -1 : e.turno);
const fin = (e) => (e.ganador ? { ganadores: e.ganador, texto: `${Math.max(...e.puntos)} puntos` } : null);
module.exports = { id: 'palabreria', min: 2, max: 4, nuevo, vista, accion, turno, fin, bot, _: { validar, jugadasCpu, PREMIO } };
