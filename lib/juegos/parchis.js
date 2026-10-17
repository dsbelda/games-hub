'use strict';
// Parchís (2-4 jugadores). Recorrido de 68 casillas en sentido de las agujas del reloj, pasillo de 7 y meta.
// Se sale con un 5. El 6 repite; si ya no tienes fichas en casa, el 6 cuenta como 7. Tres seises seguidos:
// la última ficha movida vuelve a casa. Comer da 20 casillas de premio y llegar a meta, 10. Dos fichas del
// mismo color en una casilla son barrera: nadie pasa (con un 6 hay que abrirla si se puede). En los seguros
// no se come. Al salir con un 5, si en tu salida ya hay dos fichas y alguna es de otro, te la comes.
// Gana quien mete antes sus 4 fichas.

// colores por asiento: con 2 jugadores, enfrentados
const COLORES = ['amarillo', 'azul', 'rojo', 'verde'];
const BRAZO = { amarillo: 2, azul: 3, rojo: 0, verde: 1 }; // brazo de la cruz: 0 arriba, 1 derecha, 2 abajo, 3 izquierda
const ENTRADA = [8, 25, 42, 59]; // casilla (del recorrido) donde cada brazo entra a su pasillo
const salidaDe = (brazo) => (ENTRADA[brazo] + 5) % 68;
const SEGUROS = new Set(ENTRADA.flatMap((en) => [en, (en + 5) % 68, (en + 12) % 68]));
const META = 71;

function nuevo(n) {
  const colores = n === 2 ? ['amarillo', 'rojo'] : COLORES.slice(0, n);
  return {
    n, colores, fichas: colores.map(() => [-1, -1, -1, -1]), turno: 0, dado: null, pendiente: null, seises: 0,
    ultimaMovida: null, ganador: -1, log: [], ultimoMov: null,
  };
}
const brazoDe = (e, j) => BRAZO[e.colores[j]];
// casilla absoluta del recorrido para un progreso (0..63); null en casa, pasillo o meta
const casilla = (e, j, p) => (p >= 0 && p <= 63 ? (salidaDe(brazoDe(e, j)) + p) % 68 : null);
// ocupantes de una casilla del recorrido: [{ j, f }]
function ocupantes(e, t) {
  const r = [];
  e.fichas.forEach((fs, j) => fs.forEach((p, f) => { if (casilla(e, j, p) === t) r.push({ j, f }); }));
  return r;
}
const enPasillo = (e, j, p) => e.fichas[j].filter((x) => x === p).length;
const esBarrera = (e, t) => { const o = ocupantes(e, t); return o.length === 2 && o[0].j === o[1].j; };

// destino de mover la ficha f del jugador j `v` casillas; null si no se puede
function destino(e, j, f, v, conDado) {
  const p = e.fichas[j][f];
  if (p === META) return null;
  if (p === -1) {
    if (!(conDado && v === 5)) return null;
    const t = salidaDe(brazoDe(e, j));
    const o = ocupantes(e, t);
    if (o.length >= 2 && o.every((x) => x.j === j)) return null;
    return { p: 0, come: o.length >= 2 ? o.filter((x) => x.j !== j).pop() : null };
  }
  const q = p + v;
  if (q > META) return null;
  // no se puede pasar por una barrera (ni caer en ella)
  for (let k = p + 1; k <= Math.min(q, 63); k++) if (esBarrera(e, casilla(e, j, k))) return null;
  if (q <= 63) {
    const t = casilla(e, j, q);
    const o = ocupantes(e, t);
    if (o.length >= 2) return null;
    const rival = o.find((x) => x.j !== j);
    if (rival && !SEGUROS.has(t)) return { p: q, come: rival };
    return { p: q, come: null };
  }
  if (q < META && enPasillo(e, j, q) >= 2) return null;
  return { p: q, come: null };
}
function movimientos(e, j = e.turno) {
  if (!e.pendiente) return [];
  const { valor, tipo } = e.pendiente;
  let ms = [];
  for (let f = 0; f < 4; f++) { const d = destino(e, j, f, valor, tipo === 'dado'); if (d) ms.push({ f, ...d }); }
  if (tipo === 'dado' && valor === 5 && ms.some((m) => e.fichas[j][m.f] === -1)) ms = ms.filter((m) => e.fichas[j][m.f] === -1); // obligado a sacar
  if (tipo === 'dado' && (valor === 6 || valor === 7)) {
    // obligado a abrir barrera propia si se puede
    const abre = ms.filter((m) => { const t = casilla(e, j, e.fichas[j][m.f]); return t !== null && esBarrera(e, t); });
    if (abre.length) ms = abre;
  }
  return ms;
}

function terminarTurno(e, repetir) {
  e.pendiente = null; e.dado = repetir ? null : e.dado;
  if (!repetir) { e.turno = (e.turno + 1) % e.n; e.seises = 0; e.ultimaMovida = null; }
}
// tras cualquier movimiento: ¿hay premio? ¿se repite?
function despues(e, j) {
  if (e.fichas[j].every((p) => p === META)) { e.ganador = j; e.pendiente = null; return; }
  if (e.premios.length) {
    const v = e.premios.shift();
    e.pendiente = { tipo: 'premio', valor: v };
    if (movimientos(e, j).length) return;
    e.log.push(`${e.colores[j]} pierde el premio de ${v}: no puede mover`);
    e.premios = [];
  }
  terminarTurno(e, e.repetir);
}

function accion(e, yo, a) {
  if (e.ganador >= 0) return { ok: false, error: 'La partida ha terminado' };
  if (e.turno !== yo) return { ok: false, error: 'No es tu turno' };
  if (a.tipo === 'tirar') {
    if (e.pendiente) return { ok: false, error: 'Ya has tirado: mueve una ficha' };
    let v = 1 + Math.floor(Math.random() * 6);
    e.dado = v;
    e.ultimoMov = null;
    const seis = v === 6;
    e.seises = seis ? e.seises + 1 : 0;
    if (seis && e.fichas[yo].every((p) => p !== -1)) v = 7;
    if (e.seises === 3) {
      // tercer seis: la última ficha movida vuelve a casa (si no está en el pasillo ni en meta)
      const f = e.ultimaMovida;
      if (f !== null && e.fichas[yo][f] >= 0 && e.fichas[yo][f] <= 63) { e.fichas[yo][f] = -1; e.log.push(`${e.colores[yo]}: tres seises, ficha a casa`); }
      e.ultimoMov = { j: yo, tresSeises: true };
      terminarTurno(e, false);
      return { ok: true };
    }
    e.repetir = seis;
    e.premios = [];
    e.pendiente = { tipo: 'dado', valor: v };
    if (!movimientos(e, yo).length) { terminarTurno(e, seis); }
    return { ok: true };
  }
  if (a.tipo !== 'mover') return { ok: false, error: 'Acción desconocida' };
  const m = movimientos(e, yo).find((x) => x.f === Number(a.ficha));
  if (!m) return { ok: false, error: 'Esa ficha no puede moverse' };
  const desde = e.fichas[yo][m.f];
  e.fichas[yo][m.f] = m.p;
  e.ultimaMovida = m.f;
  e.ultimoMov = { j: yo, f: m.f, desde, hasta: m.p, come: m.come || null, valor: e.pendiente.valor, tipo: e.pendiente.tipo };
  if (m.come) { e.fichas[m.come.j][m.come.f] = -1; e.premios.push(20); e.log.push(`${e.colores[yo]} se come una ficha ${e.colores[m.come.j]}`); }
  if (m.p === META) { e.premios.push(10); e.log.push(`${e.colores[yo]} mete una ficha en meta`); }
  if (e.log.length > 30) e.log.splice(0, e.log.length - 30);
  despues(e, yo);
  return { ok: true };
}

function vista(e, yo) {
  const mio = yo >= 0 && e.turno === yo;
  return {
    n: e.n, colores: e.colores, fichas: e.fichas, turno: e.turno, dado: e.dado, pendiente: e.pendiente, ganador: e.ganador,
    ultimoMov: e.ultimoMov, log: e.log.slice(-6), brazos: e.colores.map((c) => BRAZO[c]),
    puedeTirar: mio && !e.pendiente && e.ganador < 0,
    mueven: mio && e.pendiente ? movimientos(e, yo).map((m) => ({ f: m.f, p: m.p, come: !!m.come })) : [],
  };
}
const turno = (e) => (e.ganador >= 0 ? -1 : e.turno);
const fin = (e) => (e.ganador >= 0 ? { ganadores: [e.ganador], texto: 'Ha metido sus cuatro fichas' } : null);

// --- CPU ----------------------------------------------------------------------------------------
function peligro(e, j, p) {
  // ¿alguna ficha rival podría caer aquí con un dado de 1 a 6 (o 7)?
  const t = casilla(e, j, p);
  if (t === null || SEGUROS.has(t)) return 0;
  let n = 0;
  e.fichas.forEach((fs, k) => { if (k === j) return; fs.forEach((q) => { const tq = casilla(e, k, q); if (tq === null) return; const d = (t - tq + 68) % 68; if (d >= 1 && d <= 7) n++; }); });
  return n;
}
function bot(e, yo, nivel, rnd) {
  if (turno(e) !== yo) return null;
  if (!e.pendiente) return { tipo: 'tirar' };
  const ms = movimientos(e, yo);
  if (!ms.length) return null;
  if (nivel !== 'dificil' && rnd() < 0.15) return { tipo: 'mover', ficha: ms[Math.floor(rnd() * ms.length)].f };
  let mejor = null, mejorV = -Infinity;
  for (const m of ms) {
    const desde = e.fichas[yo][m.f];
    let v = m.p - Math.max(desde, 0) * 0.2;
    if (m.come) v += 100;
    if (m.p === META) v += 80;
    if (m.p > 63 && desde <= 63) v += 40; // entra al pasillo: a salvo
    if (desde === -1) v += 30;
    const t = casilla(e, yo, m.p);
    if (t !== null && SEGUROS.has(t)) v += 15;
    if (nivel === 'dificil') { v -= peligro(e, yo, m.p) * 25; if (desde >= 0 && desde <= 63) v += peligro(e, yo, desde) * 20; }
    v += rnd() * 2;
    if (v > mejorV) { mejorV = v; mejor = m; }
  }
  return { tipo: 'mover', ficha: mejor.f };
}

module.exports = { id: 'parchis', min: 2, max: 4, nuevo, vista, accion, turno, fin, bot, _: { movimientos, casilla, salidaDe, SEGUROS, ENTRADA, BRAZO, destino, META } };
