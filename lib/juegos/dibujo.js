'use strict';
// Dibuja y adivina (2-12 personas). Por turnos, uno elige entre 3 palabras y la dibuja; los demás escriben
// lo que creen que es. Quien acierta antes, más puntos (de 100 a 40); quien dibuja gana 25 por cada acierto.
// «¡Casi!» si te quedas a una letra. Con el tiempo se van destapando letras. 2 vueltas (3 si sois 4 o menos).
// Los trazos viajan como eventos en directo; la vista solo lleva cuántos hay (y la lista, para quien llega tarde).
const { DIBUJO, normalizar, distancia } = require('./palabras-fiesta');
const T_ELEGIR = 15000, T_DIBUJAR = 80000, T_FIN_TURNO = 6000, MAX_PUNTOS = 6000;

function nuevo(n) {
  const e = { n, puntos: Array(n).fill(0), vueltas: n <= 4 ? 3 : 2, turnoN: 0, usadas: [], ganador: null, feed: [] };
  siguienteTurno(e);
  return e;
}
function siguienteTurno(e) {
  if (e.turnoN >= e.n * e.vueltas) { const max = Math.max(...e.puntos); e.ganador = e.puntos.map((p, i) => (p === max ? i : -1)).filter((i) => i >= 0); e.fase = 'fin'; e.hasta = 0; return; }
  e.dibuja = e.turnoN % e.n;
  e.turnoN++;
  const opciones = [];
  while (opciones.length < 3) { const w = DIBUJO[Math.floor(Math.random() * DIBUJO.length)]; if (!opciones.includes(w) && !e.usadas.includes(w)) opciones.push(w); }
  Object.assign(e, { fase: 'elegir', opciones, palabra: null, hasta: Date.now() + T_ELEGIR, trazos: [], puntosTrazos: 0, aciertan: [], destapadas: [], casi: {} });
}
function empezarDibujo(e, palabra) {
  e.palabra = palabra; e.usadas.push(palabra);
  e.fase = 'dibujar'; e.inicio = Date.now(); e.hasta = e.inicio + T_DIBUJAR;
  e.feed.push({ sistema: true, texto: `Dibuja ${'{' + e.dibuja + '}'}` });
}
function terminarTurno(e, motivo) {
  e.fase = 'finTurno'; e.hasta = Date.now() + T_FIN_TURNO;
  e.feed.push({ sistema: true, texto: `${motivo} La palabra era «${e.palabra}».` });
  recortar(e);
}
const recortar = (e) => { if (e.feed.length > 60) e.feed.splice(0, e.feed.length - 60); };

function accion(e, yo, a) {
  if (e.ganador) return { ok: false, error: 'La partida ha terminado' };
  if (a.tipo === 'elegir') {
    if (e.fase !== 'elegir' || yo !== e.dibuja) return { ok: false, error: 'Ahora no' };
    const w = e.opciones[Number(a.i)];
    if (!w) return { ok: false, error: 'Elige una de las tres' };
    empezarDibujo(e, w);
    return { ok: true };
  }
  if (a.tipo === 'trazo') {
    if (e.fase !== 'dibujar' || yo !== e.dibuja) return { ok: false, error: 'No dibujas tú' };
    const p = Array.isArray(a.p) ? a.p.slice(0, 400).map((x) => Math.max(0, Math.min(1000, Math.round(Number(x) || 0)))) : [];
    if (p.length < 2 || p.length % 2) return { ok: false, error: 'Trazo no válido' };
    if (e.puntosTrazos + p.length / 2 > MAX_PUNTOS) return { ok: false, error: 'El dibujo es demasiado grande' };
    const t = { c: Math.max(0, Math.min(15, Number(a.c) | 0)), g: [3, 8, 18, 40][Math.max(0, Math.min(3, Number(a.g) | 0))], p, nuevo: !!a.nuevo };
    e.trazos.push(t); e.puntosTrazos += p.length / 2;
    return { ok: true, evento: { tipo: 'trazo', t, n: e.trazos.length }, sinVista: true };
  }
  if (a.tipo === 'deshacer' || a.tipo === 'borrar') {
    if (e.fase !== 'dibujar' || yo !== e.dibuja) return { ok: false, error: 'No dibujas tú' };
    if (a.tipo === 'borrar') e.trazos = [];
    else { // quita el último trazo continuo (hasta el último «nuevo»)
      let i = e.trazos.length - 1; while (i > 0 && !e.trazos[i].nuevo) i--; e.trazos.splice(Math.max(0, i));
    }
    e.puntosTrazos = e.trazos.reduce((s, t) => s + t.p.length / 2, 0);
    return { ok: true };
  }
  if (a.tipo === 'adivinar') {
    if (e.fase !== 'dibujar') return { ok: false, error: 'Ahora no se adivina' };
    if (yo === e.dibuja) return { ok: false, error: '¡Tú estás dibujando!' };
    if (e.aciertan.includes(yo)) return { ok: false, error: 'Ya la has acertado' };
    const texto = String(a.texto ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
    if (!texto) return { ok: false };
    const t = normalizar(texto), w = normalizar(e.palabra);
    if (t === w) {
      const resto = Math.max(0, e.hasta - Date.now()) / T_DIBUJAR;
      const pts = Math.round(40 + 60 * resto) - e.aciertan.length * 5;
      e.puntos[yo] += Math.max(20, pts); e.puntos[e.dibuja] += 25;
      e.aciertan.push(yo);
      e.feed.push({ j: yo, acierto: true, texto: `¡ha acertado! (+${Math.max(20, pts)})` });
      if (e.aciertan.length >= e.n - 1) terminarTurno(e, '¡Todos la han acertado!');
    } else {
      e.feed.push({ j: yo, texto });
      if (distancia(t, w) === 1 || (w.length > 4 && distancia(t, w) === 2)) e.casi[yo] = texto;
    }
    recortar(e);
    return { ok: true };
  }
  if (a.tipo === 'seguir') { if (e.fase !== 'finTurno') return { ok: false, error: 'Ahora no' }; siguienteTurno(e); return { ok: true }; }
  return { ok: false, error: 'Acción desconocida' };
}
function tiempo(e, ahora) {
  if (e.ganador || !e.hasta) return false;
  if (e.fase === 'dibujar') {
    // destapar letras al 50 % y al 75 % del tiempo
    const pasado = (ahora - e.inicio) / T_DIBUJAR;
    const quiere = pasado >= 0.75 ? 2 : pasado >= 0.5 ? 1 : 0;
    if (e.destapadas.length < quiere && ahora < e.hasta) {
      const libres = [...e.palabra].map((ch, i) => (ch !== ' ' && !e.destapadas.includes(i) ? i : -1)).filter((i) => i >= 0);
      if (libres.length > 1) { e.destapadas.push(libres[Math.floor(Math.random() * libres.length)]); return true; }
    }
  }
  if (ahora < e.hasta) return false;
  if (e.fase === 'elegir') { empezarDibujo(e, e.opciones[0]); return true; }
  if (e.fase === 'dibujar') { terminarTurno(e, '¡Tiempo!'); return true; }
  if (e.fase === 'finTurno') { siguienteTurno(e); return true; }
  return false;
}
function vista(e, yo) {
  const dibujo = yo === e.dibuja;
  const pista = e.palabra ? [...e.palabra].map((ch, i) => (ch === ' ' ? ' ' : e.destapadas.includes(i) ? ch : '_')).join('') : null;
  return {
    n: e.n, fase: e.fase, dibuja: e.dibuja, hasta: e.hasta, puntos: e.puntos, turnoN: e.turnoN, total: e.n * e.vueltas,
    opciones: dibujo && e.fase === 'elegir' ? e.opciones : null,
    palabra: dibujo || e.fase === 'finTurno' || e.fase === 'fin' || e.aciertan.includes(yo) ? e.palabra : null,
    pista, largo: e.palabra ? e.palabra.length : 0, aciertan: e.aciertan, casi: yo >= 0 ? e.casi[yo] || null : null,
    trazos: e.trazos, nTrazos: e.trazos.length, feed: e.feed.slice(-30), ganadores: e.ganador,
  };
}
const turno = (e) => (e.ganador ? -1 : e.fase === 'elegir' || e.fase === 'dibujar' ? e.dibuja : -1);
const fin = (e) => (e.ganador ? { ganadores: e.ganador, texto: `${Math.max(...e.puntos)} puntos` } : null);
const bot = () => null;
module.exports = { id: 'dibujo', min: 2, max: 12, sinCpu: true, nuevo, vista, accion, turno, fin, bot, tiempo };
