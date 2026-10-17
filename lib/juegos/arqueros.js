'use strict';
// Arqueros: dos arqueros en sus torres. Por turnos, eliges ángulo y fuerza (tensando el arco) y el servidor
// simula la flecha con gravedad y el viento del turno. Cabeza: 70 de daño. Cuerpo: daño según la fuerza.
const G = 400, CABEZA = 7;
function nuevo(n, rnd = Math.random) {
  const D = 700 + Math.floor(rnd() * 500);
  return {
    pos: [{ x: 0, y: -(40 + Math.floor(rnd() * 100)) }, { x: D, y: -(40 + Math.floor(rnd() * 100)) }], // y negativa = altura
    vida: [100, 100], turno: 0, viento: viento(rnd), tiros: [[], []], ultimo: null, ganador: -1,
  };
}
const viento = (rnd) => Math.round((rnd() - 0.5) * 120);
// simula una flecha; devuelve { puntos, impacto }
function simular(e, j, ang, fuerza, guardar = true) {
  const dir = j === 0 ? 1 : -1;
  const a = Math.max(0, Math.min(89, ang)) * Math.PI / 180;
  const v = 250 + Math.max(0, Math.min(1, fuerza)) * 650;
  const o = e.pos[j];
  let x = o.x + dir * 10, y = o.y - 30, vx = Math.cos(a) * v * dir, vy = -Math.sin(a) * v;
  const rival = e.pos[1 - j];
  const puntos = [];
  const dt = 1 / 120;
  for (let paso = 0; paso < 120 * 8; paso++) {
    vx += e.viento * dt; vy += G * dt; x += vx * dt; y += vy * dt;
    if (guardar && paso % 4 === 0) puntos.push([Math.round(x), Math.round(y)]);
    // cabeza (círculo) y cuerpo (rectángulo) del rival
    if ((x - rival.x) ** 2 + (y - (rival.y - 34)) ** 2 < CABEZA * CABEZA) return { puntos, impacto: { tipo: 'cabeza', x, y, dano: 70 } };
    if (Math.abs(x - rival.x) < 7 && y > rival.y - 28 && y < rival.y) return { puntos, impacto: { tipo: 'cuerpo', x, y, dano: Math.round(22 + Math.hypot(vx, vy) / 30) } };
    // torres (columna bajo cada arquero) y suelo
    for (const t of e.pos) if (Math.abs(x - t.x) < 14 && y > t.y) return { puntos, impacto: { tipo: 'torre', x, y, dano: 0 } };
    if (y >= 0) return { puntos, impacto: { tipo: 'suelo', x, y: 0, dano: 0 } };
    if (Math.abs(x) > 4000) break;
  }
  return { puntos, impacto: { tipo: 'fuera', x, y, dano: 0 } };
}
function accion(e, yo, a) {
  if (e.ganador >= 0) return { ok: false, error: 'La partida ha terminado' };
  if (a.tipo === 'rendirse') { e.ganador = 1 - yo; e.rendido = yo; return { ok: true }; }
  if (a.tipo !== 'disparar') return { ok: false, error: 'Acción desconocida' };
  if (e.turno !== yo) return { ok: false, error: 'No es tu turno' };
  const ang = Number(a.ang), fuerza = Number(a.fuerza);
  if (!Number.isFinite(ang) || !Number.isFinite(fuerza)) return { ok: false, error: 'Tiro no válido' };
  const r = simular(e, yo, ang, fuerza);
  e.vida[1 - yo] = Math.max(0, e.vida[1 - yo] - r.impacto.dano);
  e.ultimo = { j: yo, ...r, ang: Math.round(ang), fuerza: Math.round(fuerza * 100) };
  e.tiros[yo].push(r.puntos.filter((_, i) => i % 2 === 0)); if (e.tiros[yo].length > 3) e.tiros[yo].shift();
  if (e.vida[1 - yo] <= 0) e.ganador = yo;
  else { e.turno = 1 - yo; e.viento = viento(Math.random); }
  return { ok: true };
}
const vista = (e) => ({ pos: e.pos, vida: e.vida, turno: e.turno, viento: e.viento, ultimo: e.ultimo, tiros: e.tiros, ganador: e.ganador, rendido: e.rendido });
const turno = (e) => (e.ganador >= 0 ? -1 : e.turno);
const fin = (e) => (e.ganador >= 0 ? { ganadores: [e.ganador], texto: e.rendido !== undefined ? 'El rival se ha rendido' : e.ultimo?.impacto.tipo === 'cabeza' ? '¡Remate a la cabeza!' : 'Sin vida' } : null);
function bot(e, yo, nivel, rnd) {
  if (turno(e) !== yo) return null;
  const rival = e.pos[1 - yo];
  let mejor = null, mejorD = Infinity;
  for (let ang = 10; ang <= 70; ang += 2) for (let f = 0.2; f <= 1.001; f += 0.04) {
    const { impacto } = simular(e, yo, ang, f, false);
    const d = impacto.tipo === 'cabeza' ? -1 : impacto.tipo === 'cuerpo' ? 0 : Math.hypot(impacto.x - rival.x, (impacto.y - (rival.y - 20)) * 0.5);
    if (d < mejorD) { mejorD = d; mejor = [ang, f]; }
  }
  // la CPU afina con los tiros (como una persona): cuantos más ha hecho, menos falla
  const afinado = Math.max(0.45, 1 - e.tiros[yo].length * 0.15);
  const ruido = (nivel === 'dificil' ? 9 : 16) * afinado;
  return { tipo: 'disparar', ang: mejor[0] + (rnd() - 0.5) * ruido, fuerza: Math.max(0, Math.min(1, mejor[1] + (rnd() - 0.5) * ruido * 0.012)) };
}
module.exports = { id: 'arqueros', min: 2, max: 2, nuevo, vista, accion, turno, fin, bot, _: { simular } };
