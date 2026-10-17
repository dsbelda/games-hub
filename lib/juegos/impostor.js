'use strict';
// El impostor (3-10 personas). Todos reciben la misma palabra secreta menos uno, el impostor, que solo ve la
// categoría. Por turnos, cada uno da una pista de una palabra (dos vueltas). Luego todos votan quién es.
// Si pillan al impostor, aún puede ganar adivinando la palabra. Puntos: el pueblo gana 1 cada uno; el
// impostor, 3. Se juegan tantas rondas como jugadores (máx. 6) y gana quien más puntos tenga.
const { IMPOSTOR, normalizar, distancia } = require('./palabras-fiesta');
const T_PISTA = 40000, T_VOTO = 45000, T_ADIVINA = 30000, T_RESULTADO = 9000;

function nuevo(n, rnd) {
  const e = { n, puntos: Array(n).fill(0), ronda: 0, rondas: Math.min(6, Math.max(3, n)), usadas: [], rnd: rnd || Math.random, ganador: null };
  nuevaRonda(e);
  return e;
}
function nuevaRonda(e) {
  e.ronda++;
  const cats = Object.keys(IMPOSTOR);
  let cat, palabra;
  do { cat = cats[Math.floor(Math.random() * cats.length)]; palabra = IMPOSTOR[cat][Math.floor(Math.random() * IMPOSTOR[cat].length)]; } while (e.usadas.includes(palabra) && e.usadas.length < 150);
  e.usadas.push(palabra);
  Object.assign(e, {
    categoria: cat, palabra, impostor: Math.floor(Math.random() * e.n), fase: 'pistas',
    primero: (e.ronda - 1) % e.n, pistas: [], votos: Array(e.n).fill(null), intento: null, resultado: null,
  });
  e.turno = e.primero;
  e.hasta = Date.now() + T_PISTA;
}
const vueltas = 2;
function siguientePista(e) {
  if (e.pistas.length >= e.n * vueltas) { e.fase = 'votar'; e.turno = -1; e.hasta = Date.now() + T_VOTO; return; }
  e.turno = (e.primero + e.pistas.length) % e.n;
  e.hasta = Date.now() + T_PISTA;
}
function recuento(e) {
  const cuenta = Array(e.n).fill(0);
  for (const v of e.votos) if (v !== null && v >= 0) cuenta[v]++;
  const max = Math.max(...cuenta);
  const mas = cuenta.map((c, i) => (c === max ? i : -1)).filter((i) => i >= 0);
  const pillado = max > 0 && mas.length === 1 && mas[0] === e.impostor;
  e.cuenta = cuenta;
  e.expulsado = max > 0 && mas.length === 1 ? mas[0] : -1;
  if (pillado) { e.fase = 'adivinar'; e.turno = e.impostor; e.hasta = Date.now() + T_ADIVINA; }
  else resolver(e, 'impostor', e.expulsado < 0 ? 'Empate en la votación: nadie es expulsado' : 'El pueblo se ha equivocado');
}
function resolver(e, gana, motivo) {
  if (gana === 'impostor') e.puntos[e.impostor] += 3;
  else for (let j = 0; j < e.n; j++) if (j !== e.impostor) e.puntos[j] += 1;
  e.resultado = { gana, motivo, palabra: e.palabra, impostor: e.impostor, intento: e.intento };
  e.fase = 'resultado'; e.turno = -1; e.hasta = Date.now() + T_RESULTADO;
  if (e.ronda >= e.rondas) { const max = Math.max(...e.puntos); e.ganador = e.puntos.map((p, i) => (p === max ? i : -1)).filter((i) => i >= 0); e.hasta = 0; }
}

function accion(e, yo, a) {
  if (e.ganador) return { ok: false, error: 'La partida ha terminado' };
  if (a.tipo === 'pista') {
    if (e.fase !== 'pistas' || e.turno !== yo) return { ok: false, error: 'No es tu turno de dar pista' };
    const p = String(a.texto ?? '').replace(/\s+/g, ' ').trim().slice(0, 24);
    if (!p) return { ok: false, error: 'Escribe una pista' };
    if (yo !== e.impostor && normalizar(p).split(' ').some((w) => w.length > 2 && (normalizar(e.palabra).includes(w) || distancia(w, normalizar(e.palabra)) <= 1))) return { ok: false, error: '¡No puedes decir la palabra!' };
    e.pistas.push({ j: yo, texto: p });
    siguientePista(e);
    return { ok: true };
  }
  if (a.tipo === 'votar') {
    if (e.fase !== 'votar') return { ok: false, error: 'Ahora no se vota' };
    const v = Number(a.a);
    if (!Number.isInteger(v) || v < 0 || v >= e.n || v === yo) return { ok: false, error: 'Voto no válido' };
    e.votos[yo] = v;
    if (e.votos.every((x) => x !== null)) recuento(e);
    return { ok: true };
  }
  if (a.tipo === 'adivinar') {
    if (e.fase !== 'adivinar' || yo !== e.impostor) return { ok: false, error: 'Ahora no' };
    e.intento = String(a.texto ?? '').trim().slice(0, 40);
    const acierta = distancia(normalizar(e.intento), normalizar(e.palabra)) <= 1;
    resolver(e, acierta ? 'impostor' : 'pueblo', acierta ? '¡Le pillaron, pero ha adivinado la palabra!' : 'Pillado y sin adivinar la palabra');
    return { ok: true };
  }
  if (a.tipo === 'seguir') { if (e.fase !== 'resultado') return { ok: false, error: 'Ahora no' }; nuevaRonda(e); return { ok: true }; }
  return { ok: false, error: 'Acción desconocida' };
}
function tiempo(e, ahora) {
  if (e.ganador || !e.hasta || ahora < e.hasta) return false;
  if (e.fase === 'pistas') { e.pistas.push({ j: e.turno, texto: '(sin pista)' }); siguientePista(e); return true; }
  if (e.fase === 'votar') { recuento(e); return true; }
  if (e.fase === 'adivinar') { resolver(e, 'pueblo', 'Pillado: se le acabó el tiempo para adivinar'); return true; }
  if (e.fase === 'resultado') { nuevaRonda(e); return true; }
  return false;
}
function vista(e, yo) {
  const fin = e.fase === 'resultado' || !!e.ganador;
  return {
    n: e.n, ronda: e.ronda, rondas: e.rondas, fase: e.fase, turno: e.turno, hasta: e.hasta, puntos: e.puntos,
    categoria: e.categoria, palabra: yo >= 0 && yo !== e.impostor ? e.palabra : null, soyImpostor: yo === e.impostor,
    pistas: e.pistas, yaVote: yo >= 0 && e.votos[yo] !== null, votaron: e.votos.map((v) => v !== null),
    cuenta: fin || e.fase === 'adivinar' ? e.cuenta : null, votos: fin ? e.votos : null, resultado: e.resultado, ganadores: e.ganador,
  };
}
const turno = (e) => (e.ganador ? -1 : e.turno);
const fin = (e) => (e.ganador ? { ganadores: e.ganador, texto: `${Math.max(...e.puntos)} puntos tras ${e.rondas} rondas` } : null);
const bot = () => null;
module.exports = { id: 'impostor', min: 3, max: 10, sinCpu: true, nuevo, vista, accion, turno, fin, bot, tiempo };
