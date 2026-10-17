'use strict';
// Tanques en laberinto (2-4), en tiempo real. ↑ ↓ avanzar / retroceder, ← → girar, espacio disparar.
// Las balas rebotan en las paredes (¡también te dan a ti!). El último tanque vivo se lleva la ronda;
// gana quien llega antes a 5. Laberinto nuevo en cada ronda; si en 60 s no hay ganador, ronda nula.
const C = 9, F = 6, L = 60, ANCHO = C * L, ALTO = F * L, RT = 10, RB = 3, VT = 95, GIRO = 3.2, VB = 190, VIDA_BALA = 7, MAX_BALAS = 5, META = 5;
const ARRIBA = 1, ABAJO = 2, IZQ = 4, DER = 8, FUEGO = 16;

function laberinto(rnd) {
  // paredes: h[f][c] = pared encima de la celda (f,c); v[f][c] = pared a la izquierda de (f,c)
  const h = Array.from({ length: F + 1 }, () => Array(C).fill(true));
  const v = Array.from({ length: F }, () => Array(C + 1).fill(true));
  const visto = Array.from({ length: F }, () => Array(C).fill(false));
  const pila = [[Math.floor(rnd() * F), Math.floor(rnd() * C)]];
  visto[pila[0][0]][pila[0][1]] = true;
  while (pila.length) {
    const [f, c] = pila[pila.length - 1];
    const op = [[f - 1, c], [f + 1, c], [f, c - 1], [f, c + 1]].filter(([y, x]) => y >= 0 && y < F && x >= 0 && x < C && !visto[y][x]);
    if (!op.length) { pila.pop(); continue; }
    const [y, x] = op[Math.floor(rnd() * op.length)];
    if (y < f) h[f][c] = false; else if (y > f) h[y][x] = false; else if (x < c) v[f][c] = false; else v[f][x] = false;
    visto[y][x] = true; pila.push([y, x]);
  }
  // quitar unas cuantas paredes más para que haya caminos alternativos
  for (let k = 0; k < 12; k++) { if (rnd() < 0.5) { const f = 1 + Math.floor(rnd() * (F - 1)), c = Math.floor(rnd() * C); h[f][c] = false; } else { const f = Math.floor(rnd() * F), c = 1 + Math.floor(rnd() * (C - 1)); v[f][c] = false; } }
  // segmentos [x1, y1, x2, y2]
  const seg = [];
  for (let f = 0; f <= F; f++) for (let c = 0; c < C; c++) if (h[f][c]) seg.push([c * L, f * L, (c + 1) * L, f * L]);
  for (let f = 0; f < F; f++) for (let c = 0; c <= C; c++) if (v[f][c]) seg.push([c * L, f * L, c * L, (f + 1) * L]);
  return { h, v, seg };
}
const COLORES = ['#4d7cfe', '#ff5a36', '#3fbf5f', '#ffc63d'];
function nuevo(n) {
  const e = { n, puntos: Array(n).fill(0), ronda: 0, ganador: null, teclas: Array(n).fill(0), bots: Array(n).fill(null), cambio: true };
  ronda(e);
  return e;
}
function configurar(e, asientos) { e.bots = asientos.map((a) => (a.bot ? { nivel: a.nivel, carga: 1, ruta: null, t: 0 } : null)); }
function ronda(e) {
  e.ronda++;
  const lab = laberinto(Math.random);
  e.lab = lab;
  const esquinas = [[0, 0], [F - 1, C - 1], [0, C - 1], [F - 1, 0]];
  e.tanques = Array.from({ length: e.n }, (_, j) => { const [f, c] = esquinas[j]; return { x: c * L + L / 2, y: f * L + L / 2, a: j % 2 ? Math.PI : 0, vivo: true, carga: 0 }; });
  e.balas = []; e.finRonda = null; e.cambio = true; e.reloj = 60;
}
// choque círculo-segmento: empuja el tanque fuera de las paredes
function empujar(t, seg) {
  for (const [x1, y1, x2, y2] of seg) {
    const cx = Math.max(Math.min(t.x, Math.max(x1, x2)), Math.min(x1, x2)), cy = Math.max(Math.min(t.y, Math.max(y1, y2)), Math.min(y1, y2));
    const dx = t.x - cx, dy = t.y - cy, d = Math.hypot(dx, dy);
    if (d < RT + 2 && d > 0) { t.x += dx / d * (RT + 2 - d); t.y += dy / d * (RT + 2 - d); }
  }
}
// ¿cruza el movimiento de (x,y) a (nx,ny) una pared? devuelve el eje del rebote
function cruce(seg, x, y, nx, ny) {
  for (const [x1, y1, x2, y2] of seg) {
    if (y1 === y2) { // horizontal
      if ((y - y1) * (ny - y1) <= 0 && y !== ny) { const t = (y1 - y) / (ny - y), cx = x + (nx - x) * t; if (cx >= Math.min(x1, x2) - RB && cx <= Math.max(x1, x2) + RB) return 'y'; }
    } else if ((x - x1) * (nx - x1) <= 0 && x !== nx) { const t = (x1 - x) / (nx - x), cy = y + (ny - y) * t; if (cy >= Math.min(y1, y2) - RB && cy <= Math.max(y1, y2) + RB) return 'x'; }
  }
  return null;
}
const hayLinea = (seg, a, b) => !cruce(seg, a.x, a.y, b.x, b.y);

function paso(e, dt) {
  if (e.ganador) return;
  if (e.finRonda !== null) { e.finRonda -= dt; if (e.finRonda <= 0) { const vivos = e.tanques.map((t, j) => (t.vivo ? j : -1)).filter((j) => j >= 0); if (vivos.length === 1) e.puntos[vivos[0]]++; const max = Math.max(...e.puntos); if (max >= META) e.ganador = e.puntos.map((p, j) => (p === max ? j : -1)).filter((j) => j >= 0); else ronda(e); e.cambio = true; } }
  if (e.finRonda === null) { e.reloj -= dt; if (e.reloj <= 0) { e.tanques.forEach((t) => { t.vivo = false; }); e.finRonda = 1.5; e.cambio = true; } }
  e.tanques.forEach((t, j) => { if (e.bots[j] && t.vivo) e.teclas[j] = cerebro(e, j, dt); });
  e.tanques.forEach((t, j) => {
    if (!t.vivo) return;
    const k = e.teclas[j];
    if (k & IZQ) t.a -= GIRO * dt; if (k & DER) t.a += GIRO * dt;
    const avance = (k & ARRIBA ? 1 : 0) - (k & ABAJO ? 0.7 : 0);
    t.x += Math.cos(t.a) * VT * avance * dt; t.y += Math.sin(t.a) * VT * avance * dt;
    empujar(t, e.lab.seg);
    t.x = Math.max(RT, Math.min(ANCHO - RT, t.x)); t.y = Math.max(RT, Math.min(ALTO - RT, t.y));
    t.carga -= dt;
    if (k & FUEGO && t.carga <= 0 && e.balas.filter((b) => b.de === j).length < MAX_BALAS) {
      t.carga = 0.25;
      e.balas.push({ x: t.x + Math.cos(t.a) * (RT + 4), y: t.y + Math.sin(t.a) * (RT + 4), vx: Math.cos(t.a) * VB, vy: Math.sin(t.a) * VB, vida: VIDA_BALA, de: j, t: 0 });
    }
  });
  for (const b of e.balas) {
    b.vida -= dt; b.t += dt;
    for (let s = 0; s < 2; s++) {
      const nx = b.x + b.vx * dt / 2, ny = b.y + b.vy * dt / 2;
      const eje = cruce(e.lab.seg, b.x, b.y, nx, ny);
      if (eje === 'x') b.vx = -b.vx; else if (eje === 'y') b.vy = -b.vy; else { b.x = nx; b.y = ny; }
    }
    for (const [j, t] of e.tanques.entries()) {
      if (!t.vivo || (j === b.de && b.t < 0.15)) continue;
      if ((t.x - b.x) ** 2 + (t.y - b.y) ** 2 < (RT + RB) ** 2) { t.vivo = false; b.vida = 0; e.boom = { x: t.x, y: t.y, j }; e.cambio = true; }
    }
  }
  e.balas = e.balas.filter((b) => b.vida > 0);
  if (e.finRonda === null && e.tanques.filter((t) => t.vivo).length <= 1) e.finRonda = 2;
}
// CPU: va hacia el rival más cercano por el laberinto y dispara si lo ve
function cerebro(e, j, dt) {
  const t = e.tanques[j], bot = e.bots[j];
  const rivales = e.tanques.map((o, k) => ({ o, k })).filter(({ o, k }) => k !== j && o.vivo);
  if (!rivales.length) return 0;
  const obj = rivales.reduce((a, b) => (Math.hypot(b.o.x - t.x, b.o.y - t.y) < Math.hypot(a.o.x - t.x, a.o.y - t.y) ? b : a)).o;
  bot.t -= dt; bot.carga -= dt;
  let k = 0;
  const angA = (x, y) => { let d = Math.atan2(y - t.y, x - t.x) - t.a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
  if (hayLinea(e.lab.seg, t, obj)) {
    const d = angA(obj.x, obj.y);
    if (Math.abs(d) > 0.08) k |= d > 0 ? DER : IZQ;
    if (Math.abs(d) < (bot.nivel === 'dificil' ? 0.12 : 0.25) && bot.carga <= 0) { k |= FUEGO; bot.carga = bot.nivel === 'dificil' ? 0.7 : 1.4; }
    return k;
  }
  // ruta por las celdas (BFS)
  if (bot.t <= 0 || !bot.ruta) {
    bot.t = 0.5;
    const ini = [Math.floor(t.y / L), Math.floor(t.x / L)], fin = [Math.floor(obj.y / L), Math.floor(obj.x / L)];
    const prev = new Map([[ini.join(), null]]), cola = [ini];
    while (cola.length) {
      const [f, c] = cola.shift(); if (f === fin[0] && c === fin[1]) break;
      const ady = [];
      if (f > 0 && !e.lab.h[f][c]) ady.push([f - 1, c]); if (f < F - 1 && !e.lab.h[f + 1][c]) ady.push([f + 1, c]);
      if (c > 0 && !e.lab.v[f][c]) ady.push([f, c - 1]); if (c < C - 1 && !e.lab.v[f][c + 1]) ady.push([f, c + 1]);
      for (const q of ady) if (!prev.has(q.join())) { prev.set(q.join(), [f, c]); cola.push(q); }
    }
    const ruta = []; let cur = fin;
    while (cur && prev.has(cur.join())) { ruta.unshift(cur); cur = prev.get(cur.join()); }
    bot.ruta = ruta;
  }
  const movido = Math.hypot(t.x - (bot.px ?? t.x), t.y - (bot.py ?? t.y)); bot.px = t.x; bot.py = t.y;
  bot.quieto = movido < 0.5 ? (bot.quieto || 0) + dt : 0;
  if (bot.quieto > 0.8) { bot.atasco = 0.5; bot.quieto = 0; }
  if (bot.atasco > 0) { bot.atasco -= dt; return DER | ABAJO; }
  const sig = bot.ruta[1] || bot.ruta[0];
  if (sig) { const x = sig[1] * L + L / 2, y = sig[0] * L + L / 2; const d = angA(x, y); if (Math.abs(d) > 0.15) k |= d > 0 ? DER : IZQ; if (Math.abs(d) < 0.6) k |= ARRIBA; }
  return k;
}
function accion(e, yo, a) {
  if (a.tipo === 'teclas') { e.teclas[yo] = Number(a.k) & 31; return { ok: true, sinVista: true }; }
  return { ok: false, error: 'Acción desconocida' };
}
const foto = (e) => ({ t: e.tanques.map((t) => [Math.round(t.x), Math.round(t.y), Math.round(t.a * 100) / 100, t.vivo ? 1 : 0]), b: e.balas.map((b) => [Math.round(b.x), Math.round(b.y)]) });
const vista = (e) => ({ n: e.n, puntos: e.puntos, ronda: e.ronda, reloj: Math.ceil(e.reloj), seg: e.lab.seg, ancho: ANCHO, alto: ALTO, colores: COLORES, meta: META, foto: foto(e), finRonda: e.finRonda, ganador: e.ganador, boom: e.boom });
const turno = () => -1;
const fin = (e) => (e.ganador ? { ganadores: e.ganador, texto: `${META} rondas ganadas` } : null);
const bot = () => null;
module.exports = { id: 'tanques', min: 2, max: 4, tiempoReal: true, nuevo, configurar, paso, foto, vista, accion, turno, fin, bot, _: { laberinto, cruce } };
