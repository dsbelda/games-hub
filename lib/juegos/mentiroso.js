'use strict';
// Mentiroso de dados (2-6). Cada uno tiene 5 dados bajo el cubilete y solo ve los suyos. Por turnos se apuesta
// cuántos dados hay de una cara ENTRE TODOS (los unos son comodines y cuentan para cualquier cara). Cada apuesta
// sube: más cantidad, o la misma cantidad con una cara más alta. Apostar a unos: basta la mitad (redondeando
// hacia arriba); para volver de los unos a otra cara hace falta el doble más uno. En vez de subir se puede decir
// «¡Dudo!»: se levantan los cubiletes y pierde un dado quien se equivocó. Quien pierde todos sus dados, fuera.
// Gana el último con dados.
const T_VER = 7000;
const vale = (cara, c) => c === cara || (cara !== 1 && c === 1);
function nuevo(n, rnd = Math.random) { const e = { n, rnd, dados: Array(n).fill(5), turno: 0, ronda: 0, ganador: null, historial: [] }; ronda(e, 0); return e; }
function ronda(e, empieza) {
  e.ronda++;
  e.cubiletes = e.dados.map((k) => Array.from({ length: k }, () => 1 + Math.floor(e.rnd() * 6)).sort());
  e.apuesta = null; e.apuestas = []; e.revelado = null; e.hasta = 0;
  e.turno = empieza; while (!e.dados[e.turno]) e.turno = (e.turno + 1) % e.n;
}
const total = (e) => e.dados.reduce((s, x) => s + x, 0);
function legal(e, q, cara) {
  if (!Number.isInteger(q) || !Number.isInteger(cara) || cara < 1 || cara > 6 || q < 1 || q > total(e)) return false;
  const a = e.apuesta; if (!a) return true;
  if (cara === 1 && a.cara !== 1) return q >= Math.ceil(a.q / 2);
  if (cara !== 1 && a.cara === 1) return q >= a.q * 2 + 1;
  return q > a.q || (q === a.q && cara > a.cara);
}
const siguienteVivo = (e, j) => { let k = j; do k = (k + 1) % e.n; while (!e.dados[k]); return k; };
function accion(e, yo, a) {
  if (e.ganador) return { ok: false, error: 'La partida ha terminado' };
  if (a.tipo === 'seguir') { if (!e.revelado) return { ok: false, error: 'Ahora no' }; terminarRevelado(e); return { ok: true }; }
  if (e.revelado) return { ok: false, error: 'Mirad los dados…' };
  if (yo !== e.turno) return { ok: false, error: 'No es tu turno' };
  if (a.tipo === 'apostar') {
    const q = Number(a.q), cara = Number(a.cara);
    if (!legal(e, q, cara)) return { ok: false, error: 'Tienes que subir la apuesta' };
    e.apuesta = { j: yo, q, cara }; e.apuestas.push(e.apuesta);
    e.turno = siguienteVivo(e, yo);
    return { ok: true };
  }
  if (a.tipo === 'dudar') {
    if (!e.apuesta) return { ok: false, error: 'Aún no hay apuesta' };
    const hay = e.cubiletes.flat().filter((c) => vale(e.apuesta.cara, c)).length;
    const pierde = hay >= e.apuesta.q ? yo : e.apuesta.j;
    e.dados[pierde]--;
    e.revelado = { duda: yo, apuesta: e.apuesta, hay, pierde, cubiletes: e.cubiletes };
    e.historial.push({ ronda: e.ronda, ...e.revelado, cubiletes: undefined });
    e.hasta = Date.now() + T_VER;
    const vivos = e.dados.map((d, j) => (d ? j : -1)).filter((j) => j >= 0);
    if (vivos.length === 1) e.ganador = vivos;
    return { ok: true };
  }
  return { ok: false, error: 'Acción desconocida' };
}
function terminarRevelado(e) { const p = e.revelado.pierde; ronda(e, e.dados[p] ? p : siguienteVivo(e, p)); }
function tiempo(e, ahora) { if (e.ganador || !e.revelado || ahora < e.hasta) return false; terminarRevelado(e); return true; }
// probabilidad de que haya al menos q (binomial con los dados que no veo)
function probAlMenos(q, n, p) { let s = 0; for (let k = q; k <= n; k++) { let c = 1; for (let i = 0; i < k; i++) c = c * (n - i) / (i + 1); s += c * p ** k * (1 - p) ** (n - k); } return q <= 0 ? 1 : s; }
function bot(e, yo, nivel, rnd) {
  if (e.ganador) return null;
  if (e.revelado) return yo === e.revelado.pierde || (!e.dados[e.revelado.pierde] && yo === siguienteVivo(e, e.revelado.pierde)) ? null : null;
  if (yo !== e.turno) return null;
  const mios = e.cubiletes[yo], otros = total(e) - mios.length;
  const p = (cara) => (cara === 1 ? 1 / 6 : 1 / 3);
  const prob = (q, cara) => probAlMenos(q - mios.filter((c) => vale(cara, c)).length, otros, p(cara));
  // la apuesta legal más probable (la cantidad mínima de cada cara), con un poco de farol en la normal
  let mejor = null, mv = -1;
  for (let cara = 1; cara <= 6; cara++) {
    for (let q = 1; q <= total(e); q++) {
      if (!legal(e, q, cara)) continue;
      const v = prob(q, cara) + (nivel === 'dificil' ? (mios.includes(cara) ? 0.02 : 0) : rnd() * 0.2);
      if (v > mv) { mv = v; mejor = { tipo: 'apostar', q, cara }; }
      break;
    }
  }
  if (e.apuesta) {
    const cierta = prob(e.apuesta.q, e.apuesta.cara);
    // difícil: duda si es más fácil que la apuesta sea falsa que acertar subiendo; normal: umbral con ruido
    if (nivel === 'dificil' ? (1 - cierta > Math.min(1, mv)) : cierta < 0.3 + rnd() * 0.25) return { tipo: 'dudar' };
  }
  if (!mejor) return { tipo: 'dudar' };
  return mejor;
}
function vista(e, yo) {
  return {
    n: e.n, dados: e.dados, turno: e.turno, ronda: e.ronda, apuesta: e.apuesta, apuestas: e.apuestas.slice(-8), total: total(e),
    mios: yo >= 0 ? e.cubiletes[yo] : [], revelado: e.revelado, hasta: e.hasta, historial: e.historial.slice(-5), ganadores: e.ganador,
  };
}
const turno = (e) => (e.ganador || e.revelado ? -1 : e.turno);
const fin = (e) => (e.ganador ? { ganadores: e.ganador, texto: `Le quedan ${e.dados[e.ganador[0]]} dados` } : null);
module.exports = { id: 'mentiroso', min: 2, max: 6, nuevo, vista, accion, turno, fin, bot, tiempo, _: { legal, probAlMenos } };
