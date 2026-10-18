'use strict';
// Bombas (2-4, en tiempo real, con CPU). Laberinto de 13×11 con columnas fijas y bloques que se rompen. Pon
// bombas (estallan en cruz a los 2,5 s), rompe bloques, coge mejoras (más bombas, más fuego, patines) y sé el
// último en pie. Gana la partida quien gana antes 3 rondas. Teclas: 1 ↑, 2 ↓, 4 ←, 8 →, 16 bomba.
const AN = 13, AL = 11, MECHA = 2.5, LLAMA = 0.55, META = 3;
const COLORES = ['#ffffff', '#ff5a36', '#4d7cfe', '#3fbf5f'];
const SALIDAS = [[1, 1], [11, 9], [11, 1], [1, 9]];
function nuevo(n) { const e = { n, puntos: Array(n).fill(0), ronda: 0, ganador: null, bots: Array(n).fill(null), teclas: Array(n).fill(0), pulso: Array(n).fill(false), cambio: true }; ronda(e); return e; }
function configurar(e, asientos) { e.bots = asientos.map((a) => (a.bot ? { nivel: a.nivel } : null)); }
function ronda(e) {
  e.ronda++;
  const libres = new Set(); for (const [x, y] of SALIDAS) for (const [a, b] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) libres.add(`${x + a},${y + b}`);
  e.mapa = Array.from({ length: AL }, (_, y) => Array.from({ length: AN }, (_, x) => (x === 0 || y === 0 || x === AN - 1 || y === AL - 1 || (x % 2 === 0 && y % 2 === 0) ? 1 : !libres.has(`${x},${y}`) && Math.random() < 0.7 ? 2 : 0)));
  e.jug = Array.from({ length: e.n }, (_, j) => ({ x: SALIDAS[j][0] + 0.5, y: SALIDAS[j][1] + 0.5, vivo: true, bombas: 1, fuego: 2, vel: 3.4, dir: [0, 1] }));
  Object.assign(e, { bombasEn: [], llamas: [], mejoras: {}, t: 0, pausa: 2, finRonda: null, cambio: true });
}
const solido = (e, x, y) => x < 0 || y < 0 || x >= AN || y >= AL || e.mapa[y][x] !== 0;
const bombaEn = (e, x, y) => e.bombasEn.find((b) => b.x === x && b.y === y);
const celdaDe = (p) => [Math.floor(p.x), Math.floor(p.y)];
// casillas que alcanzaría una bomba (sin contar reacciones en cadena)
function alcance(e, b) {
  const out = [[b.x, b.y]];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let k = 1; k <= b.fuego; k++) { const x = b.x + dx * k, y = b.y + dy * k; if (x < 0 || y < 0 || x >= AN || y >= AL || e.mapa[y][x] === 1) break; out.push([x, y]); if (e.mapa[y][x] === 2) break; }
  return out;
}
function explotar(e, b) {
  e.bombasEn = e.bombasEn.filter((x) => x !== b);
  for (const [x, y] of alcance(e, b)) {
    e.llamas.push({ x, y, t: LLAMA });
    if (e.mapa[y][x] === 2) { e.mapa[y][x] = 0; if (Math.random() < 0.32) e.mejoras[`${x},${y}`] = ['bomba', 'fuego', 'patines'][Math.floor(Math.random() * 3)]; e.cambio = true; }
    else delete e.mejoras[`${x},${y}`];
    const otra = bombaEn(e, x, y); if (otra) otra.t = Math.min(otra.t, 0.05);
  }
}
const peligro = (e, x, y) => e.llamas.some((l) => l.x === x && l.y === y) || e.bombasEn.some((b) => alcance(e, b).some(([a, c]) => a === x && c === y));
function camino(e, desde, meta, evitarPeligro) { // BFS: primera casilla hacia la meta (función que dice si una casilla vale)
  const [sx, sy] = desde, prev = new Map([[`${sx},${sy}`, null]]), cola = [[sx, sy]];
  while (cola.length) {
    const [x, y] = cola.shift();
    if ((x !== sx || y !== sy) && meta(x, y)) { let cur = `${x},${y}`; while (prev.get(cur) && prev.get(cur) !== `${sx},${sy}`) cur = prev.get(cur); return cur.split(',').map(Number); }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy, k = `${a},${b}`; if (prev.has(k) || solido(e, a, b) || bombaEn(e, a, b) || (evitarPeligro && e.llamas.some((l) => l.x === a && l.y === b))) continue; prev.set(k, `${x},${y}`); cola.push([a, b]); }
  }
  if (meta(sx, sy)) return [sx, sy];
  return null;
}
function pensar(e, j) {
  const p = e.jug[j], b = e.bots[j], [cx, cy] = celdaDe(p), dif = b.nivel === 'dificil';
  b.t = (b.t || 0) - 1 / 30;
  if (b.obj && b.t > 0) return b.obj;
  b.t = dif ? 0.05 : 0.22;
  let destino = null, bomba = false;
  if (peligro(e, cx, cy)) destino = camino(e, [cx, cy], (x, y) => !peligro(e, x, y), true);
  else {
    const rivales = e.jug.filter((o, k) => k !== j && o.vivo).map(celdaDe);
    const util = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { for (let k = 1; k <= p.fuego; k++) { const a = x + dx * k, c = y + dy * k; if (solido(e, a, c) && e.mapa[c]?.[a] !== 2) return false; if (e.mapa[c]?.[a] === 2) return k === 1 || dif; if (rivales.some(([rx, ry]) => rx === a && ry === c)) return true; } return false; });
    const activas = e.bombasEn.filter((x) => x.j === j).length;
    if (activas < p.bombas && util(cx, cy) && !bombaEn(e, cx, cy)) {
      // solo si después hay a dónde huir
      const sim = { x: cx, y: cy, fuego: p.fuego }; e.bombasEn.push(sim);
      const huida = camino(e, [cx, cy], (x, y) => !peligro(e, x, y), true);
      e.bombasEn.pop();
      if (huida && Math.random() < (dif ? 1 : 0.6)) bomba = true;
    }
    if (!bomba) {
      const meta = (x, y) => !peligro(e, x, y) && (e.mejoras[`${x},${y}`] || util(x, y));
      destino = camino(e, [cx, cy], meta, true);
      if (destino && peligro(e, destino[0], destino[1])) destino = null;
    }
  }
  let mx = 0, my = 0;
  if (destino) { const tx = destino[0] + 0.5 - p.x, ty = destino[1] + 0.5 - p.y; if (Math.abs(tx) > Math.abs(ty)) mx = Math.sign(tx); else my = Math.sign(ty); if (Math.abs(tx) < 0.08 && Math.abs(ty) < 0.08) { mx = 0; my = 0; } }
  b.obj = { mx, my, bomba };
  return b.obj;
}
function mover(e, p, mx, my, dt) {
  const v = p.vel * dt;
  if (mx) {
    const cy = Math.floor(p.y) + 0.5; // alinearse con la fila
    if (Math.abs(p.y - cy) > 0.05) { p.y += Math.sign(cy - p.y) * Math.min(v, Math.abs(cy - p.y)); }
    const nx = p.x + mx * v, borde = Math.floor(nx + mx * 0.45), cyc = Math.floor(p.y);
    const libre = !solido(e, borde, cyc) && (!bombaEn(e, borde, cyc) || borde === Math.floor(p.x));
    if (libre) p.x = nx; else p.x = Math.floor(p.x) + 0.5;
    p.dir = [mx, 0];
  } else if (my) {
    const cx = Math.floor(p.x) + 0.5;
    if (Math.abs(p.x - cx) > 0.05) { p.x += Math.sign(cx - p.x) * Math.min(v, Math.abs(cx - p.x)); }
    const ny = p.y + my * v, borde = Math.floor(ny + my * 0.45), cxc = Math.floor(p.x);
    const libre = !solido(e, cxc, borde) && (!bombaEn(e, cxc, borde) || borde === Math.floor(p.y));
    if (libre) p.y = ny; else p.y = Math.floor(p.y) + 0.5;
    p.dir = [0, my];
  }
}
function paso(e, dt) {
  if (e.ganador) return;
  if (e.pausa > 0) { e.pausa -= dt; if (e.finRonda !== null && e.pausa <= 0) ronda(e); return; }
  e.t += dt;
  e.jug.forEach((p, j) => {
    if (!p.vivo) return;
    let mx, my, bomba;
    if (e.bots[j]) ({ mx, my, bomba } = pensar(e, j));
    else { const t = e.teclas[j]; mx = ((t & 8) ? 1 : 0) - ((t & 4) ? 1 : 0); my = mx ? 0 : ((t & 2) ? 1 : 0) - ((t & 1) ? 1 : 0); bomba = e.pulso[j]; e.pulso[j] = false; }
    mover(e, p, mx, my, dt);
    const [cx, cy] = celdaDe(p);
    if (bomba && e.bombasEn.filter((b) => b.j === j).length < p.bombas && !bombaEn(e, cx, cy)) { e.bombasEn.push({ x: cx, y: cy, t: MECHA, fuego: p.fuego, j }); if (e.bots[j]) e.bots[j].obj = null; }
    const m = e.mejoras[`${cx},${cy}`];
    if (m) { if (m === 'bomba') p.bombas = Math.min(6, p.bombas + 1); if (m === 'fuego') p.fuego = Math.min(7, p.fuego + 1); if (m === 'patines') p.vel = Math.min(6, p.vel + 0.6); delete e.mejoras[`${cx},${cy}`]; e.cambio = true; }
  });
  for (const b of [...e.bombasEn]) { b.t -= dt; if (b.t <= 0 && e.bombasEn.includes(b)) explotar(e, b); }
  for (const l of e.llamas) l.t -= dt; e.llamas = e.llamas.filter((l) => l.t > 0);
  e.jug.forEach((p) => { if (!p.vivo) return; const [cx, cy] = celdaDe(p); if (e.llamas.some((l) => l.x === cx && l.y === cy)) { p.vivo = false; e.cambio = true; } });
  const vivos = e.jug.map((p, j) => (p.vivo ? j : -1)).filter((j) => j >= 0);
  if (vivos.length <= 1 || e.t > 150) {
    const g = vivos.length === 1 ? vivos[0] : -1;
    if (g >= 0) e.puntos[g]++;
    e.finRonda = g; e.pausa = 2.5; e.cambio = true;
    if (g >= 0 && e.puntos[g] >= META) e.ganador = [g];
  }
}
function accion(e, yo, a) {
  if (a.tipo !== 'teclas') return { ok: false, error: 'Acción desconocida' };
  const k = Number(a.k) & 31;
  if ((k & 16) && !(e.teclas[yo] & 16)) e.pulso[yo] = true;
  e.teclas[yo] = k;
  return { ok: true, sinVista: true };
}
const foto = (e) => ({ j: e.jug.map((p) => [Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100, p.vivo ? 1 : 0, p.dir[0], p.dir[1]]), b: e.bombasEn.map((b) => [b.x, b.y, Math.round(b.t * 10) / 10]), l: e.llamas.map((l) => [l.x, l.y]), m: e.mapa.map((f) => f.join('')).join('|'), mj: e.mejoras, p: e.puntos, f: e.finRonda, pa: e.pausa > 0 ? 1 : 0 });
const vista = (e) => ({ n: e.n, an: AN, al: AL, colores: COLORES, meta: META, ronda: e.ronda, foto: foto(e), puntos: e.puntos, ganadores: e.ganador, stats: e.jug.map((p) => [p.bombas, p.fuego, Math.round((p.vel - 3.4) / 0.6)]) });
const turno = () => -1;
const fin = (e) => (e.ganador ? { ganadores: e.ganador, texto: `${META} rondas ganadas` } : null);
const bot = () => null;
module.exports = { id: 'bombas', min: 2, max: 4, tiempoReal: true, nuevo, configurar, paso, foto, vista, accion, turno, fin, bot };
