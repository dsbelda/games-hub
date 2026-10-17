'use strict';
// Chinchón (2-5 jugadores, baraja española de 40). 7 cartas; en tu turno robas (del mazo o la de arriba
// del descarte) y tiras una. Combinaciones: tríos o cuartetos del mismo número, y escaleras de 3 o más del
// mismo palo (1-2-3-4-5-6-7-Sota-Caballo-Rey seguidos). Puedes cerrar al tirar si te queda como mucho una
// carta suelta de 5 puntos o menos. Al cerrar, cada uno suma sus cartas sueltas (figuras 10); quien cierra
// sin ninguna suelta resta 10. Chinchón (7 seguidas del mismo palo) gana la partida. Quien pasa de 100
// queda eliminado; gana el último que queda. Si el mazo se acaba por tercera vez en una mano, la mano se
// anula (sin puntos) y se reparte otra.
const { crear, barajar, id } = require('./baraja');
const ORDEN = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
const valor = (c) => (c.n >= 10 ? 10 : c.n);
const LIMITE = 100;
const PAUSA = 6000;

function nuevo(n, rnd) {
  const e = { n, puntos: Array(n).fill(0), fuera: Array(n).fill(false), mano0: 0, ronda: 0, ganador: -1, resumen: null, pausaHasta: 0, rnd: null };
  repartir(e, rnd || Math.random);
  return e;
}
function repartir(e, rnd = Math.random) {
  e.ronda++;
  e.mazo = barajar(crear(), rnd);
  e.manos = Array.from({ length: e.n }, () => []);
  for (let r = 0; r < 7; r++) for (let j = 0; j < e.n; j++) if (!e.fuera[j]) e.manos[j].push(e.mazo.pop());
  e.descarte = [e.mazo.pop()];
  // empieza el siguiente que siga en juego
  do { e.mano0 = (e.mano0 + 1) % e.n; } while (e.fuera[e.mano0]);
  e.turno = e.mano0; e.robado = false; e.resumen = null; e.ultima = null; e.vueltas = 0;
}

// todas las combinaciones válidas dentro de una mano (como listas de índices)
function combinaciones(mano) {
  const res = [];
  const porNum = {};
  mano.forEach((c, i) => (porNum[c.n] ||= []).push(i));
  for (const is of Object.values(porNum)) {
    if (is.length >= 3) {
      if (is.length === 4) res.push(is);
      for (let a = 0; a < is.length; a++) for (let b = a + 1; b < is.length; b++) for (let c = b + 1; c < is.length; c++) res.push([is[a], is[b], is[c]]);
    }
  }
  for (const p of ['oros', 'copas', 'espadas', 'bastos']) {
    const del = mano.map((c, i) => [c, i]).filter(([c]) => c.p === p).sort((x, y) => ORDEN.indexOf(x[0].n) - ORDEN.indexOf(y[0].n));
    for (let a = 0; a < del.length; a++) {
      const tramo = [del[a]];
      for (let b = a + 1; b < del.length; b++) {
        if (ORDEN.indexOf(del[b][0].n) !== ORDEN.indexOf(tramo[tramo.length - 1][0].n) + 1) break;
        tramo.push(del[b]);
        if (tramo.length >= 3) res.push(tramo.map((x) => x[1]));
      }
    }
  }
  return res;
}
// la mejor forma de combinar la mano: { sueltas: [índices], puntos, grupos }
function mejor(mano) {
  const combos = combinaciones(mano);
  let best = { usadas: 0, grupos: [] };
  let mejorPuntos = mano.reduce((s, c) => s + valor(c), 0);
  const total = mejorPuntos;
  (function buscar(desde, usadas, grupos, quitado) {
    const p = total - quitado;
    if (p < mejorPuntos || (p === mejorPuntos && grupos.length > best.grupos.length)) { mejorPuntos = p; best = { usadas, grupos: [...grupos] }; }
    for (let k = desde; k < combos.length; k++) {
      const cb = combos[k];
      if (cb.some((i) => usadas & (1 << i))) continue;
      let m = usadas; for (const i of cb) m |= 1 << i;
      buscar(k + 1, m, [...grupos, cb], quitado + cb.reduce((s, i) => s + valor(mano[i]), 0));
    }
  })(0, 0, [], 0);
  const sueltas = mano.map((_, i) => i).filter((i) => !(best.usadas & (1 << i)));
  return { sueltas, puntos: mejorPuntos, grupos: best.grupos };
}
const esChinchon = (mano) => mano.length === 7 && combinaciones(mano).some((cb) => cb.length === 7 && new Set(cb.map((i) => mano[i].p)).size === 1);
const puedeCerrar = (mano) => { const m = mejor(mano); return m.sueltas.length <= 1 && m.puntos <= 5; };

function robarMazo(e) {
  if (!e.mazo.length) { const top = e.descarte.pop(); e.mazo = barajar(e.descarte, Math.random); e.descarte = [top]; e.vueltas++; }
  return e.mazo.pop();
}
// tercera vez que se acaba el mazo: mano nula
function anular(e) {
  e.resumen = { quien: -1, nula: true, filas: [], eliminados: [] };
  e.pausaHasta = Date.now() + PAUSA;
  e.turno = -1;
  return { ok: true };
}
const vivos = (e) => e.fuera.map((f, i) => (f ? -1 : i)).filter((i) => i >= 0);

function accion(e, yo, a) {
  if (e.ganador >= 0) return { ok: false, error: 'La partida ha terminado' };
  if (a.tipo === 'seguir') { if (!e.resumen) return { ok: false, error: 'Nada que seguir' }; e.pausaHasta = 0; return siguienteRonda(e) ? { ok: true } : { ok: true }; }
  if (e.resumen) return { ok: false, error: 'Espera a la siguiente ronda' };
  if (e.turno !== yo) return { ok: false, error: 'No es tu turno' };
  const mano = e.manos[yo];
  if (a.tipo === 'robar') {
    if (e.robado) return { ok: false, error: 'Ya has robado' };
    if (a.de === 'descarte') { if (!e.descarte.length) return { ok: false, error: 'No hay descarte' }; mano.push(e.descarte.pop()); e.ultima = { j: yo, texto: 'coge del descarte', carta: mano[mano.length - 1] }; }
    else {
      if (!e.mazo.length && e.vueltas >= 2) return anular(e);
      mano.push(robarMazo(e)); e.ultima = { j: yo, texto: 'roba del mazo' };
    }
    e.robado = true;
    return { ok: true };
  }
  if (a.tipo === 'tirar' || a.tipo === 'cerrar') {
    if (!e.robado) return { ok: false, error: 'Primero roba una carta' };
    const i = mano.findIndex((c) => id(c) === a.carta);
    if (i < 0) return { ok: false, error: 'No tienes esa carta' };
    const carta = mano.splice(i, 1)[0];
    if (a.tipo === 'cerrar' && !puedeCerrar(mano)) { mano.splice(i, 0, carta); return { ok: false, error: 'Para cerrar te puede quedar como mucho una carta suelta de 5 o menos' }; }
    e.descarte.push(carta);
    e.robado = false;
    e.ultima = { j: yo, texto: a.tipo === 'cerrar' ? '¡cierra!' : 'tira', carta };
    if (a.tipo === 'cerrar') return cerrarRonda(e, yo);
    // siguiente jugador en juego
    do { e.turno = (e.turno + 1) % e.n; } while (e.fuera[e.turno]);
    return { ok: true };
  }
  return { ok: false, error: 'Acción desconocida' };
}
function cerrarRonda(e, quien) {
  const filas = [];
  for (const j of vivos(e)) {
    const m = mejor(e.manos[j]);
    let suma = m.puntos;
    let nota = '';
    if (j === quien) {
      if (esChinchon(e.manos[j])) { e.ganador = j; nota = '¡CHINCHÓN!'; }
      else if (m.sueltas.length === 0) { suma = -10; nota = 'cierra sin cartas sueltas (−10)'; }
      else nota = 'cierra';
    }
    e.puntos[j] += suma;
    filas.push({ j, suma, nota, grupos: m.grupos.map((g) => g.map((i) => e.manos[j][i])), sueltas: m.sueltas.map((i) => e.manos[j][i]) });
  }
  for (const j of vivos(e)) if (e.puntos[j] > LIMITE) e.fuera[j] = true;
  e.resumen = { quien, filas, eliminados: filas.filter((x) => e.fuera[x.j]).map((x) => x.j) };
  const quedan = vivos(e);
  if (e.ganador < 0 && quedan.length === 1) e.ganador = quedan[0];
  if (e.ganador < 0 && quedan.length === 0) e.ganador = filas.reduce((a, b) => (e.puntos[b.j] < e.puntos[a.j] ? b : a)).j;
  e.pausaHasta = Date.now() + PAUSA;
  e.turno = -1;
  return { ok: true };
}
function siguienteRonda(e) { if (e.ganador >= 0 || !e.resumen) return false; repartir(e); return true; }
function tiempo(e, ahora) { if (e.resumen && e.ganador < 0 && e.pausaHasta && ahora >= e.pausaHasta) return siguienteRonda(e); return false; }

function vista(e, yo) {
  const mano = yo >= 0 ? e.manos[yo] : [];
  const m = mano.length ? mejor(mano) : { sueltas: [], puntos: 0, grupos: [] };
  return {
    n: e.n, puntos: e.puntos, fuera: e.fuera, ronda: e.ronda, turno: e.turno, robado: e.robado, limite: LIMITE,
    mano, cartas: e.manos.map((x) => x.length), arriba: e.descarte[e.descarte.length - 1] || null, quedan: e.mazo.length,
    sueltas: m.sueltas.map((i) => id(mano[i])), sueltasPuntos: m.puntos,
    puedeCerrar: yo >= 0 && e.turno === yo && e.robado && mano.some((c, i) => puedeCerrar(mano.filter((_, k) => k !== i))),
    cierraCon: yo >= 0 && e.turno === yo && e.robado ? mano.filter((c, i) => puedeCerrar(mano.filter((_, k) => k !== i))).map(id) : [],
    ultima: e.ultima, resumen: e.resumen, pausaHasta: e.pausaHasta, ganador: e.ganador,
  };
}
const turno = (e) => (e.ganador >= 0 || e.resumen ? -1 : e.turno);
const fin = (e) => (e.ganador >= 0 ? { ganadores: [e.ganador], texto: e.resumen?.filas.some((f) => f.nota === '¡CHINCHÓN!') ? '¡Chinchón!' : 'Último jugador sin pasar de 100' } : null);

// --- CPU ----------------------------------------------------------------------------------------
function bot(e, yo, nivel, rnd) {
  if (turno(e) !== yo) return null;
  const mano = e.manos[yo];
  if (!e.robado) {
    const arriba = e.descarte[e.descarte.length - 1];
    if (arriba) {
      // ¿mejora la mano coger el descarte (tirando luego la peor carta)?
      const con = mejorTrasTirar([...mano, arriba]);
      const sin = mejor(mano).puntos;
      if (con.puntos < sin - (nivel === 'dificil' ? 1 : 3)) return { tipo: 'robar', de: 'descarte' };
    }
    return { tipo: 'robar', de: 'mazo' };
  }
  const t = mejorTrasTirar(mano);
  const carta = mano[t.i];
  const resto = mano.filter((_, k) => k !== t.i);
  if (puedeCerrar(resto) && (nivel === 'dificil' || t.puntos <= 3 || rnd() < 0.5)) return { tipo: 'cerrar', carta: id(carta) };
  if (nivel !== 'dificil' && rnd() < 0.08) { const r = mano[Math.floor(rnd() * mano.length)]; return { tipo: 'tirar', carta: id(r) }; }
  return { tipo: 'tirar', carta: id(carta) };
}
function mejorTrasTirar(mano) {
  let best = { i: 0, puntos: Infinity };
  mano.forEach((c, i) => { const p = mejor(mano.filter((_, k) => k !== i)).puntos - valor(c) * 0.01; if (p < best.puntos) best = { i, puntos: p }; });
  return best;
}

module.exports = { id: 'chinchon', min: 2, max: 5, nuevo, vista, accion, turno, fin, bot, tiempo, _: { mejor, combinaciones, esChinchon, puedeCerrar } };
