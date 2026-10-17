'use strict';
// Lanza la tortuga: toca para fijar el ángulo y otra vez para la fuerza. En el aire, toca para dispararle y que
// remonte (si te quedan balas). Muelles y bombas la impulsan; pinchos y cactus la frenan. Con lo que ganes,
// mejora el cañón, la munición y el caparazón.
window.JUEGO = {
  montar(raiz) {
    const { el, boton } = UI;
    const L = window.Lienzo;
    const W = 320, H = 180, SUELO = 158;
    const MEJ = {
      canon: { n: 'Cañón', p: [0, 150, 500, 1500, 4000, 10000], v: [1, 1.2, 1.4, 1.65, 1.9, 2.2] },
      balas: { n: 'Munición', p: [0, 100, 400, 1200, 3500, 9000], v: [2, 3, 5, 7, 10, 14] },
      escopeta: { n: 'Escopeta', p: [0, 200, 700, 2000, 5000, 12000], v: [1, 1.25, 1.5, 1.8, 2.1, 2.5] },
      caparazon: { n: 'Caparazón', p: [0, 250, 800, 2200, 6000, 14000], v: [0.42, 0.5, 0.57, 0.63, 0.68, 0.72] },
    };
    const caja = el('div', 'solo tortuga');
    const barra = el('div', 'td-barra');
    const cont = el('div', 'lz-cont');
    const tienda = el('div', 'mn-tienda');
    caja.append(barra, cont, tienda);
    raiz.replaceChildren(caja);
    const { c, g } = L.crear(cont, W, H);
    const s = UI.leer('tortuga', { dinero: 0, niv: { canon: 0, balas: 0, escopeta: 0, caparazon: 0 }, record: 0 });
    const val = (k) => MEJ[k].v[s.niv[k]];
    let fase, ang, fuerza, tt, objetos, particulas, tiros, mejorLanz;
    function preparar() { fase = 'angulo'; ang = 0.3; fuerza = 0; tt = { x: 30, y: SUELO - 30, vx: 0, vy: 0, rot: 0, quieta: 0 }; objetos = []; particulas = []; tiros = val('balas'); mejorLanz = 0; generar(300); pintarTienda(); }
    function generar(hasta) {
      let x = objetos.length ? objetos[objetos.length - 1].x : 200;
      while (x < hasta + 2000) { x += 120 + Math.random() * 380; const r = Math.random(); objetos.push({ x, tipo: r < 0.32 ? 'muelle' : r < 0.52 ? 'bomba' : r < 0.78 ? 'pinchos' : 'cactus' }); }
    }
    function tocar() {
      if (fase === 'angulo') { fase = 'fuerza'; return; }
      if (fase === 'fuerza') { fase = 'vuelo'; const v = (260 + fuerza * 380) * val('canon'); tt.vx = Math.cos(ang) * v; tt.vy = -Math.sin(ang) * v; humo(tt.x, tt.y, '#ffffff', 10); return; }
      if (fase === 'vuelo' && tiros > 0) { tiros--; tt.vy = Math.min(tt.vy, 0) - 210 * val('escopeta'); tt.vx += 70 * val('escopeta'); humo(tt.x, tt.y, '#ffc63d', 8); }
    }
    c.addEventListener('pointerdown', (e) => { e.preventDefault(); tocar(); });
    document.addEventListener('keydown', (e) => { if (e.code === 'Space' && !e.target.closest('input')) { e.preventDefault(); tocar(); } });
    const humo = (x, y, color, n) => { for (let k = 0; k < n; k++) particulas.push({ x, y, vx: (Math.random() - .5) * 100, vy: (Math.random() - .5) * 100, t: .5, c: color }); };
    function actualizar(dt) {
      if (fase === 'angulo') { ang = 0.2 + (Math.sin(performance.now() / 500) + 1) / 2 * 1.2; return; }
      if (fase === 'fuerza') { fuerza = (Math.sin(performance.now() / 280) + 1) / 2; return; }
      if (fase !== 'vuelo') return;
      tt.vy += 420 * dt; tt.vx *= Math.pow(0.985, dt * 60 / 60);
      tt.x += tt.vx * dt; tt.y += tt.vy * dt; tt.rot += tt.vx * dt * 0.05;
      if (tt.y >= SUELO - 6) {
        tt.y = SUELO - 6;
        const o = objetos.find((ob) => !ob.usado && Math.abs(ob.x - tt.x) < 14);
        if (o) {
          o.usado = true;
          if (o.tipo === 'muelle') { tt.vy = -Math.max(320, Math.abs(tt.vy) * 1.1); tt.vx += 40; humo(tt.x, tt.y, '#3fbf5f', 8); }
          else if (o.tipo === 'bomba') { tt.vy = -420; tt.vx += 260; humo(tt.x, tt.y, '#ff9f2e', 18); }
          else if (o.tipo === 'pinchos') { tt.vx = 0; tt.vy = 0; humo(tt.x, tt.y, '#ff5a36', 8); }
          else { tt.vx *= 0.3; tt.vy = -Math.abs(tt.vy) * 0.2; }
        } else { tt.vy = -Math.abs(tt.vy) * val('caparazon'); tt.vx *= 0.82; if (Math.abs(tt.vy) > 40) humo(tt.x, tt.y + 4, '#c9b48e', 3); }
        if (Math.abs(tt.vx) < 8 && Math.abs(tt.vy) < 30) tt.quieta += dt; else tt.quieta = 0;
        if (tt.quieta > 0.5) terminar();
      }
      mejorLanz = Math.max(mejorLanz, tt.x);
      generar(tt.x);
      for (const p of particulas) { p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; }
      particulas = particulas.filter((p) => p.t > 0);
    }
    function terminar() {
      fase = 'fin';
      const m = Math.round((tt.x - 30) / 10);
      const ganado = Math.round(m * 0.6);
      s.dinero += ganado;
      if (m > s.record) { s.record = m; UI.aviso(`¡Récord! ${m} m (+${ganado} 💰)`, 'bien'); Confeti(60); } else UI.aviso(`${m} m · +${ganado} 💰`);
      Cuenta.record('tortuga', m);
      UI.guardar('tortuga', s);
      pintarTienda();
    }
    function pintarTienda() {
      barra.replaceChildren(el('span', null, `💰 ${s.dinero}`), el('span', null, `🏆 ${s.record} m`), el('span', null, `🔫 ${tiros ?? val('balas')}`));
      tienda.replaceChildren();
      if (fase !== 'fin' && fase !== 'angulo') return;
      const p = el('div', 'panel');
      p.append(el('h2', null, fase === 'fin' ? 'Tienda' : 'Mejoras'));
      for (const [k, mj] of Object.entries(MEJ)) {
        const nv = s.niv[k]; const f = el('div', 'fila');
        f.append(el('span', 'grow', `${mj.n} · nivel ${nv + 1}/${mj.p.length}`));
        if (nv < mj.p.length - 1) { const precio = mj.p[nv + 1]; const b = boton(`${precio} 💰`, () => { if (s.dinero >= precio) { s.dinero -= precio; s.niv[k]++; UI.guardar('tortuga', s); if (fase === 'angulo') tiros = val('balas'); pintarTienda(); } }, 'mini oro'); b.disabled = s.dinero < precio; f.append(b); } else f.append(el('small', 'suave', 'al máximo'));
        p.append(f);
      }
      if (fase === 'fin') p.append(boton('¡Otro lanzamiento!', () => preparar(), 'oro'));
      tienda.append(p);
    }
    function pintar() {
      const cam = Math.max(0, tt.x - 110);
      g.fillStyle = '#9ad1ff'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#ffffff'; for (let k = 0; k < 6; k++) { const x = ((k * 160 - cam * 0.2) % (W + 80) + W + 80) % (W + 80) - 40; g.fillRect(x, 20 + (k % 3) * 18, 34, 8); g.fillRect(x + 6, 14 + (k % 3) * 18, 20, 8); }
      g.fillStyle = '#c9b48e'; g.fillRect(0, SUELO, W, H - SUELO);
      g.fillStyle = '#b39b72'; for (let x = -cam % 12; x < W; x += 12) g.fillRect(x, SUELO + 4, 6, 2);
      // marcas de distancia
      for (let m = Math.floor(cam / 500) * 500; m < cam + W; m += 500) { if (m < 30) continue; const x = m - cam; g.fillStyle = '#1e1b2e'; g.fillRect(x, SUELO - 10, 1, 10); L.texto(g, `${Math.round((m - 30) / 10)}m`, x + 2, SUELO - 10, { tam: 8, color: '#1e1b2e', sombra: null }); }
      for (const o of objetos) {
        const x = o.x - cam; if (x < -20 || x > W + 20) continue;
        if (o.tipo === 'muelle') { g.fillStyle = '#1e1b2e'; g.fillRect(x - 7, SUELO - 6, 14, 6); g.fillStyle = o.usado ? '#9aa0b5' : '#3fbf5f'; g.fillRect(x - 6, SUELO - 5, 12, 4); }
        if (o.tipo === 'bomba') { g.fillStyle = '#1e1b2e'; g.beginPath(); g.arc(x, SUELO - 6, 6, 0, Math.PI * 2); g.fill(); if (!o.usado) { g.fillStyle = '#ff9f2e'; g.fillRect(x + 3, SUELO - 14, 2, 3); } }
        if (o.tipo === 'pinchos') { g.fillStyle = '#9aa0b5'; for (let k = -6; k < 6; k += 3) { g.beginPath(); g.moveTo(x + k, SUELO); g.lineTo(x + k + 1.5, SUELO - 7); g.lineTo(x + k + 3, SUELO); g.fill(); } }
        if (o.tipo === 'cactus') { g.fillStyle = '#2f7a3a'; g.fillRect(x - 2, SUELO - 16, 4, 16); g.fillRect(x - 6, SUELO - 11, 4, 3); g.fillRect(x - 6, SUELO - 14, 2, 4); g.fillRect(x + 2, SUELO - 9, 4, 3); g.fillRect(x + 4, SUELO - 12, 2, 4); }
      }
      // cañón
      const cx = 30 - cam, cy = SUELO - 10;
      if (cx > -40) {
        g.save(); g.translate(cx, cy); g.rotate(-ang); g.fillStyle = '#1e1b2e'; g.fillRect(-4, -6, 28, 12); g.fillStyle = '#6b6680'; g.fillRect(-3, -5, 26, 10); g.restore();
        g.fillStyle = '#9a5b2e'; g.fillRect(cx - 10, cy, 20, 10);
        if (fase === 'fuerza' || fase === 'angulo') { g.fillStyle = '#1e1b2e'; g.fillRect(cx - 12, cy - 40, 8, 32); g.fillStyle = fase === 'fuerza' ? '#ff5a36' : '#9aa0b5'; g.fillRect(cx - 11, cy - 9 - 30 * fuerza, 6, 30 * fuerza); }
      }
      // tortuga
      if (fase !== 'angulo' && fase !== 'fuerza') {
        const x = tt.x - cam, y = tt.y;
        g.save(); g.translate(x, y); g.rotate(tt.rot);
        g.fillStyle = '#1e1b2e'; g.fillRect(-8, -6, 16, 10); g.fillStyle = '#3fbf5f'; g.fillRect(-7, -5, 14, 8); g.fillStyle = '#2f7a3a'; g.fillRect(-4, -5, 3, 3); g.fillRect(2, -3, 3, 3);
        g.fillStyle = '#9adf8c'; g.fillRect(7, -2, 5, 4); g.fillStyle = '#1e1b2e'; g.fillRect(10, -1, 1, 1);
        g.restore();
      }
      for (const p of particulas) { g.fillStyle = p.c; g.fillRect(p.x - cam, p.y, 2, 2); }
      L.texto(g, `${Math.max(0, Math.round((tt.x - 30) / 10))} m`, W - 6, 6, { tam: 16, color: '#ffffff', alinear: 'right' });
      if (fase === 'angulo') L.texto(g, 'TOCA PARA FIJAR EL ÁNGULO', W / 2, 40, { tam: 8, color: '#1e1b2e', alinear: 'center', sombra: null });
      if (fase === 'fuerza') L.texto(g, 'TOCA PARA LA FUERZA', W / 2, 40, { tam: 8, color: '#1e1b2e', alinear: 'center', sombra: null });
      if (fase === 'vuelo' && tiros > 0) L.texto(g, `TOCA PARA DISPARAR (${tiros})`, W / 2, 6, { tam: 8, color: '#1e1b2e', alinear: 'center', sombra: null });
    }
    preparar();
    L.bucle(actualizar, pintar);
  },
};
