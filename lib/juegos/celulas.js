'use strict';
// Células (1-8 personas + relleno): eres una célula en una placa enorme. Come puntitos para crecer y
// cómete a las células más pequeñas que tú (hay que ser un 25 % más grande). Cuanto más grande, más lenta.
// Espacio: dividirte en dos y lanzar la mitad hacia delante (para cazar); las mitades se juntan a los 15 s.
// Las grandes pierden masa poco a poco. Gana quien llegue a la mayor masa en 4 minutos.
const A = require('./arena');
const M = 3000, COMIDA = 450, MASA0 = 12, MAX_TROZOS = 8, JUNTAR = 15;
const radio = (m) => 4 + Math.sqrt(m) * 3.4;
const velocidad = (r) => 950 / Math.pow(r, 0.55);

function nuevo(n, rnd = Math.random) {
  const e = A.crear(n, { total: 14, rnd });
  e.celulas = []; e.comida = new Map(); e.sigC = 1; e.nuevas = []; e.comidas = [];
  for (let k = 0; k < COMIDA; k++) ponerComida(e);
  e.nuevas = [];
  return e;
}
function ponerComida(e, x, y) {
  const id = e.sigC++, c = [Math.round(x ?? 20 + e.rnd() * (M - 40)), Math.round(y ?? 20 + e.rnd() * (M - 40)), Math.floor(e.rnd() * 16), 1];
  e.comida.set(id, c); e.nuevas.push([id, ...c]);
}
function reaparecer(e, p) {
  // lejos de las células grandes
  let x, y, intento = 0;
  do { x = 100 + e.rnd() * (M - 200); y = 100 + e.rnd() * (M - 200); intento++; } while (intento < 20 && e.celulas.some((c) => c.m > 30 && A.dist2(c.x, c.y, x, y) < (radio(c.m) + 200) ** 2));
  e.celulas.push({ id: e.sigC++, p, x, y, m: MASA0, vx: 0, vy: 0, edad: JUNTAR });
}
const configurar = (e, asientos) => A.configurar(e, asientos);
function dividir(e, p) {
  const mias = e.celulas.filter((c) => c.p === p);
  for (const c of mias) {
    if (c.m < 36 || e.celulas.filter((x) => x.p === p).length >= MAX_TROZOS) continue;
    c.m /= 2; c.edad = 0;
    const a = Math.atan2(p.objY - c.y, p.objX - c.x) || 0;
    e.celulas.push({ id: e.sigC++, p, x: c.x + Math.cos(a) * radio(c.m), y: c.y + Math.sin(a) * radio(c.m), m: c.m, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, edad: 0 });
  }
}
// CPU: busca comida o presas cercanas y huye de las grandes
function pensar(e, p, dt) {
  p.t = (p.t || 0) - dt; if (p.t > 0) return; p.t = p.nivel === 'dificil' ? 0.15 : 0.35;
  const mias = e.celulas.filter((c) => c.p === p); if (!mias.length) return;
  const yo = mias.reduce((a, b) => (a.m > b.m ? a : b)), r = radio(yo.m);
  let fx = 0, fy = 0, presa = null, dPresa = Infinity;
  for (const c of e.celulas) {
    if (c.p === p) continue;
    const d = Math.sqrt(A.dist2(c.x, c.y, yo.x, yo.y));
    if (c.m > yo.m * 1.25 && d < radio(c.m) + 260) { fx -= (c.x - yo.x) / d * 3; fy -= (c.y - yo.y) / d * 3; }
    else if (yo.m > c.m * 1.3 && d < 420 && d < dPresa) { presa = c; dPresa = d; }
  }
  if (fx || fy) { p.objX = yo.x + fx * 200; p.objY = yo.y + fy * 200; return; }
  if (presa) {
    p.objX = presa.x; p.objY = presa.y;
    if (p.nivel === 'dificil' && yo.m > presa.m * 2.8 && dPresa < r + 220 && dPresa > r && mias.length === 1) dividir(e, p);
    return;
  }
  let mejor = null, dm = Infinity;
  for (const [, f] of e.comida) { const d = A.dist2(f[0], f[1], yo.x, yo.y); if (d < dm) { dm = d; mejor = f; } }
  if (mejor) { p.objX = mejor[0]; p.objY = mejor[1]; }
}
function paso(e, dt) {
  if (!A.paso(e, dt, (p) => reaparecer(e, p))) return;
  for (const p of e.jug) {
    if (!p.vivo) continue;
    if (p.bot) pensar(e, p, dt);
    else { const mias = e.celulas.filter((c) => c.p === p); const cx = mias.reduce((s, c) => s + c.x, 0) / (mias.length || 1), cy = mias.reduce((s, c) => s + c.y, 0) / (mias.length || 1); p.objX = cx + Math.cos(p.mando.a) * 400 * p.mando.f; p.objY = cy + Math.sin(p.mando.a) * 400 * p.mando.f; if (p.mando.k & 1 && !(p.antes & 1)) dividir(e, p); p.antes = p.mando.k; }
  }
  for (const c of e.celulas) {
    const r = radio(c.m), p = c.p;
    const dx = (p.objX ?? c.x) - c.x, dy = (p.objY ?? c.y) - c.y, d = Math.hypot(dx, dy);
    const v = velocidad(r) * Math.min(1, d / 40);
    c.x += ((d ? dx / d * v : 0) + c.vx) * dt; c.y += ((d ? dy / d * v : 0) + c.vy) * dt;
    c.vx *= Math.pow(0.02, dt); c.vy *= Math.pow(0.02, dt);
    c.x = Math.max(r * 0.5, Math.min(M - r * 0.5, c.x)); c.y = Math.max(r * 0.5, Math.min(M - r * 0.5, c.y));
    c.edad += dt;
    if (c.m > 100) c.m -= c.m * 0.0025 * dt;
    // comida
    for (const [id, f] of e.comida) if (Math.abs(f[0] - c.x) < r && Math.abs(f[1] - c.y) < r && A.dist2(f[0], f[1], c.x, c.y) < r * r) { c.m += f[3]; e.comida.delete(id); e.comidas.push(id); }
  }
  // trozos de la misma célula: se empujan hasta que pueden juntarse
  for (let i = 0; i < e.celulas.length; i++) for (let k = i + 1; k < e.celulas.length; k++) {
    const a = e.celulas[i], b = e.celulas[k]; if (a.m <= 0 || b.m <= 0) continue;
    const ra = radio(a.m), rb = radio(b.m), d = Math.sqrt(A.dist2(a.x, a.y, b.x, b.y)) || 0.01;
    if (a.p === b.p) {
      if (a.edad > JUNTAR && b.edad > JUNTAR) { if (d < Math.max(ra, rb) * 0.8) { a.m += b.m; b.m = 0; } }
      else if (d < ra + rb) { const s = (ra + rb - d) / 2, ux = (a.x - b.x) / d, uy = (a.y - b.y) / d; a.x += ux * s; a.y += uy * s; b.x -= ux * s; b.y -= uy * s; }
      continue;
    }
    const [g, ch] = a.m > b.m ? [a, b] : [b, a], rg = radio(g.m);
    if (g.m >= ch.m * 1.25 && d < rg - radio(ch.m) * 0.4) { g.m += ch.m; ch.m = 0; }
  }
  const vivas = e.celulas.filter((c) => c.m > 0);
  for (const p of e.jug) if (p.vivo && !vivas.some((c) => c.p === p)) A.morir(e, p, 3);
  e.celulas = vivas;
  for (const p of e.jug) p.puntos = e.celulas.filter((c) => c.p === p).reduce((s, c) => s + c.m, 0);
  while (e.comida.size < COMIDA) ponerComida(e);
}
const accion = (e, yo, a) => (a.tipo === 'mando' ? A.mando(e, yo, a) : { ok: false, error: 'Acción desconocida' });
const fotoBase = (e) => ({ c: e.celulas.map((c) => [c.id, c.p.id, Math.round(c.x), Math.round(c.y), Math.round(radio(c.m))]), t: A.tabla(e), r: Math.ceil(e.reloj) });
// la foto lleva además los cambios de comida desde la anterior (la vista lleva la comida entera)
function foto(e) {
  const f = fotoBase(e);
  if (e.nuevas.length) f.n = e.nuevas.splice(0); // comida nueva
  if (e.comidas.length) f.x = e.comidas.splice(0); // comida comida
  return f;
}
const vista = (e) => { const fo = fotoBase(e); return { mapa: M, jug: A.jugadores(e), comida: [...e.comida].map(([id, c]) => [id, ...c]), foto: fo, reloj: Math.ceil(e.reloj), ganadores: e.ganador }; };
const turno = () => -1;
const bot = () => null;
module.exports = { id: 'celulas', min: 1, max: 8, tiempoReal: true, nuevo, configurar, paso, foto, vista, accion, turno, fin: A.fin, bot, _: { radio } };
