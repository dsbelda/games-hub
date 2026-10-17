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
