'use strict';
// Póquer Texas Hold'em con fichas de mentira (sin dinero). 2-8 jugadores, 1000 fichas cada uno,
// ciegas 10/20 que suben cada 8 manos. Botes paralelos cuando alguien va con todo. Quien se queda sin
// fichas queda fuera; gana el último. Baraja francesa de 52.
const PALOS = ['♠', '♥', '♦', '♣'];
const NOMBRE_JUGADA = ['Carta alta', 'Pareja', 'Doble pareja', 'Trío', 'Escalera', 'Color', 'Full', 'Póquer', 'Escalera de color'];
const FICHAS = 1000;
const PAUSA = 7000;
const SUBIDA_CADA = 8;
const config = { sims: 0 }; // las pruebas lo bajan para ir rápido

function barajar(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const nuevaBaraja = (rnd) => { const m = []; for (const s of PALOS) for (let r = 2; r <= 14; r++) m.push({ r, s }); return barajar(m, rnd); };

// --- evaluación de manos: devuelve [categoría, desempates...] (mayor es mejor) ---------------------
function eval5(cs) {
  const rs = cs.map((c) => c.r).sort((a, b) => b - a);
  const color = cs.every((c) => c.s === cs[0].s);
  const unicos = [...new Set(rs)];
  let escalera = 0;
  if (unicos.length === 5) { if (rs[0] - rs[4] === 4) escalera = rs[0]; else if (rs.join() === '14,5,4,3,2') escalera = 5; }
  const cuenta = {}; for (const r of rs) cuenta[r] = (cuenta[r] || 0) + 1;
  const grupos = Object.entries(cuenta).map(([r, n]) => [n, +r]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  if (escalera && color) return [8, escalera];
  if (grupos[0][0] === 4) return [7, grupos[0][1], grupos[1][1]];
  if (grupos[0][0] === 3 && grupos[1][0] === 2) return [6, grupos[0][1], grupos[1][1]];
  if (color) return [5, ...rs];
  if (escalera) return [4, escalera];
  if (grupos[0][0] === 3) return [3, grupos[0][1], ...grupos.slice(1).map((g) => g[1])];
  if (grupos[0][0] === 2 && grupos[1][0] === 2) return [2, grupos[0][1], grupos[1][1], grupos[2][1]];
  if (grupos[0][0] === 2) return [1, grupos[0][1], ...grupos.slice(1).map((g) => g[1])];
  return [0, ...rs];
}
const comparar = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; };
function mejorMano(cs) {
  let best = null, mejores = null;
  const n = cs.length;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++) {
    const cinco = [cs[a], cs[b], cs[c], cs[d], cs[e]];
    const v = eval5(cinco);
    if (!best || comparar(v, best) > 0) { best = v; mejores = cinco; }
  }
  return { valor: best, cartas: mejores, nombre: best[0] === 8 && best[1] === 14 ? 'Escalera real' : NOMBRE_JUGADA[best[0]] };
}

function nuevo(n, rnd) {
  const e = { n, fichas: Array(n).fill(FICHAS), fuera: Array(n).fill(false), boton: -1, manos: 0, cp: 10, cg: 20, ganador: -1, resumen: null, pausaHasta: 0, rnd };
  empezarMano(e, rnd);
  return e;
}
const enJuego = (e) => e.fichas.map((f, i) => (!e.fuera[i] ? i : -1)).filter((i) => i >= 0);
const siguiente = (e, i, cond) => { for (let k = 1; k <= e.n; k++) { const j = (i + k) % e.n; if (cond(j)) return j; } return -1; };

function empezarMano(e, rnd = Math.random) {
  e.manos++;
  if (e.manos > 1 && (e.manos - 1) % SUBIDA_CADA === 0) { e.cg = Math.round(e.cg * 1.5 / 10) * 10; e.cp = e.cg / 2; }
  e.mazo = nuevaBaraja(rnd);
  e.cartas = Array.from({ length: e.n }, (_, j) => (e.fuera[j] ? [] : [e.mazo.pop(), e.mazo.pop()]));
  e.mesa = []; e.fase = 'preflop'; e.resumen = null;
  e.puesto = Array(e.n).fill(0); e.total = Array(e.n).fill(0);
  e.retirado = e.fuera.map((f) => f); e.todo = Array(e.n).fill(false); e.actuado = Array(e.n).fill(false);
  e.dijo = Array(e.n).fill(null);
  e.boton = siguiente(e, e.boton, (j) => !e.fuera[j]);
  const vivos = enJuego(e);
  const cp = vivos.length === 2 ? e.boton : siguiente(e, e.boton, (j) => !e.fuera[j]);
  const cg = siguiente(e, cp, (j) => !e.fuera[j]);
  poner(e, cp, e.cp); e.dijo[cp] = `ciega ${e.cp}`;
  poner(e, cg, e.cg); e.dijo[cg] = `ciega ${e.cg}`;
  e.maximo = e.cg; e.minSubida = e.cg;
  e.turno = siguiente(e, cg, (j) => puedeActuar(e, j));
  if (e.turno < 0 || soloQuedaUno(e)) avanzar(e);
}
function poner(e, j, cantidad) {
  const c = Math.min(cantidad, e.fichas[j]);
  e.fichas[j] -= c; e.puesto[j] += c; e.total[j] += c;
  if (!e.fichas[j]) e.todo[j] = true;
  return c;
}
const puedeActuar = (e, j) => !e.retirado[j] && !e.todo[j] && !e.fuera[j];
const activos = (e) => e.retirado.map((r, i) => (!r ? i : -1)).filter((i) => i >= 0);
const soloQuedaUno = (e) => activos(e).length === 1;
const bote = (e) => e.total.reduce((a, b) => a + b, 0);

function rondaTerminada(e) {
  const pueden = e.retirado.map((r, j) => j).filter((j) => puedeActuar(e, j));
  if (!pueden.length) return true;
  if (pueden.length === 1 && e.puesto[pueden[0]] >= e.maximo) return true;
  return pueden.every((j) => e.actuado[j] && e.puesto[j] === e.maximo);
}
function avanzar(e) {
  if (soloQuedaUno(e)) return terminarMano(e);
  if (!rondaTerminada(e)) { e.turno = siguiente(e, e.turno, (j) => puedeActuar(e, j)); return; }
  // nueva calle
  e.puesto.fill(0); e.maximo = 0; e.minSubida = e.cg; e.actuado.fill(false);
  for (let j = 0; j < e.n; j++) if (e.dijo[j] && !e.retirado[j] && !e.todo[j]) e.dijo[j] = null;
  if (e.fase === 'river') return terminarMano(e);
  if (e.fase === 'preflop') { e.mesa.push(e.mazo.pop(), e.mazo.pop(), e.mazo.pop()); e.fase = 'flop'; }
  else if (e.fase === 'flop') { e.mesa.push(e.mazo.pop()); e.fase = 'turn'; }
  else { e.mesa.push(e.mazo.pop()); e.fase = 'river'; }
  const pueden = e.retirado.map((r, j) => j).filter((j) => puedeActuar(e, j));
  if (pueden.length <= 1) return avanzar(e); // todos con todo: se reparten las cartas que faltan
  e.turno = siguiente(e, e.boton, (j) => puedeActuar(e, j));
}

function terminarMano(e) {
  const vivos = activos(e);
  const pagos = Array(e.n).fill(0);
  const botes = [];
  let mostrar = [];
  if (vivos.length === 1) { pagos[vivos[0]] = bote(e); botes.push({ cantidad: bote(e), ganadores: vivos, jugada: null }); }
  else {
    while (e.mesa.length < 5) e.mesa.push(e.mazo.pop());
    const valores = {};
    for (const j of vivos) valores[j] = mejorMano([...e.cartas[j], ...e.mesa]);
    mostrar = vivos.map((j) => ({ j, cartas: e.cartas[j], jugada: valores[j].nombre, mejores: valores[j].cartas }));
    const niveles = [...new Set(e.total.filter((t) => t > 0))].sort((a, b) => a - b);
    let antes = 0;
    for (const nivel of niveles) {
      const cantidad = e.total.reduce((s, t) => s + Math.max(0, Math.min(t, nivel) - antes), 0);
      const optan = vivos.filter((j) => e.total[j] >= nivel);
      antes = nivel;
      if (!cantidad) continue;
      if (!optan.length) { // lo que pusieron los retirados por encima de todos los vivos vuelve al mejor vivo
        const g = vivos.reduce((a, b) => (comparar(valores[b].valor, valores[a].valor) > 0 ? b : a));
        pagos[g] += cantidad; continue;
      }
      let mejores = [optan[0]];
      for (const j of optan.slice(1)) { const d = comparar(valores[j].valor, valores[mejores[0]].valor); if (d > 0) mejores = [j]; else if (d === 0) mejores.push(j); }
      const parte = Math.floor(cantidad / mejores.length);
      mejores.forEach((j) => { pagos[j] += parte; });
      // las fichas sueltas del reparto, al primero a la izquierda del botón
      const resto = cantidad - parte * mejores.length;
      if (resto) pagos[mejores.slice().sort((a, b) => ((a - e.boton + e.n) % e.n) - ((b - e.boton + e.n) % e.n))[0]] += resto;
      const ultimo = botes[botes.length - 1];
      if (ultimo && ultimo.ganadores.join() === mejores.join()) ultimo.cantidad += cantidad;
      else botes.push({ cantidad, ganadores: mejores, jugada: valores[mejores[0]].nombre });
    }
  }
  pagos.forEach((p, j) => { e.fichas[j] += p; });
  for (const j of enJuego(e)) if (!e.fichas[j]) e.fuera[j] = true;
  e.resumen = { botes, mostrar, pagos };
  e.fase = 'fin'; e.turno = -1;
  const quedan = enJuego(e);
  if (quedan.length === 1) e.ganador = quedan[0];
  e.pausaHasta = Date.now() + PAUSA;
}
function tiempo(e, ahora) { if (e.fase === 'fin' && e.ganador < 0 && ahora >= e.pausaHasta) { empezarMano(e); return true; } return false; }

function accion(e, yo, a) {
  if (e.ganador >= 0) return { ok: false, error: 'La partida ha terminado' };
  if (a.tipo === 'seguir') { if (e.fase !== 'fin') return { ok: false, error: 'La mano sigue' }; empezarMano(e); return { ok: true }; }
  if (e.fase === 'fin') return { ok: false, error: 'Espera a la siguiente mano' };
  if (e.turno !== yo) return { ok: false, error: 'No es tu turno' };
  const debe = e.maximo - e.puesto[yo];
  if (a.tipo === 'retirarse') { e.retirado[yo] = true; e.dijo[yo] = 'se retira'; }
  else if (a.tipo === 'pasar') { if (debe > 0) return { ok: false, error: 'No puedes pasar: hay una apuesta' }; e.dijo[yo] = 'pasa'; }
  else if (a.tipo === 'igualar') { if (debe <= 0) return { ok: false, error: 'No hay nada que igualar' }; const c = poner(e, yo, debe); e.dijo[yo] = e.todo[yo] ? `va con todo (${c})` : `iguala ${c}`; }
  else if (a.tipo === 'subir' || a.tipo === 'todo') {
    const maxPosible = e.puesto[yo] + e.fichas[yo];
    let hasta = a.tipo === 'todo' ? maxPosible : Math.floor(Number(a.hasta));
    if (!Number.isFinite(hasta)) return { ok: false, error: 'Cantidad no válida' };
    hasta = Math.min(hasta, maxPosible);
    const minimo = e.maximo + e.minSubida;
    if (hasta < minimo && hasta < maxPosible) return { ok: false, error: `Tienes que subir al menos hasta ${minimo}` };
    if (hasta <= e.maximo) { if (hasta === maxPosible) { poner(e, yo, hasta - e.puesto[yo]); e.dijo[yo] = `va con todo`; } else return { ok: false, error: 'Eso no es subir' }; }
    else {
      const sube = hasta - e.maximo;
      poner(e, yo, hasta - e.puesto[yo]);
      if (sube >= e.minSubida) { e.minSubida = sube; e.actuado.fill(false); } // una subida completa reabre la ronda
      e.maximo = hasta;
      e.dijo[yo] = e.todo[yo] ? `¡va con todo! (${hasta})` : `sube a ${hasta}`;
    }
  } else return { ok: false, error: 'Acción desconocida' };
  e.actuado[yo] = true;
  avanzar(e);
  return { ok: true };
}

function vista(e, yo) {
  const mio = yo >= 0 && e.turno === yo;
  const debe = mio ? e.maximo - e.puesto[yo] : 0;
  return {
    n: e.n, fichas: e.fichas, fuera: e.fuera, boton: e.boton, cp: e.cp, cg: e.cg, manos: e.manos, subidaCada: SUBIDA_CADA,
    misCartas: yo >= 0 ? e.cartas[yo] : [], mesa: e.mesa, fase: e.fase, turno: e.turno, puesto: e.puesto, bote: bote(e),
    retirado: e.retirado, todo: e.todo, dijo: e.dijo, resumen: e.resumen, pausaHasta: e.pausaHasta, ganador: e.ganador,
    miJugada: yo >= 0 && e.cartas[yo].length && e.mesa.length >= 3 ? mejorMano([...e.cartas[yo], ...e.mesa]).nombre : null,
    opciones: mio ? { debe: Math.min(debe, e.fichas[yo]), puedePasar: debe <= 0, minSubir: Math.min(e.maximo + e.minSubida, e.puesto[yo] + e.fichas[yo]), maxSubir: e.puesto[yo] + e.fichas[yo], maximo: e.maximo } : null,
  };
}
const turno = (e) => (e.ganador >= 0 || e.fase === 'fin' ? -1 : e.turno);
const fin = (e) => (e.ganador >= 0 ? { ganadores: [e.ganador], texto: `Se queda con todas las fichas (${e.fichas[e.ganador]})` } : null);

// --- CPU: probabilidad de ganar por simulación ------------------------------------------------------
function equidad(e, yo, sims, rnd) {
  const rivales = activos(e).filter((j) => j !== yo).length;
  const conocidas = new Set([...e.cartas[yo], ...e.mesa].map((c) => c.r + c.s));
  const resto = [];
  for (const s of PALOS) for (let r = 2; r <= 14; r++) if (!conocidas.has(r + s)) resto.push({ r, s });
  let gana = 0;
  for (let k = 0; k < sims; k++) {
    const m = barajar(resto.slice(), rnd);
    const mesa = [...e.mesa, ...m.splice(0, 5 - e.mesa.length)];
    const mia = mejorMano([...e.cartas[yo], ...mesa]).valor;
    let resultado = 1;
    for (let r = 0; r < rivales; r++) { const v = mejorMano([m.pop(), m.pop(), ...mesa]).valor; const d = comparar(mia, v); if (d < 0) { resultado = 0; break; } if (d === 0) resultado = Math.min(resultado, 0.5); }
    gana += resultado;
  }
  return gana / sims;
}
function bot(e, yo, nivel, rnd) {
  if (turno(e) !== yo) return null;
  const dificil = nivel === 'dificil';
  const eq = equidad(e, yo, config.sims || (dificil ? 300 : 100), rnd);
  const debe = e.maximo - e.puesto[yo];
  const b = bote(e);
  const cuota = debe / (b + debe || 1);
  const r = rnd();
  const subir = (factor) => { const hasta = Math.max(e.maximo + e.minSubida, e.maximo + Math.round(b * factor / 10) * 10); return hasta >= e.puesto[yo] + e.fichas[yo] ? { tipo: 'todo' } : { tipo: 'subir', hasta }; };
  const rivales = activos(e).length - 1;
  const fuerte = eq > (rivales > 2 ? 0.55 : 0.7);
  if (fuerte && r < (dificil ? 0.75 : 0.6)) return subir(eq > 0.85 ? 1 : 0.6);
  if (debe <= 0) { if ((eq > 0.5 || r < (dificil ? 0.12 : 0.06)) && r < 0.5) return subir(0.5); return { tipo: 'pasar' }; }
  if (eq > cuota + (dificil ? 0.05 : 0.0) || (debe <= e.cg && eq > 0.25)) return { tipo: 'igualar' };
  if (r < (dificil ? 0.05 : 0.03)) return subir(0.8); // farol
  return { tipo: 'retirarse' };
}

module.exports = { id: 'poquer', min: 2, max: 8, nuevo, vista, accion, turno, fin, bot, tiempo, _: { mejorMano, eval5, comparar, config } };
