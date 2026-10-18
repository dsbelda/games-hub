'use strict';
// Dinosaurio sin internet: corre solo; salta (espacio, ↑ o tocar) los cactus y agáchate (↓) ante los pájaros.
// Cada vez más rápido; a partir de 700 se hace de noche.
window.JUEGO = {
  montar(raiz) {
    const { el, boton } = UI;
    const L = window.Lienzo;
    const W = 320, H = 110, SUELO = 92;
    const caja = el('div', 'solo dino');
    const marcador = el('p', 'marcador');
    const cont = el('div', 'lz-cont');
    const mandos = el('div', 'fila centro dino-mandos');
    let agachaToque = false;
    mandos.append(UI.mantener(boton('▼ Agacharse', null, 'mini'), () => { agachaToque = true; }, () => { agachaToque = false; }), UI.mantener(boton('▲ Saltar', null, 'oro'), () => saltar(), () => {}));
    caja.append(marcador, cont, mandos, el('p', 'suave centro', 'Espacio o ↑ para saltar, ↓ para agacharte. En el móvil, toca la pantalla o «Saltar»; mantén «Agacharse».'));
    raiz.replaceChildren(caja);
    const { c, g } = L.crear(cont, W, H);
    const DINO = ['.....#####', '....##.###', '....######', '....###...', '#...#####.', '##.####...', '#######...', '.######...', '..####....', '..#..#....', '..##.##...'];
    const DINO2 = ['.....#####', '....##.###', '....######', '....###...', '#...#####.', '##.####...', '#######...', '.######...', '..####....', '..##.#....', '.....##...'];
    const AGACHA = ['..............', '.......#######', '#....####.####', '###########...', '.#########....', '..#..##.......'];
    const AVE = [['#.........', '##........', '.####.....', '..#######.', '....####..'], ['....#.....', '....##....', '.####.....', '..#######.', '..........']];
    let d, obs, v, dist, vivo, record = UI.leer('dino', 0), nubes, empezado = false, noche = 0;
    function nueva() { d = { y: 0, vy: 0, agachado: false }; obs = []; v = 150; dist = 0; vivo = true; empezado = true; nubes = [[60, 20], [200, 35]]; }
    function saltar() { if (!empezado || !vivo) return nueva(); if (d.y === 0) d.vy = 330; }
    c.addEventListener('pointerdown', (e) => { e.preventDefault(); saltar(); });
    document.addEventListener('keydown', (e) => { if (e.target.closest('input')) return; if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); if (!e.repeat || vivo) saltar(); } });
    function actualizar(dt) {
      if (!empezado || !vivo) return;
      const abajo = L.teclas.has('ArrowDown') || agachaToque;
      d.agachado = abajo && d.y === 0;
      if (abajo && d.y > 0) d.vy -= 1600 * dt;
      d.vy -= 1100 * dt; d.y = Math.max(0, d.y + d.vy * dt); if (d.y === 0) d.vy = Math.max(0, d.vy);
      v = Math.min(420, v + 4 * dt); dist += v * dt / 10;
      for (const n of nubes) { n[0] -= v * 0.15 * dt; if (n[0] < -30) { n[0] = W + Math.random() * 60; n[1] = 10 + Math.random() * 30; } }
      for (const o of obs) o.x -= v * dt;
      obs = obs.filter((o) => o.x > -40);
      const ultimo = obs[obs.length - 1];
      if (!ultimo || ultimo.x < W - (v * 0.7 + Math.random() * 300)) {
        if (dist > 300 && Math.random() < 0.25) obs.push({ x: W + 10, ave: true, alto: [6, 14, 40][Math.floor(Math.random() * 3)], w: 20, h: 10 });
        else { const n = 1 + Math.floor(Math.random() * (dist > 200 ? 3 : 2)), grande = Math.random() < 0.4; obs.push({ x: W + 10, w: n * (grande ? 10 : 7), h: grande ? 22 : 15, n, grande }); }
      }
      // choque con cajas algo más pequeñas que el dibujo (para que no sea injusto)
      const dx = 24, dw = d.agachado ? 26 : 18, dh = d.agachado ? 12 : 20, dy = SUELO - d.y - dh;
      for (const o of obs) {
        const oy = o.ave ? SUELO - o.alto - o.h : SUELO - o.h;
        if (dx + 3 < o.x + o.w - 2 && dx + dw - 3 > o.x + 2 && dy + 2 < oy + o.h && dy + dh - 1 > oy + 2) {
          vivo = false; const p = Math.floor(dist);
          if (p > record) { record = p; UI.guardar('dino', record); UI.aviso(`¡Récord! ${p}`, 'bien'); Confeti(60); }
          if (p) Cuenta.record('dino', p);
        }
      }
      const objetivo = Math.floor(dist / 700) % 2;
      noche += (objetivo - noche) * Math.min(1, dt * 1.5);
    }
    function pintar() {
      const mezcla = (a, b) => `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * noche)).join(',')})`;
      const fondo = mezcla([251, 247, 238], [30, 27, 46]), tinta = mezcla([60, 56, 80], [230, 226, 240]);
      g.fillStyle = fondo; g.fillRect(0, 0, W, H);
      const pal = { '#': tinta };
      if (nubes) { g.fillStyle = mezcla([215, 210, 200], [80, 76, 110]); for (const [x, y] of nubes) { g.fillRect(x, y, 26, 5); g.fillRect(x + 6, y - 3, 12, 3); } }
      if (noche > 0.5) { g.fillStyle = '#fbf7ee'; g.globalAlpha = (noche - 0.5) * 2; g.fillRect(260, 14, 8, 8); g.fillStyle = fondo; g.fillRect(263, 13, 6, 7); g.fillStyle = '#fbf7ee'; for (const [x, y] of [[40, 12], [120, 30], [180, 8], [300, 40]]) g.fillRect(x, y, 1, 1); g.globalAlpha = 1; }
      g.fillStyle = tinta; g.fillRect(0, SUELO, W, 1);
      for (let x = -((dist * 10) % 40); x < W; x += 40) { g.fillRect(x + 5, SUELO + 4, 3, 1); g.fillRect(x + 22, SUELO + 7, 2, 1); }
      for (const o of obs || []) {
        if (o.ave) g.drawImage(L.sprite(AVE[Math.floor(performance.now() / 180) % 2], pal, 2), o.x, SUELO - o.alto - o.h);
        else for (let k = 0; k < o.n; k++) { const x = o.x + k * (o.grande ? 10 : 7), w = o.grande ? 6 : 4; g.fillRect(x + 1, SUELO - o.h, w, o.h); g.fillRect(x - 1, SUELO - o.h + 5, 2, 5); g.fillRect(x + w, SUELO - o.h + 3, 2, 5); }
      }
      const fig = d && d.agachado ? AGACHA : d && vivo && d.y === 0 && empezado && Math.floor(performance.now() / 100) % 2 ? DINO2 : DINO;
      const alto = fig.length * 2;
      g.drawImage(L.sprite(fig, pal, 2), 22, SUELO - (d ? d.y : 0) - alto);
      if (d && !vivo) { g.fillStyle = fondo; g.fillRect(36, SUELO - d.y - alto + 2, 2, 2); }
      L.texto(g, String(Math.floor(dist || 0)).padStart(5, '0'), W - 8, 6, { tam: 8, color: tinta, alinear: 'right', sombra: null });
      L.texto(g, 'HI ' + String(record).padStart(5, '0'), W - 56, 6, { tam: 8, color: tinta, alinear: 'right', sombra: null });
      if (!empezado) L.texto(g, 'PULSA ESPACIO O TOCA', W / 2, 36, { tam: 8, color: tinta, alinear: 'center', sombra: null });
      if (empezado && !vivo) L.texto(g, 'FIN DEL JUEGO', W / 2, 30, { tam: 8, color: tinta, alinear: 'center', sombra: null });
      marcador.textContent = `Distancia: ${Math.floor(dist || 0)} · Récord: ${record}`;
    }
    L.bucle(actualizar, pintar);
  },
};
