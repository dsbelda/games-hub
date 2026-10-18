'use strict';
// La Oca: tablero en serpentina (salida + 63 casillas). Las fichas avanzan casilla a casilla y luego saltan
// (oca, puente, dado…). El tablero se conserva entre repintados para que la animación no se corte.
(() => {
  const { el, boton } = UI;
  const COLORES = ['#4d7cfe', '#ff5a36', '#3fbf5f', '#ffc63d', '#8a5cf6', '#ff6fa8'];
  const ICONO = { oca: '🪿', puente: '🌉', posada: '🏨', dado: '🎲', pozo: '🕳️', laberinto: '🌀', carcel: '⛓️', muerte: '💀', jardin: '🌷' };
  const NOMBRE = { oca: 'Oca', puente: 'Puente', posada: 'Posada', dado: 'Dado', pozo: 'Pozo', laberinto: 'Laberinto', carcel: 'Cárcel', muerte: 'Muerte', jardin: 'Jardín' };
  const COLS = 8;
  const caras = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const dado = (v, cls = '') => { const d = el('div', 'pc-dado ' + cls); for (let i = 0; i < 9; i++) d.append(el('i', (caras[v] || []).includes(i) ? 'si' : '')); return d; };
  let tab = null, celdas = [], fichas = [], mostrada = [], cola = [], animando = false, vistaId = 0, ctxO = null;
  function crearTablero(v) {
    tab = el('div', 'oc-tablero'); celdas = [];
    // filas de abajo arriba, alternando sentido (serpentina)
    for (let k = 0; k <= 63; k++) {
      const fila = Math.floor(k / COLS), col = fila % 2 ? COLS - 1 - (k % COLS) : k % COLS;
      const c = el('div', 'oc-celda' + (v.casillas[k] ? ' ' + v.casillas[k] : '') + (k === 0 ? ' salida' : ''));
      c.style.gridRow = String(8 - fila); c.style.gridColumn = String(col + 1);
      c.append(el('small', null, k === 0 ? 'Salida' : String(k)));
      if (v.casillas[k]) { c.append(el('span', 'oc-ico', ICONO[v.casillas[k]])); c.title = NOMBRE[v.casillas[k]]; }
      c.append(el('div', 'oc-fichas'));
      tab.append(c); celdas.push(c);
    }
    fichas = Array.from({ length: v.n }, (_, j) => { const f = el('i', 'oc-ficha'); f.style.background = COLORES[j]; f.title = ctxO.nombre(j); return f; });
    mostrada = [...v.pos];
  }
  function colocar() { fichas.forEach((f, j) => { const c = celdas[mostrada[j]]; if (f.parentElement !== c.lastChild) c.lastChild.append(f); }); }
  // camino casilla a casilla de una tirada: avanzar (con rebote en la 63) y luego los saltos
  function camino(u) {
    const r = []; let p = u.pasos[0];
    for (let k = 0; k < u.dado; k++) { p = p + 1 > 63 ? p : p + 1; r.push(p); if (p === 63 && k < u.dado - 1) { for (let q = k + 1; q < u.dado; q++) r.push(63 - (q - k)); break; } }
    for (const s of u.pasos.slice(2)) r.push(s);
    return r;
  }
  function animar() {
    if (animando || !cola.length) return;
    animando = true;
    const { j, pasos } = cola.shift();
    let k = 0;
    const paso = () => {
      if (k >= pasos.length) { animando = false; animar(); return; }
      mostrada[j] = pasos[k++]; colocar();
      fichas[j].classList.remove('salta'); void fichas[j].offsetWidth; fichas[j].classList.add('salta');
      setTimeout(paso, k > pasos.length - 1 ? 260 : 170);
    };
    paso();
  }
  window.JUEGO = {
    render(zona, v, ctx) {
      ctxO = ctx;
      const yo = ctx.yo, mio = v.turno === yo && !v.ganadores;
      if (!tab) { crearTablero(v); vistaId = v.ultima?.id || 0; colocar(); }
      if (v.ultima && v.ultima.id !== vistaId) { vistaId = v.ultima.id; cola.push({ j: v.ultima.j, pasos: camino(v.ultima) }); animar(); }
      if (!animando && !cola.length) { mostrada = [...v.pos]; colocar(); }
      const jug = el('div', 'fi-marcador');
      for (let j = 0; j < v.n; j++) {
        const s = el('span', j === v.turno && !v.ganadores ? 'dibuja' : '');
        const pt = el('i', 'oc-punto'); pt.style.background = COLORES[j];
        s.append(pt, ` ${ctx.nombre(j)}: ${v.pos[j]}${v.castigo[j] ? ` (${v.castigo[j]} sin tirar)` : ''}${v.pozo === j ? ' (en el pozo)' : ''}`);
        jug.append(s);
      }
      const panel = el('div', 'oc-panel');
      const u = v.ultima;
      if (u) { panel.append(dado(u.dado, u.id === vistaId && animando ? 'rueda' : '')); const t = el('div', 'oc-texto'); t.append(el('b', null, `${ctx.nombre(u.j)} saca un ${u.dado}`)); for (const x of u.textos) t.append(el('p', null, x)); panel.append(t); }
      const estado = el('p', 'turno' + (mio ? ' mio' : ''), v.ganadores ? '' : mio ? 'Te toca: ¡tira el dado!' : `Turno de ${ctx.nombre(v.turno)}`);
      const acciones = el('div', 'fila centro');
      if (mio) acciones.append(boton('🎲 Tirar', () => ctx.enviar({ tipo: 'tirar' }), 'oro'));
      zona.append(jug, tab, estado, panel, acciones);
    },
  };
})();
