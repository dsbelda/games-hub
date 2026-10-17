'use strict';
// Baraja española de 40 cartas, compartida por los juegos de cartas españolas.
const PALOS = ['oros', 'copas', 'espadas', 'bastos'];
const NUMS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
const crear = () => { const m = []; for (const p of PALOS) for (const n of NUMS) m.push({ p, n }); return m; };
function barajar(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const id = (c) => `${c.p}-${c.n}`;
module.exports = { PALOS, NUMS, crear, barajar, id };
