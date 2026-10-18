'use strict';
// Genera las miniaturas de los juegos (pixel art suave: rejilla de 40×30 a 4 px = 160×120) y la ilustración
// de la portada (hero.svg, 120×80 a 4 px) en app/client/img/. Uso: node tools/miniaturas.js
const fs = require('node:fs');
const path = require('node:path');
const OUT = path.join(__dirname, '..', 'app', 'client', 'img');

// paleta del diseño (igual que en style.css)
const P = {
  tinta: '#1e1b2e', papel: '#fbf7ee', crema: '#f1e9d6', blanco: '#ffffff',
  tomate: '#ff5a36', tomateO: '#c93a1c', menta: '#18b39b', mentaO: '#0f7f6e', sol: '#ffc63d', solO: '#d99a12',
  cielo: '#4d7cfe', cieloO: '#2f55c4', uva: '#8a5cf6', uvaO: '#5b37b8', rosa: '#ff6fa8', rosaO: '#c8457a',
  verde: '#3fbf5f', verdeO: '#24863e', marron: '#9a5b2e', gris: '#9aa0b5', noche: '#23264f', nocheO: '#151838',
};

function lienzo(w, h) {
  const px = [];
  const R = (x, y, ww, hh, c) => { if (ww > 0 && hh > 0) px.push(`<rect x="${x}" y="${y}" width="${ww}" height="${hh}" fill="${c}"/>`); };
  // rectángulo con borde de tinta de 1 px
  const B = (x, y, ww, hh, c, borde = P.tinta) => { R(x, y, ww, hh, borde); R(x + 1, y + 1, ww - 2, hh - 2, c); };
  const D = (cx, cy, r, c) => { for (let y = -r; y <= r; y++) { const a = Math.floor(Math.sqrt(r * r - y * y + r * 0.6)); R(cx - a, cy + y, 2 * a + 1, 1, c); } };
  const DB = (cx, cy, r, c) => { D(cx, cy, r + 1, P.tinta); D(cx, cy, r, c); };
  // fondo liso con «tramado» de píxeles abajo y unos destellos
  const fondo = (c, o) => {
    R(0, 0, w, h, c);
    for (let y = h - 6; y < h; y++) for (let x = (y % 2); x < w; x += 2) if (y >= h - 3 || (x + y) % 4 === 0) R(x, y, 1, 1, o);
    for (const [x, y] of [[3, 3], [w - 5, 5], [7, 11], [w - 9, 13]]) R(x, y, 1, 1, P.blanco);
  };
  // dígitos de 3×5
  const DIG = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 6: '111100111101111', 8: '111101111101111' };
  const T = (txt, x, y, c) => { for (const ch of String(txt)) { const g = DIG[ch]; if (g) for (let i = 0; i < 15; i++) if (g[i] === '1') R(x + (i % 3), y + Math.floor(i / 3), 1, 1, c); x += 4; } };
  const svg = (escala = 4) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * escala}" height="${h * escala}" shape-rendering="crispEdges">${px.join('')}</svg>\n`;
  return { R, B, D, DB, fondo, T, svg };
}

// palos en miniatura (dentro de una carta de 9×13 con esquina en x,y)
const palo = (L, p, x, y) => {
  const cx = x + 4, cy = y + 6;
  if (p === 'oros') { L.D(cx, cy, 2, P.solO); L.D(cx, cy, 1, P.sol); }
  if (p === 'copas') { L.R(cx - 2, cy - 2, 5, 2, P.tomate); L.R(cx - 1, cy, 3, 1, P.tomate); L.R(cx, cy + 1, 1, 1, P.tomateO); L.R(cx - 1, cy + 2, 3, 1, P.tomateO); }
  if (p === 'espadas') { L.R(cx, cy - 3, 1, 5, P.cielo); L.R(cx - 2, cy + 1, 5, 1, P.cieloO); L.R(cx, cy + 2, 1, 2, P.cieloO); }
  if (p === 'bastos') { for (let k = 0; k < 6; k++) L.R(cx + 1 - Math.floor(k / 2), cy - 3 + k, 2, 1, P.verdeO); L.R(cx, cy - 3, 2, 2, P.verde); }
};
const carta = (L, x, y, p, n) => { L.B(x, y, 11, 15, P.blanco); palo(L, p, x + 1, y + 1); if (n) L.T(n, x + 1, y + 1, P.tinta); };

const M = {};
M.catan = (() => {
  const L = lienzo(40, 30); L.fondo(P.cielo, P.cieloO);
  const hexa = (cx, cy, c) => { for (let dy = -5; dy <= 5; dy++) { const a = 5 - Math.max(0, Math.abs(dy) - 2); L.R(cx - a - 1, cy + dy, 2 * a + 3, 1, P.tinta); } for (let dy = -4; dy <= 4; dy++) { const a = 4 - Math.max(0, Math.abs(dy) - 2); L.R(cx - a, cy + dy, 2 * a + 1, 1, c); } };
  hexa(14, 10, P.sol); hexa(26, 10, P.verde); hexa(8, 19, P.marron); hexa(20, 19, P.gris); hexa(32, 19, P.verde);
  L.B(18, 6, 5, 4, P.tomate); L.R(19, 4, 3, 2, P.tinta); L.R(20, 3, 1, 1, P.tinta);
  return L;
})();
M.swjack = (() => {
  const L = lienzo(40, 30); L.fondo(P.uva, P.uvaO);
  L.B(7, 4, 24, 22, P.sol); L.R(8, 5, 22, 2, P.solO);
  for (const x of [9, 16, 23]) { L.B(x, 9, 6, 9, P.blanco); L.R(x + 2, 11, 3, 1, P.tomate); L.R(x + 3, 12, 2, 1, P.tomate); L.R(x + 3, 13, 1, 3, P.tomate); }
  L.B(12, 20, 14, 3, P.tomate); L.R(32, 8, 1, 9, P.gris); L.DB(32, 7, 1, P.tomate);
  return L;
})();
M.brisca = (() => { const L = lienzo(40, 30); L.fondo(P.menta, P.mentaO); carta(L, 9, 7, 'oros', 1); carta(L, 21, 6, 'copas', 3); L.B(15, 19, 11, 6, P.crema); return L; })();
M.unidad = (() => {
  const L = lienzo(40, 30); L.fondo(P.tomate, P.tomateO);
  [[5, P.tomateO, P.sol], [12, P.sol, P.solO], [19, P.verde, P.verdeO], [26, P.cielo, P.cieloO]].forEach(([x, c, o], i) => {
    const y = 7 - (i === 1 || i === 2 ? 2 : 0);
    L.B(x, y, 10, 15, c, P.tinta); L.R(x + 1, y + 1, 8, 1, P.blanco); L.D(x + 5, y + 8, 3, P.blanco); L.T([7, 2, 4, 1][i], x + 4, y + 6, o);
  });
  return L;
})();
M.parchis = (() => {
  const L = lienzo(40, 30); L.fondo(P.cielo, P.cieloO);
  L.B(7, 1, 26, 28, '#fffaf0');
  L.R(8, 2, 10, 11, '#8fb0ff'); L.R(22, 2, 10, 11, '#ff8a72'); L.R(8, 17, 10, 11, '#ffd666'); L.R(22, 17, 10, 11, '#7fd98f');
  L.R(19, 2, 2, 11, '#ff8a72'); L.R(19, 17, 2, 11, '#ffd666'); L.R(8, 14, 10, 2, '#8fb0ff'); L.R(22, 14, 10, 2, '#7fd98f');
  L.R(18, 13, 4, 4, P.tinta);
  for (const [x, y, c] of [[12, 7, P.cieloO], [27, 7, P.tomate], [12, 22, P.solO], [27, 22, P.verdeO], [20, 9, P.tomate], [15, 15, P.cieloO]]) L.DB(x, y, 1, c);
  return L;
})();
M.cuatro = (() => {
  const L = lienzo(40, 30); L.fondo(P.sol, P.solO);
  L.B(6, 3, 28, 23, P.cielo);
  const rojas = [[3, 0], [2, 1], [1, 2], [3, 3]], amarillas = [[3, 1], [3, 2], [2, 2], [2, 3]];
  for (let f = 0; f < 4; f++) for (let c = 0; c < 5; c++) {
    const col = rojas.some(([a, b]) => a === f && b === c) ? P.tomate : amarillas.some(([a, b]) => a === f && b === c) ? P.sol : P.cieloO;
    L.R(9 + c * 5, 6 + f * 5, 3, 3, col); if (col !== P.cieloO) L.R(9 + c * 5, 6 + f * 5, 1, 1, P.blanco);
  }
  return L;
})();
M.dibujo = (() => {
  const L = lienzo(40, 30); L.fondo(P.sol, P.solO);
  L.B(5, 3, 30, 22, P.blanco);
  for (let x = 0; x < 18; x++) L.R(9 + x, 16 - Math.round(5 * Math.sin(x / 3)), 1, 1, P.cielo);
  L.DB(13, 9, 2, P.blanco); L.D(13, 9, 2, P.tomate); L.D(13, 9, 1, P.blanco);
  for (let k = 0; k < 9; k++) L.R(24 + k, 21 - k, 2, 2, k < 7 ? P.sol : P.rosa);
  L.R(23, 22, 1, 1, P.tinta);
  return L;
})();
M.lobo = (() => {
  const L = lienzo(40, 30); L.fondo(P.noche, P.nocheO);
  L.D(29, 8, 5, P.crema); L.R(27, 6, 2, 2, P.solO); L.R(31, 10, 1, 1, P.solO);
  for (const [x, y] of [[4, 4], [10, 9], [16, 3], [20, 12], [36, 17], [6, 14]]) L.R(x, y, 1, 1, P.blanco);
  // lobo aullando
  const lobo = [[10, 26, 10, 1], [11, 25, 9, 1], [12, 22, 8, 3], [13, 19, 6, 3], [14, 16, 4, 3], [15, 13, 3, 3], [16, 11, 2, 2], [18, 12, 1, 1]];
  for (const [x, y, w, h] of lobo) L.R(x, y, w, h, P.tinta);
  L.R(14, 12, 1, 2, P.tinta); L.R(17, 14, 1, 1, P.sol);
  L.R(0, 26, 40, 4, P.nocheO);
  return L;
})();
M.serpiente = (() => {
  const L = lienzo(40, 30); L.fondo(P.verde, P.verdeO);
  for (let y = 0; y < 30; y += 4) for (let x = (y / 4) % 2 ? 0 : 4; x < 40; x += 8) L.R(x, y, 4, 4, '#47c968');
  const cuerpo = [[6, 18], [10, 18], [14, 18], [14, 14], [18, 14], [22, 14]];
  cuerpo.forEach(([x, y], i) => L.B(x, y, 5, 5, i % 2 ? P.sol : P.solO));
  L.B(26, 13, 6, 6, P.sol); L.R(29, 14, 1, 1, P.tinta); L.R(29, 17, 1, 1, P.tinta); L.R(32, 15, 2, 1, P.tomate);
  L.DB(33, 6, 2, P.tomate); L.R(33, 2, 1, 2, P.verdeO); L.R(32, 5, 1, 1, P.blanco);
  return L;
})();
M['2048'] = (() => {
  const L = lienzo(40, 30); L.fondo('#e8d9bf', '#c9b48e');
  L.B(5, 3, 30, 24, '#bba98f');
  const t = [[2, '#f4ecdf'], [4, '#efe0c6'], [8, '#f2b179'], [16, '#f59563'], [64, '#f65e3b'], [8, '#f2b179']];
  t.forEach(([n, c], i) => { const x = 7 + (i % 3) * 9, y = 5 + Math.floor(i / 3) * 11; L.B(x, y, 8, 9, c, '#8f7e66'); L.T(n, x + (n > 9 ? 0 : 2), y + 2, n > 4 ? P.blanco : '#776e65'); });
  return L;
})();
M.memoria = (() => {
  const L = lienzo(40, 30); L.fondo(P.rosa, P.rosaO);
  for (let k = 0; k < 8; k++) {
    const x = 5 + (k % 4) * 8, y = 4 + Math.floor(k / 4) * 11;
    if (k === 1 || k === 6) { L.B(x, y, 7, 10, P.blanco); L.R(x + 3, y + 3, 1, 1, P.sol); L.R(x + 2, y + 4, 3, 1, P.sol); L.R(x + 1, y + 5, 5, 1, P.sol); L.R(x + 2, y + 6, 3, 1, P.solO); }
    else { L.B(x, y, 7, 10, P.uva); L.R(x + 2, y + 2, 3, 1, P.blanco); L.R(x + 4, y + 3, 1, 2, P.blanco); L.R(x + 3, y + 5, 1, 1, P.blanco); L.R(x + 3, y + 7, 1, 1, P.blanco); }
  }
  return L;
})();
M.palabra = (() => {
  const L = lienzo(40, 30); L.fondo(P.uva, P.uvaO);
  const cols = [[P.verde, P.sol, P.gris, P.gris, P.verde], [P.verde, P.verde, P.sol, P.verde, P.verde], [P.verde, P.verde, P.verde, P.verde, P.verde]];
  cols.forEach((fila, f) => fila.forEach((c, k) => L.B(6 + k * 6, 4 + f * 7, 6, 6, c)));
  for (let k = 0; k < 5; k++) L.B(6 + k * 6, 25, 6, 4, P.blanco);
  return L;
})();
M.buscaminas = (() => {
  const L = lienzo(40, 30); L.fondo(P.gris, '#7c8296');
  L.B(6, 3, 28, 24, '#c9cede');
  for (let f = 0; f < 4; f++) for (let c = 0; c < 5; c++) { const x = 7 + c * 5 + (c ? 0 : 0), y = 4 + f * 5 + (f ? 1 : 0); const abierta = (f + c) % 3 !== 0; if (!abierta) { L.R(x, y, 5, 5, P.blanco); L.R(x + 1, y + 1, 4, 4, '#a8aec0'); } }
  L.T(1, 13, 10, P.cielo); L.T(2, 23, 15, P.verde); L.T(3, 18, 20, P.tomate);
  L.DB(28, 21, 2, P.tinta); L.R(29, 18, 1, 1, P.sol);
  L.R(10, 20, 1, 5, P.tinta); L.R(11, 20, 3, 2, P.tomate);
  return L;
})();
M.bloques = (() => {
  const L = lienzo(40, 30); L.fondo(P.noche, P.nocheO);
  L.B(10, 1, 20, 28, '#2b2f5e');
  const c = (x, y, col) => L.B(11 + x * 3, 2 + y * 3, 3, 3, col);
  [[0, 8, P.cielo], [1, 8, P.cielo], [2, 8, P.sol], [3, 8, P.sol], [4, 8, P.verde], [5, 8, P.tomate], [0, 7, P.uva], [1, 7, P.cielo], [3, 7, P.sol], [4, 7, P.verde], [5, 7, P.verde], [0, 6, P.uva], [5, 6, P.tomate]].forEach(([x, y, col]) => c(x, y, col));
  [[2, 2], [3, 2], [3, 3], [4, 3]].forEach(([x, y]) => c(x, y, P.tomate));
  [[1, 5], [2, 5], [2, 6], [2, 4]].forEach(([x, y]) => c(x, y, '#ff9f2e'));
  return L;
})();
M.solitario = (() => {
  const L = lienzo(40, 30); L.fondo(P.verde, P.verdeO);
  const cf = (x, y, rojo) => { L.B(x, y, 9, 13, P.blanco); const c = rojo ? P.tomate : P.tinta; L.R(x + 2, y + 2, 1, 2, c); L.R(x + 4, y + 5, 2, 3, c); L.R(x + 3, y + 6, 4, 1, c); };
  for (let k = 0; k < 4; k++) L.B(3 + k * 9, 2, 8, 10, k === 0 ? P.blanco : P.verdeO);
  L.R(5, 4, 1, 1, P.tinta); L.R(6, 6, 3, 3, P.tinta);
  cf(4, 14, false); cf(10, 16, true); cf(16, 18, false); cf(22, 14, true); cf(28, 15, false);
  return L;
})();
M.hundir = (() => {
  const L = lienzo(40, 30); L.fondo(P.cielo, P.cieloO);
  for (let y = 4; y < 28; y += 5) for (let x = (y % 2) * 3; x < 40; x += 7) L.R(x, y, 3, 1, '#7ea2ff');
  L.R(6, 15, 22, 4, P.gris); L.R(8, 19, 18, 2, '#7c8296'); L.R(12, 11, 8, 4, P.gris); L.R(15, 8, 2, 3, P.tinta); L.R(14, 12, 2, 2, P.cielo); L.R(18, 12, 2, 2, P.cielo);
  L.R(4, 15, 2, 2, P.gris); L.R(28, 16, 3, 2, P.gris);
  L.DB(31, 8, 3, P.sol); L.D(31, 8, 2, P.tomate); L.R(30, 7, 2, 2, P.blanco);
  for (const [x, y] of [[26, 4], [36, 6], [34, 12], [27, 11]]) L.R(x, y, 1, 1, P.sol);
  return L;
})();
M.damas = (() => {
  const L = lienzo(40, 30); L.fondo(P.marron, '#6e3f1d');
  L.B(6, 1, 28, 28, '#efe3c8');
  for (let f = 0; f < 7; f++) for (let c = 0; c < 7; c++) if ((f + c) % 2) L.R(7 + c * 4, 2 + f * 4, 4, 4, '#c08a5a');
  for (const [f, c, b] of [[0, 1, 0], [0, 3, 0], [1, 2, 0], [4, 1, 1], [5, 2, 1], [5, 4, 1], [6, 3, 1], [2, 5, 0]]) { L.DB(9 + c * 4, 4 + f * 4, 1, b ? P.blanco : P.tinta); }
  L.R(28, 22, 3, 1, P.sol); L.R(28, 21, 1, 1, P.sol); L.R(30, 21, 1, 1, P.sol);
  return L;
})();
M.ajedrez = (() => {
  const L = lienzo(40, 30); L.fondo(P.tinta, '#2a2640');
  for (let f = 0; f < 5; f++) for (let c = 0; c < 10; c++) L.R(c * 4, 10 + f * 4, 4, 4, (f + c) % 2 ? '#c08a5a' : '#efe3c8');
  const caballo = [[2, 0, 2], [1, 1, 5], [0, 2, 7], [0, 3, 3], [4, 3, 3], [0, 4, 2], [3, 4, 4], [3, 5, 4], [2, 6, 5], [1, 7, 7]];
  for (const [x, y, w] of caballo) L.R(9 + x, 3 + y, w, 1, P.crema);
  L.R(10, 5, 1, 1, P.tinta);
  const rey = [[3, 0, 2], [2, 1, 4], [3, 2, 2], [1, 3, 6], [0, 4, 8], [1, 5, 6], [2, 6, 4], [1, 7, 6], [0, 8, 8]];
  for (const [x, y, w] of rey) L.R(24 + x, 2 + y, w, 1, '#3a3456');
  L.R(24, 10, 8, 1, P.tinta);
  return L;
})();
M.tute = (() => {
  const L = lienzo(40, 30); L.fondo(P.uva, P.uvaO);
  carta(L, 5, 9, 'copas', 0); carta(L, 14, 7, 'oros', 0); carta(L, 23, 9, 'espadas', 0);
  for (const x of [8, 17, 26]) { L.R(x, 3 + (x === 17 ? -2 : 0), 5, 2, P.sol); L.R(x, 2 + (x === 17 ? -2 : 0), 1, 1, P.sol); L.R(x + 2, 2 + (x === 17 ? -2 : 0), 1, 1, P.sol); L.R(x + 4, 2 + (x === 17 ? -2 : 0), 1, 1, P.sol); }
  L.T(4, 33, 22, P.blanco); L.T(0, 33, 22, P.blanco);
  return L;
})();
M.chinchon = (() => {
  const L = lienzo(40, 30); L.fondo(P.tomate, P.tomateO);
  for (let k = 0; k < 4; k++) carta(L, 3 + k * 8, 6, 'copas', [4, 5, 6, 7][k]);
  L.R(3, 23, 34, 2, P.sol); L.R(3, 25, 34, 1, P.solO);
  return L;
})();
M.poquer = (() => {
  const L = lienzo(40, 30); L.fondo(P.verde, P.verdeO);
  L.B(3, 4, 34, 22, '#2f9a55'); L.R(4, 5, 32, 1, '#47c968');
  const naipe = (x, y, rojo, t) => { L.B(x, y, 9, 12, P.blanco); L.T(t, x + 2, y + 2, rojo ? P.tomate : P.tinta); L.R(x + 3, y + 8, 3, 2, rojo ? P.tomate : P.tinta); };
  naipe(8, 9, false, 1); naipe(16, 9, true, 1); naipe(24, 9, false, 8);
  for (const [x, y, c] of [[6, 22, P.tomate], [10, 22, P.cielo], [29, 21, P.sol], [32, 22, P.tomate]]) { L.DB(x, y, 2, c); L.R(x - 1, y, 3, 1, P.blanco); }
  return L;
})();
M.mus = (() => {
  const L = lienzo(40, 30); L.fondo(P.rosa, P.rosaO);
  carta(L, 3, 8, 'oros', 3); carta(L, 11, 6, 'copas', 3); carta(L, 19, 6, 'espadas', 0); carta(L, 27, 8, 'bastos', 1);
  L.R(4, 24, 32, 3, P.tinta); L.R(5, 25, 30, 1, P.sol);
  return L;
})();
M.impostor = (() => {
  const L = lienzo(40, 30); L.fondo(P.noche, P.nocheO);
  const cara = (x, c, gafas) => { L.B(x, 9, 9, 10, c); L.R(x + 2, 12, 2, 2, P.tinta); L.R(x + 5, 12, 2, 2, P.tinta); L.R(x + 3, 16, 3, 1, P.tinta); if (gafas) { L.R(x + 1, 12, 7, 1, P.tinta); L.R(x - 1, 8, 11, 2, P.tinta); L.R(x + 1, 6, 7, 2, P.tinta); } L.B(x + 1, 19, 7, 7, c); };
  cara(4, P.sol, false); cara(15, '#9aa0b5', true); cara(26, P.sol, false);
  L.R(17, 2, 5, 1, P.blanco); L.R(19, 1, 1, 3, P.blanco);
  return L;
})();
M.stop = (() => {
  const L = lienzo(40, 30); L.fondo(P.sol, P.solO);
  L.B(5, 4, 30, 22, P.blanco);
  for (let y = 9; y < 26; y += 4) L.R(6, y, 28, 1, '#c9d6ff');
  L.R(6, 4, 9, 22, '#fff1c7'); L.R(15, 4, 1, 22, P.tomate);
  L.T(1, 9, 6, P.tinta); L.T(2, 9, 10, P.tinta); L.T(3, 9, 14, P.tinta);
  L.DB(29, 9, 5, P.tomate); L.R(26, 8, 7, 2, P.blanco);
  for (let k = 0; k < 3; k++) L.R(18, 6 + k * 4, 7 + (k % 2) * 3, 1, P.cieloO);
  return L;
})();
M.burbujas = (() => {
  const L = lienzo(40, 30); L.fondo(P.noche, P.nocheO);
  const cols = [P.tomate, P.sol, P.verde, P.cielo, P.uva, P.rosa];
  for (let f = 0; f < 3; f++) for (let k = 0; k < 7 - (f % 2); k++) L.DB(4 + k * 5 + (f % 2) * 2, 3 + f * 4, 2, cols[(k * 3 + f * 2) % 6]);
  L.DB(20, 25, 2, P.verde); for (let k = 0; k < 6; k++) L.R(19 - k, 21 - k * 2, 1, 1, P.blanco);
  return L;
})();
M.torres = (() => {
  const L = lienzo(40, 30); L.fondo(P.verde, P.verdeO);
  L.R(0, 8, 14, 5, '#d9b27c'); L.R(10, 8, 5, 16, '#d9b27c'); L.R(10, 19, 30, 5, '#d9b27c');
  for (const [x, y, c] of [[4, 9, P.tomate], [12, 14, P.cielo], [18, 20, P.sol], [27, 20, P.rosa]]) { L.R(x, y, 3, 3, P.tinta); L.R(x, y, 2, 2, c); }
  L.B(18, 10, 6, 6, '#9a5b2e'); L.R(23, 12, 4, 2, P.tinta); L.B(30, 10, 6, 6, '#3a3456'); L.R(28, 12, 2, 2, P.tinta);
  return L;
})();
M.eras = (() => {
  const L = lienzo(40, 30); L.fondo('#9ad1ff', '#7fb8ff');
  L.R(0, 24, 40, 6, P.verde);
  L.B(1, 12, 9, 12, '#9a5b2e'); L.R(2, 12, 7, 2, P.cielo); L.B(30, 12, 9, 12, '#9aa0b5'); L.R(31, 12, 7, 2, P.tomate);
  for (const [x, c] of [[13, P.cielo], [17, P.cielo], [22, P.tomate], [26, P.tomate]]) { L.R(x, 17, 3, 3, '#e0ac7e'); L.R(x, 20, 3, 4, c); }
  L.R(19, 18, 2, 1, P.sol); for (const [x, y] of [[8, 3], [15, 5], [24, 2]]) { L.DB(x, y, 1, P.solO); }
  return L;
})();
M.minero = (() => {
  const L = lienzo(40, 30); L.fondo('#9ad1ff', '#7fb8ff');
  L.R(0, 8, 40, 22, '#8a5a35'); L.R(0, 8, 40, 2, '#5fc46f');
  L.R(14, 10, 6, 10, '#2a1c12');
  L.B(14, 16, 6, 5, P.sol); L.R(17, 17, 2, 1, P.cielo); L.R(16, 21, 2, 2, '#9aa0b5');
  for (const [x, y, c] of [[4, 14, '#d9803a'], [28, 13, '#9aa0b5'], [7, 22, P.sol], [30, 24, P.verde], [24, 19, P.tomate], [2, 27, '#8fe9ff']]) { L.R(x, y, 3, 3, P.tinta); L.R(x, y, 2, 2, c); }
  L.R(0, 26, 6, 4, '#ff7a1a');
  return L;
})();
M.tortuga = (() => {
  const L = lienzo(40, 30); L.fondo('#9ad1ff', '#c9b48e');
  L.R(0, 25, 40, 5, '#c9b48e');
  L.B(1, 19, 9, 4, '#6b6680'); L.R(3, 23, 4, 2, '#9a5b2e');
  for (let k = 0; k < 6; k++) L.R(10 + k * 3, 17 - k * 2 + Math.floor(k * k / 6), 1, 1, P.blanco);
  L.B(26, 6, 8, 5, P.verde); L.R(28, 7, 2, 2, '#2f7a3a'); L.R(33, 7, 3, 2, '#9adf8c');
  L.R(30, 24, 6, 2, P.verde);
  return L;
})();
M.volar = (() => {
  const L = lienzo(40, 30); L.fondo('#a8d4ff', '#dbe8ee');
  L.R(0, 26, 40, 4, '#f4f8fb');
  for (let k = 0; k < 12; k++) L.R(k, 14 + k, 1, 12 - k, '#9a5b2e');
  L.B(20, 8, 9, 5, P.tinta); L.R(22, 10, 6, 2, P.blanco); L.R(29, 9, 2, 2, P.sol); L.R(17, 9, 3, 3, '#ff9f2e');
  L.R(36, 14, 3, 12, '#8fe9ff');
  return L;
})();
M.test = (() => {
  const L = lienzo(40, 30); L.fondo(P.uva, P.uvaO);
  L.B(6, 3, 28, 12, P.blanco);
  L.R(18, 5, 4, 1, P.tinta); L.R(21, 6, 2, 2, P.tinta); L.R(19, 8, 2, 2, P.tinta); L.R(19, 11, 2, 2, P.tinta);
  const bt = [[6, 18, P.tomate], [21, 18, P.verde], [6, 24, P.sol], [21, 24, P.cielo]];
  for (const [x, y, c] of bt) L.B(x, y, 13, 5, c);
  return L;
})();
M.arqueros = (() => {
  const L = lienzo(40, 30); L.fondo('#9ad1ff', '#7fb8ff');
  L.R(0, 26, 40, 4, P.verde);
  L.R(3, 16, 5, 10, '#9a5b2e'); L.R(32, 13, 5, 13, '#9a5b2e');
  L.R(4, 10, 3, 6, P.cielo); L.R(4, 8, 3, 2, '#e0ac7e'); L.R(33, 7, 3, 6, P.tomate); L.R(33, 5, 3, 2, '#e0ac7e');
  for (let k = 0; k < 9; k++) L.R(9 + k * 2, 9 - Math.round(Math.sin(k / 8 * Math.PI) * 5), 1, 1, P.tinta);
  L.R(27, 8, 3, 1, P.tinta);
  return L;
})();
M.billar = (() => {
  const L = lienzo(40, 30); L.fondo('#6b4520', '#4a2f17');
  L.B(3, 5, 34, 20, '#1b7a43');
  for (const [x, y] of [[4, 6], [20, 5], [35, 6], [4, 23], [20, 24], [35, 23]]) L.R(x, y, 2, 2, P.tinta);
  const cs = [P.sol, P.cielo, P.tomate, P.uva, '#ff9f2e', P.verde, P.tinta];
  let k = 0; for (let f = 0; f < 4; f++) for (let i = 0; i <= f; i++) L.R(24 + f * 2, 13 - f + i * 2, 2, 2, cs[k++ % cs.length]);
  L.R(10, 14, 2, 2, P.blanco); for (let x = 0; x < 9; x++) L.R(1 + x, 15, 1, 1, '#c08a5a');
  return L;
})();
M.tanques = (() => {
  const L = lienzo(40, 30); L.fondo('#e9e2d0', '#ddd4bd');
  for (const [x, y, w, h] of [[2, 2, 36, 1], [2, 27, 36, 1], [2, 2, 1, 26], [37, 2, 1, 26], [12, 2, 1, 10], [12, 18, 14, 1], [25, 8, 1, 11], [6, 12, 10, 1], [30, 14, 1, 13]]) L.R(x, y, w, h, P.tinta);
  L.B(5, 5, 6, 5, P.cielo); L.R(11, 7, 3, 1, P.tinta); L.B(28, 21, 6, 5, P.tomate); L.R(25, 23, 3, 1, P.tinta);
  for (const [x, y] of [[16, 8], [20, 12], [23, 15]]) L.R(x, y, 1, 1, P.tinta);
  return L;
})();
M.cabezones = (() => {
  const L = lienzo(40, 30); L.fondo('#9ad1ff', P.verde);
  L.R(0, 24, 40, 6, P.verde); L.R(0, 15, 3, 9, 'rgba(255,255,255,.5)'); L.R(37, 15, 3, 9, 'rgba(255,255,255,.5)'); L.R(0, 14, 4, 1, P.blanco); L.R(36, 14, 4, 1, P.blanco);
  L.DB(11, 15, 4, '#e0ac7e'); L.R(7, 12, 9, 2, P.cielo); L.R(9, 14, 2, 2, P.tinta); L.R(13, 14, 2, 2, P.tinta);
  L.DB(28, 15, 4, '#a86b45'); L.R(24, 12, 9, 2, P.tomate); L.R(25, 14, 2, 2, P.tinta); L.R(29, 14, 2, 2, P.tinta);
  L.R(9, 20, 4, 4, P.cielo); L.R(26, 20, 4, 4, P.tomate);
  L.DB(20, 8, 2, P.blanco); L.R(20, 8, 1, 1, P.tinta);
  return L;
})();
M.fuegoagua = (() => {
  const L = lienzo(40, 30); L.fondo('#2b2f5e', '#23264f');
  L.R(0, 25, 40, 5, '#6b6680'); L.R(10, 24, 6, 2, P.tomate); L.R(24, 24, 6, 2, P.cielo);
  L.R(4, 13, 10, 2, '#6b6680'); L.R(26, 13, 10, 2, '#6b6680');
  L.B(6, 17, 5, 5, P.tomate); L.R(7, 14, 3, 3, P.sol); L.R(8, 12, 1, 2, P.sol);
  L.B(29, 17, 5, 5, P.cielo); L.R(30, 14, 3, 3, '#9ad1ff');
  L.B(8, 9, 3, 3, P.tomate); L.B(29, 9, 3, 3, P.cielo);
  return L;
})();
// ilustración de la portada: mesa con cartas, dados, mando y una moneda
const hero = (() => {
  const L = lienzo(120, 80);
  L.R(0, 0, 120, 80, 'rgba(0,0,0,0)');
  L.B(10, 46, 100, 22, P.menta); L.R(11, 47, 98, 2, '#3fd0b5');
  for (let y = 52; y < 66; y += 4) for (let x = 14 + (y % 8); x < 108; x += 8) L.R(x, y, 1, 1, P.mentaO);
  L.R(14, 68, 6, 8, P.tinta); L.R(100, 68, 6, 8, P.tinta);
  // cartas en abanico, apoyadas en la mesa
  carta(L, 24, 36, 'oros', 1); carta(L, 34, 33, 'copas', 3); carta(L, 44, 36, 'espadas', 0);
  L.B(56, 34, 12, 17, P.cielo); L.R(57, 35, 10, 1, P.blanco); L.D(62, 42, 3, P.blanco); L.T(4, 61, 40, P.cieloO);
  // dados
  const dado = (x, y, puntos) => { L.B(x, y, 11, 11, P.blanco); for (const [a, b] of puntos) L.R(x + a, y + b, 2, 2, P.tinta); };
  dado(74, 42, [[2, 2], [7, 7], [4, 4]]); dado(87, 39, [[2, 2], [7, 2], [2, 7], [7, 7]]);
  // mando
  L.B(70, 14, 30, 14, P.tomate); L.R(71, 15, 28, 2, '#ff8466');
  L.R(75, 19, 6, 2, P.tinta); L.R(77, 17, 2, 6, P.tinta);
  L.DB(91, 19, 1, P.sol); L.DB(95, 22, 1, P.cielo);
  // moneda y destellos
  L.DB(20, 18, 5, P.sol); L.D(20, 18, 3, P.solO); L.R(19, 16, 2, 5, P.sol);
  for (const [x, y] of [[8, 8], [108, 10], [50, 12], [112, 40], [4, 40]]) { L.R(x, y - 1, 1, 3, P.sol); L.R(x - 1, y, 3, 1, P.sol); }
  return L;
})();

// logotipo: mando de 12×12
const logo = (() => {
  const L = lienzo(12, 12);
  L.B(0, 3, 12, 7, P.tomate); L.R(1, 4, 10, 1, '#ff8466');
  L.R(2, 6, 3, 1, P.tinta); L.R(3, 5, 1, 3, P.tinta);
  L.R(8, 5, 1, 1, P.sol); L.R(9, 7, 1, 1, P.cielo);
  L.R(1, 9, 3, 1, P.tinta); L.R(8, 9, 3, 1, P.tinta);
  return L;
})();
M.pajaro = (() => {
  const L = lienzo(40, 30); L.fondo(P.cielo, P.cieloO);
  for (const [x, y, h] of [[8, 0, 9], [8, 21, 9], [28, 0, 5], [28, 17, 13]]) { L.B(x, y, 6, h, P.verde); L.R(x + 1, y, 1, h, '#7fe08f'); }
  L.B(7, 8, 8, 2, P.verde); L.B(7, 20, 8, 2, P.verde); L.B(27, 4, 8, 2, P.verde); L.B(27, 16, 8, 2, P.verde);
  L.B(17, 11, 8, 7, P.sol); L.R(21, 12, 3, 2, P.blanco); L.R(22, 13, 1, 1, P.tinta); L.R(24, 15, 2, 2, P.tomate); L.R(18, 14, 3, 2, '#ff9f2e');
  return L;
})();
M.saltos = (() => {
  const L = lienzo(40, 30); L.fondo(P.crema, '#e8dcc0');
  for (const [x, y, c] of [[4, 24, P.verde], [20, 18, P.gris], [8, 12, P.verde], [24, 6, P.marron]]) L.B(x, y, 12, 3, c);
  L.B(11, 3, 6, 6, P.sol); L.R(11, 7, 6, 2, P.verde); L.R(14, 4, 1, 1, P.tinta); L.R(16, 5, 2, 1, P.tinta);
  L.R(13, 9, 1, 2, P.tinta); L.R(15, 9, 1, 2, P.tinta);
  return L;
})();
M.frutas = (() => {
  const L = lienzo(40, 30); L.fondo(P.marron, '#6b4520');
  L.DB(11, 12, 6, P.verde); L.D(11, 12, 4, P.tomate); L.R(6, 12, 11, 1, P.tinta);
  L.DB(28, 9, 4, '#ff9f2e'); L.DB(26, 21, 3, P.tomate); L.R(25, 17, 1, 2, P.verdeO);
  for (let k = 0; k < 9; k++) L.R(3 + k * 4, 25 - k * 2, 3, 1, P.blanco);
  return L;
})();
M.carretera = (() => {
  const L = lienzo(40, 30);
  L.R(0, 0, 40, 6, '#7fd98f'); L.R(0, 6, 40, 8, '#4a4560'); L.R(0, 14, 40, 8, P.cielo); L.R(0, 22, 40, 8, '#7fd98f');
  for (let x = 0; x < 40; x += 8) L.R(x, 13, 4, 1, P.gris);
  L.B(3, 7, 10, 6, P.tomate); L.R(10, 8, 2, 3, '#bfe9ff'); L.B(26, 7, 9, 6, P.sol);
  L.B(2, 15, 14, 6, P.marron); L.B(22, 15, 12, 6, P.marron);
  L.B(17, 22, 6, 7, P.blanco); L.R(19, 21, 2, 2, P.tomate); L.R(19, 25, 2, 1, P.sol); L.R(18, 24, 1, 1, P.tinta); L.R(21, 24, 1, 1, P.tinta);
  L.R(4, 24, 5, 5, P.verdeO); L.R(32, 23, 5, 6, P.verdeO);
  return L;
})();
M.dino = (() => {
  const L = lienzo(40, 30); L.R(0, 0, 40, 30, P.papel);
  const t = '#3c3850';
  L.R(0, 24, 40, 1, t); L.R(6, 26, 2, 1, t); L.R(25, 27, 3, 1, t);
  L.R(10, 9, 8, 5, t); L.R(12, 10, 1, 1, P.papel); L.R(10, 14, 3, 1, t); L.R(4, 13, 2, 3, t); L.R(5, 14, 8, 6, t); L.R(6, 20, 5, 2, t); L.R(6, 22, 1, 2, t); L.R(9, 22, 1, 2, t); L.R(13, 16, 2, 1, t);
  L.R(28, 15, 3, 9, t); L.R(26, 17, 2, 3, t); L.R(31, 16, 2, 3, t); L.R(35, 19, 2, 5, t);
  L.R(24, 4, 6, 1, '#d7d2c8'); L.R(26, 3, 3, 1, '#d7d2c8');
  return L;
})();
M.galletas = (() => {
  const L = lienzo(40, 30); L.fondo(P.rosa, P.rosaO);
  L.DB(20, 14, 10, '#d9a35b'); L.D(20, 14, 8, '#e6b672');
  for (const [x, y] of [[15, 9], [23, 8], [25, 15], [17, 18], [20, 13]]) L.R(x, y, 2, 2, '#5a3a1b');
  L.R(32, 4, 3, 1, P.blanco); L.R(33, 3, 1, 3, P.blanco); L.R(5, 22, 3, 1, P.blanco); L.R(6, 21, 1, 3, P.blanco);
  return L;
})();
M.honda = (() => {
  const L = lienzo(40, 30); L.R(0, 0, 40, 30, '#9fdcff'); L.R(0, 25, 40, 5, P.verde);
  L.R(6, 16, 2, 9, P.marron); L.R(4, 13, 1, 4, P.marron); L.R(9, 13, 1, 4, P.marron);
  L.B(12, 8, 5, 5, P.tomate); L.R(15, 9, 1, 1, P.blanco);
  for (let k = 0; k < 4; k++) L.R(5 + k * 2, 11 - k, 1, 1, P.blanco);
  L.B(25, 15, 3, 10, '#c08a5a'); L.B(34, 15, 3, 10, '#c08a5a'); L.B(24, 12, 14, 3, P.gris);
  L.DB(31, 21, 3, P.verde); L.R(29, 20, 1, 1, P.blanco); L.R(32, 20, 1, 1, P.blanco);
  L.DB(31, 8, 3, P.verde); L.R(29, 7, 1, 1, P.blanco); L.R(32, 7, 1, 1, P.blanco);
  return L;
})();
M.plantas = (() => {
  const L = lienzo(40, 30);
  for (let f = 0; f < 3; f++) for (let c = 0; c < 5; c++) L.R(c * 8, f * 10, 8, 10, (f + c) % 2 ? '#7fd98f' : '#6fcf80');
  L.R(4, 6, 1, 4, P.verdeO); L.B(1, 1, 7, 6, P.sol); L.R(3, 3, 3, 2, '#ff9f2e');
  L.R(4, 16, 1, 4, P.verdeO); L.B(1, 11, 7, 6, P.verde); L.B(7, 13, 3, 3, P.verde);
  L.B(14, 13, 2, 2, '#7fe08f'); L.B(20, 13, 2, 2, '#7fe08f');
  L.B(12, 21, 7, 8, '#c08a5a');
  L.B(29, 8, 6, 18, '#6b4520'); L.B(29, 7, 6, 6, '#8fb98a'); L.R(31, 9, 1, 1, P.tomate); L.R(26, 14, 4, 2, '#8fb98a'); L.B(30, 4, 4, 4, '#ff9f2e');
  return L;
})();
M.revueltas = (() => {
  const L = lienzo(40, 30); L.fondo(P.uva, P.uvaO);
  for (let k = 0; k < 12; k++) { const x = 3 + (k % 4) * 9, y = 2 + Math.floor(k / 4) * 8; L.B(x, y, 8, 7, k === 0 || k === 1 || k === 6 ? P.sol : P.blanco); }
  L.R(7, 5, 9, 1, P.tomate); L.R(16, 5, 1, 8, P.tomate); L.R(16, 13, 9, 1, P.tomate);
  return L;
})();
M.saber = (() => {
  const L = lienzo(40, 30); L.fondo(P.cielo, P.cieloO);
  const cols = [P.cielo, P.sol, P.verde, P.uva, '#ff9f2e', P.rosa, P.tomate];
  L.D(14, 14, 11, P.tinta);
  for (let y = -10; y <= 10; y++) for (let x = -10; x <= 10; x++) if (x * x + y * y <= 100) { const a = (Math.atan2(y, x) + Math.PI) / (2 * Math.PI); L.R(14 + x, 14 + y, 1, 1, cols[Math.floor(a * 7) % 7]); }
  L.D(14, 14, 2, P.blanco); L.R(13, 1, 3, 3, P.tinta);
  L.B(28, 6, 10, 18, P.blanco); L.R(31, 9, 4, 1, P.tinta); L.R(34, 10, 1, 3, P.tinta); L.R(32, 13, 2, 2, P.tinta); L.R(32, 17, 2, 2, P.tinta);
  return L;
})();
M.telefono = (() => {
  const L = lienzo(40, 30); L.fondo(P.menta, P.mentaO);
  L.B(3, 4, 15, 11, P.blanco); L.R(6, 7, 6, 1, P.tinta); L.R(6, 9, 8, 1, P.tinta); L.R(6, 11, 4, 1, P.tinta);
  L.R(18, 9, 4, 1, P.tinta); L.R(21, 8, 1, 3, P.tinta);
  L.B(23, 4, 15, 11, P.blanco); L.DB(30, 9, 3, P.sol); L.R(26, 13, 9, 1, P.verde);
  L.B(12, 17, 16, 9, P.tomate); L.R(15, 19, 10, 5, P.tomateO); L.R(14, 15, 3, 3, P.tinta); L.R(23, 15, 3, 3, P.tinta); L.R(14, 15, 12, 1, P.tinta);
  return L;
})();
M.palabreria = (() => {
  const L = lienzo(40, 30); L.R(0, 0, 40, 30, '#e9dfc8');
  for (let y = 0; y < 30; y += 5) L.R(0, y, 40, 1, '#d5c8a8'); for (let x = 0; x < 40; x += 5) L.R(x, 0, 1, 30, '#d5c8a8');
  L.R(0, 0, 5, 5, P.tomate); L.R(35, 25, 5, 5, P.tomate); L.R(10, 20, 5, 5, P.cielo); L.R(30, 5, 5, 5, '#ff9fbf');
  for (const [x, y] of [[6, 11], [11, 11], [16, 11], [21, 11], [16, 6], [16, 16]]) L.B(x, y, 5, 5, '#ffe7a8');
  L.R(4, 26, 32, 4, P.marron); for (let k = 0; k < 5; k++) L.B(6 + k * 6, 24, 5, 5, '#ffe7a8');
  return L;
})();
// avatares: 12 personajes de 12×12 (piel, pelo, ropa y un detalle)
const AVATARES = [
  ['#f2c9a0', '#6b3f1d', P.tomate, 'nada'], ['#c98e5f', P.tinta, P.cielo, 'gafas'], ['#f5d6b8', P.sol, P.menta, 'lazo'],
  ['#8d5a3b', P.tinta, P.uva, 'gorra'], ['#f2c9a0', P.tomate, P.sol, 'pecas'], ['#e0ac7e', P.gris, P.tinta, 'bigote'],
  ['#f5d6b8', P.uva, P.rosa, 'corona'], ['#a86b45', '#3b2a1a', P.verde, 'auriculares'], ['#f2c9a0', P.cielo, P.tomate, 'gafas'],
  ['#c98e5f', P.rosa, P.cielo, 'lazo'], ['#6e4a32', P.tinta, P.sol, 'gorra'], ['#f5d6b8', P.verde, P.uva, 'corona'],
].map(([piel, pelo, ropa, extra]) => {
  const L = lienzo(12, 12);
  L.R(0, 0, 12, 12, P.crema);
  L.R(1, 10, 10, 2, P.tinta); L.R(2, 10, 8, 2, ropa);                  // hombros
  L.R(3, 2, 6, 8, P.tinta); L.R(2, 3, 8, 6, P.tinta); L.R(3, 3, 6, 6, piel); L.R(4, 9, 4, 1, piel); // cabeza
  L.R(3, 2, 6, 2, pelo); L.R(2, 3, 1, 3, pelo); L.R(9, 3, 1, 3, pelo);      // pelo
  L.R(4, 5, 1, 1, P.tinta); L.R(7, 5, 1, 1, P.tinta); L.R(5, 7, 2, 1, P.tomateO); // ojos y boca
  if (extra === 'gafas') { L.R(3, 5, 3, 1, P.tinta); L.R(6, 5, 3, 1, P.tinta); L.R(4, 5, 1, 1, P.blanco); L.R(7, 5, 1, 1, P.blanco); }
  if (extra === 'lazo') { L.R(8, 1, 3, 2, P.rosa); L.R(9, 1, 1, 2, P.rosaO); }
  if (extra === 'gorra') { L.R(2, 1, 8, 2, P.tomate); L.R(8, 3, 3, 1, P.tomateO); }
  if (extra === 'pecas') { L.R(3, 6, 1, 1, P.tomateO); L.R(8, 6, 1, 1, P.tomateO); }
  if (extra === 'bigote') { L.R(4, 7, 4, 1, P.tinta); L.R(5, 7, 2, 1, pelo); }
  if (extra === 'corona') { L.R(3, 0, 6, 2, P.sol); L.R(3, 0, 1, 1, P.crema); L.R(5, 0, 2, 1, P.crema); L.R(8, 0, 1, 1, P.crema); }
  if (extra === 'auriculares') { L.R(3, 1, 6, 1, P.tinta); L.R(1, 4, 2, 3, P.tomate); L.R(9, 4, 2, 3, P.tomate); }
  return L;
});
fs.mkdirSync(path.join(OUT, 'avatares'), { recursive: true });
AVATARES.forEach((L, i) => fs.writeFileSync(path.join(OUT, 'avatares', `${i}.svg`), L.svg(4)));
fs.mkdirSync(path.join(OUT, 'juegos'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'logo.svg'), logo.svg(3));
for (const [id, L] of Object.entries(M)) fs.writeFileSync(path.join(OUT, 'juegos', `${id}.svg`), L.svg());
fs.writeFileSync(path.join(OUT, 'hero.svg'), hero.svg());
console.log(`${Object.keys(M).length} miniaturas + hero.svg en ${OUT}`);
