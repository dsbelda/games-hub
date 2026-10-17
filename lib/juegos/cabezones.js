'use strict';
// Cabezones: fútbol 1 contra 1 en tiempo real. ← → moverse, ↑ saltar, espacio chutar.
// El jugador 0 defiende la portería izquierda. Partido de 90 s; gana quien marque más (puede haber empate).
const W = 640, H = 360, SUELO = 320, LARGUERO = 220, PORTERIA = 46, RC = 26, RB = 13, G = 1300, GB = 1000, DURACION = 90;
const ARRIBA = 1, IZQ = 4, DER = 8, CHUT = 16;
function nuevo() {
  const e = { goles: [0, 0], reloj: DURACION, teclas: [0, 0], bots: [null, null], ganador: null, pausa: 1.5, cambio: true, ultimoGol: null };
  saque(e, Math.random() < 0.5 ? 0 : 1);
  return e;
}
function configurar(e, asientos) { e.bots = asientos.map((a) => (a.bot ? { nivel: a.nivel, reaccion: 0 } : null)); }
function saque(e, hacia) {
  e.j = [{ x: 150, y: SUELO, vx: 0, vy: 0, chut: 0 }, { x: W - 150, y: SUELO, vx: 0, vy: 0, chut: 0 }];
  e.b = { x: W / 2, y: 120, vx: hacia ? 60 : -60, vy: 0 };
  e.pausa = 1.2;
}
function paso(e, dt) {
  if (e.ganador) return;
  if (e.pausa > 0) { e.pausa -= dt; return; }
  e.reloj -= dt;
  if (e.reloj <= 0) { e.reloj = 0; e.ganador = e.goles[0] === e.goles[1] ? [0, 1] : [e.goles[0] > e.goles[1] ? 0 : 1]; e.empate = e.goles[0] === e.goles[1]; e.cambio = true; return; }
  e.j.forEach((p, i) => { if (e.bots[i]) e.teclas[i] = cerebro(e, i, dt); });
  e.j.forEach((p, i) => {
    const k = e.teclas[i];
    const objetivo = ((k & DER) ? 1 : 0) - ((k & IZQ) ? 1 : 0);
    p.vx += (objetivo * 260 - p.vx) * Math.min(1, dt * 12);
    if (k & ARRIBA && p.y >= SUELO) p.vy = -520;
    if (k & CHUT && p.chut <= 0) p.chut = 0.25;
    p.chut -= dt;
    p.vy += G * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.y > SUELO) { p.y = SUELO; p.vy = 0; }
    p.x = Math.max(PORTERIA + RC, Math.min(W - PORTERIA - RC, p.x));
  });
  // los dos jugadores no se atraviesan
  const [a, c] = e.j; const dx = c.x - a.x, dy = (c.y - RC) - (a.y - RC), d = Math.hypot(dx, dy);
  if (d < RC * 2 && d > 0) { const s = (RC * 2 - d) / 2; a.x -= dx / d * s; c.x += dx / d * s; }
  // balón
  const b = e.b;
  b.vy += GB * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= Math.pow(0.995, dt * 60);
  if (b.y > SUELO - RB) { b.y = SUELO - RB; b.vy = -Math.abs(b.vy) * 0.72; b.vx *= 0.96; if (Math.abs(b.vy) < 40) b.vy = 0; }
  if (b.y < RB) { b.y = RB; b.vy = Math.abs(b.vy) * 0.7; }
  // larguero y postes: la portería es el hueco bajo el larguero en cada extremo
  for (const lado of [0, 1]) {
    const xl = lado ? W - PORTERIA : PORTERIA;
    // parte de arriba del larguero
    if ((lado ? b.x > xl : b.x < xl) && Math.abs(b.y - LARGUERO) < RB && b.vy > 0) { b.y = LARGUERO - RB; b.vy = -Math.abs(b.vy) * 0.7; }
    // gol: el balón entra entero bajo el larguero
    if ((lado ? b.x > W - PORTERIA + RB : b.x < PORTERIA - RB) && b.y > LARGUERO) {
      const marca = lado ? 0 : 1;
      e.goles[marca]++; e.ultimoGol = { marca, t: Date.now() }; e.cambio = true;
      saque(e, lado); return;
    }
    // paredes por encima del larguero
    if (b.y < LARGUERO && (b.x < RB || b.x > W - RB)) { b.x = Math.max(RB, Math.min(W - RB, b.x)); b.vx = -b.vx * 0.7; }
  }
  // cabezas, cuerpos y chuts
  e.j.forEach((p, i) => {
    const hx = p.x, hy = p.y - RC - 12;
    const ddx = b.x - hx, ddy = b.y - hy, dd = Math.hypot(ddx, ddy);
    if (dd < RC + RB && dd > 0) {
      const nx = ddx / dd, ny = ddy / dd;
      b.x = hx + nx * (RC + RB); b.y = hy + ny * (RC + RB);
      const rel = (b.vx - p.vx) * nx + (b.vy - p.vy) * ny;
      if (rel < 0) { b.vx -= 1.3 * rel * nx; b.vy -= 1.3 * rel * ny; }
      b.vx += p.vx * 0.3; b.vy += Math.min(0, p.vy) * 0.4;
    }
    // pie: zona delante del jugador a ras de suelo
    const dir = i === 0 ? 1 : -1;
    const fx = p.x + dir * 22, fy = p.y - 8;
    if (p.chut > 0.1 && Math.hypot(b.x - fx, b.y - fy) < RB + 16) { b.vx = dir * 380 + p.vx * 0.4; b.vy = -228; p.chut = 0.1; }
  });
  const sp = Math.hypot(b.vx, b.vy); if (sp > 1100) { b.vx *= 1100 / sp; b.vy *= 1100 / sp; }
}
// CPU: si el rival llega antes al balón, vuelve a cubrir su portería (y salta a por los balones altos);
// si llega antes ella, ataca desde detrás del balón y chuta de cerca. La difícil se coloca mejor.
function cerebro(e, i, dt) {
  const p = e.j[i], o = e.j[1 - i], b = e.b, bot = e.bots[i], dir = i === 0 ? 1 : -1;
  const dificil = bot.nivel === 'dificil';
  bot.reaccion -= dt; if (bot.reaccion > 0) return bot.ultima || 0;
  bot.reaccion = dificil ? 0.06 : 0.16;
  const miPorteria = i === 0 ? PORTERIA : W - PORTERIA;
  const yoLlego = Math.abs(b.x - p.x) < Math.abs(b.x - o.x) + (dificil ? 0 : 30);
  const balonEnMiCampo = (b.x - W / 2) * dir < 0;
  const peligro = b.vx * dir < -120;
  let objetivoX;
  if (!yoLlego && (balonEnMiCampo || peligro)) objetivoX = miPorteria + dir * (dificil ? 70 : 95); // a defender
  else if ((b.x - p.x) * dir < -6) objetivoX = b.x - dir * 45; // balón a la espalda: volver por detrás
  else objetivoX = b.x - dir * 18; // atacar
  let k = 0;
  if (objetivoX > p.x + 6) k |= DER; else if (objetivoX < p.x - 6) k |= IZQ;
  const cerca = Math.abs(b.x - p.x) < 70;
  if (cerca && b.y < p.y - RC * 2 - 10 && b.y > LARGUERO - 170) k |= ARRIBA;
  if ((b.x - p.x) * dir > 0 && (b.x - p.x) * dir < 55 && b.y > p.y - 60) k |= CHUT;
  if (!dificil && Math.random() < 0.12) k &= ~(Math.random() < 0.5 ? CHUT : ARRIBA);
  bot.ultima = k;
  return k;
}
function accion(e, yo, a) {
  if (a.tipo === 'teclas') { e.teclas[yo] = Number(a.k) & 31; return { ok: true, sinVista: true }; }
  return { ok: false, error: 'Acción desconocida' };
}
const r = (x) => Math.round(x);
const foto = (e) => ({ j: e.j.map((p) => [r(p.x), r(p.y), p.chut > 0 ? 1 : 0]), b: [r(e.b.x), r(e.b.y)], reloj: Math.ceil(e.reloj) });
const vista = (e) => ({ goles: e.goles, reloj: Math.ceil(e.reloj), foto: foto(e), ultimoGol: e.ultimoGol, ganador: e.ganador, W, H, SUELO, LARGUERO, PORTERIA, RC, RB });
const turno = () => -1;
const fin = (e) => (e.ganador ? { ganadores: e.empate ? [] : e.ganador, texto: `${e.goles[0]} – ${e.goles[1]}` } : null);
const bot = () => null;
module.exports = { id: 'cabezones', min: 2, max: 2, tiempoReal: true, nuevo, configurar, paso, foto, vista, accion, turno, fin, bot };
