'use strict';
// Base común de los juegos «.io» (Células, Serpientes, Territorio, Tanques mejorables): un mapa grande donde
// juegan las personas de la sala y, para que nunca esté vacío, rivales de relleno que controla la CPU.
// Al morir se reaparece a los pocos segundos. La partida dura unos minutos y gana quien haya llegado a la
// mayor puntuación. Cada jugador: { id, j (asiento o -1 si es de relleno), nombre, nivel, vivo, puntos, max,
// espera (s hasta reaparecer), mando }.
const NOMBRES = ['Pepa', 'Toni', 'Lola', 'Chimo', 'Amparo', 'Vicent', 'Nuria', 'Paco', 'Rosa', 'Quique', 'Marta', 'Juanjo', 'Sole', 'Rafa', 'Inma', 'Xavi', 'Carmen', 'Pau', 'Lucía', 'Andreu', 'Neus', 'Iker', 'Maite', 'Héctor'];
const COLORES = ['#4d7cfe', '#ff5a36', '#3fbf5f', '#ffc63d', '#8a5cf6', '#ff6fa8', '#18b39b', '#ff9f2e', '#9a5b2e', '#2f55c4', '#c93a1c', '#24863e', '#5b37b8', '#c8457a', '#0f7f6e', '#d99a12'];

function crear(n, { total = 12, duracion = 240, rnd = Math.random } = {}) {
  const e = { n, rnd, reloj: duracion, duracion, jug: [], ganador: null, cambio: true, sigId: 1, total };
  for (let j = 0; j < n; j++) e.jug.push(nuevoJug(e, j, null, 'normal'));
  return e;
}
function nuevoJug(e, j, nombre, nivel) {
  return { id: e.sigId++, j, nombre, nivel, bot: j < 0, vivo: false, puntos: 0, max: 0, espera: 0, mando: { a: 0, x: 0, y: 0, k: 0 }, color: COLORES[(e.jug.length) % COLORES.length] };
}
// los asientos de CPU de la sala también los mueve el motor (como los de relleno); después se rellena
function configurar(e, asientos) {
  asientos.forEach((a, j) => { const p = e.jug.find((x) => x.j === j); if (p && a.bot) { p.bot = true; p.nivel = a.nivel || 'normal'; } });
  const usados = new Set();
  while (e.jug.length < Math.max(e.total, e.n)) {
    let nombre; do { nombre = NOMBRES[Math.floor(e.rnd() * NOMBRES.length)]; } while (usados.has(nombre) && usados.size < NOMBRES.length);
    usados.add(nombre);
    e.jug.push(nuevoJug(e, -1, nombre, e.rnd() < 0.35 ? 'dificil' : 'normal'));
  }
}
// avanza el reloj y las reapariciones; reaparecer(p) lo pone el juego. Devuelve false si la partida ya acabó.
function paso(e, dt, reaparecer) {
  if (e.ganador) return false;
  e.reloj -= dt;
  for (const p of e.jug) {
    if (!p.vivo) { p.espera -= dt; if (p.espera <= 0) { reaparecer(p); p.vivo = true; p.puntos = 0; e.cambio = true; } }
    p.max = Math.max(p.max, Math.round(p.puntos));
  }
  if (e.reloj <= 0) {
    e.reloj = 0;
    const personas = e.jug.filter((p) => p.j >= 0);
    const mejor = Math.max(...personas.map((p) => p.max));
    e.ganador = personas.filter((p) => p.max === mejor).map((p) => p.j);
    e.cambio = true;
    return false;
  }
  return true;
}
function morir(e, p, espera = 3) { p.vivo = false; p.espera = espera; e.cambio = true; }
function mando(e, yo, a) {
  const p = e.jug.find((x) => x.j === yo);
  if (!p || p.bot) return { ok: false, error: 'No juegas' };
  const ang = Number(a.a);
  p.mando = { a: Number.isFinite(ang) ? ang : 0, x: Math.max(-1, Math.min(1, Number(a.x) || 0)), y: Math.max(-1, Math.min(1, Number(a.y) || 0)), k: Number(a.k) & 255, f: Math.max(0, Math.min(1, Number(a.f) || 0)) };
  return { ok: true, sinVista: true };
}
// clasificación (los 10 mejores por puntuación actual) y datos fijos de cada jugador para la vista
const tabla = (e) => e.jug.filter((p) => p.vivo).sort((a, b) => b.puntos - a.puntos).slice(0, 6).map((p) => [p.id, Math.round(p.puntos)]);
const jugadores = (e) => e.jug.map((p) => ({ id: p.id, j: p.j, nombre: p.nombre, color: p.color, bot: p.bot, max: p.max, vivo: p.vivo, espera: Math.ceil(p.espera) }));
const fin = (e) => (e.ganador ? { ganadores: e.ganador, texto: `${Math.max(...e.jug.filter((p) => p.j >= 0).map((p) => p.max))} puntos de máximo` } : null);
const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
const angDif = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
module.exports = { crear, configurar, paso, morir, mando, tabla, jugadores, fin, dist2, angDif, COLORES };
