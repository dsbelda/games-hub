'use strict';
// Hockey de aire (1 contra 1, o contra la CPU), en tiempo real. Mesa de 400×600; cada uno defiende una
// portería y solo puede mover su mazo por su mitad. El mazo va hacia donde apuntas (ratón, dedo o flechas).
// Gana quien llega antes a 7 goles. Cada jugador ve la mesa con su portería abajo (el cliente gira la vista).
const W = 400, H = 600, RM = 28, RD = 16, PORTERIA = 150, META = 7, VMAZO = 1150, VMAX = 1500;
function nuevo() {
  const e = { goles: [0, 0], ganador: null, mazos: [{ x: W / 2, y: H - 80, vx: 0, vy: 0 }, { x: W / 2, y: 80, vx: 0, vy: 0 }], obj: [[0.5, 0.87], [0.5, 0.87]], bots: [null, null], pausa: 1.2, cambio: true, golDe: null };
  saque(e, Math.random() < 0.5 ? 0 : 1); return e;
}
function configurar(e, asientos) { e.bots = asientos.map((a) => (a.bot ? { nivel: a.nivel } : null)); }
function saque(e, para) { e.disco = { x: W / 2, y: para === 0 ? H / 2 + 70 : H / 2 - 70, vx: 0, vy: 0 }; }
// del punto de vista del jugador (0..1, su portería abajo) a la mesa
const aMesa = (j, x, y) => (j === 0 ? [x * W, y * H] : [(1 - x) * W, (1 - y) * H]);
function pensar(e, j, dt) {
  const b = e.bots[j], m = e.mazos[j], d = e.disco, dif = b.nivel === 'dificil';
  const casa = j === 0 ? H - 70 : 70, miLado = j === 0 ? d.y > H / 2 : d.y < H / 2, golRival = j === 0 ? 0 : H;
  let tx, ty;
  const detras = j === 0 ? d.y > m.y - 4 : d.y < m.y + 4; // el disco está entre mi mazo y mi portería
  if (miLado && !detras) {
    // golpear: colocarse detrás del disco en la línea hacia la portería rival y atravesarlo
    const gx = W / 2 + (Math.random() - 0.5) * (dif ? 60 : 200), dx = gx - d.x, dy = golRival - d.y, l = Math.hypot(dx, dy) || 1;
    tx = d.x - dx / l * (RM + RD - 18) + d.vx * 0.05; ty = d.y - dy / l * (RM + RD - 18) + d.vy * 0.05;
  } else if (miLado && detras) { tx = d.x + (d.x < W / 2 ? 40 : -40); ty = casa; } // rodearlo por un lado
  else { tx = W / 2 + (d.x - W / 2) * 0.5; ty = casa; } // defender en casa siguiendo el disco
  b.t = (b.t || 0) - dt;
  if (b.t <= 0) { b.t = dif ? 0.03 : 0.11; b.tx = tx; b.ty = ty; }
  return [b.tx ?? tx, b.ty ?? ty, dif ? 1 : 0.72];
}
function paso(e, dt) {
  if (e.ganador) return;
  if (e.pausa > 0) { e.pausa -= dt; if (e.pausa <= 0) e.golDe = null; }
  for (let j = 0; j < 2; j++) {
    const m = e.mazos[j];
    let tx, ty, vel = 1;
    if (e.bots[j]) [tx, ty, vel] = pensar(e, j, dt); else [tx, ty] = aMesa(j, e.obj[j][0], e.obj[j][1]);
    const ymin = j === 0 ? H / 2 + RM : RM, ymax = j === 0 ? H - RM : H / 2 - RM;
    tx = Math.max(RM, Math.min(W - RM, tx)); ty = Math.max(ymin, Math.min(ymax, ty));
    const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy), max = VMAZO * vel * dt;
    const k = d > max ? max / d : 1;
    m.vx = dx * k / dt; m.vy = dy * k / dt; m.x += dx * k; m.y += dy * k;
  }
  const d = e.disco;
  if (e.pausa > 0 && e.golDe !== null) return;
  for (let s = 0; s < 3; s++) {
    const h = dt / 3;
    d.x += d.vx * h; d.y += d.vy * h;
    d.vx *= Math.pow(0.6, h); d.vy *= Math.pow(0.6, h);
    if (d.x < RD) { d.x = RD; d.vx = Math.abs(d.vx) * 0.9; } if (d.x > W - RD) { d.x = W - RD; d.vx = -Math.abs(d.vx) * 0.9; }
    const enBoca = Math.abs(d.x - W / 2) < PORTERIA / 2 - RD * 0.3;
    if (d.y < RD && !enBoca) { d.y = RD; d.vy = Math.abs(d.vy) * 0.9; }
    if (d.y > H - RD && !enBoca) { d.y = H - RD; d.vy = -Math.abs(d.vy) * 0.9; }
    if (d.y < -RD) return gol(e, 0);
    if (d.y > H + RD) return gol(e, 1);
    for (const m of e.mazos) {
      const dx = d.x - m.x, dy = d.y - m.y, dist = Math.hypot(dx, dy);
      if (dist < RM + RD && dist > 0) {
        const nx = dx / dist, ny = dy / dist;
        d.x = m.x + nx * (RM + RD); d.y = m.y + ny * (RM + RD);
        const rvx = d.vx - m.vx, rvy = d.vy - m.vy, vn = rvx * nx + rvy * ny;
        if (vn < 0) { d.vx -= 1.9 * vn * nx; d.vy -= 1.9 * vn * ny; }
        const v = Math.hypot(d.vx, d.vy); if (v > VMAX) { d.vx *= VMAX / v; d.vy *= VMAX / v; }
      }
    }
  }
  // disco parado en un campo mucho tiempo: se recoloca (para que nada se atasque)
  e.quieto = Math.hypot(d.vx, d.vy) < 15 ? (e.quieto || 0) + dt : 0;
  if (e.quieto > 6) { e.quieto = 0; saque(e, d.y > H / 2 ? 0 : 1); }
}
function gol(e, j) {
  e.goles[j]++; e.golDe = j; e.pausa = 1.4; e.cambio = true;
  if (e.goles[j] >= META) { e.ganador = [j]; return; }
  saque(e, 1 - j);
}
function accion(e, yo, a) {
  if (a.tipo !== 'mando') return { ok: false, error: 'Acción desconocida' };
  const x = Number(a.x), y = Number(a.y);
  if (Number.isFinite(x) && Number.isFinite(y)) e.obj[yo] = [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))];
  return { ok: true, sinVista: true };
}
const r1 = (v) => Math.round(v * 10) / 10;
const foto = (e) => ({ d: [r1(e.disco.x), r1(e.disco.y), Math.round(e.disco.vx), Math.round(e.disco.vy)], m: e.mazos.map((m) => [r1(m.x), r1(m.y)]), g: e.goles, gol: e.golDe });
const vista = (e) => ({ ancho: W, alto: H, rm: RM, rd: RD, porteria: PORTERIA, meta: META, foto: foto(e), goles: e.goles, ganadores: e.ganador });
const turno = () => -1;
const fin = (e) => (e.ganador ? { ganadores: e.ganador, texto: `${Math.max(...e.goles)} a ${Math.min(...e.goles)}` } : null);
const bot = () => null;
module.exports = { id: 'hockey', min: 2, max: 2, tiempoReal: true, nuevo, configurar, paso, foto, vista, accion, turno, fin, bot };
