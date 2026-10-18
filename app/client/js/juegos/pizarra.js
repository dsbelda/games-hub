'use strict';
// Pizarra de dibujo reutilizable (Teléfono dibujado): lienzo 1000×750, colores, grosores, deshacer y borrar.
// Guarda los trazos como { c: color, g: grosor, p: [x, y, x, y…] } (mismo formato que Dibuja y adivina).
window.Pizarra = (() => {
  const { el, boton } = UI;
  const COLORES = ['#1e1b2e', '#ffffff', '#9aa0b5', '#ff5a36', '#ff9f2e', '#ffc63d', '#3fbf5f', '#18b39b', '#4d7cfe', '#8a5cf6', '#ff6fa8', '#9a5b2e'];
  const GROSOR = [3, 8, 18, 40], ANCHO = 1000, ALTO = 750;
  function pintarTrazo(g, t) {
    g.strokeStyle = COLORES[t.c] || '#000'; g.lineWidth = GROSOR[t.g] || 8; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
    g.moveTo(t.p[0], t.p[1]);
    for (let i = 2; i < t.p.length; i += 2) g.lineTo(t.p[i], t.p[i + 1]);
    if (t.p.length <= 4) g.lineTo(t.p[0] + 0.1, t.p[1]);
    g.stroke();
  }
  function dibujo(trazos, clase = '') {
    const c = el('canvas', 'pz-lienzo ' + clase); c.width = ANCHO; c.height = ALTO;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, ANCHO, ALTO);
    (trazos || []).forEach((t) => pintarTrazo(g, t));
    return c;
  }
  // pizarra editable: alCambiar(trazos) se llama al acabar cada trazo
  function crear(trazosIniciales = [], alCambiar = () => {}) {
    const trazos = trazosIniciales.map((t) => ({ ...t, p: [...t.p] }));
    const c = dibujo(trazos, 'puedo'); const g = c.getContext('2d');
    let color = 0, grosor = 1, actual = null;
    const repintar = () => { g.fillStyle = '#fff'; g.fillRect(0, 0, ANCHO, ALTO); trazos.forEach((t) => pintarTrazo(g, t)); };
    const punto = (e) => { const r = c.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * ANCHO), Math.round((e.clientY - r.top) / r.height * ALTO)]; };
    c.addEventListener('pointerdown', (e) => { e.preventDefault(); c.setPointerCapture(e.pointerId); const p = punto(e); actual = { c: color, g: grosor, p: [...p] }; trazos.push(actual); pintarTrazo(g, actual); });
    c.addEventListener('pointermove', (e) => {
      if (!actual || actual.p.length > 800) return;
      const p = punto(e), n = actual.p.length;
      if (Math.hypot(p[0] - actual.p[n - 2], p[1] - actual.p[n - 1]) < 4) return;
      g.strokeStyle = COLORES[color]; g.lineWidth = GROSOR[grosor]; g.lineCap = 'round'; g.beginPath(); g.moveTo(actual.p[n - 2], actual.p[n - 1]); g.lineTo(...p); g.stroke();
      actual.p.push(...p);
    });
    const acabar = () => { if (actual) { actual = null; alCambiar(trazos); } };
    c.addEventListener('pointerup', acabar); c.addEventListener('pointercancel', acabar);
    const herr = el('div', 'dj-herr');
    COLORES.forEach((col, i) => { const b = el('button', 'dj-color' + (i === color ? ' sel' : '')); b.type = 'button'; b.style.background = col; b.setAttribute('aria-label', `Color ${i + 1}`); b.onclick = () => { color = i; herr.querySelectorAll('.dj-color').forEach((x, k) => x.classList.toggle('sel', k === i)); }; herr.append(b); });
    GROSOR.forEach((px, i) => { const b = el('button', 'dj-grosor' + (i === grosor ? ' sel' : '')); b.type = 'button'; b.setAttribute('aria-label', `Grosor ${i + 1}`); const p = el('i'); p.style.width = p.style.height = `${Math.max(4, px / 2)}px`; b.append(p); b.onclick = () => { grosor = i; herr.querySelectorAll('.dj-grosor').forEach((x, k) => x.classList.toggle('sel', k === i)); }; herr.append(b); });
    herr.append(boton('↶', () => { trazos.pop(); repintar(); alCambiar(trazos); }, 'mini'), boton('🗑 Borrar', () => { trazos.length = 0; repintar(); alCambiar(trazos); }, 'mini flojo'));
    return { lienzo: c, herramientas: herr, trazos };
  }
  return { crear, dibujo };
})();
