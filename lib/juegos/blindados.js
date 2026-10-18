'use strict';
// Tanques mejorables (1-8 personas + relleno): dispara a las figuras (cuadrados, triángulos y pentágonos)
// y a otros tanques para ganar experiencia. Cada nivel da un punto de mejora (daño, velocidad de bala,
// recarga, blindaje, motor) y en el nivel 10 eliges clase: Doble, Francotirador o Ametralladora.
// WASD para moverte, ratón para apuntar, clic para disparar (E: disparo automático). En el móvil, el dedo
// mueve, apunta y dispara a la vez. Al caer vuelves a empezar desde el nivel 1. Gana la mayor puntuación
// alcanzada en 4 minutos. Las figuras solo viajan cuando cambian; balas con velocidad para extrapolar.
const A = require('./arena');
const M = 2400, FIGURAS = 110, RT = 18, MAXNIVEL = 30;
const TIPOS = { c: { hp: 10, xp: 10, r: 11 }, t: { hp: 30, xp: 25, r: 13 }, p: { hp: 100, xp: 130, r: 22 } };
const STATS = ['dano', 'bala', 'recarga', 'vida', 'motor'];
const CLASES = {
  base: { dano: 1, bala: 1, recarga: 1, canones: [0], disp: 0.05 },
  doble: { dano: 0.75, bala: 1, recarga: 0.9, canones: [-7, 7], disp: 0.05 },
  francotirador: { dano: 1.6, bala: 1.6, recarga: 1.7, canones: [0], disp: 0.01, vista: 1.3 },
  ametralladora: { dano: 0.6, bala: 0.95, recarga: 0.45, canones: [0], disp: 0.3 },
};
const xpNivel = (n) => Math.round(12 * (n - 1) ** 1.9);
const nivelDe = (xp) => { let n = 1; while (n < MAXNIVEL && xp >= xpNivel(n + 1)) n++; return n; };

function nuevo(n, rnd = Math.random) {
  const e = A.crear(n, { total: 12, rnd });
  e.tanques = []; e.balas = []; e.figs = new Map(); e.sigF = 1; e.cambF = new Map(); e.quitF = [];
  for (let k = 0; k < FIGURAS; k++) figura(e);
  e.cambF.clear();
  return e;
}
function figura(e) {
  const r = e.rnd(), tipo = r < 0.62 ? 'c' : r < 0.9 ? 't' : 'p';
  const id = e.sigF++, f = { id, tipo, x: 40 + e.rnd() * (M - 80), y: 40 + e.rnd() * (M - 80), rot: e.rnd() * 6.28, hp: TIPOS[tipo].hp, vx: 0, vy: 0 };
  e.figs.set(id, f); e.cambF.set(id, f);
}
function reaparecer(e, p) {
  let x, y, intento = 0;
  do { x = 100 + e.rnd() * (M - 200); y = 100 + e.rnd() * (M - 200); intento++; } while (intento < 30 && e.tanques.some((t) => A.dist2(t.x, t.y, x, y) < 500 ** 2));
  const t = { id: e.sigF++, p, x, y, vx: 0, vy: 0, apunta: 0, xp: 0, nivel: 1, puntosLibres: 0, stats: { dano: 0, bala: 0, recarga: 0, vida: 0, motor: 0 }, clase: 'base', hp: 0, carga: 0, auto: false, cual: 0 };
  t.hp = hpMax(t);
  e.tanques = e.tanques.filter((x) => x.p !== p); e.tanques.push(t);
  p.puntos = 0;
}
const hpMax = (t) => 60 + t.stats.vida * 22 + t.nivel * 3;
const velocidad = (t) => 165 + t.stats.motor * 14 - t.nivel * 1.2;
const configurar = (e, asientos) => A.configurar(e, asientos);
function ganarXp(e, t, xp) {
  t.xp += xp; const n = nivelDe(t.xp);
  if (n > t.nivel) { t.puntosLibres += n - t.nivel; t.nivel = n; t.hp = Math.min(hpMax(t), t.hp + 10); e.cambio = true; }
  t.p.puntos = t.xp;
}
function disparar(e, t) {
  const c = CLASES[t.clase];
  const vb = (330 + t.stats.bala * 35) * c.bala, dano = (7 + t.stats.dano * 3) * c.dano;
  const lado = c.canones[t.cual % c.canones.length]; t.cual++;
  const a = t.apunta + (e.rnd() - 0.5) * c.disp * 2;
  const ox = Math.cos(t.apunta + Math.PI / 2) * lado, oy = Math.sin(t.apunta + Math.PI / 2) * lado;
  e.balas.push({ x: t.x + Math.cos(a) * (RT + 10) + ox, y: t.y + Math.sin(a) * (RT + 10) + oy, vx: Math.cos(a) * vb + t.vx * 0.3, vy: Math.sin(a) * vb + t.vy * 0.3, r: t.clase === 'francotirador' ? 6 : 5, dano, t, vida: t.clase === 'francotirador' ? 2.2 : 1.6 });
  t.vx -= Math.cos(a) * 12; t.vy -= Math.sin(a) * 12; // retroceso
  t.carga = 0.62 * Math.pow(0.86, t.stats.recarga) * c.recarga * (c.canones.length > 1 ? 0.5 : 1);
}
function golpearTanque(e, t, dano, autor) {
  t.hp -= dano; t.golpe = 0.15;
  if (t.hp <= 0 && t.p.vivo) {
    if (autor && autor !== t) ganarXp(e, autor, Math.max(20, Math.round(t.xp * 0.5)));
    e.tanques = e.tanques.filter((x) => x !== t);
    e.balas = e.balas.filter((b) => b.t !== t);
    A.morir(e, t.p, 3);
  }
}
// CPU
function pensar(e, t, dt) {
  const p = t.p; p.t = (p.t || 0) - dt;
  if (t.puntosLibres > 0) { const orden = p.nivel === 'dificil' ? ['recarga', 'dano', 'bala', 'motor', 'vida'] : ['dano', 'vida', 'recarga', 'motor', 'bala']; const s = orden.find((k) => t.stats[k] < 7); if (s) { t.stats[s]++; t.puntosLibres--; if (s === 'vida') t.hp += 22; } else t.puntosLibres = 0; }
  if (t.nivel >= 10 && t.clase === 'base') t.clase = ['doble', 'francotirador', 'ametralladora'][Math.floor(e.rnd() * 3)];
  if (p.t > 0) return; p.t = p.nivel === 'dificil' ? 0.1 : 0.25;
  let obj = null, d = Infinity, huir = null;
  const vision = 520;
  for (const o of e.tanques) {
    if (o === t) continue; const dd = Math.sqrt(A.dist2(o.x, o.y, t.x, t.y)); if (dd > vision) continue;
    if (o.nivel > t.nivel + 4 && dd < 380) huir = o;
    if (dd < d && (o.nivel <= t.nivel + 2 || p.nivel === 'dificil')) { obj = o; d = dd; }
  }
  if (!obj) for (const [, f] of e.figs) { const dd = Math.sqrt(A.dist2(f.x, f.y, t.x, t.y)) / (f.tipo === 'p' ? 1.6 : 1); if (dd < d && dd < vision) { obj = f; d = dd; } }
  p.dir = null; p.fuego = false;
  if (huir || t.hp < hpMax(t) * 0.3) { const o = huir || obj; if (o) { p.dir = Math.atan2(t.y - o.y, t.x - o.x); p.apunta = Math.atan2(o.y - t.y, o.x - t.x); p.fuego = true; } return; }
  if (obj) {
    const lead = p.nivel === 'dificil' && obj.vx !== undefined ? d / 400 : 0;
    p.apunta = Math.atan2(obj.y + (obj.vy || 0) * lead - t.y, obj.x + (obj.vx || 0) * lead - t.x); p.fuego = d < 460;
    const ideal = obj.tipo ? 140 : 280;
    p.dir = d > ideal ? p.apunta : d < ideal - 60 ? p.apunta + Math.PI : p.apunta + Math.PI / 2;
  } else { p.vagar = (p.vagar ?? e.rnd() * 6.28) + (e.rnd() - 0.5) * 0.5; p.dir = p.vagar; }
  if (t.x < 150 || t.y < 150 || t.x > M - 150 || t.y > M - 150) p.dir = Math.atan2(M / 2 - t.y, M / 2 - t.x);
}
function paso(e, dt) {
  if (!A.paso(e, dt, (p) => reaparecer(e, p))) return;
  for (const t of e.tanques) {
    const p = t.p; let mx = 0, my = 0, fuego = false;
    if (p.bot) { pensar(e, t, dt); if (p.dir != null) { mx = Math.cos(p.dir); my = Math.sin(p.dir); } t.apunta = p.apunta ?? t.apunta; fuego = p.fuego; }
    else {
      const m = p.mando;
      t.apunta = m.a;
      if (m.x || m.y) { const l = Math.hypot(m.x, m.y); mx = m.x / l; my = m.y / l; }
      else if (m.k & 64 && m.k & 128) { mx = Math.cos(m.a) * m.f; my = Math.sin(m.a) * m.f; } // dedo: moverse hacia él
      fuego = !!(m.k & 128) || !!(m.k & 4);
    }
    const v = velocidad(t);
    t.vx += (mx * v - t.vx) * Math.min(1, dt * 6); t.vy += (my * v - t.vy) * Math.min(1, dt * 6);
    t.x = Math.max(RT, Math.min(M - RT, t.x + t.vx * dt)); t.y = Math.max(RT, Math.min(M - RT, t.y + t.vy * dt));
    t.carga -= dt; if (fuego && t.carga <= 0) disparar(e, t);
    t.hp = Math.min(hpMax(t), t.hp + (1.2 + t.stats.vida * 0.35) * dt);
    t.golpe = Math.max(0, (t.golpe || 0) - dt);
  }
  // balas contra figuras y tanques
  for (const b of e.balas) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.vida -= dt;
    if (b.vida <= 0) continue;
    for (const [id, f] of e.figs) {
      const rf = TIPOS[f.tipo].r; if (Math.abs(f.x - b.x) > rf + b.r || Math.abs(f.y - b.y) > rf + b.r) continue;
      f.hp -= b.dano; f.vx += b.vx * 0.03; f.vy += b.vy * 0.03; b.vida = 0; e.cambF.set(id, f);
      if (f.hp <= 0) { e.figs.delete(id); e.cambF.delete(id); e.quitF.push(id); if (b.t.p.vivo) ganarXp(e, b.t, TIPOS[f.tipo].xp); }
      break;
    }
    if (b.vida <= 0) continue;
    for (const t of e.tanques) { if (t === b.t) continue; if (A.dist2(t.x, t.y, b.x, b.y) < (RT + b.r) ** 2) { b.vida = 0; golpearTanque(e, t, b.dano, b.t.p.vivo ? b.t : null); break; } }
  }
  e.balas = e.balas.filter((b) => b.vida > 0 && b.x > -20 && b.y > -20 && b.x < M + 20 && b.y < M + 20);
  // figuras: frenan, giran y empujan (y hacen daño) a los tanques que las tocan
  for (const [id, f] of e.figs) {
    if (f.vx || f.vy) { f.x = Math.max(20, Math.min(M - 20, f.x + f.vx * dt)); f.y = Math.max(20, Math.min(M - 20, f.y + f.vy * dt)); f.vx *= Math.pow(0.05, dt); f.vy *= Math.pow(0.05, dt); if (Math.abs(f.vx) + Math.abs(f.vy) < 1) { f.vx = f.vy = 0; } e.cambF.set(id, f); }
    for (const t of e.tanques) { const rf = TIPOS[f.tipo].r; if (A.dist2(t.x, t.y, f.x, f.y) < (RT + rf) ** 2) { const d = Math.sqrt(A.dist2(t.x, t.y, f.x, f.y)) || 1; t.vx += (t.x - f.x) / d * 60; t.vy += (t.y - f.y) / d * 60; f.vx -= (t.x - f.x) / d * 40; f.vy -= (t.y - f.y) / d * 40; golpearTanque(e, t, 8 * dt * 10, null); e.cambF.set(id, f); } }
  }
  while (e.figs.size < FIGURAS) figura(e);
}
function accion(e, yo, a) {
  if (a.tipo === 'mando') return A.mando(e, yo, a);
  const p = e.jug.find((x) => x.j === yo), t = p && e.tanques.find((x) => x.p === p);
  if (!t) return { ok: false, error: 'Ahora no tienes tanque' };
  if (a.tipo === 'mejora') {
    if (!STATS.includes(a.s)) return { ok: false, error: 'Mejora no válida' };
    if (t.puntosLibres <= 0) return { ok: false, error: 'No tienes puntos' };
    if (t.stats[a.s] >= 7) return { ok: false, error: 'Ya está al máximo' };
    t.stats[a.s]++; t.puntosLibres--; if (a.s === 'vida') t.hp += 22;
    return { ok: true };
  }
  if (a.tipo === 'clase') {
    if (t.nivel < 10 || t.clase !== 'base' || !CLASES[a.c] || a.c === 'base') return { ok: false, error: 'Ahora no puedes cambiar de clase' };
    t.clase = a.c; return { ok: true };
  }
  return { ok: false, error: 'Acción desconocida' };
}
const figFoto = (f) => [f.id, f.tipo, Math.round(f.x), Math.round(f.y), Math.round(f.rot * 10) / 10, Math.round(f.hp / TIPOS[f.tipo].hp * 100)];
const fotoBase = (e) => ({
  k: e.tanques.map((t) => [t.id, t.p.id, Math.round(t.x), Math.round(t.y), Math.round(t.apunta * 100) / 100, Math.round(Math.max(0, t.hp) / hpMax(t) * 100), t.nivel, t.clase[0], t.golpe > 0 ? 1 : 0]),
  b: e.balas.map((b) => [Math.round(b.x), Math.round(b.y), Math.round(b.vx), Math.round(b.vy), b.r, b.t.p.id]), t: A.tabla(e), r: Math.ceil(e.reloj),
});
function foto(e) {
  const f = fotoBase(e);
  if (e.cambF.size) { f.n = [...e.cambF.values()].map(figFoto); e.cambF.clear(); }
  if (e.quitF.length) f.x = e.quitF.splice(0);
  return f;
}
function vista(e, yo) {
  const p = e.jug.find((x) => x.j === yo), t = p && e.tanques.find((x) => x.p === p);
  return {
    mapa: M, jug: A.jugadores(e), figs: [...e.figs.values()].map(figFoto), foto: fotoBase(e), reloj: Math.ceil(e.reloj), ganadores: e.ganador,
    mio: t ? { nivel: t.nivel, xp: t.xp, sig: xpNivel(t.nivel + 1), ant: xpNivel(t.nivel), puntos: t.puntosLibres, stats: t.stats, clase: t.clase, puedeClase: t.nivel >= 10 && t.clase === 'base' } : null,
  };
}
// la vista de cada uno cambia al subir de nivel o mejorar: se marca como cambio
const pasoConVista = (e, dt) => { const antes = e.tanques.map((t) => t.nivel + t.puntosLibres).join(); paso(e, dt); if (e.tanques.map((t) => t.nivel + t.puntosLibres).join() !== antes) e.cambio = true; };
const turno = () => -1;
const bot = () => null;
module.exports = { id: 'blindados', min: 1, max: 8, tiempoReal: true, nuevo, configurar, paso: pasoConVista, foto, vista, accion, turno, fin: A.fin, bot, _: { xpNivel, nivelDe } };
