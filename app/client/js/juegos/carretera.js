'use strict';
// Cruza la carretera: avanza (↑, deslizar o tocar) esquivando coches, saltando por troncos en el río y con
// cuidado con los trenes. Si te quedas atrás, te pilla la pantalla. Cada fila nueva, un punto.
window.JUEGO = {
  montar(raiz) {
    const { el, boton } = UI;
    const L = window.Lienzo;
    const C = 9, T = 20, W = C * T, H = 300;
    const caja = el('div', 'solo carretera');
    const marcador = el('p', 'marcador');
    const cont = el('div', 'lz-cont');
    const otra = boton('Otra vez', () => nueva(), 'oro');
    caja.append(marcador, cont, otra, el('p', 'suave centro', 'Flechas para moverte. En el móvil, toca para avanzar o desliza hacia los lados.'));
    raiz.replaceChildren(caja);
    const { c, g } = L.crear(cont, W, H, { clase: 'vertical' });
    let filas, pj, cam, max, vivo, record = UI.leer('carretera', 0), salto = 0;
    function fila(n) {
      if (n < 3) return { tipo: 'hierba', arboles: n === 0 ? [] : [0, C - 1] };
      const r = Math.random(), dif = Math.min(1, n / 120);
      if (r < 0.32) return { tipo: 'hierba', arboles: Array.from({ length: C }, (_, i) => i).filter(() => Math.random() < 0.18) };
      if (r < 0.62) { const dir = Math.random() < 0.5 ? 1 : -1, v = (30 + Math.random() * 40 + dif * 50) * dir; const coches = []; let x = Math.random() * 60; while (x < W) { coches.push({ x, largo: Math.random() < 0.25 ? 36 : 20, color: ['#ff5a36', '#4d7cfe', '#ffc63d', '#8a5cf6'][Math.floor(Math.random() * 4)] }); x += 70 + Math.random() * 60; } return { tipo: 'carretera', v, coches }; }
      if (r < 0.85) { const dir = Math.random() < 0.5 ? 1 : -1, v = (22 + Math.random() * 25) * dir; const troncos = []; let x = Math.random() * 30; while (x < W + 40) { const largo = 40 + Math.floor(Math.random() * 3) * 20; troncos.push({ x, largo }); x += largo + 30 + Math.random() * 30; } return { tipo: 'rio', v, troncos }; }
      return { tipo: 'vias', tren: null, espera: 2 + Math.random() * 4, aviso: 0 };
    }
    function nueva() { filas = []; for (let n = 0; n < 30; n++) filas.push(fila(n)); pj = { c: 4, f: 1, x: 4 * T, dx: 0 }; cam = 0; max = 1; vivo = true; otra.hidden = true; }
    const fl = (n) => { while (filas.length <= n + 20) filas.push(fila(filas.length)); return filas[n]; };
    function mover(dc, df) {
      if (!vivo) return;
      const nc = pj.c + dc, nf = pj.f + df;
      if (nc < 0 || nc >= C || nf < Math.floor(cam) || nf < 0) return;
      const f = fl(nf);
      if (f.tipo === 'hierba' && f.arboles.includes(nc)) return;
      pj.c = nc; pj.f = nf; pj.x = nc * T; salto = 0.12;
      if (nf > max) max = nf;
    }
    document.addEventListener('keydown', (e) => { if (e.target.closest('input')) return; const m = { ArrowUp: [0, 1], KeyW: [0, 1], ArrowDown: [0, -1], KeyS: [0, -1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] }[e.code]; if (m) { e.preventDefault(); mover(...m); } });
    let ini = null;
    c.addEventListener('pointerdown', (e) => { ini = [e.clientX, e.clientY]; });
    c.addEventListener('pointerup', (e) => { if (!ini) return; const dx = e.clientX - ini[0], dy = e.clientY - ini[1]; if (Math.abs(dx) > 25 && Math.abs(dx) > Math.abs(dy)) mover(Math.sign(dx), 0); else if (dy > 25) mover(0, -1); else mover(0, 1); ini = null; });
    function morir(txt) { if (!vivo) return; vivo = false; otra.hidden = false; const p = max - 1; if (p > record) { record = p; UI.guardar('carretera', record); UI.aviso(`¡Récord! ${p}`, 'bien'); Confeti(60); } else UI.aviso(txt, 'mal'); if (p) Cuenta.record('carretera', p); }
    function actualizar(dt) {
      salto = Math.max(0, salto - dt);
      for (let n = Math.max(0, Math.floor(cam) - 2); n < cam + H / T + 2; n++) {
        const f = fl(n);
        if (f.tipo === 'carretera') for (const k of f.coches) { k.x += f.v * dt; if (f.v > 0 && k.x > W + 10) k.x -= W + 80; if (f.v < 0 && k.x < -50) k.x += W + 80; }
        if (f.tipo === 'rio') for (const k of f.troncos) { k.x += f.v * dt; if (f.v > 0 && k.x > W + 10) k.x -= W + 140; if (f.v < 0 && k.x < -k.largo - 10) k.x += W + 140; }
        if (f.tipo === 'vias') { if (!f.tren) { f.espera -= dt; f.aviso = f.espera < 1.2; if (f.espera <= 0) f.tren = { x: -260, v: 520 }; } else { f.tren.x += f.tren.v * dt; if (f.tren.x > W + 20) { f.tren = null; f.espera = 3 + Math.random() * 5; f.aviso = false; } } }
      }
      if (!vivo) return;
      // la cámara avanza sola, poco a poco
      cam += dt * (0.25 + Math.min(0.6, max / 250));
      if (pj.f > cam + 6) cam += (pj.f - cam - 6) * dt * 3;
      const f = fl(pj.f);
      const px = pj.x + T / 2;
      if (f.tipo === 'carretera' && f.coches.some((k) => px > k.x - 4 && px < k.x + k.largo + 4)) return morir('¡Atropellado!');
      if (f.tipo === 'vias' && f.tren && px > f.tren.x && px < f.tren.x + 240) return morir('¡El tren!');
      if (f.tipo === 'rio') {
        const tronco = f.troncos.find((k) => px > k.x && px < k.x + k.largo);
        if (!tronco) return morir('¡Al agua!');
        pj.x += f.v * dt; pj.c = Math.round(pj.x / T);
        if (pj.x < -6 || pj.x > W - T + 6) return morir('¡Te ha llevado el río!');
      } else pj.x += (pj.c * T - pj.x) * Math.min(1, dt * 20);
      if (pj.f < cam - 0.5) morir('¡Demasiado lento!');
    }
    function pintar() {
      if (!filas) return;
      const y0 = (n) => H - (n - cam + 1) * T;
      for (let n = Math.floor(cam) - 1; n < cam + H / T + 1; n++) {
        const f = fl(Math.max(0, n)); const y = y0(n);
        if (f.tipo === 'hierba') { g.fillStyle = n % 2 ? '#7fd98f' : '#74cf84'; g.fillRect(0, y, W, T); for (const a of f.arboles) { g.fillStyle = '#1e1b2e'; g.fillRect(a * T + 3, y + 1, 14, 16); g.fillStyle = '#2f9a4a'; g.fillRect(a * T + 4, y + 2, 12, 10); g.fillStyle = '#9a5b2e'; g.fillRect(a * T + 8, y + 12, 4, 5); } }
        if (f.tipo === 'carretera') { g.fillStyle = '#4a4560'; g.fillRect(0, y, W, T); g.fillStyle = '#9aa0b5'; for (let x = 0; x < W; x += 20) g.fillRect(x, y + T - 1, 10, 1); for (const k of f.coches) { g.fillStyle = '#1e1b2e'; g.fillRect(k.x - 1, y + 3, k.largo + 2, 14); g.fillStyle = k.color; g.fillRect(k.x, y + 4, k.largo, 12); g.fillStyle = '#bfe9ff'; g.fillRect(k.x + (f.v > 0 ? k.largo - 7 : 2), y + 6, 5, 8); } }
        if (f.tipo === 'rio') { g.fillStyle = '#4d7cfe'; g.fillRect(0, y, W, T); g.fillStyle = '#7fa3ff'; for (let x = (performance.now() / 50) % 16; x < W; x += 16) g.fillRect(x, y + 9, 6, 1); for (const k of f.troncos) { g.fillStyle = '#1e1b2e'; g.fillRect(k.x - 1, y + 2, k.largo + 2, 16); g.fillStyle = '#9a5b2e'; g.fillRect(k.x, y + 3, k.largo, 14); g.fillStyle = '#c08a5a'; g.fillRect(k.x + 2, y + 6, k.largo - 4, 2); } }
        if (f.tipo === 'vias') { g.fillStyle = '#9aa0b5'; g.fillRect(0, y, W, T); g.fillStyle = '#6b4520'; for (let x = 0; x < W; x += 8) g.fillRect(x, y + 3, 4, 14); g.fillStyle = '#4a4560'; g.fillRect(0, y + 5, W, 2); g.fillRect(0, y + 13, W, 2); if (f.aviso && (performance.now() / 200) % 2 < 1) { g.fillStyle = '#ff5a36'; g.fillRect(W - 10, y + 2, 6, 6); } if (f.tren) { g.fillStyle = '#1e1b2e'; g.fillRect(f.tren.x, y + 1, 240, 18); g.fillStyle = '#ff5a36'; g.fillRect(f.tren.x + 1, y + 2, 238, 16); g.fillStyle = '#ffc63d'; for (let x = 10; x < 230; x += 26) g.fillRect(f.tren.x + x, y + 5, 12, 6); } }
      }
      // personaje (gallina)
      const y = y0(pj.f) - (salto > 0 ? 5 : 0), x = pj.x;
      g.fillStyle = '#1e1b2e'; g.fillRect(x + 4, y + 3, 12, 14); g.fillStyle = '#ffffff'; g.fillRect(x + 5, y + 4, 10, 12); g.fillStyle = '#ff5a36'; g.fillRect(x + 8, y + 1, 4, 3); g.fillStyle = '#ffc63d'; g.fillRect(x + 8, y + 8, 4, 3); g.fillStyle = '#1e1b2e'; g.fillRect(x + 7, y + 6, 2, 2); g.fillRect(x + 11, y + 6, 2, 2);
      L.texto(g, String(max - 1), 6, 6, { tam: 16, color: '#ffffff' });
      marcador.textContent = `Filas: ${max - 1} · Récord: ${record}`;
    }
    nueva();
    L.bucle(actualizar, pintar);
  },
};
