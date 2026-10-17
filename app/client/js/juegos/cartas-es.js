'use strict';
// Baraja española dibujada con SVG, compartida por Tute, Chinchón y Mus (la Brisca lleva la suya).
window.CartasES = (() => {
  const { el } = UI;
  const PALOS = {
    oros: '<circle cx="20" cy="20" r="15" fill="#f2b51c" stroke="#a06a10" stroke-width="3"/><circle cx="20" cy="20" r="8" fill="none" stroke="#a06a10" stroke-width="2.5"/><circle cx="20" cy="20" r="3" fill="#a06a10"/>',
    copas: '<path d="M8 6h24q0 12-8 16v5h5v4H11v-4h5v-5Q8 18 8 6z" fill="#d6262b" stroke="#7a1010" stroke-width="2.5" stroke-linejoin="round"/><path d="M12 9h16" stroke="#f2b51c" stroke-width="3"/>',
    espadas: '<path d="M20 3l3 5v18h-6V8z" fill="#bcd3f0" stroke="#1e4d8a" stroke-width="2.5" stroke-linejoin="round"/><rect x="10" y="25" width="20" height="4" rx="2" fill="#2f63c9" stroke="#1e4d8a" stroke-width="2"/><rect x="18" y="29" width="4" height="7" fill="#2f63c9" stroke="#1e4d8a" stroke-width="2"/>',
    bastos: '<path d="M24 4q6 1 5 7l-11 26q-3 2-5 0l8-27q-1-5 3-6z" fill="#3a9a3c" stroke="#1e5a22" stroke-width="2.5" stroke-linejoin="round"/><circle cx="23" cy="15" r="2.5" fill="#1e5a22"/><circle cx="19" cy="25" r="2.5" fill="#1e5a22"/>',
  };
  const FIG = { 10: 'Sota', 11: 'Caballo', 12: 'Rey', 1: 'As' };
  const LETRA = { 10: 'S', 11: 'C', 12: 'R' };
  const PUNTOS = { 1: 11, 3: 10, 12: 4, 11: 3, 10: 2 };
  const id = (c) => `${c.p}-${c.n}`;
  const nombre = (c) => `${FIG[c.n] || c.n} de ${c.p}`;
  function svgPalo(p) { const s = el('span', 'palo'); s.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true">${PALOS[p]}</svg>`; return s; }
  function carta(c, { onclick, cls = '', puntos = false } = {}) {
    const b = el(onclick ? 'button' : 'div', `carta-es ${c.p} ${cls}`);
    if (onclick) { b.type = 'button'; b.onclick = onclick; }
    b.setAttribute('aria-label', nombre(c));
    b.title = nombre(c) + (puntos && PUNTOS[c.n] ? ` · ${PUNTOS[c.n]} puntos` : '');
    const l = LETRA[c.n] || String(c.n);
    b.append(el('span', 'num', l), svgPalo(c.p), el('span', 'num abajo', l));
    return b;
  }
  const dorso = (cls = '') => el('div', 'carta-es dorso ' + cls);
  return { carta, dorso, id, nombre, svgPalo };
})();
