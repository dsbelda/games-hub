'use strict';
// Sumo de bolas (2-6, en tiempo real, con CPU). Bolas en una plataforma redonda que se va encogiendo: empuja a
// los demás fuera y aguanta. Embestida (espacio o botón) con recarga. Gana la ronda el último en pie; la
// partida, quien gane antes 3 rondas. Mando: dirección {x, y} (-1..1) y bit 16 = embestir.
const C = 300, R0 = 270, RMIN = 110, RB = 22, ACC = 950, VMAX = 330, META = 3;
const COLORES = ['#4d7cfe', '#ff5a36', '#3fbf5f', '#ffc63d', '#8a5cf6', '#ff6fa8'];
function nuevo(n) { const e = { n, puntos: Array(n).fill(0), ronda: 0, ganador: null, bots: Array(n).fill(null), mando: Array.from({ length: n }, () => ({ x: 0, y: 0, k: 0 })), pulso: Array(n).fill(false), cambio: true }; ronda(e); return e; }
function configurar(e, asientos) { e.bots = asientos.map((a) => (a.bot ? { nivel: a.nivel } : null)); }
function ronda(e) {
  e.ronda++; e.radio = R0; e.t = 0; e.pausa = 2; e.finRonda = null;
  e.bolas = Array.from({ length: e.n }, (_, j) => { const a = (j / e.n) * Math.PI * 2 - Math.PI / 2; return { x: C + Math.cos(a) * 170, y: C + Math.sin(a) * 170, vx: 0, vy: 0, vivo: true, recarga: 0, choque: 0 }; });
  e.cambio = true;
}
function pensar(e, j) {
  const b = e.bolas[j], dif = e.bots[j].nivel === 'dificil';
  const dc = Math.hypot(b.x - C, b.y - C);
  if (dc > e.radio * (dif ? 0.7 : 0.8)) return { x: (C - b.x) / dc, y: (C - b.y) / dc, k: 0 };
  // la difícil esquiva de lado (hacia el centro) a quien viene lanzado contra ella
  if (dif) for (const o of e.bolas) {
    if (o === b || !o.vivo) continue;
    const dx = b.x - o.x, dy = b.y - o.y, d = Math.hypot(dx, dy) || 1, acerca = (o.vx * dx + o.vy * dy) / d;
    if (d < 140 && acerca > 300) { let px = -dy / d, py = dx / d; if (px * (C - b.x) + py * (C - b.y) < 0) { px = -px; py = -py; } return { x: px, y: py, k: 0 }; }
  }
  let obj = null, dm = Infinity;
  e.bolas.forEach((o, k) => { if (k !== j && o.vivo) { const d = Math.hypot(o.x - b.x, o.y - b.y); if (d < dm) { dm = d; obj = o; } } });
  if (!obj) return { x: 0, y: 0, k: 0 };
  // colocarse entre el centro y el rival, y embestir hacia fuera
  const oc = Math.hypot(obj.x - C, obj.y - C) || 1, ux = (obj.x - C) / oc, uy = (obj.y - C) / oc;
  const px = obj.x - ux * (RB * 2.2), py = obj.y - uy * (RB * 2.2);
  const dx = px - b.x, dy = py - b.y, d = Math.hypot(dx, dy) || 1;
  const alineado = d < RB * 1.5 || (dx * ux + dy * uy) / d > 0.7;
  const tx = alineado ? obj.x - b.x : dx, ty = alineado ? obj.y - b.y : dy, l = Math.hypot(tx, ty) || 1;
  // la difícil solo embiste si no corre peligro de salir volando ella y el rival ya está lejos del centro
  const embiste = alineado && dm < 80 && Math.random() < (dif ? 0.12 : 0.15) && (!dif || dc < e.radio * 0.6);
  return { x: tx / l, y: ty / l, k: embiste ? 16 : 0 };
}
function paso(e, dt) {
  if (e.ganador) return;
  if (e.pausa > 0) { e.pausa -= dt; if (e.finRonda !== null && e.pausa <= 0) { ronda(e); } return; }
  e.t += dt;
  if (e.t > 8) e.radio = Math.max(RMIN, R0 - (e.t - 8) * 4);
  e.bolas.forEach((b, j) => {
    if (!b.vivo) return;
    const m = e.bots[j] ? pensar(e, j) : e.mando[j];
    const l = Math.hypot(m.x, m.y); const mx = l > 1 ? m.x / l : m.x, my = l > 1 ? m.y / l : m.y;
    const acc = ACC * (e.bots[j]?.nivel === 'dificil' ? 1.1 : 1); // la CPU difícil empuja un poco más
    b.vx += mx * acc * dt; b.vy += my * acc * dt;
    b.recarga = Math.max(0, b.recarga - dt); b.choque = Math.max(0, b.choque - dt);
    if ((e.bots[j] ? m.k & 16 : e.pulso[j]) && b.recarga <= 0) { e.pulso[j] = false; const ll = Math.hypot(mx, my) || 1; b.vx += mx / ll * 520; b.vy += my / ll * 520; b.recarga = 2.2; }
    e.pulso[j] = false;
    const v = Math.hypot(b.vx, b.vy), max = b.choque > 0 ? 900 : VMAX;
    if (v > max) { b.vx *= max / v; b.vy *= max / v; }
    b.vx *= Math.pow(0.35, dt); b.vy *= Math.pow(0.35, dt);
    b.x += b.vx * dt; b.y += b.vy * dt;
  });
  // choques entre bolas (rebotan con fuerza)
  for (let i = 0; i < e.n; i++) for (let k = i + 1; k < e.n; k++) {
    const a = e.bolas[i], b = e.bolas[k]; if (!a.vivo || !b.vivo) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d >= RB * 2 || d === 0) continue;
    const nx = dx / d, ny = dy / d, sep = (RB * 2 - d) / 2;
    a.x -= nx * sep; a.y -= ny * sep; b.x += nx * sep; b.y += ny * sep;
    const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (vn < 0) { const imp = -1.6 * vn / 2; a.vx -= imp * nx; a.vy -= imp * ny; b.vx += imp * nx; b.vy += imp * ny; a.choque = b.choque = 0.35; }
  }
  e.bolas.forEach((b) => { if (b.vivo && Math.hypot(b.x - C, b.y - C) > e.radio + RB * 0.3) { b.vivo = false; e.cambio = true; } });
  const vivos = e.bolas.map((b, j) => (b.vivo ? j : -1)).filter((j) => j >= 0);
  if (vivos.length <= 1 || e.t > 75) {
    const g = vivos.length === 1 ? vivos[0] : -1;
    if (g >= 0) e.puntos[g]++;
    e.finRonda = g; e.pausa = 2.2; e.cambio = true;
    if (g >= 0 && e.puntos[g] >= META) e.ganador = [g];
  }
}
function accion(e, yo, a) {
  if (a.tipo !== 'mando') return { ok: false, error: 'Acción desconocida' };
  const x = Number(a.x) || 0, y = Number(a.y) || 0, k = Number(a.k) & 255;
  if ((k & 16) && !(e.mando[yo].k & 16)) e.pulso[yo] = true;
  e.mando[yo] = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)), k };
  return { ok: true, sinVista: true };
}
const foto = (e) => ({ b: e.bolas.map((b) => [Math.round(b.x), Math.round(b.y), b.vivo ? 1 : 0, b.recarga > 0 ? 1 : 0]), r: Math.round(e.radio), p: e.puntos, f: e.finRonda, pa: e.pausa > 0 ? Math.ceil(e.pausa) : 0 });
const vista = (e) => ({ n: e.n, centro: C, rb: RB, colores: COLORES, meta: META, ronda: e.ronda, foto: foto(e), puntos: e.puntos, ganadores: e.ganador });
const turno = () => -1;
const fin = (e) => (e.ganador ? { ganadores: e.ganador, texto: `${META} rondas ganadas` } : null);
const bot = () => null;
module.exports = { id: 'sumo', min: 2, max: 6, tiempoReal: true, nuevo, configurar, paso, foto, vista, accion, turno, fin, bot };
