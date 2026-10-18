'use strict';
// Plantas contra zombis: recoge soles, planta en el jardín y aguanta 10 oleadas sin que un zombi llegue a la casa.
window.JUEGO = {
  montar(raiz) {
    const { el, boton } = UI;
    const L = window.Lienzo;
    const COL = 9, FIL = 5, TW = 28, TH = 30, X0 = 26, Y0 = 36, W = X0 + COL * TW + 6, H = Y0 + FIL * TH;
    // [id, nombre, precio, recarga s, vida]
    const PL = [
      ['sol', 'Solecito', 50, 7, 60], ['guis', 'Guisantero', 100, 7, 60], ['nuez', 'Nuez muro', 50, 25, 800],
      ['hielo', 'Escarchado', 175, 9, 60], ['mina', 'Mina patata', 25, 25, 60], ['petardo', 'Petardo', 150, 40, 1e9],
    ];
    const ZO = { normal: [200, 14, '#9aa0b5'], cono: [560, 14, '#ff9f2e'], cubo: [1100, 14, '#6b7088'], rapido: [180, 26, '#ff6fa8'] };
    const caja = el('div', 'solo plantas');
    const marcador = el('p', 'marcador');
    const cont = el('div', 'lz-cont');
    const otra = boton('Otra vez', () => nueva(), 'oro');
    caja.append(marcador, cont, otra, el('p', 'suave centro', 'Elige una planta arriba y toca una casilla. Toca los soles para recogerlos. Pala: quitar una planta.'));
    raiz.replaceChildren(caja);
    const { c, g, punto } = L.crear(cont, W, H);
    let soles, plantas, zombis, guisantes, solesSuelo, sel, recarga, oleada, pendientes, aSig, aSol, fase, record = UI.leer('plantas', 0), flash, cortacesped, efectos;
    function nueva() {
      soles = 150; plantas = []; zombis = []; guisantes = []; solesSuelo = []; sel = null; recarga = {}; oleada = 0; pendientes = []; aSig = 20; aSol = 6; fase = 'juego'; flash = 0; efectos = [];
      cortacesped = Array(FIL).fill(true); otra.hidden = true;
    }
    function lanzarOleada() {
      oleada++;
      const n = 3 + oleada * 2, grande = oleada % 5 === 0;
      const tipos = ['normal', 'normal', ...(oleada >= 2 ? ['cono'] : []), ...(oleada >= 4 ? ['cubo'] : []), ...(oleada >= 3 ? ['rapido'] : []), ...(oleada >= 6 ? ['cono', 'cubo'] : [])];
      for (let k = 0; k < (grande ? n * 2 : n); k++) pendientes.push({ t: grande ? k * 0.7 : k * (3 - Math.min(2, oleada * 0.15)) + Math.random() * 2, tipo: tipos[Math.floor(Math.random() * tipos.length)] });
      if (grande) UI.aviso('¡Se acerca una gran oleada de zombis!', 'mal');
      aSig = grande ? 40 : 28;
    }
    const enCasilla = (cx, fy) => plantas.find((p) => p.c === cx && p.f === fy);
    c.addEventListener('pointerdown', (e) => {
      if (fase !== 'juego') return;
      const p = punto(e);
      for (const s of solesSuelo) if (Math.hypot(p.x - s.x, p.y - s.y) < 12) { s.recogido = true; soles += 25; return; }
      if (p.y < Y0) {
        const i = Math.floor((p.x - 4) / 34);
        if (i >= 0 && i < PL.length) { sel = sel === PL[i][0] ? null : PL[i][0]; return; }
        if (p.x > W - 34) sel = sel === 'pala' ? null : 'pala';
        return;
      }
      const cx = Math.floor((p.x - X0) / TW), fy = Math.floor((p.y - Y0) / TH);
      if (cx < 0 || cx >= COL || fy < 0 || fy >= FIL || !sel) return;
      const hay = enCasilla(cx, fy);
      if (sel === 'pala') { if (hay) plantas.splice(plantas.indexOf(hay), 1); sel = null; return; }
      const d = PL.find((x) => x[0] === sel);
      if (hay || soles < d[2] || (recarga[sel] || 0) > 0) return;
      soles -= d[2]; recarga[sel] = d[3];
      plantas.push({ tipo: sel, c: cx, f: fy, vida: d[4], t: 0, armada: sel === 'mina' ? 14 : 0 });
      sel = null;
    });
    function actualizar(dt) {
      for (const e of efectos) e.t -= dt; efectos = efectos.filter((e) => e.t > 0);
      if (fase !== 'juego') return;
      flash = Math.max(0, flash - dt);
      for (const k in recarga) recarga[k] = Math.max(0, recarga[k] - dt);
      aSol -= dt; if (aSol <= 0) { aSol = 9; solesSuelo.push({ x: X0 + 10 + Math.random() * (COL * TW - 20), y: Y0 - 5, hasta: Y0 + 10 + Math.random() * (FIL * TH - 20), vida: 12 }); }
      for (const s of solesSuelo) { if (s.y < s.hasta) s.y += 30 * dt; else s.vida -= dt; }
      solesSuelo = solesSuelo.filter((s) => !s.recogido && s.vida > 0);
      // oleadas
      aSig -= dt; if (aSig <= 0 && oleada < 10) lanzarOleada();
      for (const p of pendientes) p.t -= dt;
      for (const p of pendientes.filter((p) => p.t <= 0)) { const [vida, v, color] = ZO[p.tipo]; zombis.push({ tipo: p.tipo, f: Math.floor(Math.random() * FIL), x: W + 4, vida, max: vida, v, color, lento: 0, come: 0 }); }
      pendientes = pendientes.filter((p) => p.t > 0);
      // plantas
      for (const p of plantas) {
        p.t += dt;
        const px = X0 + p.c * TW + TW / 2, py = Y0 + p.f * TH + TH / 2;
        if (p.tipo === 'sol' && p.t > 11) { p.t = 0; solesSuelo.push({ x: px + 4, y: py - 8, hasta: py + 4, vida: 10 }); }
        if ((p.tipo === 'guis' || p.tipo === 'hielo') && p.t > 1.5 && zombis.some((z) => z.f === p.f && z.x > px && z.x < W)) { p.t = 0; guisantes.push({ x: px + 8, f: p.f, hielo: p.tipo === 'hielo' }); }
        if (p.tipo === 'mina') { p.armada -= dt; if (p.armada <= 0) { const z = zombis.find((z) => z.f === p.f && Math.abs(z.x - px) < 14); if (z) { for (const o of zombis) if (o.f === p.f && Math.abs(o.x - px) < 24) o.vida -= 1800; p.vida = 0; efectos.push({ x: px, y: py, t: 0.5, r: 22, color: '#ff9f2e' }); } } }
        if (p.tipo === 'petardo' && p.t > 1) { for (const z of zombis) if (Math.abs(z.f - p.f) <= 1 && Math.abs(z.x - px) < TW * 1.6) z.vida -= 1800; p.vida = 0; efectos.push({ x: px, y: py, t: 0.6, r: 46, color: '#ff5a36' }); }
      }
      for (const b of guisantes) { b.x += 180 * dt; const z = zombis.filter((z) => z.f === b.f && z.x - 6 < b.x && z.x + 6 > b.x).sort((a, b) => a.x - b.x)[0]; if (z) { z.vida -= 20; if (b.hielo) z.lento = 4; b.fin = true; } }
      guisantes = guisantes.filter((b) => !b.fin && b.x < W);
      // zombis: avanzan y se comen lo que encuentran
      for (const z of zombis) {
        z.lento = Math.max(0, z.lento - dt);
        const cx = Math.floor((z.x - 6 - X0) / TW), presa = enCasilla(cx, z.f);
        if (presa && presa.tipo !== 'mina' || presa && presa.armada > 0) { presa.vida -= 100 * dt * (z.lento ? 0.5 : 1); z.come += dt; }
        else z.x -= z.v * dt * (z.lento ? 0.5 : 1);
        if (z.x < X0 - 2) {
          if (cortacesped[z.f]) { cortacesped[z.f] = false; for (const o of zombis) if (o.f === z.f) o.vida = 0; efectos.push({ x: X0, y: Y0 + z.f * TH + TH / 2, t: 0.6, r: 16, color: '#ffffff', linea: true }); UI.aviso('¡El cortacésped ha salvado la casa!', 'mal'); }
          else if (z.x < 4) return perder();
        }
      }
      zombis = zombis.filter((z) => z.vida > 0);
      plantas = plantas.filter((p) => p.vida > 0);
      if (oleada >= 10 && !pendientes.length && !zombis.length) ganar();
    }
    function terminar(gano) {
      fase = 'fin'; otra.hidden = false;
      const r = gano ? 10 : oleada - 1;
      if (r > record) { record = r; UI.guardar('plantas', record); }
      if (r > 0) Cuenta.record('plantas', r);
    }
    function perder() { UI.aviso('¡Los zombis se han comido tus sesos!', 'mal'); terminar(false); }
    function ganar() { UI.aviso('¡Has aguantado las 10 oleadas!', 'bien'); Confeti(80); terminar(true); }
    function dibujaPlanta(tipo, x, y, extra) {
      const T = (c, a, b, w, h) => { g.fillStyle = c; g.fillRect(x + a, y + b, w, h); };
      T('#2f9a4a', 9, 14, 2, 10); T('#3fbf5f', 4, 19, 6, 3); T('#3fbf5f', 11, 17, 6, 3);
      if (tipo === 'sol') { T('#1e1b2e', 2, 0, 16, 16); T('#ffc63d', 3, 1, 14, 14); T('#ff9f2e', 6, 4, 8, 8); T('#1e1b2e', 7, 6, 2, 2); T('#1e1b2e', 11, 6, 2, 2); }
      if (tipo === 'guis' || tipo === 'hielo') { const c1 = tipo === 'hielo' ? '#7fd1ff' : '#3fbf5f'; T('#1e1b2e', 2, 2, 14, 13); T(c1, 3, 3, 12, 11); T('#1e1b2e', 15, 6, 5, 5); T(c1, 15, 7, 4, 3); T('#1e1b2e', 7, 5, 2, 2); }
      if (tipo === 'nuez') { T('#1e1b2e', 2, 0, 16, 23); T(extra < 0.4 ? '#9a5b2e' : '#c08a5a', 3, 1, 14, 21); T('#1e1b2e', 6, 7, 2, 2); T('#1e1b2e', 12, 7, 2, 2); if (extra < 0.6) T('#1e1b2e', 5, 14, 6, 1); }
      if (tipo === 'mina') { T('#1e1b2e', 3, 14, 14, 9); T('#c08a5a', 4, 15, 12, 7); if (extra) T((performance.now() / 300) % 2 < 1 ? '#ff5a36' : '#ffc63d', 9, 11, 2, 3); }
      if (tipo === 'petardo') { T('#1e1b2e', 3, 6, 14, 14); T('#ff5a36', 4, 7, 12, 12); T('#ffc63d', 9, 2, 2, 5); }
    }
    function pintar() {
      g.fillStyle = '#fbf3e0'; g.fillRect(0, 0, W, H);
      if (!plantas) return;
      // barra de semillas
      PL.forEach((d, i) => {
        const x = 4 + i * 34, y = 3, rc = recarga[d[0]] || 0, puede = soles >= d[2] && !rc;
        g.fillStyle = '#1e1b2e'; g.fillRect(x, y, 32, 31); g.fillStyle = sel === d[0] ? '#ffc63d' : puede ? '#fbf7ee' : '#c9c3b5'; g.fillRect(x + 1, y + 1, 30, 29);
        dibujaPlanta(d[0], x + 6, y - 2, 1);
        if (rc) { g.fillStyle = 'rgba(30,27,46,.45)'; g.fillRect(x + 1, y + 1, 30, 29 * rc / d[3]); }
        L.texto(g, String(d[2]), x + 16, y + 23, { tam: 8, color: '#1e1b2e', alinear: 'center', sombra: null });
      });
      g.fillStyle = '#1e1b2e'; g.fillRect(W - 34, 3, 30, 31); g.fillStyle = sel === 'pala' ? '#ffc63d' : '#fbf7ee'; g.fillRect(W - 33, 4, 28, 29); g.fillStyle = '#9aa0b5'; g.fillRect(W - 24, 8, 10, 10); g.fillStyle = '#9a5b2e'; g.fillRect(W - 20, 18, 3, 12);
      L.texto(g, `☀${soles}`, 4 + PL.length * 34 + 4, 12, { tam: 8, color: '#ff9f2e', sombra: null });
      // jardín
      for (let f = 0; f < FIL; f++) for (let cx = 0; cx < COL; cx++) { g.fillStyle = (f + cx) % 2 ? '#7fd98f' : '#6fcf80'; g.fillRect(X0 + cx * TW, Y0 + f * TH, TW, TH); }
      g.fillStyle = '#c08a5a'; g.fillRect(0, Y0, X0, FIL * TH); g.fillStyle = '#9a5b2e'; for (let y = Y0; y < H; y += 8) g.fillRect(0, y, X0, 1);
      for (let f = 0; f < FIL; f++) if (cortacesped[f]) { const y = Y0 + f * TH + 12; g.fillStyle = '#1e1b2e'; g.fillRect(X0 - 14, y, 14, 9); g.fillStyle = '#ff5a36'; g.fillRect(X0 - 13, y + 1, 12, 5); }
      for (const p of plantas) { const x = X0 + p.c * TW + 4, y = Y0 + p.f * TH + 4; dibujaPlanta(p.tipo, x, y, p.tipo === 'nuez' ? p.vida / 800 : p.armada <= 0); if (p.tipo === 'mina' && p.armada > 0) { g.fillStyle = 'rgba(251,243,224,.5)'; g.fillRect(x, y + 12, 20, 12); } }
      for (const b of guisantes) { const y = Y0 + b.f * TH + 11; g.fillStyle = '#1e1b2e'; g.fillRect(b.x - 1, y - 1, 6, 6); g.fillStyle = b.hielo ? '#bfe9ff' : '#7fe08f'; g.fillRect(b.x, y, 4, 4); }
      for (const z of [...zombis].sort((a, b) => a.f - b.f)) {
        const x = z.x - 8, y = Y0 + z.f * TH + 2, paso = Math.floor(performance.now() / 250) % 2;
        g.fillStyle = '#1e1b2e'; g.fillRect(x + 3, y + 4, 12, 22); g.fillStyle = z.lento ? '#a8d8ff' : '#8fb98a'; g.fillRect(x + 4, y + 5, 10, 8);
        g.fillStyle = '#6b4520'; g.fillRect(x + 4, y + 13, 10, 8); g.fillStyle = '#4a4560'; g.fillRect(x + 4, y + 21, 4, 5 - paso); g.fillRect(x + 10, y + 21, 4, 4 + paso);
        g.fillStyle = z.lento ? '#a8d8ff' : '#8fb98a'; g.fillRect(x - 2, y + 14 + (z.come ? paso : 0), 6, 3);
        g.fillStyle = '#ff5a36'; g.fillRect(x + 5, y + 8, 2, 2);
        if (z.tipo === 'cono' && z.vida > 200) { g.fillStyle = '#1e1b2e'; g.fillRect(x + 5, y - 3, 8, 8); g.fillStyle = z.color; g.fillRect(x + 6, y - 2, 6, 6); }
        if (z.tipo === 'cubo' && z.vida > 200) { g.fillStyle = '#1e1b2e'; g.fillRect(x + 3, y, 12, 6); g.fillStyle = z.color; g.fillRect(x + 4, y + 1, 10, 4); }
        if (z.tipo === 'rapido') { g.fillStyle = z.color; g.fillRect(x + 4, y + 13, 10, 3); }
      }
      for (const s of solesSuelo) { g.fillStyle = '#1e1b2e'; g.beginPath(); g.arc(s.x, s.y, 8, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffc63d'; g.beginPath(); g.arc(s.x, s.y, 7, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff1c7'; g.fillRect(s.x - 3, s.y - 3, 3, 3); }
      for (const e of efectos) { g.globalAlpha = Math.min(1, e.t * 2); g.fillStyle = e.color; if (e.linea) g.fillRect(X0, e.y - 4, W, 8); else { g.beginPath(); g.arc(e.x, e.y, e.r * (1.2 - e.t), 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1; }
      if (fase === 'fin') { g.fillStyle = 'rgba(30,27,46,.6)'; g.fillRect(0, Y0, W, H - Y0); L.texto(g, oleada >= 10 && !zombis.length ? '¡VICTORIA!' : 'FIN', W / 2, Y0 + 50, { tam: 16, color: '#ffc63d', alinear: 'center' }); }
      const prox = oleada < 10 ? ` · próxima en ${Math.ceil(Math.max(0, aSig))} s` : '';
      marcador.textContent = `Soles: ${soles} · Oleada ${oleada} de 10${prox} · Récord: ${record}`;
    }
    nueva();
    L.bucle(actualizar, pintar);
  },
};
