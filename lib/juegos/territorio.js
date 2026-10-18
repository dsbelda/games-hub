'use strict';
// Territorio (1-8 personas + relleno): empiezas con un cuadradito de color. Al salir de tu zona dejas un
// rastro; al volver a ella, te quedas con todo lo que has rodeado (también lo de otros). Si alguien pisa
// tu rastro antes de que vuelvas, caes (y si lo pisas tú, también). El borde mata. Gana quien llegue a
// tener más mapa en 4 minutos. Rejilla de 64×64; en las fotos solo viajan las casillas que cambian.
const A = require('./arena');
const G = 64, V = 6.5, VACIA = -1;
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

function nuevo(n, rnd = Math.random) {
  const e = A.crear(n, { total: 10, rnd });
  e.dueno = new Int8Array(G * G).fill(VACIA); e.rastro = new Int8Array(G * G).fill(VACIA); e.cambios = new Map();
  return e;
}
const configurar = (e, asientos) => { A.configurar(e, asientos); e.jug.forEach((p, i) => { p.i = i; }); };
const idx = (x, y) => y * G + x;
function poner(e, k, dueno, rastro) { if (dueno !== undefined) e.dueno[k] = dueno; if (rastro !== undefined) e.rastro[k] = rastro; e.cambios.set(k, [k, e.dueno[k], e.rastro[k]]); }
function reaparecer(e, p) {
  let x, y, intento = 0;
  do { x = 3 + Math.floor(e.rnd() * (G - 6)); y = 3 + Math.floor(e.rnd() * (G - 6)); intento++; }
  while (intento < 60 && [...Array(25)].some((_, k) => e.dueno[idx(x - 2 + (k % 5), y - 2 + Math.floor(k / 5))] !== VACIA));
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) poner(e, idx(x + dx, y + dy), p.i);
  Object.assign(p, { cx: x, cy: y, d: Math.floor(e.rnd() * 4), sig: null, prog: 0, fuera: 0, plan: null });
}
function morir(e, p) {
  for (let k = 0; k < G * G; k++) { if (e.dueno[k] === p.i) poner(e, k, VACIA); if (e.rastro[k] === p.i) poner(e, k, undefined, VACIA); }
  A.morir(e, p, 3);
}
function capturar(e, p) {
  for (let k = 0; k < G * G; k++) if (e.rastro[k] === p.i) poner(e, k, p.i, VACIA);
  // relleno desde el borde por lo que no es mío: lo que no se alcanza queda rodeado
  const visto = new Uint8Array(G * G), cola = [];
  for (let k = 0; k < G; k++) for (const c of [idx(k, 0), idx(k, G - 1), idx(0, k), idx(G - 1, k)]) if (!visto[c] && e.dueno[c] !== p.i) { visto[c] = 1; cola.push(c); }
  while (cola.length) { const c = cola.pop(), x = c % G, y = (c - x) / G; for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= G || ny >= G) continue; const n = idx(nx, ny); if (!visto[n] && e.dueno[n] !== p.i) { visto[n] = 1; cola.push(n); } } }
  for (let k = 0; k < G * G; k++) if (!visto[k] && e.dueno[k] !== p.i) {
    if (e.rastro[k] !== VACIA && e.rastro[k] !== p.i) { const q = e.jug[e.rastro[k]]; if (q?.vivo) morir(e, q); } // rodeas el rastro de otro: cae
    poner(e, k, p.i, VACIA);
  }
  // quien se quede con la cabeza dentro de lo capturado y sin casa, cae
  for (const q of e.jug) if (q !== p && q.vivo && e.dueno[idx(q.cx, q.cy)] === p.i && !e.dueno.includes(q.i)) morir(e, q);
}
function entrar(e, p) {
  const x = p.cx, y = p.cy;
  if (x < 0 || y < 0 || x >= G || y >= G) { p.cx = Math.max(0, Math.min(G - 1, x)); p.cy = Math.max(0, Math.min(G - 1, y)); return morir(e, p); }
  const k = idx(x, y), r = e.rastro[k];
  if (r !== VACIA) { const q = e.jug[r]; if (q && q.vivo) morir(e, q); if (q === p) return; }
  if (e.dueno[k] === p.i) { if (p.fuera) { capturar(e, p); p.fuera = 0; } }
  else { poner(e, k, undefined, p.i); p.fuera++; }
}
// CPU: sale de casa, da una vuelta en forma de rectángulo y vuelve; si hay peligro, vuelve antes
function pensar(e, p) {
  const libre = (d) => { const x = p.cx + DIRS[d][0], y = p.cy + DIRS[d][1]; return x >= 0 && y >= 0 && x < G && y < G && e.rastro[idx(x, y)] !== p.i; };
  const casa = () => { // dirección hacia la casilla propia más cercana (búsqueda en anchura por casillas sin rastro propio)
    const prev = new Map([[idx(p.cx, p.cy), -1]]), cola = [idx(p.cx, p.cy)];
    while (cola.length) { const c = cola.shift(), x = c % G, y = (c - x) / G; if (c !== idx(p.cx, p.cy) && e.dueno[c] === p.i) { let cur = c; while (prev.get(cur) !== idx(p.cx, p.cy)) cur = prev.get(cur); const nx = cur % G, ny = (cur - nx) / G; return DIRS.findIndex(([dx, dy]) => dx === nx - p.cx && dy === ny - p.cy); } for (const [dx, dy] of DIRS) { const a = x + dx, b = y + dy; if (a < 0 || b < 0 || a >= G || b >= G) continue; const n = idx(a, b); if (!prev.has(n) && e.rastro[n] !== p.i) { prev.set(n, c); cola.push(n); } } }
    return -1;
  };
  const amenaza = p.fuera && e.jug.some((q) => q !== p && q.vivo && Math.abs(q.cx - p.cx) + Math.abs(q.cy - p.cy) < (p.nivel === 'dificil' ? 9 : 5));
  const maxFuera = p.nivel === 'dificil' ? 26 : 16;
  if (p.fuera && (amenaza || p.fuera > maxFuera || (p.plan && p.plan.paso >= 3))) { const d = casa(); if (d >= 0) return d; }
  if (!p.fuera) { p.plan = { paso: 0, n: 3 + Math.floor(e.rnd() * (p.nivel === 'dificil' ? 7 : 5)), giro: e.rnd() < 0.5 ? 1 : 3 }; }
  if (p.fuera && p.plan) { p.plan.n--; if (p.plan.n <= 0) { p.plan.paso++; p.plan.n = 3 + Math.floor(e.rnd() * 6); const d = (p.d + p.plan.giro) % 4; if (libre(d)) return d; } }
  if (libre(p.d) && !(p.cx + DIRS[p.d][0] <= 1 || p.cy + DIRS[p.d][1] <= 1 || p.cx + DIRS[p.d][0] >= G - 2 || p.cy + DIRS[p.d][1] >= G - 2)) return p.d;
  const ops = [1, 3, 2].map((g) => (p.d + g) % 4).filter(libre);
  return ops.length ? ops[0] : p.d;
}
function paso(e, dt) {
  if (!A.paso(e, dt, (p) => reaparecer(e, p))) return;
  for (const p of e.jug) {
    if (!p.vivo) continue;
    if (!p.bot) { // personas: flechas/WASD, o dirección del ratón o dedo
      const m = p.mando; let d = null;
      if (m.x || m.y) d = m.x > 0 ? 0 : m.x < 0 ? 2 : m.y > 0 ? 1 : 3;
      else if (m.f > 0.15) d = Math.round(((m.a % (2 * Math.PI)) + 2 * Math.PI) / (Math.PI / 2)) % 4;
      if (d !== null && (d + 2) % 4 !== p.d) p.sig = d;
    }
    p.prog += V * dt;
    while (p.prog >= 1 && p.vivo) {
      p.prog -= 1;
      if (p.bot) p.d = pensar(e, p); else if (p.sig !== null) { p.d = p.sig; p.sig = null; }
      p.cx += DIRS[p.d][0]; p.cy += DIRS[p.d][1];
      entrar(e, p);
    }
  }
  const cuenta = new Array(e.jug.length).fill(0);
  for (let k = 0; k < G * G; k++) if (e.dueno[k] >= 0) cuenta[e.dueno[k]]++;
  for (const p of e.jug) p.puntos = p.vivo ? Math.round(cuenta[p.i] / (G * G) * 1000) / 10 : 0;
}
const accion = (e, yo, a) => (a.tipo === 'mando' ? A.mando(e, yo, a) : { ok: false, error: 'Acción desconocida' });
const fotoBase = (e) => ({ p: e.jug.filter((p) => p.vivo).map((p) => [p.id, p.i, Math.round((p.cx + DIRS[p.d][0] * p.prog) * 10), Math.round((p.cy + DIRS[p.d][1] * p.prog) * 10)]), t: e.jug.filter((p) => p.vivo).sort((a, b) => b.puntos - a.puntos).slice(0, 6).map((p) => [p.id, p.puntos]), r: Math.ceil(e.reloj) });
function foto(e) { const f = fotoBase(e); if (e.cambios.size) { f.c = [...e.cambios.values()]; e.cambios.clear(); } return f; }
const vista = (e) => ({ g: G, jug: A.jugadores(e).map((x, i) => ({ ...x, i })), dueno: Array.from(e.dueno), rastro: Array.from(e.rastro), foto: fotoBase(e), reloj: Math.ceil(e.reloj), ganadores: e.ganador });
const turno = () => -1;
const bot = () => null;
module.exports = { id: 'territorio', min: 1, max: 8, tiempoReal: true, nuevo, configurar, paso, foto, vista, accion, turno, fin: A.fin, bot };
