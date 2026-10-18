'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const JUEGOS = require('../lib/juegos');

// partida entera entre CPUs: nunca se atasca, toda acción del bot es válida y termina
function jugar(J, n, niveles, semilla) {
  let s = semilla;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const e = J.nuevo(n, rnd);
  for (let paso = 0; paso < 20000; paso++) {
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

test('Parchís: salir con 5, barreras, comer y partidas completas', () => {
  const J = JUEGOS.parchis;
  const e = J.nuevo(2);
  e.pendiente = { tipo: 'dado', valor: 4 };
  assert.equal(J._.movimientos(e, 0).length, 0, 'sin un 5 no se sale');
  e.pendiente = { tipo: 'dado', valor: 5 };
  assert.ok(J._.movimientos(e, 0).every((m) => e.fichas[0][m.f] === -1), 'con un 5 hay que sacar');
  // barrera rival a 3 casillas: no se puede pasar
  e.fichas[0] = [0, -1, -1, -1];
  const t = J._.casilla(e, 0, 3);
  const pr = (t - J._.salidaDe(J._.BRAZO.rojo) + 68) % 68;
  e.fichas[1] = [pr, pr, -1, -1];
  assert.equal(J._.destino(e, 0, 0, 5, true), null, 'no se pasa una barrera');
  // comer fuera de seguro
  e.fichas[1] = [pr, -1, -1, -1];
  const d = J._.destino(e, 0, 0, 3, true);
  assert.equal(!!d.come, !J._.SEGUROS.has(t));
  for (let k = 0; k < 30; k++) {
    const g = J.nuevo([2, 3, 4][k % 3]);
    for (let i = 0; i < 30000 && !J.fin(g); i++) { const tt = J.turno(g); assert.ok(J.accion(g, tt, J.bot(g, tt, 'dificil', Math.random)).ok); }
    assert.ok(J.fin(g));
  }
});

test('Juegos de fiesta: impostor, stop, dibujo y hombre lobo (reglas básicas)', () => {
  const I = JUEGOS.impostor, S = JUEGOS.stop, D = JUEGOS.dibujo, L = JUEGOS.lobo;
  // impostor: no se puede decir la palabra; si le pillan y acierta, gana igual
  const i = I.nuevo(4);
  const civil = (i.impostor + 1) % 4;
  i.turno = civil;
  assert.match(I.accion(i, civil, { tipo: 'pista', texto: i.palabra }).error, /No puedes decir la palabra/);
  // stop: puntuación 20 / 10 / 5 y tachar
  const s = S.nuevo(3); const l = s.letra.toLowerCase();
  S.accion(s, 0, { tipo: 'stop', resp: Object.fromEntries([0, 1, 2, 3, 4, 5, 6, 7].map((k) => [k, l + 'aaa' + k])) });
  S.accion(s, 1, { tipo: 'guardar', resp: { 0: l + 'aaa0' } });
  S.tiempo(s, Date.now() + 10000);
  S.accion(s, 1, { tipo: 'vetar', j: 0, c: 2 }); S.accion(s, 2, { tipo: 'vetar', j: 0, c: 2 });
  for (let j = 0; j < 3; j++) S.accion(s, j, { tipo: 'listo' });
  assert.equal(s.tabla.filas[0].fila[0].pts, 5);
  assert.equal(s.tabla.filas[1].fila[0].pts, 20);
  assert.equal(s.tabla.filas[2].fila[0].ok, false, 'tachada por la mayoría');
  // dibujo: el trazo va como evento sin vista; acertar puntúa
  const d = D.nuevo(3);
  D.accion(d, d.dibuja, { tipo: 'elegir', i: 0 });
  const r = D.accion(d, d.dibuja, { tipo: 'trazo', c: 0, g: 1, p: [1, 2, 3, 4], nuevo: true });
  assert.ok(r.sinVista && r.evento.tipo === 'trazo');
  D.accion(d, (d.dibuja + 1) % 3, { tipo: 'adivinar', texto: d.palabra.toUpperCase() });
  assert.ok(d.puntos[(d.dibuja + 1) % 3] > 0 && d.puntos[d.dibuja] === 25);
  // hombre lobo: nadie ve los papeles ajenos (salvo los lobos entre ellos)
  const h = L.nuevo(8);
  const aldeano = h.papeles.indexOf('aldeano');
  const visibles = L.vista(h, aldeano).papeles.filter((p, k) => p && k !== aldeano);
  assert.equal(visibles.length, 0);
  const lobo = h.papeles.indexOf('lobo');
  assert.equal(L.vista(h, lobo).papeles.filter((p) => p === 'lobo').length, 2);
});

test('Arqueros y Billar: física en el servidor y partidas completas', () => {
  const A = JUEGOS.arqueros, B = JUEGOS.billar;
  const a = A.nuevo(2);
  assert.ok(A.accion(a, 0, { tipo: 'disparar', ang: 45, fuerza: 0.6 }).ok);
  assert.ok(a.ultimo.puntos.length > 5, 'manda la trayectoria');
  assert.equal(a.turno, 1);
  for (let k = 0; k < 10; k++) jugar(A, 2, ['normal', 'dificil'], k + 1);
  const b = B.nuevo();
  assert.ok(B.accion(b, 0, { tipo: 'tirar', ang: 0, fuerza: 1 }).ok, 'saque');
  assert.ok(b.ultimo.fotos.length > 10, 'manda los fotogramas');
  // falta: meter la blanca da bola en mano al rival
  const c = B.nuevo(); c.saque = false;
  c.b[0].x = 60; c.b[0].y = 60;
  B.accion(c, 0, { tipo: 'tirar', ang: Math.atan2(-60, -60), fuerza: 0.4 });
  assert.equal(c.enMano, true); assert.equal(c.turno, 1);
  for (let k = 0; k < 4; k++) jugar(B, 2, ['dificil', 'dificil'], k + 7);
});

test('Tiempo real: tanques y cabezones terminan; Fuego y Agua reenvía y sus niveles se pueden pasar', () => {
  const Tq = JUEGOS.tanques, Cb = JUEGOS.cabezones, FA = JUEGOS.fuegoagua;
  const t = Tq.nuevo(3); Tq.configurar(t, [0, 1, 2].map(() => ({ bot: true, nivel: 'dificil' })));
  for (let s = 0; s < 30 * 60 * 20 && !Tq.fin(t); s++) Tq.paso(t, 1 / 30);
  assert.ok(Tq.fin(t), 'la partida de tanques termina');
  assert.ok(Tq.accion(t, 0, { tipo: 'teclas', k: 255 }).sinVista);
  const c = Cb.nuevo(2); Cb.configurar(c, [{ bot: true, nivel: 'normal' }, { bot: true, nivel: 'dificil' }]);
  for (let s = 0; s < 30 * 120 && !Cb.fin(c); s++) Cb.paso(c, 1 / 30);
  assert.ok(Cb.fin(c), 'el partido acaba a los 90 s');
  const f = FA.nuevo(2);
  assert.equal(FA.accion(f, 1, { tipo: 'foto', f: {} }).ok, false, 'solo el anfitrión manda fotos');
  assert.equal(FA.accion(f, 0, { tipo: 'teclas', k: 1 }).ok, false, 'el anfitrión no manda teclas');
  for (let n = 0; n < 4; n++) assert.ok(FA.accion(f, 0, { tipo: 'nivel', n, segundos: 30 }).ok);
  assert.ok(FA.fin(f));
  // niveles: medidas y caminos (saltos de 3 de alto y 4 de largo)
  const NIV = require('../app/client/js/juegos/fuegoagua-niveles.js');
  const SOLIDO = new Set(['#', 'r', 'w', 'g', 'D']);
  for (const nv of NIV) {
    const m = nv.mapa.map((x) => x.split(''));
    assert.ok(m.length === 20 && m.every((x) => x.length === 30), nv.nombre);
    for (const [ini, mata, gema, puerta] of [['1', 'wg', 'R', 'F'], ['2', 'rg', 'B', 'A']]) {
      const libre = (x, y) => y >= 0 && y < 20 && x >= 0 && x < 30 && (!SOLIDO.has(m[y][x]) || m[y][x] === 'D');
      const pie = (x, y) => y + 1 < 20 && SOLIDO.has(m[y + 1][x]) && m[y + 1][x] !== 'D' && !mata.includes(m[y + 1][x]);
      const pos = []; for (let y = 0; y < 20; y++) for (let x = 0; x < 30; x++) if (libre(x, y) && pie(x, y)) pos.push([x, y]);
      let s; m.forEach((fila, y) => fila.forEach((ch, x) => { if (ch === ini) s = [x, y]; }));
      const visto = new Set([s.join()]), cola = [s];
      while (cola.length) { const [x, y] = cola.shift(); for (const [x2, y2] of pos) { if (visto.has(`${x2},${y2}`)) continue; const dy = y2 - y, dx = Math.abs(x2 - x); if (dy < -3 || dx > 4 + Math.max(0, dy)) continue; let b = false; for (let yy = Math.min(y, y2) - (dy < 0 ? 1 : 0); yy <= y2; yy++) if (!libre(x2, yy)) b = true; if (!b) { visto.add(`${x2},${y2}`); cola.push([x2, y2]); } } }
      const llega = (ch) => m.every((fila, y) => fila.every((c2, x) => c2 !== ch || [...visto].some((v) => { const [vx, vy] = v.split(',').map(Number); return Math.abs(vx - x) <= 1 && vy >= y && vy - y <= 3; })));
      assert.ok(llega(gema) && llega(puerta), `${nv.nombre}: ${ini === '1' ? 'Fuego' : 'Agua'} no llega a todo`);
    }
  }
});

test('Letras revueltas: tableros con palabras, validación de rutas, CPUs y 3 rondas', () => {
  const J = JUEGOS.revueltas;
  const e = J.nuevo(2);
  J.configurar(e, [{ bot: false }, { bot: true, nivel: 'dificil' }]);
  assert.ok(e.sol.size >= 40, `pocas palabras: ${e.sol.size}`);
  assert.equal(J.vista(e, 0).total, null, 'no se ve cuántas hay mientras se juega');
  assert.ok(!JSON.stringify(J.vista(e, 0)).includes('"sol"'));
  const [w, ruta] = [...e.sol.entries()][0];
  const r = J.accion(e, 0, { tipo: 'palabra', ruta });
  assert.ok(r.ok, r.error); assert.equal(r.evento.w, w);
  assert.equal(J.accion(e, 0, { tipo: 'palabra', ruta }).ok, false, 'repetida');
  assert.equal(J.accion(e, 0, { tipo: 'palabra', ruta: [0, 5, 15] }).ok, false, 'letras separadas');
  assert.equal(J.accion(e, 0, { tipo: 'palabra', ruta: [0, 1, 0] }).ok, false, 'casilla repetida');
  for (let ronda = 1; ronda <= 3; ronda++) {
    J.tiempo(e, e.inicio + 50000);
    J.tiempo(e, e.hasta + 1);
    assert.equal(e.fase, 'resultado');
    assert.ok(e.halladas[1].length > 5, 'la CPU encuentra palabras');
    if (ronda < 3) { assert.ok(J.accion(e, 1, { tipo: 'seguir' }).ok); assert.equal(e.ronda, ronda + 1); }
  }
  const f = J.fin(e);
  assert.ok(f && f.ganadores.length);
  assert.ok(e.puntos[1] > 0);
});

test('Ruleta del saber: partidas entre CPUs, no se filtra la respuesta y el tiempo cuenta como fallo', () => {
  const J = JUEGOS.saber;
  let dificil = 0, normal = 0;
  for (let k = 0; k < 40; k++) {
    const { f } = jugar(J, 2, k % 2 ? ['normal', 'dificil'] : ['dificil', 'normal'], k + 7);
    if (f.ganadores.length !== 1) continue;
    if ((k % 2 ? 1 : 0) === f.ganadores[0]) dificil++; else normal++;
  }
  assert.ok(dificil > normal, `difícil ${dificil} – normal ${normal}`);
  const e = J.nuevo(3);
  assert.equal(J.accion(e, 1, { tipo: 'girar' }).ok, false, 'no es su turno');
  do { e.fase = 'girar'; J.accion(e, 0, { tipo: 'girar' }); } while (e.fase !== 'responder');
  const v = J.vista(e, 0);
  assert.equal(v.preg.opciones.length, 4);
  assert.ok(!('correcta' in v.preg), 'la correcta no viaja');
  J.tiempo(e, e.hasta + 1);
  assert.equal(e.turno, 1, 'se acabó el tiempo: pasa el turno');
  assert.equal(e.ultima.bien, false);
});

test('Teléfono dibujado: cada cadena pasa por todos, el tiempo rellena huecos y el repaso no filtra', () => {
  const J = JUEGOS.telefono;
  const e = J.nuevo(4);
  for (let j = 0; j < 4; j++) assert.ok(J.accion(e, j, { tipo: 'listo', frase: `frase de ${j}` }).ok);
  assert.equal(e.paso, 1, 'todos listos: siguiente paso');
  const v = J.vista(e, 2);
  assert.equal(v.tipo, 'dibujo'); assert.equal(v.anterior.frase, 'frase de 1', 'dibuja la frase de la persona anterior');
  assert.ok(J.accion(e, 2, { tipo: 'guardar', trazos: [{ c: 3, g: 1, p: [1, 2, 300, 400] }, { p: 'malo' }] }).ok);
  J.tiempo(e, e.hasta + 1); // se acaba el tiempo: quien no dibujó deja la hoja en blanco
  assert.equal(e.paso, 2);
  assert.equal(J.vista(e, 3).anterior.trazos.length, 1, 'recibe el dibujo de 2');
  J.tiempo(e, e.hasta + 1); J.tiempo(e, e.hasta + 1);
  assert.equal(e.fase, 'revelar');
  for (const c of e.cadenas) { assert.equal(c.length, 4); assert.equal(new Set(c.map((x) => x.j)).size, 4, 'cada cadena pasa por todos'); }
  const r = J.vista(e, 0);
  assert.equal(r.revela.items.length, 1); assert.ok(!('cadenas' in r));
  for (let k = 0; k < 16; k++) J.accion(e, 1, { tipo: 'siguiente' });
  assert.ok(J.fin(e));
});

test('Palabrería: reglas de colocación, puntos, la CPU juega partidas enteras y no se filtra la bolsa', () => {
  const J = JUEGOS.palabreria;
  const e = J.nuevo(2);
  const { validar } = J._;
  assert.match(validar(e, [{ f: 0, c: 0, l: 'c' }, { f: 0, c: 1, l: 'a' }]).error, /estrella/);
  assert.match(validar(e, [{ f: 7, c: 6, l: 'c' }, { f: 7, c: 8, l: 'a' }]).error, /seguidas/);
  assert.match(validar(e, [{ f: 7, c: 7, l: 'c' }, { f: 8, c: 8, l: 'a' }]).error, /misma fila/);
  assert.match(validar(e, [{ f: 7, c: 7, l: 'x' }, { f: 7, c: 8, l: 'q' }]).error, /diccionario/);
  const r = validar(e, [{ f: 7, c: 7, l: 'c' }, { f: 7, c: 8, l: 'a' }, { f: 7, c: 9, l: 's' }, { f: 7, c: 10, l: 'a' }]);
  assert.equal(r.puntos, (3 + 1 + 1 + 1) * 2, 'CASA en el centro: doble palabra');
  e.atriles[0] = ['c', 'a', 's', 'a', 'e', 'e', 'e'];
  assert.ok(J.accion(e, 0, { tipo: 'jugar', fichas: r.puestas }).ok);
  assert.match(validar(e, [{ f: 0, c: 0, l: 'a' }, { f: 0, c: 1, l: 'l' }]).error, /tocar/);
  const v = J.vista(e, 1);
  assert.ok(!('bolsa' in v && Array.isArray(v.bolsa)) && !('atriles' in v), 'ni bolsa ni atriles ajenos');
  assert.equal(v.atril.length, 7);
  const { f } = jugar(J, 2, ['dificil', 'normal'], 3);
  assert.ok(f.ganadores.length >= 1);
});

test('Células: la CPU crece, se come a otras, se reaparece y la partida acaba a los 4 minutos', () => {
  const J = JUEGOS.celulas;
  const e = J.nuevo(2);
  J.configurar(e, [{ bot: false }, { bot: true, nivel: 'dificil' }]);
  assert.equal(e.jug.length, 14, 'se rellena hasta 14');
  const v = J.vista(e, 0);
  assert.ok(v.comida.length > 400);
  for (let k = 0; k < 30 * 245 && !J.fin(e); k++) { J.paso(e, 1 / 30); if (k % 3 === 0) J.foto(e); }
  const f = J.fin(e);
  assert.ok(f, 'termina'); assert.ok(e.jug.some((p) => p.max > 100), 'alguien crece');
  assert.ok(f.ganadores.every((j) => j === 0 || j === 1), 'gana una persona de la sala (o su CPU)');
});

test('Serpientes: crecen, chocan y se convierten en bolitas, y la partida acaba', () => {
  const J = JUEGOS.serpientes;
  const e = J.nuevo(1);
  J.configurar(e, [{ bot: true, nivel: 'dificil' }]);
  let muertes = 0;
  const vivas = () => e.jug.filter((p) => p.vivo).length;
  for (let k = 0; k < 30 * 245 && !J.fin(e); k++) { const antes = vivas(); J.paso(e, 1 / 30); if (vivas() < antes) muertes++; if (k % 3 === 0) J.foto(e); }
  assert.ok(J.fin(e), 'termina');
  assert.ok(muertes > 0, 'hay choques');
  assert.ok(e.jug.some((p) => p.max > 40), 'alguna crece');
  assert.ok(Object.keys(J.vista(e, 0).cuerpos).length > 0);
});

test('Territorio: rodear captura, pisar un rastro mata y la partida acaba', () => {
  const J = JUEGOS.territorio;
  const e = J.nuevo(1);
  J.configurar(e, [{ bot: false }]);
  J.paso(e, 0.01); // reaparecen todos
  const p = e.jug[0];
  // a mano: casa en (10,10), salir 3 a la derecha, bajar 3, volver
  for (let k = 0; k < 64 * 64; k++) { e.dueno[k] = -1; e.rastro[k] = -1; }
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) e.dueno[(10 + dy) * 64 + 10 + dx] = p.i;
  Object.assign(p, { cx: 11, cy: 10, d: 0, prog: 0, fuera: 0, sig: null });
  for (const o of e.jug.slice(1)) Object.assign(o, { cx: 50, cy: 50, vivo: false, espera: 999 });
  const mover = (d, n) => { p.mando = { a: 0, f: 0, x: [1, 0, -1, 0][d], y: [0, 1, 0, -1][d], k: 0 }; for (let i = 0; i < n; i++) J.paso(e, 1 / 6.5 + 1e-6); };
  mover(0, 3); mover(1, 4); mover(2, 3); mover(3, 3);
  assert.ok(p.vivo);
  assert.ok(e.dueno[(12) * 64 + 13] === p.i, 'lo rodeado es suyo');
  assert.ok(e.dueno.filter((d) => d === p.i).length > 15);
  const e2 = J.nuevo(1); J.configurar(e2, [{ bot: true, nivel: 'dificil' }]);
  let muertes = 0;
  for (let k = 0; k < 30 * 245 && !J.fin(e2); k++) { const a = e2.jug.filter((x) => x.vivo).length; J.paso(e2, 1 / 30); if (e2.jug.filter((x) => x.vivo).length < a) muertes++; if (k % 3 === 0) J.foto(e2); }
  assert.ok(J.fin(e2)); assert.ok(muertes > 0, 'hay cortes');
});

test('Tanques mejorables: disparo, experiencia, mejoras, clase y fin de partida', () => {
  const J = JUEGOS.blindados;
  const e = J.nuevo(1);
  J.configurar(e, [{ bot: false }]);
  J.paso(e, 0.01);
  const t = e.tanques.find((x) => x.p.j === 0);
  for (const q of e.tanques) if (q !== t) { q.x = 10; q.y = 10; }
  e.figs.clear(); e.figs.set(999, { id: 999, tipo: 'c', x: t.x + 150, y: t.y, rot: 0, hp: 10, vx: 0, vy: 0 });
  J.accion(e, 0, { tipo: 'mando', a: 0, f: 0, x: 0, y: 0, k: 4 });
  for (let k = 0; k < 60; k++) J.paso(e, 1 / 30);
  assert.equal(t.xp, 10, 'el cuadrado da 10');
  assert.equal(J.accion(e, 0, { tipo: 'mejora', s: 'dano' }).ok, false, 'sin puntos no hay mejora');
  t.xp = J._.xpNivel(10); t.nivel = 10; t.puntosLibres = 2;
  assert.ok(J.accion(e, 0, { tipo: 'mejora', s: 'recarga' }).ok);
  assert.equal(J.accion(e, 0, { tipo: 'mejora', s: 'nada' }).ok, false);
  assert.ok(J.accion(e, 0, { tipo: 'clase', c: 'doble' }).ok);
  assert.equal(J.accion(e, 0, { tipo: 'clase', c: 'francotirador' }).ok, false, 'solo una vez');
  assert.equal(J.vista(e, 0).mio.clase, 'doble');
  const e2 = J.nuevo(1); J.configurar(e2, [{ bot: true, nivel: 'dificil' }]);
  for (let k = 0; k < 30 * 245 && !J.fin(e2); k++) { J.paso(e2, 1 / 30); if (k % 3 === 0) J.foto(e2); }
  assert.ok(J.fin(e2)); assert.ok(e2.jug.some((p) => p.max > 300), 'alguien sube de nivel');
});

test('La Oca: casillas especiales, rebote y partidas que acaban', () => {
  const J = JUEGOS.oca;
  const e = J.nuevo(2);
  J._.tirar(e, 0, 5); assert.equal(e.pos[0], 9); assert.equal(e.turno, 0, 'de oca a oca y tiro');
  e.pos[0] = 60; J._.tirar(e, 0, 5); assert.equal(e.pos[0], 61, 'rebota en la 63');
  e.pos[1] = 55; e.turno = 1; J._.tirar(e, 1, 3); assert.equal(e.pos[1], 0, 'la muerte');
  e.pos[0] = 50; e.turno = 0; J._.tirar(e, 0, 2); assert.equal(e.castigo[0], 2, 'cárcel');
  for (let k = 0; k < 20; k++) jugar(J, 2 + (k % 5), ['normal'], k + 1);
});

test('Damas chinas: pasos y saltos encadenados, la CPU difícil gana a la normal', () => {
  const J = JUEGOS.chinas;
  const e = J.nuevo(2);
  assert.equal(e.t.filter((x) => x === 0).length, 10);
  // la punta de destino es la opuesta: su vértice es el simétrico del de salida
  for (let p = 0; p < 6; p++) { const a = J._.CELDAS[J._.VERTICE[p]], b = J._.CELDAS[J._.VERTICE[J._.CONTRARIA[p]]]; assert.deepEqual(a.map((x) => -x), b, `punta ${p}`); }
  const de = e.t.findIndex((x, i) => x === 0 && J._.destinos(e, i).size > 0);
  assert.ok(de >= 0, 'alguna ficha puede moverse al empezar');
  assert.equal(J.accion(e, 1, { tipo: 'mover', de, a: [...J._.destinos(e, de).keys()][0] }).ok, false, 'no es su turno');
  let dif = 0, nor = 0;
  for (let k = 0; k < 10; k++) { const { f } = jugar(J, 2, k % 2 ? ['normal', 'dificil'] : ['dificil', 'normal'], k + 3); if (f.ganadores.length === 1) { if (f.ganadores[0] === (k % 2 ? 1 : 0)) dif++; else nor++; } }
  assert.ok(dif > nor, `difícil ${dif} – normal ${nor}`);
  jugar(J, 6, ['normal'], 9);
});

test('Dominó: abre el seis doble, encajar, pases automáticos y partidas a 100', () => {
  const J = JUEGOS.domino;
  const e = J.nuevo(4);
  const t = e.turno;
  assert.ok(e.manos[t].some(([a, b]) => a === 6 && b === 6));
  const i = e.manos[t].findIndex(([a, b]) => a === 6 && b === 6);
  const otra = e.manos[t].findIndex(([a, b]) => !(a === 6 && b === 6));
  assert.equal(J.accion(e, t, { tipo: 'poner', i: otra }).ok, false, 'se abre con el seis doble');
  assert.ok(J.accion(e, t, { tipo: 'poner', i }).ok);
  assert.deepEqual(e.extremos, [6, 6]);
  assert.equal(J.vista(e, (t + 1) % 4).mia.length, 7);
  assert.ok(!('manos' in J.vista(e, 0)), 'no se ven las manos ajenas');
  for (let k = 0; k < 10; k++) jugar(J, 4, ['dificil', 'normal'], k + 11);
});

test('Mentiroso de dados: apuestas que suben, comodines, dudar y fin', () => {
  const J = JUEGOS.mentiroso;
  const e = J.nuevo(3);
  assert.ok(J.accion(e, 0, { tipo: 'apostar', q: 3, cara: 4 }).ok);
  assert.equal(J.accion(e, 1, { tipo: 'apostar', q: 3, cara: 2 }).ok, false, 'misma cantidad, cara más baja');
  assert.ok(J.accion(e, 1, { tipo: 'apostar', q: 2, cara: 1 }).ok, 'a unos basta la mitad');
  assert.equal(J.accion(e, 2, { tipo: 'apostar', q: 4, cara: 5 }).ok, false, 'volver de unos pide el doble más uno');
  assert.ok(J.accion(e, 2, { tipo: 'apostar', q: 5, cara: 5 }).ok);
  const v = J.vista(e, 0); assert.equal(v.mios.length, 5); assert.ok(!('cubiletes' in v));
  assert.ok(J.accion(e, 0, { tipo: 'dudar' }).ok);
  assert.equal(e.dados.reduce((s, x) => s + x, 0), 14, 'alguien pierde un dado');
  J.tiempo(e, e.hasta + 1); assert.equal(e.revelado, null);
  for (let k = 0; k < 10; k++) { const e2 = J.nuevo(4); let s = 0; while (!J.fin(e2) && s++ < 5000) { if (e2.revelado) { J.accion(e2, 0, { tipo: 'seguir' }); continue; } const t = J.turno(e2); assert.ok(J.accion(e2, t, J.bot(e2, t, 'dificil', Math.random)).ok); } assert.ok(J.fin(e2)); }
});

test('Palabras en clave: solo los jefes ven colores, pistas válidas, turnos y asesino', () => {
  const J = JUEGOS.clave;
  const e = J.nuevo(4);
  assert.ok(J.vista(e, 2).colores.every((c) => c === -1), 'un adivinador no ve colores');
  assert.ok(J.vista(e, 0).colores.every((c) => c >= 0), 'el jefe sí');
  assert.equal(J.accion(e, 0, { tipo: 'pista', palabra: e.palabras[0], n: 1 }).ok, false, 'no vale una palabra del tablero');
  assert.ok(J.accion(e, 0, { tipo: 'pista', palabra: 'xilófono', n: 2 }).ok);
  assert.equal(J.accion(e, 1, { tipo: 'tocar', i: 0 }).ok, false, 'no es su equipo');
  const mia = e.colores.findIndex((c) => c === 0);
  assert.ok(J.accion(e, 2, { tipo: 'tocar', i: mia }).ok); assert.equal(e.turno, 0, 'acierta y sigue');
  const neutral = e.colores.findIndex((c, i) => c === 2 && !e.abiertas[i]);
  assert.ok(J.accion(e, 2, { tipo: 'tocar', i: neutral }).ok); assert.equal(e.turno, 1, 'neutral: pasa el turno');
  assert.ok(J.accion(e, 1, { tipo: 'pista', palabra: 'zzz', n: 1 }).ok);
  assert.ok(J.accion(e, 3, { tipo: 'tocar', i: e.colores.indexOf(3) }).ok);
  assert.deepEqual(J.fin(e).ganadores, [0, 2], 'tocar al asesino da la partida al otro equipo');
});

test('Tabú: palabras prohibidas automáticas, aciertos escritos, tarjeta oculta al equipo que adivina y fin', () => {
  const J = JUEGOS.tabu;
  const e = J.nuevo(4);
  assert.equal(e.describe, 0);
  assert.ok(J.accion(e, 0, { tipo: 'empezar' }).ok);
  assert.equal(J.vista(e, 2).carta, null, 'su compañero no ve la tarjeta'); assert.ok(J.vista(e, 1).carta, 'el rival sí');
  const [w, r] = require('../lib/juegos/fiesta2').TABU[e.carta];
  assert.ok(J.accion(e, 0, { tipo: 'pista', texto: `es como un ${r[0]}` }).ok);
  assert.equal(e.puntos[0], -1, 'tabú automático');
  const w2 = require('../lib/juegos/fiesta2').TABU[e.carta][0];
  assert.ok(J.accion(e, 2, { tipo: 'adivinar', texto: w2.toUpperCase() }).ok); assert.equal(e.puntos[0], 0, 'acierto escrito');
  assert.ok(J.accion(e, 3, { tipo: 'tabu' }).ok); assert.equal(e.puntos[0], -1, 'el rival pita');
  for (let k = 0; k < 20 && !J.fin(e); k++) { if (e.fase === 'listo') J.accion(e, e.describe, { tipo: 'empezar' }); J.tiempo(e, e.hasta + 1); }
  assert.ok(J.fin(e)); void w;
});

test('En la onda: la aguja oculta, puntos por cercanía y rondas', () => {
  const J = JUEGOS.onda;
  const e = J.nuevo(3);
  assert.equal(J.vista(e, 1).objetivo, null); assert.ok(J.vista(e, 0).objetivo >= 0);
  e.objetivo = 50;
  assert.ok(J.accion(e, 0, { tipo: 'pista', texto: 'una sopa' }).ok);
  assert.ok(J.accion(e, 1, { tipo: 'dial', v: e.objetivo + 3, listo: true }).ok);
  assert.ok(J.accion(e, 2, { tipo: 'dial', v: e.objetivo + 30, listo: true }).ok);
  assert.deepEqual(e.resultado.pts, [2, 4, 0]);
  while (!J.fin(e)) { J.tiempo(e, e.hasta + 1); }
  assert.ok(J.fin(e));
});

test('Farol: definiciones inventadas, voto (no la propia) y puntos', () => {
  const J = JUEGOS.farol;
  const e = J.nuevo(3);
  for (let j = 0; j < 3; j++) assert.ok(J.accion(e, j, { tipo: 'inventar', texto: `invento número ${j}` }).ok);
  assert.equal(e.fase, 'votar'); assert.equal(e.opciones.length, 4);
  const v = J.vista(e, 0); assert.ok(!JSON.stringify(v.opciones).includes('autor'));
  const real = e.opciones.findIndex((o) => o.autor < 0), de1 = e.opciones.findIndex((o) => o.autor === 1), de0 = e.opciones.findIndex((o) => o.autor === 0);
  assert.equal(J.accion(e, 0, { tipo: 'votar', o: de0 }).ok, false);
  J.accion(e, 0, { tipo: 'votar', o: real }); J.accion(e, 1, { tipo: 'votar', o: de0 }); J.accion(e, 2, { tipo: 'votar', o: de1 });
  assert.deepEqual(e.resultado.pts, [3, 1, 0]);
  while (!J.fin(e)) J.tiempo(e, e.hasta + 1);
});

test('Sin palabras: jugar en orden, perder vidas por cartas más bajas, estrella y CPUs que no se ven las cartas', () => {
  const J = JUEGOS.mente;
  const e = J.nuevo(2);
  e.manos = [[10], [5]]; e.fase = 'jugando';
  J._.jugar(e, 0); assert.equal(e.vidas, 1, 'el 5 era más bajo: vida menos'); assert.equal(e.fase, 'superado');
  assert.ok(J.accion(e, 0, { tipo: 'listo' }).ok); assert.equal(e.nivel, 2);
  J.accion(e, 1, { tipo: 'listo' }); assert.equal(e.fase, 'jugando');
  const antes = e.manos.map((m) => m.length);
  J.accion(e, 0, { tipo: 'estrella' }); J.accion(e, 1, { tipo: 'estrella' });
  assert.deepEqual(e.manos.map((m) => m.length), antes.map((x) => x - 1), 'la estrella quita la más baja de cada uno');
  assert.ok(!('manos' in J.vista(e, 0)));
  let ganadas = 0;
  for (let k = 0; k < 40; k++) { const f = J.nuevo(2); J.configurar(f, [{ bot: true, nivel: 'dificil' }, { bot: true, nivel: 'dificil' }]); let t = 0; while (!J.fin(f) && t < 4e7) { t += 100; J.tiempo(f, t); } assert.ok(J.fin(f)); if (!f.perdido) ganadas++; }
  assert.ok(ganadas > 0 && ganadas < 40, `ni siempre ni nunca: ${ganadas}/40`);
});

test('Desactiva la bomba: reglas, fallos, el manual no ve la bomba y tres bombas desactivadas', () => {
  const J = JUEGOS.bomba; const X = J._;
  assert.equal(X.cableCorrecto(['rojo', 'rojo', 'azul'], 'A1'), 2);
  assert.equal(X.cableCorrecto(['azul', 'amarillo', 'rojo', 'negro'], 'A3'), 0);
  assert.equal(X.cableCorrecto(['amarillo', 'rojo', 'azul', 'blanco', 'negro', 'rojo'], 'A2'), 1);
  const e = J.nuevo(2);
  X.accion(e, 0, { tipo: 'listo' }); X.accion(e, 1, { tipo: 'listo' }); assert.equal(e.fase, 'activa');
  assert.equal(J.vista(e, 1).serie, null, 'quien tiene el manual no ve la bomba'); assert.ok(J.vista(e, 1).manual);
  assert.equal(J.vista(e, 0).manual, null, 'quien tiene la bomba no ve el manual');
  assert.equal(X.accion(e, 1, { tipo: 'cortar', m: 0, c: 0 }).ok, false, 'solo la artificiera toca la bomba');
  const i = e.modulos.findIndex((m) => m.tipo === 'cables'), m = e.modulos[i];
  const malo = m.cables.findIndex((_, k) => k !== X.cableCorrecto(m.cables, e.serie));
  X.accion(e, 0, { tipo: 'cortar', m: i, c: malo }); assert.equal(e.fallos, 1);
  for (let b = 0; b < 3; b++) {
    if (e.fase === 'desactivada') { X.accion(e, 0, { tipo: 'listo' }); X.accion(e, 0, { tipo: 'listo' }); X.accion(e, 1, { tipo: 'listo' }); }
    const a = e.artificiero;
    e.modulos.forEach((md, k) => {
      if (md.tipo === 'cables') X.accion(e, a, { tipo: 'cortar', m: k, c: X.cableCorrecto(md.cables, e.serie) });
      if (md.tipo === 'simbolos') for (const s of X.ordenSimbolos(md)) X.accion(e, a, { tipo: 'simbolo', m: k, s });
      if (md.tipo === 'boton') {
        const t0 = Date.now(); X.accion(e, a, { tipo: 'boton', m: k, fase: 'abajo' }, t0);
        if (X.botonRapido(md, e.serie)) X.accion(e, a, { tipo: 'boton', m: k, fase: 'arriba' }, t0 + 100);
        else { const d = X.cifraTira(md.tira); let t = t0 + 1000; const lee = (tt) => { const s = Math.max(0, Math.ceil((e.hasta - tt) / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }; while (!lee(t).includes(d)) t += 1000; X.accion(e, a, { tipo: 'boton', m: k, fase: 'arriba' }, t); }
      }
    });
  }
  assert.deepEqual(J.fin(e).ganadores, [0, 1]);
  const f = J.nuevo(2); X.accion(f, 0, { tipo: 'listo' }); X.accion(f, 1, { tipo: 'listo' }); J.tiempo(f, f.hasta + 1); assert.ok(J.fin(f).texto.includes('BUM'));
});

test('La isla que se hunde: acciones, papeles, hundimientos y partidas entre CPUs que acaban', () => {
  const J = JUEGOS.isla;
  const e = J.nuevo(2);
  assert.equal(e.estado.filter((x) => x === 1).length, 6, 'empieza con 6 inundadas');
  const t = e.turno, aqui = e.donde[t];
  const v = J._.vecinas(e, aqui, e.roles[t] === 'explorador')[0];
  assert.ok(J.accion(e, t, { tipo: 'mover', a: v }).ok); assert.equal(e.acciones, 2);
  assert.equal(J.accion(e, 1 - t, { tipo: 'mover', a: aqui }).ok, false, 'no es su turno');
  // capturar con 4 cartas en la loseta de su tesoro
  const p = e.loseta.findIndex((l) => J._.LOSETAS[l].t === 'fuego'); e.estado[p] = 0; e.donde[t] = p; e.manos[t] = ['fuego', 'fuego', 'fuego', 'fuego'];
  assert.ok(J.accion(e, t, { tipo: 'capturar' }).ok); assert.deepEqual(e.capturados, ['fuego']);
  // hundir el helipuerto hace perder
  const f = J.nuevo(2); const h = f.loseta.indexOf(0); f.estado[h] = 1; f.inund.push(h); f.donde = f.donde.map(() => f.loseta.indexOf(1));
  J.accion(f, f.turno, { tipo: 'terminar' });
  while (!J.fin(f)) { f.estado[h] = 1; f.inund.push(h); J.accion(f, J.turno(f), J.bot(f, J.turno(f), 'normal', Math.random)); }
  assert.ok(J.fin(f));
  let ganadas = 0;
  for (let k = 0; k < 40; k++) { const g = J.nuevo(2); J.configurar(g, [{ bot: true, nivel: 'dificil' }, { bot: true, nivel: 'dificil' }]); let s = 0; while (!J.fin(g) && s++ < 5000) { const tt = J.turno(g); assert.ok(J.accion(g, tt, J.bot(g, tt, 'dificil', Math.random)).ok); } assert.ok(J.fin(g)); if (!g.perdido) ganadas++; }
});

test('Cocina loca: cortar, cocinar, montar y entregar un pedido; la carne se quema', () => {
  const J = JUEGOS.cocina;
  const e = J.nuevo(1); const c = e.chefs[0];
  const ir = (x, y, dx, dy) => { c.x = x + 0.5; c.y = y + 0.5; c.dx = dx; c.dy = dy; };
  const pulsar = () => { e.pulso[0] = true; J.paso(e, 0.01); };
  const cortar = () => { e.teclas[0] = 32; for (let i = 0; i < 120; i++) J.paso(e, 1 / 60); e.teclas[0] = 0; };
  e.pedidos = [{ id: 1, receta: 'ensalada', queda: 70, total: 75 }]; e.sigPedido = 999;
  ir(3, 1, 0, -1); pulsar(); assert.equal(c.lleva.tipo, 'lechuga');
  ir(1, 2, -1, 0); pulsar(); cortar(); pulsar(); assert.ok(c.lleva.cortado, 'lechuga cortada');
  ir(5, 2, 0, 1); pulsar(); assert.deepEqual(c.lleva.cosas, ['lechuga'], 'con un ingrediente listo, coger plato lo emplata');
  ir(1, 4, -1, 0); pulsar(); assert.equal(e.cosas['0,4'].tipo, 'plato', 'plato al mostrador');
  ir(1, 1, 0, -1); pulsar(); assert.equal(c.lleva.tipo, 'tomate');
  ir(1, 2, -1, 0); pulsar(); cortar(); pulsar();
  ir(1, 4, -1, 0); pulsar(); assert.deepEqual(e.cosas['0,4'].cosas, ['lechuga', 'tomate']);
  pulsar(); assert.equal(c.lleva.tipo, 'plato');
  ir(11, 1, 1, 0); pulsar();
  assert.ok(e.puntos >= 20, `entregado: ${e.puntos}`); assert.equal(e.pedidos.length, 0);
  // carne: cortar y al fogón; se hace y luego se quema
  ir(8, 1, 0, -1); pulsar(); ir(1, 2, -1, 0); pulsar(); cortar(); pulsar();
  ir(11, 4, 1, 0); pulsar(); assert.equal(e.cosas['12,4'].tipo, 'carne');
  for (let i = 0; i < 60 * 7; i++) J.paso(e, 1 / 60); assert.ok(J._.listo(e.cosas['12,4']), 'hecha');
  for (let i = 0; i < 60 * 7; i++) J.paso(e, 1 / 60); assert.ok(!J._.listo(e.cosas['12,4']), 'quemada');
  e.reloj = 0.01; J.paso(e, 0.1); assert.ok(J.fin(e));
});
