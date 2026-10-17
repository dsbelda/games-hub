'use strict';
// Billar a bola 8 (2 jugadores). Mesa de 1000×500, bolas de radio 11. 1-7 lisas, 8 negra, 9-15 rayadas.
// Reglas: tras el saque, la primera bola que metas decide tu grupo. Sigues tirando si metes de tu grupo sin
// falta. Falta (bola en mano para el rival): meter la blanca, no tocar ninguna bola o tocar primero una que no
// es tuya. La negra, cuando ya no te queden de tu grupo; meterla antes (o con falta) pierde la partida.
// El servidor simula el tiro y manda los fotogramas para que todos vean lo mismo.
const W = 1000, H = 500, R = 11, TRONERA = 24, DT = 1 / 240;
const TRONERAS = [[0, 0], [W / 2, -6], [W, 0], [0, H], [W / 2, H + 6], [W, H]];
const grupoDe = (n) => (n >= 1 && n <= 7 ? 'lisas' : n >= 9 ? 'rayadas' : null);

function colocarInicial() {
  const b = Array.from({ length: 16 }, (_, n) => ({ n, x: 0, y: 0, vx: 0, vy: 0, dentro: false }));
  b[0].x = 250; b[0].y = H / 2;
  // triángulo con la 8 en el centro y una lisa y una rayada en las esquinas de atrás
  const orden = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 15, 7];
  let k = 0;
  for (let fila = 0; fila < 5; fila++) for (let i = 0; i <= fila; i++) {
    const n = orden[k++];
    b[n].x = 720 + fila * (R * 2 * 0.87 + 0.5);
    b[n].y = H / 2 + (i - fila / 2) * (R * 2 + 0.5);
  }
  return b;
}
function nuevo() { return { b: colocarInicial(), turno: 0, grupos: [null, null], enMano: false, saque: true, ganador: -1, ultimo: null, aviso: null }; }

// simula hasta que todo se para; devuelve { fotos, primero, metidas }
function simular(bolas, ang, fuerza, conFotos = true) {
  const b = bolas.map((x) => ({ ...x }));
  const blanca = b[0];
  const v = 150 + Math.max(0, Math.min(1, fuerza)) * 1650;
  blanca.vx = Math.cos(ang) * v; blanca.vy = Math.sin(ang) * v;
  const fotos = [];
  let primero = null; const metidas = []; let bandas = 0;
  for (let paso = 0; paso < 240 * 15; paso++) {
    let moviendo = false;
    for (const p of b) {
      if (p.dentro) continue;
      const sp = Math.hypot(p.vx, p.vy);
      if (sp < 4) { p.vx = p.vy = 0; continue; }
      moviendo = true;
      const freno = Math.max(0, sp - 220 * DT) / sp; // rozamiento con el paño
      p.vx *= freno; p.vy *= freno;
      p.x += p.vx * DT; p.y += p.vy * DT;
      // troneras
      if (TRONERAS.some(([tx, ty]) => (p.x - tx) ** 2 + (p.y - ty) ** 2 < TRONERA * TRONERA)) { p.dentro = true; p.vx = p.vy = 0; metidas.push(p.n); continue; }
      // bandas (sin troneras en medio de los lados largos)
      if (p.x < R) { p.x = R; p.vx = -p.vx * 0.82; bandas++; } if (p.x > W - R) { p.x = W - R; p.vx = -p.vx * 0.82; bandas++; }
      if (p.y < R) { p.y = R; p.vy = -p.vy * 0.82; bandas++; } if (p.y > H - R) { p.y = H - R; p.vy = -p.vy * 0.82; bandas++; }
    }
    // choques entre bolas (elásticos, misma masa)
    for (let i = 0; i < 16; i++) {
      const p = b[i]; if (p.dentro) continue;
      for (let k = i + 1; k < 16; k++) {
        const q = b[k]; if (q.dentro) continue;
        const dx = q.x - p.x, dy = q.y - p.y, d2 = dx * dx + dy * dy;
        if (d2 >= 4 * R * R || d2 === 0) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
        const rel = (p.vx - q.vx) * nx + (p.vy - q.vy) * ny;
        if (rel <= 0) { const sol = (2 * R - d) / 2; p.x -= nx * sol; p.y -= ny * sol; q.x += nx * sol; q.y += ny * sol; continue; }
        const imp = rel * 0.97;
        p.vx -= imp * nx; p.vy -= imp * ny; q.vx += imp * nx; q.vy += imp * ny;
        const sol = (2 * R - d) / 2; p.x -= nx * sol; p.y -= ny * sol; q.x += nx * sol; q.y += ny * sol;
        if (primero === null && (i === 0 || k === 0)) primero = i === 0 ? k : i;
      }
    }
    if (conFotos && paso % 8 === 0) fotos.push(b.map((p) => (p.dentro ? null : [Math.round(p.x), Math.round(p.y)])));
    if (!moviendo) break;
  }
  if (conFotos) fotos.push(b.map((p) => (p.dentro ? null : [Math.round(p.x), Math.round(p.y)])));
  return { b, fotos, primero, metidas, bandas };
}
const quedanDe = (e, grupo) => e.b.filter((p) => !p.dentro && grupoDe(p.n) === grupo).length;
const objetivo = (e, j) => (e.grupos[j] ? (quedanDe(e, e.grupos[j]) ? e.grupos[j] : 'negra') : 'abierta');

function accion(e, yo, a) {
  if (e.ganador >= 0) return { ok: false, error: 'La partida ha terminado' };
  if (a.tipo === 'rendirse') { e.ganador = 1 - yo; e.rendido = yo; return { ok: true }; }
  if (e.turno !== yo) return { ok: false, error: 'No es tu turno' };
  if (a.tipo === 'colocar') {
    if (!e.enMano) return { ok: false, error: 'No tienes bola en mano' };
    const x = Number(a.x), y = Number(a.y);
    if (!(x >= R && x <= W - R && y >= R && y <= H - R)) return { ok: false, error: 'Fuera de la mesa' };
    if (e.b.some((p) => p.n && !p.dentro && (p.x - x) ** 2 + (p.y - y) ** 2 < 4 * R * R)) return { ok: false, error: 'Ahí hay otra bola' };
    Object.assign(e.b[0], { x, y, dentro: false }); e.enMano = false;
    return { ok: true };
  }
  if (a.tipo !== 'tirar') return { ok: false, error: 'Acción desconocida' };
  if (e.enMano) return { ok: false, error: 'Primero coloca la bola blanca' };
  const ang = Number(a.ang), fuerza = Number(a.fuerza);
  if (!Number.isFinite(ang) || !Number.isFinite(fuerza)) return { ok: false, error: 'Tiro no válido' };
  const obj = objetivo(e, yo);
  const r = simular(e.b, ang, fuerza);
  e.b = r.b;
  // ¿falta?
  let falta = null;
  if (r.metidas.includes(0)) falta = 'has metido la blanca';
  else if (r.primero === null) falta = 'no has tocado ninguna bola';
  else if (obj === 'negra' ? r.primero !== 8 : obj === 'abierta' ? (r.primero === 8 && !e.saque) : grupoDe(r.primero) !== obj) falta = 'has tocado primero una bola que no es tuya';
  const mias = r.metidas.filter((n) => n !== 0 && n !== 8);
  // la negra
  let texto = '';
  if (r.metidas.includes(8)) {
    if (obj === 'negra' && !falta) { e.ganador = yo; texto = '¡mete la negra y gana!'; }
    else { e.ganador = 1 - yo; texto = 'mete la negra antes de tiempo y pierde'; }
  } else {
    // asignar grupos con la primera bola metida tras el saque
    if (!e.grupos[yo] && !falta && mias.length && !e.saque) { const g = grupoDe(mias[0]); e.grupos[yo] = g; e.grupos[1 - yo] = g === 'lisas' ? 'rayadas' : 'lisas'; texto = `juega con las ${g}`; }
    const sigue = !falta && mias.some((n) => !e.grupos[yo] || grupoDe(n) === e.grupos[yo]);
    if (falta) { e.turno = 1 - yo; e.enMano = true; if (r.metidas.includes(0)) e.b[0].dentro = true; texto = `falta: ${falta}`; }
    else if (!sigue) e.turno = 1 - yo;
    else texto = texto || `mete ${mias.length === 1 ? 'una' : mias.length} y sigue`;
  }
  e.saque = false;
  e.ultimo = { j: yo, fotos: r.fotos, metidas: r.metidas, texto, falta: !!falta };
  return { ok: true };
}
function vista(e, yo) {
  return { b: e.b.map((p) => ({ n: p.n, x: Math.round(p.x), y: Math.round(p.y), dentro: p.dentro })), turno: e.turno, grupos: e.grupos, enMano: e.enMano, ganador: e.ganador, ultimo: e.ultimo, rendido: e.rendido, objetivo: yo >= 0 ? objetivo(e, yo) : null, W, H, R };
}
const turno = (e) => (e.ganador >= 0 ? -1 : e.turno);
const fin = (e) => (e.ganador >= 0 ? { ganadores: [e.ganador], texto: e.rendido !== undefined ? 'El rival se ha rendido' : e.ultimo?.texto || 'Bola 8' } : null);

// --- CPU: bola fantasma hacia cada tronera, se simulan los mejores candidatos ---------------------------
function bot(e, yo, nivel, rnd) {
  if (turno(e) !== yo) return null;
  if (e.enMano) {
    // coloca la blanca en un sitio libre cerca del centro
    for (let k = 0; k < 50; k++) { const x = 200 + rnd() * 600, y = 80 + rnd() * 340; if (!e.b.some((p) => p.n && !p.dentro && (p.x - x) ** 2 + (p.y - y) ** 2 < 9 * R * R)) return { tipo: 'colocar', x, y }; }
    return { tipo: 'colocar', x: 250, y: H / 2 };
  }
  const obj = objetivo(e, yo);
  const blanca = e.b[0];
  const validas = e.b.filter((p) => !p.dentro && p.n && (obj === 'negra' ? p.n === 8 : obj === 'abierta' ? p.n !== 8 : grupoDe(p.n) === obj));
  if (e.saque) return { tipo: 'tirar', ang: Math.atan2(H / 2 - blanca.y + (rnd() - 0.5) * 6, 720 - blanca.x), fuerza: 1 };
  const candidatos = [];
  for (const p of validas) for (const [tx, ty] of TRONERAS) {
    const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
    const gx = p.x - dx / d * 2 * R, gy = p.y - dy / d * 2 * R; // bola fantasma
    const ang = Math.atan2(gy - blanca.y, gx - blanca.x);
    const corte = Math.abs(Math.atan2(dy, dx) - ang); const c = Math.min(corte, 2 * Math.PI - corte);
    if (c > 1.2) continue;
    candidatos.push({ ang, puntos: c + d / 1500 + Math.hypot(gx - blanca.x, gy - blanca.y) / 2000 });
  }
  candidatos.sort((a, b) => a.puntos - b.puntos);
  const limite = Date.now() + 60;
  let mejor = null, mejorV = -Infinity;
  for (const cnd of candidatos.slice(0, 10)) for (const f of [0.35, 0.6]) {
    if (Date.now() > limite) break;
    const r = simular(e.b, cnd.ang, f, false);
    let v = 0;
    if (r.metidas.includes(0)) v -= 80;
    if (r.metidas.includes(8)) v += obj === 'negra' ? 200 : -300;
    const buenas = r.metidas.filter((n) => n && n !== 8 && (obj === 'abierta' || grupoDe(n) === obj)).length;
    v += buenas * 60 - r.metidas.filter((n) => n && n !== 8 && obj !== 'abierta' && grupoDe(n) !== obj).length * 20;
    if (r.primero === null || (obj !== 'abierta' && obj !== 'negra' && grupoDe(r.primero) !== obj)) v -= 50;
    v -= cnd.puntos * 10;
    if (v > mejorV) { mejorV = v; mejor = { ang: cnd.ang, f }; }
  }
  if (!mejor) { const p = validas[0] || e.b.find((x) => x.n && !x.dentro); mejor = { ang: Math.atan2(p.y - blanca.y, p.x - blanca.x), f: 0.5 }; }
  const ruido = nivel === 'dificil' ? 0.012 : 0.04;
  return { tipo: 'tirar', ang: mejor.ang + (rnd() - 0.5) * ruido, fuerza: mejor.f };
}

module.exports = { id: 'billar', min: 2, max: 2, nuevo, vista, accion, turno, fin, bot, _: { simular, objetivo } };
