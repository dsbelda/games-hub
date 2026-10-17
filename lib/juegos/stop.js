'use strict';
// Stop (Tutti frutti), 2-10 personas. Sale una letra y cada uno rellena las 8 categorías con palabras que
// empiecen por ella. Quien las tiene todas puede decir «¡Stop!» y los demás tienen 5 segundos. Luego se
// revisan: cada uno puede tachar respuestas que no valgan (si más de la mitad de los demás la tachan, no
// cuenta). Puntos: 10 si es única, 5 si alguien más puso lo mismo y 20 si eres el único con respuesta en
// esa categoría. 5 rondas; gana quien más puntos tenga.
const { STOP_CATEGORIAS: CATS, STOP_LETRAS, normalizar } = require('./palabras-fiesta');
const T_ESCRIBIR = 120000, T_GRACIA = 5000, T_REVISAR = 40000, T_RESULTADO = 8000, RONDAS = 5;

function nuevo(n) {
  const e = { n, puntos: Array(n).fill(0), ronda: 0, letras: [], ganador: null };
  nuevaRonda(e);
  return e;
}
function nuevaRonda(e) {
  e.ronda++;
  const libres = STOP_LETRAS.filter((l) => !e.letras.includes(l));
  const letra = libres[Math.floor(Math.random() * libres.length)];
  e.letras.push(letra);
  Object.assign(e, { letra, fase: 'escribir', resp: Array.from({ length: e.n }, () => ({})), stop: null, hasta: Date.now() + T_ESCRIBIR, vetos: {}, listos: Array(e.n).fill(false), tabla: null });
}
const valida = (e, txt) => { const t = normalizar(txt); return t.length >= 2 && t[0] === normalizar(e.letra); };
function revisar(e) { e.fase = 'revisar'; e.hasta = Date.now() + T_REVISAR; e.listos.fill(false); }
function puntuar(e) {
  const tabla = [];
  const suma = Array(e.n).fill(0);
  CATS.forEach((cat, ci) => {
    const fila = [];
    const buenas = [];
    for (let j = 0; j < e.n; j++) {
      const txt = e.resp[j][ci] || '';
      const vetos = Object.keys(e.vetos[`${j}:${ci}`] || {}).length;
      const ok = valida(e, txt) && vetos <= (e.n - 1) / 2; // tachada por más de la mitad de los demás: no vale
      fila.push({ txt, ok, vetos });
      if (ok) buenas.push(j);
    }
    for (const j of buenas) {
      const igual = buenas.filter((k) => normalizar(e.resp[k][ci]) === normalizar(e.resp[j][ci])).length;
      fila[j].pts = buenas.length === 1 ? 20 : igual > 1 ? 5 : 10;
      suma[j] += fila[j].pts;
    }
    tabla.push({ cat, fila });
  });
  suma.forEach((s, j) => { e.puntos[j] += s; });
  e.tabla = { filas: tabla, suma };
  e.fase = 'resultado'; e.hasta = Date.now() + T_RESULTADO;
  if (e.ronda >= RONDAS) { const max = Math.max(...e.puntos); e.ganador = e.puntos.map((p, i) => (p === max ? i : -1)).filter((i) => i >= 0); e.hasta = 0; }
}
function accion(e, yo, a) {
  if (e.ganador) return { ok: false, error: 'La partida ha terminado' };
  if (a.tipo === 'guardar' || a.tipo === 'stop') {
    if (e.fase !== 'escribir') return { ok: false, error: 'Se acabó el tiempo de escribir' };
    const r = a.resp && typeof a.resp === 'object' ? a.resp : {};
    const limpio = {};
    CATS.forEach((_, ci) => { limpio[ci] = String(r[ci] ?? '').replace(/\s+/g, ' ').trim().slice(0, 30); });
    e.resp[yo] = limpio;
    if (a.tipo === 'guardar') return { ok: true, sinVista: true };
    if (CATS.some((_, ci) => !limpio[ci])) return { ok: false, error: 'Para decir «¡Stop!» tienes que rellenarlas todas' };
    if (!e.stop) { e.stop = yo; e.hasta = Math.min(e.hasta, Date.now() + T_GRACIA); }
    return { ok: true };
  }
  if (a.tipo === 'vetar') {
    if (e.fase !== 'revisar') return { ok: false, error: 'Ahora no se revisa' };
    const j = Number(a.j), ci = Number(a.c);
    if (!Number.isInteger(j) || j < 0 || j >= e.n || j === yo || !Number.isInteger(ci) || ci < 0 || ci >= CATS.length) return { ok: false, error: 'No válido' };
    const k = `${j}:${ci}`;
    e.vetos[k] ||= {};
    if (e.vetos[k][yo]) delete e.vetos[k][yo]; else e.vetos[k][yo] = true;
    return { ok: true };
  }
  if (a.tipo === 'listo') {
    if (e.fase !== 'revisar') return { ok: false, error: 'Ahora no' };
    e.listos[yo] = true;
    if (e.listos.every(Boolean)) puntuar(e);
    return { ok: true };
  }
  if (a.tipo === 'seguir') { if (e.fase !== 'resultado') return { ok: false, error: 'Ahora no' }; nuevaRonda(e); return { ok: true }; }
  return { ok: false, error: 'Acción desconocida' };
}
function tiempo(e, ahora) {
  if (e.ganador || !e.hasta || ahora < e.hasta) return false;
  if (e.fase === 'escribir') { revisar(e); return true; }
  if (e.fase === 'revisar') { puntuar(e); return true; }
  if (e.fase === 'resultado') { nuevaRonda(e); return true; }
  return false;
}
function vista(e, yo) {
  return {
    n: e.n, ronda: e.ronda, rondas: RONDAS, letra: e.letra, cats: CATS, fase: e.fase, hasta: e.hasta, puntos: e.puntos, stop: e.stop,
    mias: yo >= 0 ? e.resp[yo] : {}, todas: e.fase !== 'escribir' ? e.resp : null, listos: e.listos,
    vetos: e.fase === 'revisar' ? Object.fromEntries(Object.entries(e.vetos).map(([k, v]) => [k, Object.keys(v).map(Number)])) : null,
    tabla: e.tabla, ganadores: e.ganador,
  };
}
const turno = () => -1;
const fin = (e) => (e.ganador ? { ganadores: e.ganador, texto: `${Math.max(...e.puntos)} puntos en ${RONDAS} rondas` } : null);
const bot = () => null;
module.exports = { id: 'stop', min: 2, max: 10, sinCpu: true, nuevo, vista, accion, turno, fin, bot, tiempo, _: { valida } };
