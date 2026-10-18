'use strict';
// Carreras (2-4, en tiempo real, con CPU). Cochecitos vistos desde arriba en un circuito cerrado; fuera del
// asfalto se va mucho más lento. 3 vueltas; gana quien llega primero. Teclas: 1 acelerar, 2 frenar/marcha
// atrás, 4 izquierda, 8 derecha, 16 turbo (una vez por vuelta).
const CONTROL = [[150, 110], [500, 80], [820, 110], [890, 250], [790, 350], [600, 320], [470, 390], [560, 490], [800, 500], [850, 590], [420, 600], [160, 570], [80, 420], [190, 310], [90, 220]];
const ANCHO = 74, VUELTAS = 3, COLORES = ['#4d7cfe', '#ff5a36', '#3fbf5f', '#ffc63d'];
// línea central suavizada (Catmull-Rom cerrada)
const PUNTOS = [];
for (let i = 0; i < CONTROL.length; i++) {
  const p0 = CONTROL[(i - 1 + CONTROL.length) % CONTROL.length], p1 = CONTROL[i], p2 = CONTROL[(i + 1) % CONTROL.length], p3 = CONTROL[(i + 2) % CONTROL.length];
  for (let t = 0; t < 1; t += 1 / 24) { const t2 = t * t, t3 = t2 * t; PUNTOS.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3))); }
}
const NP = PUNTOS.length;
function masCercano(x, y, pista) { // índice del punto de la pista más cercano (buscando cerca del anterior)
  let best = pista, bd = Infinity;
  for (let k = -25; k <= 25; k++) { const i = (pista + k + NP) % NP, d = (PUNTOS[i][0] - x) ** 2 + (PUNTOS[i][1] - y) ** 2; if (d < bd) { bd = d; best = i; } }
  return [best, Math.sqrt(bd)];
}
function nuevo(n) {
  const e = { n, ganador: null, bots: Array(n).fill(null), teclas: Array(n).fill(0), pulso: Array(n).fill(false), t: 0, salida: 3, llegadas: [], cambio: true };
  const [a, b] = PUNTOS[NP - 6], [c, d] = PUNTOS[NP - 5], ang = Math.atan2(d - b, c - a);
  e.coches = Array.from({ length: n }, (_, j) => { const fila = Math.floor(j / 2), lado = j % 2 ? 1 : -1; const px = a - Math.cos(ang) * fila * 40 + Math.cos(ang + Math.PI / 2) * lado * 16, py = b - Math.sin(ang) * fila * 40 + Math.sin(ang + Math.PI / 2) * lado * 16; return { x: px, y: py, ang, vx: 0, vy: 0, pista: NP - 6 - fila * 2, vuelta: 0, avance: 0, turbo: 0, turboUsado: false, fin: false }; });
  return e;
}
function configurar(e, asientos) { e.bots = asientos.map((a) => (a.bot ? { nivel: a.nivel } : null)); }
function pensar(e, j) {
  const c = e.coches[j], b = e.bots[j], dif = b.nivel === 'dificil', v = Math.hypot(c.vx, c.vy);
  const mira = Math.round((60 + v * 0.35) / 9), [tx, ty] = PUNTOS[(c.pista + mira) % NP];
  let da = Math.atan2(ty - c.y, tx - c.x) - c.ang; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
  let k = 0;
  if (da > 0.06) k |= 8; else if (da < -0.06) k |= 4;
  const lim = dif ? 0.6 : 0.42;
  if (Math.abs(da) > lim && v > (dif ? 200 : 150)) k |= 2; else k |= 1;
  if (dif && !c.turboUsado && Math.abs(da) < 0.1 && v > 200) k |= 16;
  b.k = k; return k;
}
function paso(e, dt) {
  if (e.ganador) return;
  if (e.salida > 0) { e.salida -= dt; return; }
  e.t += dt;
  e.coches.forEach((c, j) => {
    let k = e.bots[j] ? pensar(e, j) : e.teclas[j];
    if (c.fin) k = 0;
    const [pi, dist] = masCercano(c.x, c.y, c.pista);
    const asfalto = dist < ANCHO / 2, v = Math.hypot(c.vx, c.vy);
    const maxV = (asfalto ? 340 : 130) * (e.bots[j] ? (e.bots[j].nivel === 'dificil' ? 0.97 : 0.8) : 1) * (c.turbo > 0 ? 1.45 : 1);
    if ((k & 16 || e.pulso[j]) && !c.turboUsado) { c.turbo = 1.4; c.turboUsado = true; }
    e.pulso[j] = false; c.turbo = Math.max(0, c.turbo - dt);
    const fx = Math.cos(c.ang), fy = Math.sin(c.ang);
    const adelante = c.vx * fx + c.vy * fy;
    if (k & 1) { c.vx += fx * 300 * dt; c.vy += fy * 300 * dt; }
    if (k & 2) { if (adelante > 10) { c.vx -= fx * 420 * dt; c.vy -= fy * 420 * dt; } else { c.vx -= fx * 160 * dt; c.vy -= fy * 160 * dt; } }
    const giro = (((k & 8) ? 1 : 0) - ((k & 4) ? 1 : 0)) * Math.min(1, v / 90) * 2.9 * Math.sign(adelante || 1);
    c.ang += giro * dt;
    // agarre: la velocidad se alinea con el morro (derrapes suaves)
    const agarre = asfalto ? 6 : 3, vf = c.vx * Math.cos(c.ang) + c.vy * Math.sin(c.ang);
    c.vx += (Math.cos(c.ang) * vf - c.vx) * Math.min(1, agarre * dt); c.vy += (Math.sin(c.ang) * vf - c.vy) * Math.min(1, agarre * dt);
    const v2 = Math.hypot(c.vx, c.vy); if (v2 > maxV) { c.vx *= Math.pow(0.2, dt) * (maxV / v2 > 0.9 ? 1 : 1); if (v2 > maxV * 1.05) { c.vx *= maxV / v2; c.vy *= maxV / v2; } }
    c.vx *= Math.pow(0.75, dt); c.vy *= Math.pow(0.75, dt);
    c.x = Math.max(10, Math.min(950, c.x + c.vx * dt)); c.y = Math.max(10, Math.min(630, c.y + c.vy * dt));
    // vueltas: el índice de pista avanza; al pasar del final al principio, vuelta nueva
    let d = pi - c.pista; if (d > NP / 2) d -= NP; if (d < -NP / 2) d += NP;
    if (Math.abs(d) < 30) { c.avance += d; c.pista = pi; }
    if (c.avance >= NP * (c.vuelta + 1) && !c.fin) { c.vuelta++; c.turboUsado = false; e.cambio = true; if (c.vuelta >= VUELTAS) { c.fin = true; e.llegadas.push(j); } }
  });
  // choques entre coches
  for (let i = 0; i < e.n; i++) for (let k = i + 1; k < e.n; k++) { const a = e.coches[i], b = e.coches[k], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d < 22 && d > 0) { const s = (22 - d) / 2, nx = dx / d, ny = dy / d; a.x -= nx * s; a.y -= ny * s; b.x += nx * s; b.y += ny * s; } }
  if (e.llegadas.length && !e.ganador) e.ganador = [e.llegadas[0]];
  if (e.t > 420) { const orden = e.coches.map((c, j) => [c.avance, j]).sort((a, b) => b[0] - a[0]); e.ganador = [orden[0][1]]; }
}
function accion(e, yo, a) {
  if (a.tipo !== 'teclas') return { ok: false, error: 'Acción desconocida' };
  const k = Number(a.k) & 31;
  if ((k & 16) && !(e.teclas[yo] & 16)) e.pulso[yo] = true;
  e.teclas[yo] = k;
  return { ok: true, sinVista: true };
}
const posiciones = (e) => e.coches.map((c, j) => [c.avance, j]).sort((a, b) => b[0] - a[0]).map(([, j]) => j);
const foto = (e) => ({ c: e.coches.map((c) => [Math.round(c.x * 10) / 10, Math.round(c.y * 10) / 10, Math.round(c.ang * 100) / 100, Math.min(VUELTAS, c.vuelta + 1), c.turbo > 0 ? 1 : 0, c.turboUsado ? 1 : 0]), o: posiciones(e), s: Math.ceil(e.salida), t: Math.floor(e.t) });
const vista = (e) => ({ n: e.n, pista: PUNTOS.map(([x, y]) => [Math.round(x), Math.round(y)]), ancho: ANCHO, vueltas: VUELTAS, colores: COLORES, foto: foto(e), ganadores: e.ganador });
const turno = () => -1;
const fin = (e) => (e.ganador ? { ganadores: e.ganador, texto: `${VUELTAS} vueltas en ${Math.floor(e.t)} s` } : null);
const bot = () => null;
module.exports = { id: 'carreras', min: 2, max: 4, tiempoReal: true, nuevo, configurar, paso, foto, vista, accion, turno, fin, bot, _: { PUNTOS } };
