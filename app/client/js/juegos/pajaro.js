'use strict';
// Pájaro saltarín: toca (o espacio) para aletear y pasa entre las tuberías. Cada tubería, un punto.
window.JUEGO = {
  montar(raiz) {
    const { el, boton } = UI;
    const L = window.Lienzo;
    const W = 180, H = 320, SUELO = 290, HUECO = 74, SEP = 92;
    const caja = el('div', 'solo pajaro');
    const marcador = el('p', 'marcador');
    const cont = el('div', 'lz-cont');
    caja.append(marcador, cont, el('p', 'suave centro', 'Toca la pantalla o pulsa espacio para aletear.'));
    raiz.replaceChildren(caja);
    const { c, g } = L.crear(cont, W, H, { clase: 'vertical' });
    let p, tubos, puntos, fase, desp, record = UI.leer('pajaro', 0), flash = 0;
    const AVE = ['..####..', '.#yyy#w#', '#yyyy#ww', '#ooyyyy#', '.#ooo###', '..####r#', '...#rrr.', '....###.'];
    const pal = { '#': '#1e1b2e', y: '#ffc63d', w: '#ffffff', o: '#ff9f2e', r: '#ff5a36' };
    function nueva() { p = { y: H / 2, v: 0 }; tubos = []; puntos = 0; fase = 'listo'; desp = 0; for (let k = 0; k < 3; k++) tubos.push({ x: W + 60 + k * SEP, h: 60 + Math.random() * (SUELO - HUECO - 100), paso: false }); }
    function aletear() { if (fase === 'muerto') { if (flash <= 0) nueva(); return; } if (fase === 'listo') fase = 'vuela'; p.v = -230; }
    c.addEventListener('pointerdown', (e) => { e.preventDefault(); aletear(); });
    document.addEventListener('keydown', (e) => { if (e.code === 'Space' && !e.target.closest('input')) { e.preventDefault(); aletear(); } });
    function morir() {
      fase = 'muerto'; flash = 0.6;
      if (puntos > record) { record = puntos; UI.guardar('pajaro', record); UI.aviso(`¡Récord! ${puntos}`, 'bien'); Confeti(60); }
      if (puntos) Cuenta.record('pajaro', puntos);
    }
    function actualizar(dt) {
      flash = Math.max(0, flash - dt);
      if (fase === 'listo') { p.y = H / 2 + Math.sin(performance.now() / 200) * 4; desp += 60 * dt; return; }
      if (fase === 'muerto') { if (p.y < SUELO - 8) { p.v += 900 * dt; p.y = Math.min(SUELO - 8, p.y + p.v * dt); } return; }
      desp += 60 * dt;
      p.v += 900 * dt; p.y += p.v * dt;
      for (const t of tubos) {
        t.x -= 60 * dt;
        if (t.x < -30) { t.x += SEP * 3; t.h = 50 + Math.random() * (SUELO - HUECO - 90); t.paso = false; }
        if (!t.paso && t.x + 26 < 40) { t.paso = true; puntos++; }
        if (40 + 6 > t.x && 40 - 6 < t.x + 26 && (p.y - 5 < t.h || p.y + 5 > t.h + HUECO)) morir();
      }
      if (p.y > SUELO - 6 || p.y < -20) morir();
    }
    function pintar() {
      if (!p) return;
      g.fillStyle = '#7fd1ff'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#e6f6ff'; for (let k = 0; k < 6; k++) { const x = ((k * 50 - desp * 0.3) % (W + 50) + W + 50) % (W + 50) - 25; g.fillRect(x, 200 + (k % 2) * 8, 30, 10); }
      g.fillStyle = '#5fc46f'; for (let k = 0; k < 12; k++) { const x = ((k * 22 - desp * 0.5) % (W + 22) + W + 22) % (W + 22) - 11; g.fillRect(x, 240 - (k % 3) * 6, 18, 60); }
      for (const t of tubos) {
        for (const [y0, y1] of [[0, t.h], [t.h + HUECO, SUELO]]) { g.fillStyle = '#1e1b2e'; g.fillRect(t.x - 1, y0, 28, y1 - y0); g.fillStyle = '#3fbf5f'; g.fillRect(t.x, y0, 26, y1 - y0); g.fillStyle = '#7fe08f'; g.fillRect(t.x + 3, y0, 4, y1 - y0); }
        g.fillStyle = '#1e1b2e'; g.fillRect(t.x - 4, t.h - 12, 34, 12); g.fillRect(t.x - 4, t.h + HUECO, 34, 12);
        g.fillStyle = '#3fbf5f'; g.fillRect(t.x - 3, t.h - 11, 32, 10); g.fillRect(t.x - 3, t.h + HUECO + 1, 32, 10);
      }
      g.fillStyle = '#d9b27c'; g.fillRect(0, SUELO, W, H - SUELO); g.fillStyle = '#5fc46f'; g.fillRect(0, SUELO, W, 6);
      g.fillStyle = '#c9a26a'; for (let x = -(desp % 12); x < W; x += 12) g.fillRect(x, SUELO + 10, 6, 2);
      g.save(); g.translate(40, p.y); g.rotate(Math.max(-0.5, Math.min(1.2, p.v / 400))); g.drawImage(L.sprite(AVE, pal, 2), -8, -8); g.restore();
      L.texto(g, String(puntos), W / 2, 20, { tam: 16, color: '#ffffff', alinear: 'center' });
      if (fase === 'listo') L.texto(g, 'TOCA PARA VOLAR', W / 2, 110, { tam: 8, color: '#1e1b2e', alinear: 'center', sombra: null });
      if (fase === 'muerto') { if (flash > 0.4) { g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(0, 0, W, H); } L.texto(g, 'FIN', W / 2, 100, { tam: 16, color: '#ff5a36', alinear: 'center' }); L.texto(g, `MEJOR ${record}`, W / 2, 124, { tam: 8, color: '#ffffff', alinear: 'center' }); }
      marcador.textContent = `Puntos: ${puntos} · Récord: ${record}`;
    }
    nueva();
    L.bucle(actualizar, pintar);
  },
};
