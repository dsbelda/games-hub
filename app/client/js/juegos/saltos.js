'use strict';
// Saltos al cielo: el muñeco bota solo; tú lo mueves a los lados (← → o tocando a izquierda/derecha) para
// caer en plataformas y subir. Las grises se mueven, las marrones se rompen y los muelles te lanzan.
window.JUEGO = {
  montar(raiz) {
    const { el, boton } = UI;
    const L = window.Lienzo;
    const W = 200, H = 320;
    const caja = el('div', 'solo saltos');
    const marcador = el('p', 'marcador');
    const cont = el('div', 'lz-cont');
    const otra = boton('Otra vez', () => nueva(), 'oro');
    caja.append(marcador, cont, otra, el('p', 'suave centro', '← → para moverte. En el móvil, toca a la izquierda o a la derecha.'));
    raiz.replaceChildren(caja);
    const { c, g, punto } = L.crear(cont, W, H, { clase: 'vertical' });
    let j, plats, cam, max, vivo, record = UI.leer('saltos', 0), toque = 0;
    function plat(y) {
      const alt = -y / 100;
      const r = Math.random();
      const tipo = r < Math.min(0.25, alt / 400) ? 'mueve' : r < Math.min(0.4, 0.1 + alt / 500) ? 'rompe' : 'normal';
      return { x: Math.random() * (W - 36), y, tipo, v: (Math.random() < 0.5 ? -1 : 1) * 40, muelle: tipo === 'normal' && Math.random() < 0.08, rota: false };
    }
    function nueva() {
      j = { x: W / 2 - 8, y: H - 60, vy: -420, vx: 0, mira: 1 }; cam = 0; max = 0; vivo = true; otra.hidden = true;
      plats = [{ x: W / 2 - 18, y: H - 30, tipo: 'normal' }];
      for (let y = H - 80; y > -400; y -= 34 + Math.random() * 20) plats.push(plat(y));
    }
    c.addEventListener('pointerdown', (e) => { toque = punto(e).x < W / 2 ? -1 : 1; });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) c.addEventListener(ev, () => { toque = 0; });
    function actualizar(dt) {
      if (!vivo) return;
      const dir = (L.teclas.has('ArrowRight') || L.teclas.has('KeyD') ? 1 : 0) - (L.teclas.has('ArrowLeft') || L.teclas.has('KeyA') ? 1 : 0) || toque;
      j.vx += (dir * 190 - j.vx) * Math.min(1, dt * 10); if (dir) j.mira = dir;
      j.x += j.vx * dt; if (j.x < -16) j.x = W; if (j.x > W) j.x = -16;
      const antes = j.y + 16;
      j.vy += 900 * dt; j.y += j.vy * dt;
      if (j.vy > 0) for (const p of plats) {
        if (p.rota) continue;
        if (antes <= p.y && j.y + 16 >= p.y && j.x + 14 > p.x && j.x + 2 < p.x + 36) {
          if (p.tipo === 'rompe') { p.rota = true; continue; }
          j.y = p.y - 16; j.vy = p.muelle && j.x + 8 > p.x + 12 && j.x + 8 < p.x + 26 ? -800 : -420; if (p.muelle && j.vy < -500) p.saltado = true;
        }
      }
      for (const p of plats) { if (p.tipo === 'mueve') { p.x += p.v * dt; if (p.x < 0 || p.x > W - 36) p.v *= -1; } if (p.rota) p.y += 300 * dt; }
      // la cámara sube con el muñeco
      if (j.y < cam + H * 0.4) cam = j.y - H * 0.4;
      max = Math.max(max, Math.round(-cam / 10));
      plats = plats.filter((p) => p.y < cam + H + 40);
      let alta = Math.min(...plats.map((p) => p.y));
      while (alta > cam - 120) { alta -= 34 + Math.random() * (20 + Math.min(40, -cam / 300)); plats.push(plat(alta)); }
      if (j.y > cam + H + 20) {
        vivo = false; otra.hidden = false;
        if (max > record) { record = max; UI.guardar('saltos', record); UI.aviso(`¡Récord! ${max}`, 'bien'); Confeti(60); } else UI.aviso('¡Al vacío!', 'mal');
        if (max) Cuenta.record('saltos', max);
      }
    }
    function pintar() {
      if (!j) return;
      g.fillStyle = '#fbf3e0'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#e8dcc0'; for (let y = -((cam % 16) + 16) % 16; y < H; y += 16) g.fillRect(0, y, W, 1); for (let x = 0; x < W; x += 16) g.fillRect(x, 0, 1, H);
      for (const p of plats) {
        const y = p.y - cam;
        const color = p.tipo === 'mueve' ? '#9aa0b5' : p.tipo === 'rompe' ? '#9a5b2e' : '#3fbf5f';
        g.fillStyle = '#1e1b2e'; g.fillRect(p.x - 1, y - 1, 38, 8);
        g.fillStyle = color; g.fillRect(p.x, y, 36, 6);
        if (p.tipo === 'rompe') { g.fillStyle = '#1e1b2e'; g.fillRect(p.x + 17, y, 2, 6); }
        if (p.muelle) { g.fillStyle = '#1e1b2e'; g.fillRect(p.x + 13, y - 7, 10, 7); g.fillStyle = '#9aa0b5'; g.fillRect(p.x + 14, y - 6, 8, 2); g.fillRect(p.x + 14, y - 3, 8, 2); }
      }
      const y = j.y - cam;
      g.save(); g.translate(j.x + 8, y + 8); g.scale(j.mira, 1);
      g.fillStyle = '#1e1b2e'; g.fillRect(-8, -8, 16, 16); g.fillStyle = '#ffc63d'; g.fillRect(-7, -7, 14, 12); g.fillStyle = '#3fbf5f'; g.fillRect(-7, 2, 14, 4);
      g.fillStyle = '#1e1b2e'; g.fillRect(1, -4, 2, 2); g.fillRect(4, -4, 2, 2); g.fillRect(6, -1, 5, 3);
      g.fillRect(-6, 8, 3, 3); g.fillRect(2, 8, 3, 3);
      g.restore();
      L.texto(g, String(max), 6, 6, { tam: 16, color: '#1e1b2e', sombra: null });
      marcador.textContent = `Altura: ${max} · Récord: ${record}`;
    }
    nueva();
    L.bucle(actualizar, pintar);
  },
};
