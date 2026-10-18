'use strict';
// Cocina loca (1-4, cooperativo, en tiempo real). Preparad los pedidos antes de que caduquen: coged
// ingredientes de los cajones, cortadlos en la tabla (mantener «usar»), cocinad la carne en el fogón (¡que no
// se queme!), montad el plato y entregadlo en la ventanilla. 3 minutos; según los puntos, de 0 a 3 estrellas.
// Teclas (bits): 1 arriba, 2 abajo, 4 izquierda, 8 derecha, 16 coger/soltar, 32 usar (cortar).
const MAPA = [
  'XTXLXXPXCXXXX',
  'X...........E',
  'K...........E',
  'K...XDDXX...X',
  'X...XXXXX...F',
  'X...XXXXX...F',
  'B...........X',
  'X...........X',
  'XXXKXXXXXFXXX',
];
const AN = MAPA[0].length, AL = MAPA.length, DURACION = 180, V = 4.2;
const CAJON = { T: 'tomate', L: 'lechuga', P: 'pan', C: 'carne' };
const RECETAS = { ensalada: ['lechuga', 'tomate'], hamburguesa: ['pan', 'carne'], bocadillo: ['pan', 'lechuga', 'tomate'] };
const PUNTOS = { ensalada: 20, hamburguesa: 30, bocadillo: 35 };
const celda = (x, y) => (x < 0 || y < 0 || x >= AN || y >= AL ? 'X' : MAPA[y][x]);
const suelo = (x, y) => celda(x, y) === '.';
// un ingrediente vale para el plato si está listo: lechuga y tomate cortados, carne cortada y hecha (no quemada)
const listo = (it) => it && it.tipo !== 'plato' && ((it.tipo === 'pan') || ((it.tipo === 'lechuga' || it.tipo === 'tomate') && it.cortado) || (it.tipo === 'carne' && it.cortado && it.hecho >= 1 && it.hecho < 2));
const encaja = (plato, it) => listo(it) && !plato.cosas.includes(it.tipo) && Object.values(RECETAS).some((r) => [...plato.cosas, it.tipo].every((c) => r.includes(c)));

function nuevo(n) {
  const salidas = [[2, 1], [10, 1], [2, 7], [10, 7]];
  const e = { n, reloj: DURACION, puntos: 0, entregados: 0, caducados: 0, ganador: null, cambio: true, sigPedido: 2, sigId: 1, pedidos: [], cosas: {}, teclas: Array(n).fill(0), pulso: Array(n).fill(false) };
  e.chefs = Array.from({ length: n }, (_, j) => ({ x: salidas[j][0] + 0.5, y: salidas[j][1] + 0.5, dx: 0, dy: -1, lleva: null, cortando: 0 }));
  return e;
}
const k = (x, y) => `${x},${y}`;
function frente(c) { return [Math.floor(c.x + c.dx * 0.75), Math.floor(c.y + c.dy * 0.75)]; }
function coger(e, c) {
  const [fx, fy] = frente(c), t = celda(fx, fy), clave = k(fx, fy), aqui = e.cosas[clave];
  if (CAJON[t]) { if (!c.lleva) c.lleva = { tipo: CAJON[t], cortado: CAJON[t] === 'pan', hecho: 0 }; else if (c.lleva.tipo === 'plato' && encaja(c.lleva, { tipo: CAJON[t], cortado: CAJON[t] === 'pan', hecho: 0 })) c.lleva.cosas.push(CAJON[t]); return; }
  if (t === 'D') { if (!c.lleva) c.lleva = { tipo: 'plato', cosas: [] }; else if (listo(c.lleva)) c.lleva = { tipo: 'plato', cosas: [c.lleva.tipo] }; return; }
  if (t === 'B') { if (c.lleva) c.lleva = c.lleva.tipo === 'plato' ? { tipo: 'plato', cosas: [] } : null; return; }
  if (t === 'E') {
    if (!c.lleva || c.lleva.tipo !== 'plato' || !c.lleva.cosas.length) return;
    const ped = e.pedidos.filter((p) => { const r = RECETAS[p.receta]; return r.length === c.lleva.cosas.length && r.every((x) => c.lleva.cosas.includes(x)); }).sort((a, b) => a.queda - b.queda)[0];
    if (ped) { const extra = Math.round(ped.queda / ped.total * 10); e.puntos += PUNTOS[ped.receta] + extra; e.entregados++; e.pedidos = e.pedidos.filter((p) => p !== ped); e.aviso = { tipo: 'bien', texto: `+${PUNTOS[ped.receta] + extra}`, id: e.sigId++ }; }
    else e.aviso = { tipo: 'mal', texto: 'Nadie ha pedido eso', id: e.sigId++ };
    c.lleva = null; e.cambio = true; return;
  }
  if (!'XKF'.includes(t)) return;
  if (!c.lleva && aqui) { c.lleva = aqui; delete e.cosas[clave]; return; }
  if (c.lleva && !aqui) {
    if (t === 'F' && !(c.lleva.tipo === 'carne' && c.lleva.cortado)) return; // al fogón, solo carne cortada
    e.cosas[clave] = c.lleva; c.lleva = null; return;
  }
  if (c.lleva && aqui) { // combinar en el plato
    if (c.lleva.tipo === 'plato' && encaja(c.lleva, aqui)) { c.lleva.cosas.push(aqui.tipo); delete e.cosas[clave]; }
    else if (aqui.tipo === 'plato' && encaja(aqui, c.lleva)) { aqui.cosas.push(c.lleva.tipo); c.lleva = null; }
  }
}
function paso(e, dt) {
  if (e.ganador) return;
  e.reloj -= dt;
  // pedidos
  e.sigPedido -= dt;
  if (e.sigPedido <= 0 && e.pedidos.length < 4) { const rs = Object.keys(RECETAS); const r = rs[Math.floor(Math.random() * (e.reloj > 120 ? 2 : 3))]; e.pedidos.push({ id: e.sigId++, receta: r, queda: 75, total: 75 }); e.sigPedido = 22 - Math.min(8, e.n * 2); }
  for (const p of e.pedidos) p.queda -= dt;
  if (e.pedidos.some((p) => p.queda <= 0)) { e.caducados += e.pedidos.filter((p) => p.queda <= 0).length; e.puntos = Math.max(0, e.puntos - 10 * e.pedidos.filter((p) => p.queda <= 0).length); e.pedidos = e.pedidos.filter((p) => p.queda > 0); e.aviso = { tipo: 'mal', texto: '¡Un pedido caducado! −10', id: e.sigId++ }; }
  // fogones
  for (const [clave, it] of Object.entries(e.cosas)) { const [x, y] = clave.split(',').map(Number); if (celda(x, y) === 'F' && it.tipo === 'carne') it.hecho = Math.min(2.5, it.hecho + dt / 6); }
  // cocineros
  e.chefs.forEach((c, j) => {
    const t = e.teclas[j];
    const mx = ((t & 8) ? 1 : 0) - ((t & 4) ? 1 : 0), my = ((t & 2) ? 1 : 0) - ((t & 1) ? 1 : 0);
    if (mx || my) { c.dx = mx; c.dy = mx ? 0 : my; if (mx && my) { c.dx = mx; c.dy = 0; } }
    const l = Math.hypot(mx, my) || 1;
    const nx = c.x + mx / l * V * dt, ny = c.y + my / l * V * dt, r = 0.32;
    const libre = (x, y) => [[x - r, y - r], [x + r, y - r], [x - r, y + r], [x + r, y + r]].every(([a, b]) => suelo(Math.floor(a), Math.floor(b))) && e.chefs.every((o) => o === c || Math.hypot(o.x - x, o.y - y) > 0.6);
    if (libre(nx, c.y)) c.x = nx; if (libre(c.x, ny)) c.y = ny;
    if (e.pulso[j]) { e.pulso[j] = false; coger(e, c); }
    // cortar: mantener «usar» delante de una tabla con algo sin cortar
    const [fx, fy] = frente(c), it = e.cosas[k(fx, fy)];
    if ((t & 32) && celda(fx, fy) === 'K' && it && !it.cortado && it.tipo !== 'plato' && it.tipo !== 'pan') { c.cortando += dt / 1.6; if (c.cortando >= 1) { it.cortado = true; c.cortando = 0; } } else c.cortando = 0;
  });
  if (e.reloj <= 0) { e.reloj = 0; const n = estrellas(e); e.ganador = n > 0 ? Array.from({ length: e.n }, (_, j) => j) : []; e.cambio = true; }
}
const estrellas = (e) => { const base = 40 + e.n * 25; return e.puntos >= base * 2.2 ? 3 : e.puntos >= base * 1.4 ? 2 : e.puntos >= base * 0.7 ? 1 : 0; };
function accion(e, yo, a) {
  if (a.tipo !== 'teclas') return { ok: false, error: 'Acción desconocida' };
  const nuevo = Number(a.k) & 63;
  if ((nuevo & 16) && !(e.teclas[yo] & 16)) e.pulso[yo] = true; // se guarda la pulsación aunque sea muy corta
  e.teclas[yo] = nuevo;
  return { ok: true, sinVista: true };
}
const foto = (e) => ({ c: e.chefs.map((c) => [Math.round(c.x * 100) / 100, Math.round(c.y * 100) / 100, c.dx, c.dy, c.lleva, Math.round(c.cortando * 100) / 100]), o: e.cosas, p: e.pedidos.map((p) => [p.id, p.receta, Math.ceil(p.queda), p.total]), r: Math.ceil(e.reloj), pt: e.puntos, av: e.aviso || null });
const vista = (e) => ({ n: e.n, mapa: MAPA, recetas: RECETAS, foto: foto(e), puntos: e.puntos, entregados: e.entregados, caducados: e.caducados, estrellas: estrellas(e), ganadores: e.ganador });
const turno = () => -1;
const fin = (e) => (e.ganador ? { ganadores: e.ganador, texto: `${e.puntos} puntos · ${'★'.repeat(estrellas(e)) || 'sin estrellas'} (${e.entregados} pedidos)` } : null);
const bot = () => null;
module.exports = { id: 'cocina', min: 1, max: 4, sinCpu: true, tiempoReal: true, nuevo, paso, foto, vista, accion, turno, fin, bot, _: { coger, encaja, listo, RECETAS, celda } };
