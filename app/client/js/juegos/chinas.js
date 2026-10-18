'use strict';
// Damas chinas: estrella de 121 agujeros en SVG, girada para que tus fichas salgan siempre desde abajo.
// Toca una ficha tuya y luego un agujero iluminado (paso o cadena de saltos).
(() => {
  const { el } = UI;
  const COLORES = ['#ff5a36', '#4d7cfe', '#3fbf5f', '#ffc63d', '#8a5cf6', '#ff6fa8'];
  const NS = 'http://www.w3.org/2000/svg';
  const S = (tag, at) => { const x = document.createElementNS(NS, tag); for (const k in at) x.setAttribute(k, at[k]); return x; };
  const DIRS = [[1, -1, 0], [1, 0, -1], [0, 1, -1], [-1, 1, 0], [-1, 0, 1], [0, -1, 1]];
  let sel = null, destinos = new Map();
  // destinos en el navegador (mismas reglas que el servidor, que es quien decide)
  function calcular(v, i) {
    const idx = new Map(v.celdas.map((c, k) => [c.join(','), k]));
    const vec = (k, d, m) => idx.get(v.celdas[k].map((x, q) => x + DIRS[d][q] * m).join(','));
    const out = new Map();
    for (let d = 0; d < 6; d++) { const n = vec(i, d, 1); if (n !== undefined && v.t[n] < 0) out.set(n, [i, n]); }
    const cola = [[i, [i]]], visto = new Set([i]);
    while (cola.length) { const [c, r] = cola.shift(); for (let d = 0; d < 6; d++) { const m = vec(c, d, 1), s = vec(c, d, 2); if (m === undefined || s === undefined || v.t[m] < 0 || (v.t[s] >= 0 && s !== i) || visto.has(s)) continue; visto.add(s); if (s !== i) out.set(s, [...r, s]); cola.push([s, [...r, s]]); } }
    return out;
  }
  window.JUEGO = {
    render(zona, v, ctx) {
      const yo = ctx.yo, mio = v.turno === yo && !v.ganadores;
      if (!mio) { sel = null; destinos = new Map(); }
      // posición 2D y giro: mi punta de salida abajo
      const xy = (c) => [Math.sqrt(3) * (c[0] + c[2] / 2), 1.5 * c[2]];
      const centro = (zona2) => { const ps = v.zonas[zona2].map((k) => xy(v.celdas[k])); return [ps.reduce((s, p) => s + p[0], 0) / ps.length, ps.reduce((s, p) => s + p[1], 0) / ps.length]; };
      const mia = yo >= 0 ? v.puntas[yo] : v.puntas[0];
      const [cx, cy] = centro(mia), ang = Math.PI / 2 - Math.atan2(cy, cx);
      const P = (c) => { const [x, y] = xy(c); return [x * Math.cos(ang) - y * Math.sin(ang), x * Math.sin(ang) + y * Math.cos(ang)]; };
      const svg = S('svg', { viewBox: '-15 -15 30 30', class: 'dc-tablero' });
      // las seis puntas con el color de su dueño (salida) y la de destino marcada
      const dueno = {}; v.puntas.forEach((p, j) => { dueno[p] = j; });
      v.zonas.forEach((z, p) => { if (dueno[p] === undefined) return; const pts = z.map((k) => P(v.celdas[k])); for (const [x, y] of pts) svg.append(S('circle', { cx: x, cy: y, r: 0.95, fill: COLORES[dueno[p]], opacity: 0.18 })); });
      if (yo >= 0) for (const k of v.zonas[v.destino[yo]]) { const [x, y] = P(v.celdas[k]); svg.append(S('circle', { cx: x, cy: y, r: 0.9, fill: 'none', stroke: COLORES[yo], 'stroke-width': 0.12, 'stroke-dasharray': '0.3 0.2' })); }
      // última jugada
      if (v.ultima) { const pts = v.ultima.ruta.map((k) => P(v.celdas[k]).join(',')).join(' '); svg.append(S('polyline', { points: pts, fill: 'none', stroke: COLORES[v.ultima.j], 'stroke-width': 0.18, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.8 })); }
      v.celdas.forEach((c, k) => {
        const [x, y] = P(c), j = v.t[k];
        const g = S('g', { class: 'dc-hueco' + (destinos.has(k) ? ' destino' : '') + (j === yo && mio ? ' mia' : '') + (sel === k ? ' sel' : '') });
        g.append(S('circle', { cx: x, cy: y, r: 0.42, class: 'dc-agujero' }));
        if (j >= 0) g.append(S('circle', { cx: x, cy: y, r: 0.62, fill: COLORES[j], stroke: '#1e1b2e', 'stroke-width': 0.12, class: 'dc-ficha' }));
        if (destinos.has(k)) g.append(S('circle', { cx: x, cy: y, r: 0.5, class: 'dc-marca' }));
        g.append(S('circle', { cx: x, cy: y, r: 0.85, fill: 'transparent' }));
        g.addEventListener('click', () => {
          if (!mio) return;
          if (destinos.has(k)) { const de = sel; sel = null; destinos = new Map(); ctx.enviar({ tipo: 'mover', de, a: k }); return; }
          if (j === yo) { sel = k; destinos = calcular(v, k); } else { sel = null; destinos = new Map(); }
          zona.replaceChildren(); window.JUEGO.render(zona, v, ctx);
        });
        svg.append(g);
      });
      const jug = el('div', 'fi-marcador');
      for (let j = 0; j < v.n; j++) { const s = el('span', j === v.turno && !v.ganadores ? 'dibuja' : ''); const pt = el('i', 'oc-punto'); pt.style.background = COLORES[j]; s.append(pt, ` ${ctx.nombre(j)}${j === yo ? ' (tú)' : ''}: ${v.zonas[v.destino[j]].filter((k) => v.t[k] === j).length}/10`); jug.append(s); }
      const estado = el('p', 'turno' + (mio ? ' mio' : ''), v.ganadores ? '' : mio ? (sel === null ? 'Te toca: elige una ficha' : 'Ahora el agujero de destino') : `Turno de ${ctx.nombre(v.turno)}`);
      zona.append(jug, estado, svg, el('p', 'suave centro', `Lleva tus 10 fichas a la punta marcada con línea discontinua · jugada ${v.jugadas}/${v.limite}`));
    },
  };
})();
