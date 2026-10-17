'use strict';
// Mus a 8 reyes (los treses son reyes y los doses, ases), 4 jugadores por parejas (0+2 contra 1+3).
// 1) Mus: empezando por la mano, cada uno dice «mus» o «no hay mus». Si todos piden mus, cada uno descarta
//    de 1 a 4 cartas y roba otras tantas, y vuelta a empezar. 2) Lances: grande, chica, pares y juego
//    (o punto si nadie tiene juego). En cada lance: paso, envido (2 o más), órdago; la otra pareja quiere,
//    no quiere o reenvida. 3) Conteo al final de la mano. Gana la primera pareja que llega a 40 piedras.
const { crear, barajar, id } = require('./baraja');
const META = 40;
const PAUSA = 9000;
const LANCES = ['grande', 'chica', 'pares', 'juego'];

// valor de una carta en el mus a 8 reyes
const rango = (c) => (c.n === 3 ? 12 : c.n === 2 ? 1 : c.n);
const puntosJuego = (c) => (c.n >= 10 || c.n === 3 ? 10 : c.n === 2 ? 1 : c.n);
const ORDEN_GRANDE = [12, 11, 10, 7, 6, 5, 4, 1];
const fuerzaG = (r) => 8 - ORDEN_GRANDE.indexOf(r); // más alto = mejor para la grande

function sumaJuego(m) { return m.reduce((s, c) => s + puntosJuego(c), 0); }
const ORDEN_JUEGO = [31, 32, 40, 37, 36, 35, 34, 33];
function pares(m) {
  const cuenta = {};
  for (const c of m) cuenta[rango(c)] = (cuenta[rango(c)] || 0) + 1;
  const g = Object.entries(cuenta).map(([r, n]) => [n, +r]).sort((a, b) => b[0] - a[0] || fuerzaG(b[1]) - fuerzaG(a[1]));
  if (g[0][0] === 4) return { tipo: 3, nombre: 'duples', rangos: [g[0][1], g[0][1]] };
  if (g[0][0] === 2 && g[1] && g[1][0] === 2) return { tipo: 3, nombre: 'duples', rangos: [g[0][1], g[1][1]].sort((a, b) => fuerzaG(b) - fuerzaG(a)) };
  if (g[0][0] === 3) return { tipo: 2, nombre: 'medias', rangos: [g[0][1]] };
  if (g[0][0] === 2) return { tipo: 1, nombre: 'pareja', rangos: [g[0][1]] };
  return null;
}
// compara dos manos en un lance: >0 si a es mejor
function comparar(lance, a, b) {
  if (lance === 'grande') { const x = a.map(rango).sort((p, q) => fuerzaG(q) - fuerzaG(p)), y = b.map(rango).sort((p, q) => fuerzaG(q) - fuerzaG(p)); for (let i = 0; i < 4; i++) { const d = fuerzaG(x[i]) - fuerzaG(y[i]); if (d) return d; } return 0; }
  if (lance === 'chica') { const x = a.map(rango).sort((p, q) => fuerzaG(p) - fuerzaG(q)), y = b.map(rango).sort((p, q) => fuerzaG(p) - fuerzaG(q)); for (let i = 0; i < 4; i++) { const d = fuerzaG(y[i]) - fuerzaG(x[i]); if (d) return d; } return 0; }
  if (lance === 'pares') { const x = pares(a), y = pares(b); if (!x || !y) return (x ? 1 : 0) - (y ? 1 : 0); if (x.tipo !== y.tipo) return x.tipo - y.tipo; for (let i = 0; i < x.rangos.length; i++) { const d = fuerzaG(x.rangos[i]) - fuerzaG(y.rangos[i]); if (d) return d; } return 0; }
  if (lance === 'juego') { const x = sumaJuego(a), y = sumaJuego(b); return ORDEN_JUEGO.indexOf(y) - ORDEN_JUEGO.indexOf(x); }
  if (lance === 'punto') return sumaJuego(a) - sumaJuego(b);
  return 0;
}
const equipo = (j) => j % 2;

function nuevo(n, rnd) {
  const e = { piedras: [0, 0], mano: 0, ganador: -1, manoN: 0, resumen: null, pausaHasta: 0 };
  repartir(e, rnd || Math.random);
  return e;
}
function repartir(e, rnd = Math.random) {
  e.manoN++;
  e.mazo = barajar(crear(), rnd);
  e.descartes = [];
  e.manos = [0, 1, 2, 3].map(() => [e.mazo.pop(), e.mazo.pop(), e.mazo.pop(), e.mazo.pop()]);
  e.fase = 'mus'; e.turno = e.mano; e.dijo = [null, null, null, null];
  e.descartado = [false, false, false, false];
  e.lances = {}; e.lance = null; e.resumen = null; e.ordago = null;
}
const ordenDesde = (e, desde = e.mano) => [0, 1, 2, 3].map((k) => (desde + k) % 4);
// ¿quién gana un lance? (con empate, el más cercano a la mano)
function mejorDe(e, lance, jugadores) {
  let g = null;
  for (const j of ordenDesde(e)) if (jugadores.includes(j) && (g === null || comparar(lance, e.manos[j], e.manos[g]) > 0)) g = j;
  return g;
}
const tieneJuego = (m) => sumaJuego(m) >= 31;
// quién habla en cada lance
function hablan(e, lance) {
  if (lance === 'pares') return ordenDesde(e).filter((j) => pares(e.manos[j]));
  if (lance === 'juego') return e.hayJuego ? ordenDesde(e).filter((j) => tieneJuego(e.manos[j])) : ordenDesde(e);
  return ordenDesde(e);
}

function empezarLance(e, k) {
  if (k >= LANCES.length) return conteo(e);
  const lance = LANCES[k];
  e.lanceIdx = k;
  e.lance = lance === 'juego' && !e.hayJuego ? 'punto' : lance;
  const quienes = hablan(e, lance);
  const equipos = new Set(quienes.map(equipo));
  e.lances[e.lance] = { estado: 'paso', cantidad: 0, quienes };
  // si en pares o juego solo una pareja (o nadie) lleva jugada, no se apuesta
  if ((lance === 'pares' || (lance === 'juego' && e.hayJuego)) && equipos.size < 2) { e.lances[e.lance].estado = quienes.length ? 'sin apuesta' : 'nadie'; return empezarLance(e, k + 1); }
  e.apuesta = null; // { cantidad, anterior, equipo }
  e.hablaron = [];
  e.turno = quienes[0];
}
// siguiente que habla en el lance actual (o cierra el lance)
function siguienteHablar(e) {
  const quienes = e.lances[e.lance].quienes;
  if (!e.apuesta) {
    const resto = quienes.filter((j) => !e.hablaron.includes(j));
    if (!resto.length) { e.lances[e.lance].estado = 'en paso'; return empezarLance(e, e.lanceIdx + 1); }
    e.turno = resto[0];
    return;
  }
  // con apuesta: contesta la pareja contraria, por orden
  const contesta = quienes.filter((j) => equipo(j) !== e.apuesta.equipo && !e.hablaron.includes(j));
  if (!contesta.length) {
    // nadie quiere: la pareja que envidó cobra lo anterior
    const ganan = e.apuesta.equipo;
    sumar(e, ganan, e.apuesta.anterior);
    e.lances[e.lance] = { ...e.lances[e.lance], estado: 'no querido', cantidad: e.apuesta.anterior, ganaEquipo: ganan };
    if (e.ganador >= 0) return;
    return empezarLance(e, e.lanceIdx + 1);
  }
  e.turno = contesta[0];
}
function sumar(e, eq, n) {
  e.piedras[eq] += n;
  if (e.piedras[eq] >= META && e.ganador < 0) { e.ganador = eq; e.fase = 'fin'; e.turno = -1; e.pausaHasta = 0; }
}

function accion(e, yo, a) {
  if (e.ganador >= 0) return { ok: false, error: 'La partida ha terminado' };
  if (a.tipo === 'seguir') { if (e.fase !== 'resumen') return { ok: false, error: 'La mano sigue' }; return siguienteMano(e); }
  if (e.fase === 'descarte') {
    if (a.tipo !== 'descartar') return { ok: false, error: 'Ahora toca descartarse' };
    if (e.descartado[yo]) return { ok: false, error: 'Ya te has descartado' };
    const cartas = Array.isArray(a.cartas) ? a.cartas : [];
    const idx = cartas.map((x) => e.manos[yo].findIndex((c) => id(c) === x));
    if (!idx.length || idx.length > 4 || idx.some((i) => i < 0) || new Set(idx).size !== idx.length) return { ok: false, error: 'Elige de 1 a 4 cartas para descartarte' };
    e.descartado[yo] = idx;
    if (e.descartado.every(Boolean)) {
      for (const j of ordenDesde(e)) {
        const quita = e.descartado[j].sort((x, y) => y - x);
        for (const i of quita) e.descartes.push(e.manos[j].splice(i, 1)[0]);
        for (let k = 0; k < quita.length; k++) { if (!e.mazo.length) { e.mazo = barajar(e.descartes, Math.random); e.descartes = []; } e.manos[j].push(e.mazo.pop()); }
      }
      e.descartado = [false, false, false, false];
      e.fase = 'mus'; e.turno = e.mano; e.dijo = [null, null, null, null];
    }
    return { ok: true };
  }
  if (e.turno !== yo) return { ok: false, error: 'No es tu turno' };
  if (e.fase === 'mus') {
    if (a.tipo === 'mus') {
      e.dijo[yo] = 'mus';
      if (ordenDesde(e).every((j) => e.dijo[j] === 'mus')) { e.fase = 'descarte'; e.turno = -1; return { ok: true }; }
      e.turno = (yo + 1) % 4;
      return { ok: true };
    }
    if (a.tipo === 'cortar') {
      e.dijo[yo] = 'no hay mus';
      e.fase = 'lances';
      e.hayJuego = e.manos.some(tieneJuego);
      e.declaraciones = e.manos.map((m) => ({ pares: !!pares(m), juego: tieneJuego(m) }));
      empezarLance(e, 0);
      return { ok: true };
    }
    return { ok: false, error: 'Di «mus» o «no hay mus»' };
  }
  if (e.fase !== 'lances') return { ok: false, error: 'Ahora no' };
  const L = e.lances[e.lance];
  const eq = equipo(yo);
  if (a.tipo === 'paso' || a.tipo === 'noquiero') {
    if (a.tipo === 'paso' && e.apuesta) return { ok: false, error: 'Hay un envite: quiere o no quiere' };
    if (a.tipo === 'noquiero' && !e.apuesta) return { ok: false, error: 'No hay envite' };
    e.hablaron.push(yo); e.dijo[yo] = a.tipo === 'paso' ? 'paso' : 'no quiero';
    return siguienteHablar(e) || { ok: true };
  }
  if (a.tipo === 'quiero') {
    if (!e.apuesta) return { ok: false, error: 'No hay envite' };
    e.dijo[yo] = 'quiero';
    if (e.apuesta.ordago) {
      // órdago querido: se enseñan las cartas y quien gane el lance gana la partida
      const g = mejorDe(e, e.lance, L.quienes);
      e.ordago = { lance: e.lance, gana: g };
      e.lances[e.lance] = { ...L, estado: 'órdago', ganaEquipo: equipo(g) };
      e.resumen = { filas: [{ lance: e.lance, texto: `Órdago a ${e.lance} querido: gana ${['la pareja 1', 'la pareja 2'][equipo(g)]}`, equipo: equipo(g), piedras: META }], manos: e.manos };
      sumar(e, equipo(g), META);
      return { ok: true };
    }
    e.lances[e.lance] = { ...L, estado: 'querido', cantidad: e.apuesta.cantidad };
    empezarLance(e, e.lanceIdx + 1);
    return { ok: true };
  }
  if (a.tipo === 'envido' || a.tipo === 'ordago') {
    if (e.apuesta && e.apuesta.ordago) return { ok: false, error: 'Contra un órdago solo se quiere o no se quiere' };
    if (e.apuesta && e.apuesta.equipo === eq) return { ok: false, error: 'Tu pareja ya ha envidado' };
    const mas = a.tipo === 'ordago' ? 0 : Math.max(2, Math.min(30, Math.floor(Number(a.cantidad) || 2)));
    const anterior = e.apuesta ? e.apuesta.cantidad : 1;
    const cantidad = e.apuesta ? e.apuesta.cantidad + mas : mas;
    e.apuesta = { cantidad: a.tipo === 'ordago' ? META : cantidad, anterior, equipo: eq, ordago: a.tipo === 'ordago' };
    e.dijo[yo] = a.tipo === 'ordago' ? '¡ÓRDAGO!' : e.apuesta.anterior > 1 ? `envido ${mas} más` : `envido ${mas}`;
    // tras un envite, vuelve a hablar la otra pareja entera
    e.hablaron = L.quienes.filter((j) => equipo(j) === eq);
    siguienteHablar(e);
    return { ok: true };
  }
  return { ok: false, error: 'Acción desconocida' };
}

function conteo(e) {
  const filas = [];
  const todos = [0, 1, 2, 3];
  const paga = (lance, eqGana, n, texto) => { if (n > 0) { filas.push({ lance, equipo: eqGana, piedras: n, texto }); } };
  for (const lance of ['grande', 'chica', 'pares', e.hayJuego ? 'juego' : 'punto']) {
    const L = e.lances[lance];
    if (!L || L.estado === 'nadie') continue;
    const quienes = lance === 'pares' ? todos.filter((j) => pares(e.manos[j])) : lance === 'juego' ? todos.filter((j) => tieneJuego(e.manos[j])) : todos;
    if (!quienes.length) continue;
    const g = L.estado === 'no querido' ? null : mejorDe(e, lance, quienes);
    const eqG = L.estado === 'no querido' ? L.ganaEquipo : equipo(g);
    if (L.estado === 'querido') paga(lance, eqG, L.cantidad, `envite querido`);
    if (L.estado === 'en paso' && (lance === 'grande' || lance === 'chica' || lance === 'punto')) paga(lance, eqG, 1, 'en paso');
    if (lance === 'punto' && L.estado === 'querido') paga(lance, eqG, 1, 'punto');
    if (lance === 'pares') { const v = todos.filter((j) => equipo(j) === eqG && pares(e.manos[j])).reduce((s, j) => s + pares(e.manos[j]).tipo, 0); paga(lance, eqG, v, 'tantos de pares'); }
    if (lance === 'juego') { const v = todos.filter((j) => equipo(j) === eqG && tieneJuego(e.manos[j])).reduce((s, j) => s + (sumaJuego(e.manos[j]) === 31 ? 3 : 2), 0); paga(lance, eqG, v, 'tantos de juego'); }
  }
  e.resumen = { filas, manos: e.manos.map((m) => m.slice()) };
  // se cuenta por orden: si una pareja llega a 40 durante el conteo, gana
  for (const f of filas) { sumar(e, f.equipo, f.piedras); if (e.ganador >= 0) break; }
  if (e.ganador < 0) { e.fase = 'resumen'; e.turno = -1; e.pausaHasta = Date.now() + PAUSA; }
}
function siguienteMano(e) { e.mano = (e.mano + 1) % 4; repartir(e); return { ok: true }; }
function tiempo(e, ahora) { if (e.fase === 'resumen' && e.ganador < 0 && ahora >= e.pausaHasta) { siguienteMano(e); return true; } return false; }

function vista(e, yo) {
  const L = e.lance ? e.lances[e.lance] : null;
  const mio = yo >= 0 && e.turno === yo;
  const enseñar = e.fase === 'resumen' || e.ganador >= 0 || !!e.ordago;
  return {
    piedras: e.piedras, meta: META, mano: e.mano, fase: e.fase, turno: e.turno, dijo: e.dijo, manoN: e.manoN,
    misCartas: yo >= 0 ? e.manos[yo] : [], todas: enseñar ? e.manos : null,
    lance: e.lance, lances: e.lances, apuesta: e.apuesta && e.fase === 'lances' ? e.apuesta : null,
    declaraciones: e.fase === 'lances' || enseñar ? e.declaraciones : null, hayJuego: e.hayJuego,
    yaDescartado: yo >= 0 ? !!e.descartado[yo] : false, descartados: e.descartado.map(Boolean),
    resumen: e.resumen, pausaHasta: e.pausaHasta, ganador: e.ganador, ordago: e.ordago,
    miJugada: yo >= 0 ? { pares: pares(e.manos[yo])?.nombre || null, juego: sumaJuego(e.manos[yo]) } : null,
    puede: mio && e.fase === 'lances' ? { envidar: !e.apuesta || (!e.apuesta.ordago && e.apuesta.equipo !== equipo(yo)), contestar: !!e.apuesta && e.apuesta.equipo !== equipo(yo) } : null,
  };
}
const turno = (e) => (e.ganador >= 0 || e.fase === 'resumen' ? -1 : e.fase === 'descarte' ? -1 : e.turno);
const fin = (e) => (e.ganador >= 0 ? { ganadores: [0, 1, 2, 3].filter((j) => equipo(j) === e.ganador), texto: e.ordago ? '¡Órdago ganado!' : `Primera pareja en llegar a ${META} piedras` } : null);

// --- CPU ----------------------------------------------------------------------------------------
function fuerzaLance(e, j, lance) {
  const m = e.manos[j];
  const rs = m.map(rango);
  const mano = j === e.mano ? 0.05 : 0;
  if (lance === 'grande') { const reyes = rs.filter((r) => r === 12).length; return Math.min(1, reyes * 0.28 + rs.filter((r) => r === 11 || r === 10).length * 0.06 + mano); }
  if (lance === 'chica') { const ases = rs.filter((r) => r === 1).length; return Math.min(1, ases * 0.28 + rs.filter((r) => r === 4 || r === 5).length * 0.06 + mano); }
  if (lance === 'pares') { const p = pares(m); if (!p) return 0; return Math.min(1, [0, 0.35, 0.65, 0.85][p.tipo] + fuerzaG(p.rangos[0]) * 0.015 + mano); }
  if (lance === 'juego') { const s = sumaJuego(m); return s === 31 ? 0.95 : s === 32 ? 0.75 : s === 40 ? 0.6 : s >= 31 ? 0.45 : 0; }
  return Math.min(1, sumaJuego(m) / 32 + mano); // punto
}
function bot(e, yo, nivel, rnd) {
  if (e.ganador >= 0) return null;
  const dif = nivel === 'dificil';
  if (e.fase === 'descarte') {
    if (e.descartado[yo]) return null;
    const m = e.manos[yo];
    const p = pares(m);
    let quitar = m.filter((c) => { const r = rango(c); if (p && p.rangos.includes(r)) return false; return !(r === 12 || (dif && r === 1 && m.filter((x) => rango(x) === 1).length >= 2)); });
    if (!quitar.length) quitar = [m.reduce((a, b) => (fuerzaG(rango(b)) < fuerzaG(rango(a)) ? b : a))];
    return { tipo: 'descartar', cartas: quitar.slice(0, 4).map(id) };
  }
  if (e.turno !== yo) return null;
  if (e.fase === 'mus') {
    const f = Math.max(...['grande', 'chica', 'pares', 'juego'].map((l) => fuerzaLance(e, yo, l)));
    return f > (dif ? 0.7 : 0.8) || rnd() < 0.08 ? { tipo: 'cortar' } : { tipo: 'mus' };
  }
  if (e.fase !== 'lances') return null;
  const f = fuerzaLance(e, yo, e.lance) + (rnd() - 0.5) * (dif ? 0.1 : 0.25);
  if (!e.apuesta) {
    if (f > 0.97 && rnd() < (dif ? 0.4 : 0.15)) return { tipo: 'ordago' };
    if (f > 0.7) return { tipo: 'envido', cantidad: f > 0.85 ? 3 : 2 };
    if (rnd() < (dif ? 0.06 : 0.03)) return { tipo: 'envido', cantidad: 2 }; // farol
    return { tipo: 'paso' };
  }
  if (e.apuesta.equipo === equipo(yo)) return { tipo: 'paso' };
  if (e.apuesta.ordago) return f > (dif ? 0.82 : 0.88) ? { tipo: 'quiero' } : { tipo: 'noquiero' };
  if (f > 0.9 && e.apuesta.cantidad < 10 && rnd() < 0.5) return { tipo: 'envido', cantidad: 2 };
  return f > 0.6 - Math.min(0.15, 1 / (e.apuesta.cantidad + 2)) ? { tipo: 'quiero' } : { tipo: 'noquiero' };
}

module.exports = { id: 'mus', min: 4, max: 4, nuevo, vista, accion, turno, fin, bot, tiempo, _: { pares, comparar, sumaJuego, rango } };
