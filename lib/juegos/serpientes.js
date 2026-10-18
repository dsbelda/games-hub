'use strict';
// Serpientes (1-8 personas + relleno): tu serpiente avanza sola hacia el ratón o el dedo. Come bolitas para
// crecer. Si tu cabeza choca con el cuerpo de otra serpiente (o con el borde), mueres y te conviertes en
// bolitas. Con el botón (espacio o mantener pulsado) aceleras a cambio de perder longitud: sirve para
// cerrar el paso a otras. Gana quien llegue a más longitud en 4 minutos.
// El cuerpo no viaja en cada foto: el navegador lo reconstruye con el rastro de la cabeza.
const A = require('./arena');
const M = 2600, BOLITAS = 900, V = 150, V_TURBO = 290, GIRO = 3.6, SEP = 6;
const grosor = (pts) => 7 + Math.min(11, Math.sqrt(pts) * 0.45);
const largo = (pts) => 70 + pts * 3.2;

function nuevo(n, rnd = Math.random) {
  const e = A.crear(n, { total: 14, rnd });
  e.serp = []; e.comida = new Map(); e.sigC = 1; e.nuevas = []; e.comidas = [];
  for (let k = 0; k < BOLITAS; k++) bolita(e);
  e.nuevas = [];
  return e;
}
function bolita(e, x, y, valor = 1) {
  if (x !== undefined && (x < 5 || y < 5 || x > M - 5 || y > M - 5)) return;
  const id = e.sigC++, c = [Math.round(x ?? 20 + e.rnd() * (M - 40)), Math.round(y ?? 20 + e.rnd() * (M - 40)), Math.floor(e.rnd() * 16), x === undefined && e.rnd() < 0.25 ? 2 : valor];
  e.comida.set(id, c); e.nuevas.push([id, ...c]);
}
function reaparecer(e, p) {
  let x, y, intento = 0;
  do { x = 300 + e.rnd() * (M - 600); y = 300 + e.rnd() * (M - 600); intento++; } while (intento < 30 && e.serp.some((s) => s.cuerpo.some((q, i) => i % 6 === 0 && A.dist2(q[0], q[1], x, y) < 250 ** 2)));
  const a = e.rnd() * Math.PI * 2, cuerpo = [];
  for (let k = 0; k < 12; k++) cuerpo.push([x - Math.cos(a) * k * SEP, y - Math.sin(a) * k * SEP]);
  e.serp.push({ id: e.sigC++, p, a, cuerpo, pts: 0, turbo: false, gasto: 0 });
  p.puntos = 0;
}
const configurar = (e, asientos) => A.configurar(e, asientos);
// ¿hay peligro en (x, y) para la serpiente s? (cuerpos ajenos o borde)
function peligro(e, s, x, y, margen) {
  if (x < margen || y < margen || x > M - margen || y > M - margen) return true;
  for (const o of e.serp) {
    if (o === s) continue;
    const r = grosor(o.pts) + margen;
    for (let i = 0; i < o.cuerpo.length; i += 2) { const q = o.cuerpo[i]; if (Math.abs(q[0] - x) < r && Math.abs(q[1] - y) < r) return true; }
  }
  return false;
}
function pensar(e, s, dt) {
  const p = s.p; p.t = (p.t || 0) - dt;
  if (p.t > 0) return; p.t = p.nivel === 'dificil' ? 0.08 : 0.2;
  const [x, y] = s.cuerpo[0];
  // esquivar: mira delante y a los lados
  const mira = p.nivel === 'dificil' ? 70 : 45;
  const libre = (da) => !peligro(e, s, x + Math.cos(s.a + da) * mira, y + Math.sin(s.a + da) * mira, 20);
  if (!libre(0)) { const op = [0.6, -0.6, 1.2, -1.2, 2, -2].find(libre); p.obj = s.a + (op ?? Math.PI); p.turbo = false; return; }
  // presa (solo la difícil): ponerse delante de una cabeza cercana más pequeña
  if (p.nivel === 'dificil' && s.pts > 30) {
    for (const o of e.serp) { if (o === s) continue; const [ox, oy] = o.cuerpo[0]; if (A.dist2(ox, oy, x, y) < 220 ** 2 && o.pts < s.pts) { p.obj = Math.atan2(oy + Math.sin(o.a) * 80 - y, ox + Math.cos(o.a) * 80 - x); p.turbo = true; return; } }
  }
  p.turbo = false;
  let mejor = null, dm = Infinity;
  for (const [, f] of e.comida) { const d = A.dist2(f[0], f[1], x, y) / f[3]; if (d < dm) { dm = d; mejor = f; } }
  if (mejor) p.obj = Math.atan2(mejor[1] - y, mejor[0] - x);
}
function matar(e, s) {
  const p = s.p;
  for (let i = 0; i < s.cuerpo.length; i += 3) bolita(e, s.cuerpo[i][0] + (e.rnd() - 0.5) * 10, s.cuerpo[i][1] + (e.rnd() - 0.5) * 10, 2 + Math.floor(s.pts / Math.max(1, s.cuerpo.length) * 2));
  e.serp = e.serp.filter((x) => x !== s);
  A.morir(e, p, 3);
}
function paso(e, dt) {
  if (!A.paso(e, dt, (p) => reaparecer(e, p))) return;
  for (const s of e.serp) {
    const p = s.p;
    if (p.bot) pensar(e, s, dt);
    else { p.obj = p.mando.a; p.turbo = !!(p.mando.k & 1) || (!!(p.mando.k & 128) && !(p.mando.k & 64)); } // con el dedo, el turbo es su botón
    if (p.obj !== undefined) { const d = A.angDif(s.a, p.obj); s.a += Math.max(-GIRO * dt, Math.min(GIRO * dt, d)); }
    s.turbo = p.turbo && s.pts > 10;
    const v = s.turbo ? V_TURBO : V;
    const [hx, hy] = s.cuerpo[0], nx = hx + Math.cos(s.a) * v * dt, ny = hy + Math.sin(s.a) * v * dt;
    // el cuerpo es una lista de puntos separados SEP; la cabeza avanza y se recorta la cola
    const d0 = Math.hypot(nx - s.cuerpo[1][0], ny - s.cuerpo[1][1]);
    if (d0 >= SEP) s.cuerpo.unshift([nx, ny]); else s.cuerpo[0] = [nx, ny];
    const max = Math.max(12, Math.round(largo(s.pts) / SEP));
    while (s.cuerpo.length > max) s.cuerpo.pop();
    if (s.turbo) { s.gasto += dt * 6; while (s.gasto >= 1) { s.gasto--; s.pts--; const c = s.cuerpo[s.cuerpo.length - 1]; if (e.rnd() < 0.5) bolita(e, c[0], c[1], 1); } }
    // comer
    const r = grosor(s.pts) + 8;
    for (const [id, f] of e.comida) if (Math.abs(f[0] - nx) < r && Math.abs(f[1] - ny) < r) { s.pts += f[3]; e.comida.delete(id); e.comidas.push(id); }
    p.puntos = s.pts;
  }
  // choques: cabeza contra cuerpos ajenos o contra el borde
  const muertas = [];
  for (const s of e.serp) {
    const [x, y] = s.cuerpo[0], r = grosor(s.pts) * 0.8;
    if (x < 0 || y < 0 || x > M || y > M) { muertas.push(s); continue; }
    for (const o of e.serp) {
      if (o === s) continue;
      const ro = grosor(o.pts), lim = (r + ro) ** 2;
      if (o.cuerpo.some((q) => A.dist2(q[0], q[1], x, y) < lim)) { muertas.push(s); break; }
    }
  }
  for (const s of new Set(muertas)) matar(e, s);
  while (e.comida.size < BOLITAS) bolita(e);
}
const accion = (e, yo, a) => (a.tipo === 'mando' ? A.mando(e, yo, a) : { ok: false, error: 'Acción desconocida' });
const fotoBase = (e) => ({ s: e.serp.map((s) => [s.id, s.p.id, Math.round(s.cuerpo[0][0]), Math.round(s.cuerpo[0][1]), Math.round(grosor(s.pts)), Math.round(largo(s.pts)), s.turbo ? 1 : 0]), t: A.tabla(e), r: Math.ceil(e.reloj) });
function foto(e) { const f = fotoBase(e); if (e.nuevas.length) f.n = e.nuevas.splice(0); if (e.comidas.length) f.x = e.comidas.splice(0); return f; }
const vista = (e) => ({ mapa: M, jug: A.jugadores(e), comida: [...e.comida].map(([id, c]) => [id, ...c]), cuerpos: Object.fromEntries(e.serp.map((s) => [s.id, s.cuerpo.filter((_, i) => i % 2 === 0).map(([x, y]) => [Math.round(x), Math.round(y)])])), foto: fotoBase(e), reloj: Math.ceil(e.reloj), ganadores: e.ganador });
const turno = () => -1;
const bot = () => null;
module.exports = { id: 'serpientes', min: 1, max: 8, tiempoReal: true, nuevo, configurar, paso, foto, vista, accion, turno, fin: A.fin, bot };
