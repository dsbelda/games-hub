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

test('Hundir la flota: colocar, disparar, repetir al acertar y partidas completas', () => {
  const J = JUEGOS.hundir;
  assert.match(J._.validar([{ f: 0, c: 0, largo: 5 }, { f: 1, c: 0, largo: 4 }, { f: 4, c: 0, largo: 3 }, { f: 6, c: 0, largo: 3 }, { f: 8, c: 0, largo: 2 }]).error, /tocarse/);
  const e = J.nuevo();
  const flota = [{ f: 0, c: 0, largo: 5 }, { f: 2, c: 0, largo: 4 }, { f: 4, c: 0, largo: 3 }, { f: 6, c: 0, largo: 3 }, { f: 8, c: 0, largo: 2 }];
  assert.ok(J.accion(e, 0, { tipo: 'colocar', barcos: flota }).ok);
  assert.ok(J.accion(e, 1, { tipo: 'colocar', barcos: flota }).ok);
  assert.equal(e.fase, 'disparar');
  assert.ok(J.accion(e, 0, { tipo: 'disparar', f: 0, c: 0 }).ok);
  assert.equal(e.turno, 0, 'si aciertas, repites');
  assert.ok(J.accion(e, 0, { tipo: 'disparar', f: 9, c: 9 }).ok);
  assert.equal(e.turno, 1);
  assert.equal(J.vista(e, 1).miFlota.length, 5);
  assert.equal(J.vista(e, 0).flotaRival, null, 'no se ve la flota rival hasta el final');
  for (let k = 0; k < 20; k++) jugar(J, 2, ['normal', 'dificil'], k + 3);
});

test('Damas: comer es obligatorio y por donde más se come', () => {
  const J = JUEGOS.damas;
  const e = J.nuevo();
  e.t = Array.from({ length: 8 }, () => Array(8).fill(null));
  e.t[5][2] = { j: 0, dama: false }; e.t[7][0] = { j: 0, dama: false };
  e.t[4][3] = { j: 1, dama: false }; e.t[2][3] = { j: 1, dama: false }; e.t[4][1] = { j: 1, dama: false };
  const ls = J._.legales(e);
  assert.ok(ls.every((m) => m.comidas.length === 2), 'solo vale la que come dos');
  assert.equal(J.accion(e, 0, { tipo: 'mover', ruta: [[7, 0], [6, 1]] }).ok, false);
  assert.ok(J.accion(e, 0, { tipo: 'mover', ruta: ls[0].ruta }).ok);
  for (let k = 0; k < 6; k++) jugar(J, 2, ['normal', 'normal'], k + 11);
});

test('Ajedrez: perft correcto (inicio, Kiwipete y posición 3) y mate del pastor', () => {
  const J = JUEGOS.ajedrez;
  const perft = (e, d) => { if (!d) return 1; let n = 0; for (const m of J._.legales(e)) { const x = J._.hacer(e, m); n += perft(e, d - 1); J._.deshacerJugada(e, x); } return n; };
  const desdeFen = (fen, enroque) => { const e = J.nuevo(); e.b = fen.split('/').map((f) => f.replace(/\d/g, (d) => '.'.repeat(+d))).join('').split('').map((c) => (c === '.' ? null : c)); e.enroque = enroque; return e; };
  assert.deepEqual([1, 2, 3].map((d) => perft(J.nuevo(), d)), [20, 400, 8902]);
  assert.deepEqual([1, 2, 3].map((d) => perft(desdeFen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R', { K: true, Q: true, k: true, q: true }), d)), [48, 2039, 97862]);
  assert.deepEqual([1, 2, 3, 4].map((d) => perft(desdeFen('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8', { K: false, Q: false, k: false, q: false }), d)), [14, 191, 2812, 43238]);
  const e = J.nuevo();
  const sq = (s) => (8 - +s[1]) * 8 + 'abcdefgh'.indexOf(s[0]);
  for (const [j, de, a] of [[0, 'e2', 'e4'], [1, 'e7', 'e5'], [0, 'f1', 'c4'], [1, 'b8', 'c6'], [0, 'd1', 'h5'], [1, 'g8', 'f6'], [0, 'h5', 'f7']]) assert.ok(J.accion(e, j, { tipo: 'mover', de: sq(de), a: sq(a) }).ok, de + a);
  assert.deepEqual(J.fin(e).ganadores, [0]);
  assert.equal(e.jugadas.at(-1), 'Dxf7#');
});

test('Tute: obligaciones de asistir y montar, cantes y 130 puntos', () => {
  const J = JUEGOS.tute;
  const e = J.nuevo(4, Math.random);
  e.palo = 'oros';
  e.manos[1] = [{ p: 'copas', n: 4 }, { p: 'copas', n: 1 }, { p: 'oros', n: 5 }, { p: 'bastos', n: 7 }];
  e.mesa = [{ j: 0, carta: { p: 'copas', n: 12 } }];
  e.turno = 1;
  assert.deepEqual(J._.legales(e, 1).map((c) => c.n), [1], 'debe asistir y montar con el As');
  e.manos[1] = [{ p: 'espadas', n: 4 }, { p: 'oros', n: 5 }, { p: 'oros', n: 2 }];
  assert.deepEqual(J._.legales(e, 1).map((c) => c.p), ['oros', 'oros'], 'sin palo, falla con triunfo');
  for (const n of [2, 3, 4]) for (let k = 0; k < 20; k++) {
    const { e: f } = jugar(J, n, ['normal', 'dificil'], k * 5 + n);
    if (f.tute < 0) assert.equal(f.puntos.reduce((a, b) => a + b, 0), 130);
  }
});

test('Chinchón: combinaciones, cierre y partidas completas', () => {
  const J = JUEGOS.chinchon;
  const c = (p, n) => ({ p, n });
  assert.equal(J._.mejor([c('oros', 5), c('oros', 6), c('oros', 7), c('oros', 10), c('copas', 3), c('espadas', 3), c('bastos', 3)]).puntos, 0);
  assert.ok(J._.esChinchon([1, 2, 3, 4, 5, 6, 7].map((n) => c('copas', n))));
  assert.ok(J._.puedeCerrar([c('oros', 5), c('oros', 6), c('oros', 7), c('copas', 3), c('espadas', 3), c('bastos', 3), c('copas', 4)]));
  assert.ok(!J._.puedeCerrar([c('oros', 5), c('oros', 6), c('oros', 7), c('copas', 3), c('espadas', 3), c('bastos', 3), c('copas', 12)]));
  for (const n of [2, 4]) for (let k = 0; k < 5; k++) {
    const e = J.nuevo(n, Math.random);
    for (let i = 0; i < 100000 && !J.fin(e); i++) { if (e.resumen) { J.tiempo(e, Date.now() + 1e9); continue; } const t = J.turno(e); assert.ok(J.accion(e, t, J.bot(e, t, 'dificil', Math.random)).ok); }
    assert.ok(J.fin(e));
  }
});

test('Póquer: jugadas, botes paralelos y fichas que no se pierden', () => {
  const J = JUEGOS.poquer;
  const c = (s) => s.split(' ').map((x) => ({ r: '--23456789TJQKA'.indexOf(x[0]), s: x[1] }));
  assert.equal(J._.mejorMano(c('Ah 2d 3c 4s 5h 9c Kd')).nombre, 'Escalera');
  assert.equal(J._.mejorMano(c('As Ks Qs Js Ts 2h 3d')).nombre, 'Escalera real');
  assert.ok(J._.comparar(J._.mejorMano(c('Kh Kd Kc 2s 2h 9c 3d')).valor, J._.mejorMano(c('2h 5h 9h Jh Kh 3c 4c')).valor) > 0, 'full gana a color');
  J._.config.sims = 15;
  for (const n of [2, 5, 8]) for (let k = 0; k < 2; k++) {
    const e = J.nuevo(n, Math.random);
    for (let i = 0; i < 200000 && !J.fin(e); i++) {
      if (e.fase === 'fin') { J.tiempo(e, Date.now() + 1e9); continue; }
      const t = J.turno(e); assert.ok(J.accion(e, t, J.bot(e, t, 'normal', Math.random)).ok);
      const enMesa = e.fase === 'fin' ? 0 : e.total.reduce((a, b) => a + b, 0);
      assert.equal(e.fichas.reduce((a, b) => a + b, 0) + enMesa, n * 1000);
    }
    assert.ok(J.fin(e));
  }
  J._.config.sims = 0;
});

test('Mus: jugadas y partidas completas a 40', () => {
  const J = JUEGOS.mus;
  const c = (p, n) => ({ p, n });
  assert.equal(J._.pares([c('oros', 12), c('copas', 3), c('espadas', 1), c('bastos', 2)]).nombre, 'duples');
  assert.ok(J._.comparar('juego', [c('oros', 12), c('copas', 11), c('espadas', 7), c('bastos', 4)], [c('oros', 12), c('copas', 11), c('espadas', 10), c('bastos', 10)]) > 0, 'la 31 gana a la 40');
  assert.ok(J._.comparar('grande', [c('oros', 3), c('copas', 1), c('espadas', 1), c('bastos', 1)], [c('oros', 11), c('copas', 11), c('espadas', 11), c('bastos', 11)]) > 0, 'un tres es rey');
  for (let k = 0; k < 30; k++) {
    const e = J.nuevo(4, Math.random);
    for (let i = 0; i < 20000 && !J.fin(e); i++) {
      if (e.fase === 'resumen') { J.tiempo(e, Date.now() + 1e9); continue; }
      const quien = e.fase === 'descarte' ? [0, 1, 2, 3] : [J.turno(e)];
      let hecho = false;
      for (const j of quien) { const a = J.bot(e, j, 'normal', Math.random); if (a) { assert.ok(J.accion(e, j, a).ok); hecho = true; break; } }
      assert.ok(hecho, `atascado en ${e.fase}`);
    }
    assert.ok(J.fin(e));
  }
});
