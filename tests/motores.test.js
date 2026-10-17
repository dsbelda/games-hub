'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const JUEGOS = require('../lib/juegos');

// partida entera entre CPUs: nunca se atasca, toda acción del bot es válida y termina
function jugar(J, n, niveles, semilla) {
  let s = semilla;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const e = J.nuevo(n, rnd);
  for (let paso = 0; paso < 5000; paso++) {
    if (J.fin(e)) return { e, f: J.fin(e), paso };
    let hecho = false;
    const t = J.turno(e);
    for (const i of [t, ...Array.from({ length: n }, (_, k) => k)]) {
      if (i < 0) continue;
      const a = J.bot(e, i, niveles[i % niveles.length], rnd);
      if (!a) continue;
      const r = J.accion(e, i, a);
      assert.ok(r.ok, `${J.id}: acción del bot rechazada: ${JSON.stringify(a)} → ${r.error}`);
      hecho = true; break;
    }
    assert.ok(hecho, `${J.id}: nadie puede mover`);
  }
  assert.fail(`${J.id}: la partida no termina`);
}

test('Cuatro en raya: partidas completas y la difícil gana a la normal', () => {
  let dificil = 0, normal = 0;
  for (let k = 0; k < 30; k++) {
    const { f } = jugar(JUEGOS.cuatro, 2, k % 2 ? ['normal', 'dificil'] : ['dificil', 'normal'], k + 1);
    const g = f.ganadores[0];
    if (g === undefined) continue;
    if ((k % 2 ? g === 1 : g === 0)) dificil++; else normal++;
  }
  assert.ok(dificil > normal, `difícil ${dificil} – normal ${normal}`);
});

test('Cuatro en raya: reglas básicas', () => {
  const J = JUEGOS.cuatro;
  const e = J.nuevo(2);
  assert.equal(J.accion(e, 1, { tipo: 'soltar', col: 0 }).ok, false); // no es su turno
  for (let k = 0; k < 3; k++) { J.accion(e, 0, { tipo: 'soltar', col: 0 }); J.accion(e, 1, { tipo: 'soltar', col: 1 }); }
  J.accion(e, 0, { tipo: 'soltar', col: 0 });
  assert.deepEqual(J.fin(e).ganadores, [0]);
});

test('Brisca: 2, 3 y 4 jugadores, se reparten 120 puntos y nadie ve manos ajenas', () => {
  const J = JUEGOS.brisca;
  for (const n of [2, 3, 4]) for (let k = 0; k < 40; k++) {
    const { e, f } = jugar(J, n, ['normal', 'dificil'], k * 7 + n);
    const total = e.puntos.reduce((a, b) => a + b, 0);
    assert.equal(total, 120, `n=${n}: suman ${total}`);
    assert.ok(e.manos.every((m) => m.length === 0));
    assert.ok(f);
  }
  const e = J.nuevo(4, Math.random);
  const v = J.vista(e, 1);
  assert.equal(v.manos, undefined, 'la vista no lleva las manos de todos');
  assert.deepEqual(v.mano, e.manos[1]);
  assert.equal(v.mano.length, 3);
});

test('Brisca: gana el triunfo y, si no hay, la más alta del palo de salida', () => {
  const J = JUEGOS.brisca;
  const e = { palo: 'oros' };
  assert.equal(J._.ganadorMesa(e, [{ j: 0, carta: { p: 'copas', n: 1 } }, { j: 1, carta: { p: 'oros', n: 2 } }]), 1);
  assert.equal(J._.ganadorMesa(e, [{ j: 0, carta: { p: 'copas', n: 12 } }, { j: 1, carta: { p: 'copas', n: 3 } }]), 1);
  assert.equal(J._.ganadorMesa(e, [{ j: 0, carta: { p: 'copas', n: 2 } }, { j: 1, carta: { p: 'bastos', n: 1 } }]), 0);
});

test('El juego de la Unidad: partidas completas de 2 a 8 y pillar a quien no lo dice', () => {
  const J = JUEGOS.unidad;
  for (const n of [2, 3, 5, 8]) for (let k = 0; k < 30; k++) {
    const { e, f } = jugar(J, n, ['normal', 'dificil'], k * 13 + n);
    assert.equal(e.manos[f.ganadores[0]].length, 0);
    const total = e.manos.reduce((s, m) => s + m.length, 0) + e.mazo.length + e.descarte.length;
    assert.equal(total, 108, 'no se pierden ni se inventan cartas');
  }
  const e = J.nuevo(3, Math.random);
  e.manos[0] = [{ id: 900, c: e.color, v: '5' }, { id: 901, c: e.color, v: '6' }];
  assert.ok(J.accion(e, 0, { tipo: 'jugar', carta: 900 }).ok);
  assert.equal(e.pillable, 0);
  assert.ok(J.accion(e, 2, { tipo: 'pillar' }).ok);
  assert.equal(e.manos[0].length, 3);
});
