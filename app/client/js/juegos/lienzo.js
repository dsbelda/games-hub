'use strict';
// Base común de los juegos de lienzo: lienzo nítido (pixelado) que se adapta al ancho, teclado, puntero,
// bucle con paso fijo (se pausa con la pestaña oculta), sprites a partir de textos y texto pixel.
window.Lienzo = (() => {
  const { el } = UI;
  function crear(raiz, ancho, alto, { clase = '' } = {}) {
    const c = el('canvas', 'lz-lienzo ' + clase);
    c.width = ancho; c.height = alto;
    c.style.aspectRatio = `${ancho} / ${alto}`;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    raiz.append(c);
    // coordenadas del puntero en píxeles del juego
    const punto = (e) => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * ancho, y: (e.clientY - r.top) / r.height * alto }; };
    return { c, g, ancho, alto, punto };
  }
  // teclas pulsadas (por código), sin que las flechas muevan la página mientras se juega
  const teclas = new Set();
  const PROPIAS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
  document.addEventListener('keydown', (e) => { if (e.target.closest('input, textarea, dialog')) return; teclas.add(e.code); if (PROPIAS.has(e.code) && document.querySelector('.lz-lienzo')) e.preventDefault(); });
  document.addEventListener('keyup', (e) => teclas.delete(e.code));
  window.addEventListener('blur', () => teclas.clear());
  // bucle con paso fijo de 1/60 s; fn(dt) actualiza y pinta. Devuelve { parar, pausa }
  function bucle(actualizar, pintar) {
    let ultimo = performance.now(), acum = 0, vivo = true, pausado = false;
    const PASO = 1 / 60;
    function marco(t) {
      if (!vivo) return;
      let d = Math.min(0.1, (t - ultimo) / 1000); ultimo = t;
      if (!pausado && !document.hidden) { acum += d; while (acum >= PASO) { actualizar(PASO); acum -= PASO; } }
      pintar();
      requestAnimationFrame(marco);
    }
    requestAnimationFrame(marco);
    return { parar: () => { vivo = false; }, pausa: (p) => { pausado = p; ultimo = performance.now(); }, get pausado() { return pausado; } };
  }
  // sprite: filas de caracteres; cada carácter es un color de la paleta ('.' = transparente)
  const cacheSprites = new Map();
  function sprite(filas, paleta, tam = 1) {
    const clave = filas.join('|') + JSON.stringify(paleta) + tam;
    if (cacheSprites.has(clave)) return cacheSprites.get(clave);
    const c = document.createElement('canvas');
    c.width = filas[0].length * tam; c.height = filas.length * tam;
    const g = c.getContext('2d');
    filas.forEach((f, y) => [...f].forEach((ch, x) => { if (ch !== '.' && paleta[ch]) { g.fillStyle = paleta[ch]; g.fillRect(x * tam, y * tam, tam, tam); } }));
    cacheSprites.set(clave, c);
    return c;
  }
  function texto(g, t, x, y, { tam = 8, color = '#fff', alinear = 'left', sombra = '#1e1b2e', fuente = 'Silkscreen' } = {}) {
    g.font = `${tam}px ${fuente}, monospace`; g.textAlign = alinear; g.textBaseline = 'top';
    if (sombra) { g.fillStyle = sombra; g.fillText(t, Math.round(x) + 1, Math.round(y) + 1); }
    g.fillStyle = color; g.fillText(t, Math.round(x), Math.round(y));
  }
  const PALETA = { tinta: '#1e1b2e', papel: '#fbf7ee', tomate: '#ff5a36', menta: '#18b39b', sol: '#ffc63d', cielo: '#4d7cfe', uva: '#8a5cf6', rosa: '#ff6fa8', verde: '#3fbf5f', gris: '#9aa0b5', marron: '#9a5b2e', blanco: '#ffffff' };
  return { crear, teclas, bucle, sprite, texto, PALETA };
})();
