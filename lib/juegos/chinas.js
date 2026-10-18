'use strict';
// Damas chinas (2, 3, 4 o 6). Tablero de estrella de 121 agujeros (coordenadas cúbicas x+y+z = 0) con seis
// puntas de 10. Cada jugador lleva sus fichas a la punta contraria: un paso a un agujero vecino libre, o una
// cadena de saltos sobre fichas (de cualquiera) a agujeros libres. Gana quien llena la punta contraria
// (vale si la punta está llena y al menos una ficha es suya: así no se puede bloquear dejando una ficha dentro).
// Con 5 personas se usan seis puntas y una queda vacía. Si en 400 jugadas nadie gana, gana quien tenga más
// fichas en su punta (y, si empatan, quien esté más cerca).
const DIRS = [[1, -1, 0], [1, 0, -1], [0, 1, -1], [-1, 1, 0], [-1, 0, 1], [0, -1, 1]];
const CELDAS = [];
for (let x = -8; x <= 8; x++) for (let y = -8; y <= 8; y++) { const z = -x - y; if (Math.abs(z) > 8) continue; if ((x >= -4 && y >= -4 && z >= -4) || (x <= 4 && y <= 4 && z <= 4)) CELDAS.push([x, y, z]); }
const clave = (c) => c.join(',');
const IDX = new Map(CELDAS.map((c, i) => [clave(c), i]));
// puntas: 0 arriba, en el sentido de las agujas del reloj. Cada una se define por la coordenada que pasa de 4.
const PUNTAS = [[1, -1], [0, 1], [2, -1], [1, 1], [0, -1], [2, 1]].map(([k, s]) => CELDAS.map((c, i) => (s > 0 ? c[k] > 4 : c[k] < -4) ? i : -1).filter((i) => i >= 0));
// punta contraria: la de la misma coordenada con el signo cambiado
const CONTRARIA = [3, 4, 5, 0, 1, 2]; // las puntas están en orden alrededor de la estrella: la opuesta, +3
const PUNTA_DE = { 2: [0, 3], 3: [0, 2, 4], 4: [1, 2, 4, 5], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5] };
const VEC = CELDAS.map((c) => DIRS.map((d) => IDX.get(clave([c[0] + d[0], c[1] + d[1], c[2] + d[2]]))));
const SALTO = CELDAS.map((c) => DIRS.map((d) => IDX.get(clave([c[0] + 2 * d[0], c[1] + 2 * d[1], c[2] + 2 * d[2]]))));
const dist = (a, b) => (Math.abs(CELDAS[a][0] - CELDAS[b][0]) + Math.abs(CELDAS[a][1] - CELDAS[b][1]) + Math.abs(CELDAS[a][2] - CELDAS[b][2])) / 2;
// la punta de cada punta (el agujero más lejano del centro)
const VERTICE = PUNTAS.map((p) => p.reduce((a, b) => (dist(b, IDX.get('0,0,0')) > dist(a, IDX.get('0,0,0')) ? b : a)));
const LIMITE = 400;

function nuevo(n) {
  const puntas = PUNTA_DE[n];
  const t = Array(CELDAS.length).fill(-1);
  puntas.forEach((p, j) => { for (const i of PUNTAS[p]) t[i] = j; });
  return { n, t, puntas, destino: puntas.map((p) => CONTRARIA[p]), turno: 0, jugadas: 0, ultima: null, ganador: null };
}
// agujeros a los que puede ir la ficha de i (pasos y cadenas de saltos)
function destinos(e, i) {
  const out = new Map();
  for (const v of VEC[i]) if (v !== undefined && e.t[v] < 0) out.set(v, [i, v]);
  const cola = [[i, [i]]], visto = new Set([i]);
  while (cola.length) {
    const [c, ruta] = cola.shift();
    for (let d = 0; d < 6; d++) {
      const m = VEC[c][d], s = SALTO[c][d];
      if (m === undefined || s === undefined || e.t[m] < 0 || (e.t[s] >= 0 && s !== i) || visto.has(s)) continue;
      visto.add(s); const r = [...ruta, s];
      if (s !== i) out.set(s, r);
      cola.push([s, r]);
    }
  }
  return out;
}
function gana(e, j) {
  const dest = PUNTAS[e.destino[j]];
  return dest.every((i) => e.t[i] >= 0) && dest.some((i) => e.t[i] === j);
}
function accion(e, yo, a) {
  if (e.ganador) return { ok: false, error: 'La partida ha terminado' };
  if (a.tipo !== 'mover') return { ok: false, error: 'Acción desconocida' };
  if (yo !== e.turno) return { ok: false, error: 'No es tu turno' };
  const de = Number(a.de), a2 = Number(a.a);
  if (e.t[de] !== yo) return { ok: false, error: 'Esa ficha no es tuya' };
  const ruta = destinos(e, de).get(a2);
  if (!ruta) return { ok: false, error: 'No puedes ir ahí' };
  e.t[a2] = yo; e.t[de] = -1; e.jugadas++;
  e.ultima = { j: yo, ruta };
  if (gana(e, yo)) { e.ganador = [yo]; return { ok: true }; }
  if (e.jugadas >= LIMITE * e.n / 2) { // demasiado larga: gana quien más fichas tenga en su destino
    const v = e.puntas.map((_, j) => PUNTAS[e.destino[j]].filter((i) => e.t[i] === j).length * 1000 - e.t.reduce((s, x, i) => s + (x === j ? dist(i, VERTICE[e.destino[j]]) : 0), 0));
    const max = Math.max(...v); e.ganador = v.map((x, j) => (x === max ? j : -1)).filter((j) => j >= 0);
    return { ok: true };
  }
  e.turno = (e.turno + 1) % e.n;
  return { ok: true };
}
// CPU: la jugada que más acerca (suma de distancias al vértice de destino), empujando a las rezagadas
function bot(e, yo, nivel, rnd) {
  if (e.ganador || yo !== e.turno) return null;
  const v = VERTICE[e.destino[yo]], dest = new Set(PUNTAS[e.destino[yo]]);
  const mias = e.t.map((x, i) => (x === yo ? i : -1)).filter((i) => i >= 0);
  const rezagada = Math.max(...mias.map((i) => dist(i, v)));
  let mejor = null, mv = -Infinity;
  for (const i of mias) for (const [d] of destinos(e, i)) {
    let val = dist(i, v) - dist(d, v);
    if (dest.has(i) && !dest.has(d)) val -= 6; // no salir de la punta
    if (dest.has(d)) val += 0.5;
    if (dist(i, v) === rezagada) val += nivel === 'dificil' ? 0.6 : 0.3;
    if (nivel === 'dificil') { // mirar si deja un buen salto para la siguiente
      e.t[d] = yo; e.t[i] = -1;
      let extra = 0; for (const k of mias) { if (k === i) continue; for (const [d2] of destinos(e, k)) extra = Math.max(extra, dist(k, v) - dist(d2, v)); }
      e.t[i] = yo; e.t[d] = -1; val += extra * 0.35;
    }
    val += rnd() * (nivel === 'dificil' ? 0.1 : 0.9);
    if (val > mv) { mv = val; mejor = { tipo: 'mover', de: i, a: d }; }
  }
  return mejor;
}
const vista = (e) => ({ n: e.n, t: e.t, celdas: CELDAS, puntas: e.puntas, destino: e.destino, turno: e.turno, ultima: e.ultima, jugadas: e.jugadas, limite: LIMITE * e.n / 2, ganadores: e.ganador, zonas: PUNTAS });
const turno = (e) => (e.ganador ? -1 : e.turno);
const fin = (e) => (e.ganador ? { ganadores: e.ganador, texto: e.ganador.length === 1 && gana(e, e.ganador[0]) ? '¡Punta contraria llena!' : 'Al llegar al límite de jugadas' } : null);
module.exports = { id: 'chinas', min: 2, max: 6, nuevo, vista, accion, turno, fin, bot, _: { destinos, CELDAS, PUNTAS, gana, VERTICE, CONTRARIA } };
