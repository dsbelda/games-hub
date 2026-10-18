'use strict';
// Palabras en clave (4-10, dos equipos: asientos pares rojo, impares azul; el primero de cada equipo es el jefe).
// 25 palabras: 9 agentes del equipo que empieza (rojo), 8 del otro, 7 transeúntes y 1 asesino. El jefe da una
// pista de una palabra y un número; su equipo toca cartas: si es suya, sigue (hasta número + 1); si es neutral o
// del rival, se acaba el turno; el asesino hace perder. Gana quien destapa antes a todos sus agentes.
// Los colores solo los ven los jefes (y los de las cartas ya destapadas).
const { DIBUJO, normalizar } = require('./palabras-fiesta');
const equipo = (j) => j % 2; // 0 rojo, 1 azul
function nuevo(n, rnd = Math.random) {
  const pool = [...new Set(DIBUJO.filter((w) => !w.includes(' ') && w.length <= 10))];
  const palabras = [];
  while (palabras.length < 25) { const w = pool[Math.floor(rnd() * pool.length)]; if (!palabras.includes(w)) palabras.push(w); }
  const colores = [...Array(9).fill(0), ...Array(8).fill(1), ...Array(7).fill(2), 3];
  for (let i = colores.length - 1; i > 0; i--) { const k = Math.floor(rnd() * (i + 1)); [colores[i], colores[k]] = [colores[k], colores[i]]; }
  return { n, palabras, colores, abiertas: Array(25).fill(false), turno: 0, fase: 'pista', pista: null, quedan: 0, historial: [], ganador: null, jefes: [0, 1] };
}
const quedanAgentes = (e, t) => e.colores.filter((c, i) => c === t && !e.abiertas[i]).length;
function cambiarTurno(e) { e.turno = 1 - e.turno; e.fase = 'pista'; e.pista = null; e.quedan = 0; }
function accion(e, yo, a) {
  if (e.ganador) return { ok: false, error: 'La partida ha terminado' };
  const t = equipo(yo), jefe = e.jefes[t] === yo;
  if (a.tipo === 'pista') {
    if (e.fase !== 'pista' || t !== e.turno || !jefe) return { ok: false, error: 'Ahora no das tú la pista' };
    const w = normalizar(a.palabra).split(' ')[0] || '', num = Number(a.n);
    if (!w || w.length > 25) return { ok: false, error: 'Escribe una palabra' };
    if (!Number.isInteger(num) || num < 1 || num > 9) return { ok: false, error: 'El número va del 1 al 9' };
    if (e.palabras.some((p, i) => !e.abiertas[i] && (normalizar(p).includes(w) || w.includes(normalizar(p))))) return { ok: false, error: 'No vale una palabra del tablero (ni parte de ella)' };
    e.pista = { palabra: String(a.palabra).trim().split(/\s+/)[0].slice(0, 25), n: num, t }; e.quedan = num + 1; e.fase = 'adivinar';
    e.historial.push({ ...e.pista, aciertos: 0 }); e.historial = e.historial.slice(-12);
    return { ok: true };
  }
  if (a.tipo === 'tocar') {
    if (e.fase !== 'adivinar' || t !== e.turno || jefe) return { ok: false, error: 'Ahora no te toca adivinar' };
    const i = Number(a.i);
    if (!Number.isInteger(i) || i < 0 || i > 24 || e.abiertas[i]) return { ok: false, error: 'Esa carta no' };
    e.abiertas[i] = true; const c = e.colores[i];
    e.ultima = { i, c, j: yo };
    if (c === 3) { e.ganador = e.jefes.map((_, k) => k).filter((k) => k !== t).flatMap((k) => Array.from({ length: e.n }, (_, j) => j).filter((j) => equipo(j) === k)); e.motivo = 'asesino'; return { ok: true }; }
    for (const k of [0, 1]) if (!quedanAgentes(e, k)) { e.ganador = Array.from({ length: e.n }, (_, j) => j).filter((j) => equipo(j) === k); e.motivo = 'agentes'; return { ok: true }; }
    if (c === t) { e.historial[e.historial.length - 1].aciertos++; e.quedan--; if (e.quedan <= 0) cambiarTurno(e); }
    else cambiarTurno(e);
    return { ok: true };
  }
  if (a.tipo === 'pasar') { if (e.fase !== 'adivinar' || t !== e.turno || jefe) return { ok: false, error: 'Ahora no' }; cambiarTurno(e); return { ok: true }; }
  return { ok: false, error: 'Acción desconocida' };
}
function vista(e, yo) {
  const jefe = yo >= 0 && e.jefes[equipo(yo)] === yo;
  return {
    n: e.n, palabras: e.palabras, abiertas: e.abiertas, colores: e.colores.map((c, i) => (jefe || e.abiertas[i] || e.ganador ? c : -1)),
    turno: e.turno, fase: e.fase, pista: e.pista, quedan: e.quedan, historial: e.historial, jefes: e.jefes, soyJefe: jefe,
    restan: [quedanAgentes(e, 0), quedanAgentes(e, 1)], ultima: e.ultima || null, ganadores: e.ganador, motivo: e.motivo || null,
  };
}
const turno = (e) => (e.ganador ? -1 : e.fase === 'pista' ? e.jefes[e.turno] : -1);
const fin = (e) => (e.ganador ? { ganadores: e.ganador, texto: e.motivo === 'asesino' ? 'El otro equipo tocó al asesino' : '¡Todos los agentes encontrados!' } : null);
const bot = () => null;
module.exports = { id: 'clave', min: 4, max: 10, sinCpu: true, nuevo, vista, accion, turno, fin, bot };
