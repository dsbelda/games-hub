'use strict';
// Lanza pájaros: estira la honda (arrastrar y soltar) y derriba las torres para aplastar a los glotones verdes
// que se comieron los huevos. Rojo normal; amarillo acelera, azul se divide en tres y negro explota (toca en el aire).
// Física sencilla de cajas sin giro: gravedad, choques con reparto de masas, rozamiento y daño por golpe.
window.JUEGO = {
  montar(raiz) {
    const { el, boton } = UI;
    const L = window.Lienzo;
    const W = 400, H = 220, SUELO = 200, HX = 60, HY = 150, MAXE = 42, GRAV = 420;
    const MAT = { madera: ['#c08a5a', '#9a5b2e', 1, 60], piedra: ['#9aa0b5', '#6b7088', 2.5, 180], hielo: ['#bfe9ff', '#7fbfe0', 0.8, 30] };
    // niveles: [pájaros, piezas]; pieza = [x, y desde el suelo, ancho, alto, material] o ['g', x, y, r]
    const N = [
      ['rrr', [['g', 300, 0, 7], [280, 14, 40, 6, 'madera'], [282, 0, 6, 14, 'madera'], [312, 0, 6, 14, 'madera'], ['g', 300, 20, 7]]],
      ['rrr', [[260, 0, 6, 30, 'madera'], [300, 0, 6, 30, 'madera'], [256, 30, 54, 6, 'madera'], ['g', 283, 0, 7], [272, 36, 6, 24, 'hielo'], [292, 36, 6, 24, 'hielo'], [268, 60, 34, 6, 'hielo'], ['g', 285, 36, 6]]],
      ['ryr', [[250, 0, 8, 40, 'piedra'], [330, 0, 8, 40, 'piedra'], [246, 40, 96, 6, 'madera'], ['g', 270, 0, 7], ['g', 310, 0, 7], [280, 46, 6, 30, 'madera'], [300, 46, 6, 30, 'madera'], [276, 76, 34, 6, 'madera'], ['g', 293, 46, 6]]],
      ['bbr', [[230, 0, 30, 10, 'hielo'], [270, 0, 30, 10, 'hielo'], [310, 0, 30, 10, 'hielo'], ['g', 245, 10, 7], ['g', 285, 10, 7], ['g', 325, 10, 7], [226, 24, 118, 5, 'hielo'], ['g', 285, 29, 7]]],
      ['rkr', [[260, 0, 8, 50, 'piedra'], [320, 0, 8, 50, 'piedra'], [256, 50, 76, 8, 'piedra'], ['g', 294, 0, 9], [272, 0, 6, 20, 'madera'], [310, 0, 6, 20, 'madera'], [270, 58, 8, 30, 'piedra'], [310, 58, 8, 30, 'piedra'], [266, 88, 56, 8, 'piedra'], ['g', 294, 58, 7]]],
      ['yybr', [[200, 0, 6, 26, 'madera'], [236, 0, 6, 26, 'madera'], [196, 26, 50, 5, 'madera'], ['g', 221, 0, 6], [290, 0, 8, 60, 'piedra'], [350, 0, 8, 60, 'piedra'], [286, 60, 76, 6, 'madera'], ['g', 310, 0, 7], ['g', 334, 0, 7], [304, 66, 6, 24, 'hielo'], [338, 66, 6, 24, 'hielo'], [300, 90, 48, 5, 'hielo'], ['g', 324, 66, 7]]],
      ['kkbr', [[240, 0, 10, 70, 'piedra'], [350, 0, 10, 70, 'piedra'], [236, 70, 128, 8, 'piedra'], ['g', 270, 0, 8], ['g', 300, 0, 8], ['g', 330, 0, 8], [262, 0, 6, 30, 'madera'], [290, 0, 6, 30, 'madera'], [318, 0, 6, 30, 'madera'], [258, 30, 70, 5, 'madera'], [270, 78, 8, 30, 'madera'], [320, 78, 8, 30, 'madera'], [266, 108, 66, 6, 'madera'], ['g', 299, 78, 8]]],
      ['rybk', [[220, 0, 50, 8, 'piedra'], [226, 8, 6, 30, 'hielo'], [258, 8, 6, 30, 'hielo'], [222, 38, 46, 5, 'madera'], ['g', 245, 8, 6], [300, 0, 8, 90, 'piedra'], [370, 0, 8, 90, 'piedra'], [296, 90, 86, 8, 'piedra'], [310, 0, 6, 30, 'madera'], [362, 0, 6, 30, 'madera'], ['g', 338, 0, 7], [308, 30, 62, 6, 'madera'], [310, 36, 6, 24, 'hielo'], [362, 36, 6, 24, 'hielo'], ['g', 338, 36, 7], [308, 60, 62, 6, 'madera'], ['g', 338, 66, 7], ['g', 338, 98, 9]]],
    ];
    const caja = el('div', 'solo honda');
    const marcador = el('p', 'marcador');
    const cont = el('div', 'lz-cont');
    const barra = el('div', 'fila centro');
    caja.append(marcador, cont, barra, el('p', 'suave centro', 'Arrastra desde la honda hacia atrás y suelta. Toca la pantalla con el pájaro en el aire para usar su poder.'));
    raiz.replaceChildren(caja);
    const { c, g, punto } = L.crear(cont, W, H);
    const prog = UI.leer('honda', { nivel: 0, estrellas: [] });
    let nivel = Math.min(prog.nivel, N.length - 1), cuerpos, pajaros, actual, tirando, vuelo, puntos, fase, quieto, particulas, finT;
    function cargar(n) {
      nivel = n; cuerpos = []; particulas = []; puntos = 0; fase = 'apunta'; tirando = null; vuelo = []; finT = 0;
      for (const p of N[n][1]) {
        if (p[0] === 'g') cuerpos.push({ x: p[1] - p[3], y: SUELO - p[2] - p[3] * 2, w: p[3] * 2, h: p[3] * 2, m: 1, vida: 18 + p[3] * 2, max: 18 + p[3] * 2, glo: true, vx: 0, vy: 0 });
        else { const [x, y, w, h, mat] = p, M = MAT[mat]; cuerpos.push({ x, y: SUELO - y - h, w, h, m: (w * h) / 60 * M[2], vida: M[3] * Math.sqrt(w * h / 60), max: M[3] * Math.sqrt(w * h / 60), mat, vx: 0, vy: 0 }); }
      }
      pajaros = [...N[n][0]]; actual = null;
      siguiente();
      barra.replaceChildren(...N.map((_, i) => { const b = boton(`${i + 1}${prog.estrellas[i] ? ' ' + '★'.repeat(prog.estrellas[i]) : ''}`, () => cargar(i), 'mini' + (i === n ? ' oro' : '')); b.disabled = i > prog.nivel; return b; }), boton('↻ Repetir', () => cargar(nivel), 'mini'));
    }
    function siguiente() { const t = pajaros.shift(); actual = t ? { tipo: t, x: HX - 5, y: HY - 5, w: 10, h: 10, m: t === 'k' ? 5 : 3, vx: 0, vy: 0, ave: true, poder: true, vida: 1e9 } : null; fase = actual ? 'apunta' : 'espera'; }
    c.addEventListener('pointerdown', (e) => {
      const p = punto(e);
      if (fase === 'apunta' && actual && Math.hypot(p.x - HX, p.y - HY) < 30) { tirando = p; c.setPointerCapture(e.pointerId); return; }
      if (fase === 'vuela') poder();
    });
    c.addEventListener('pointermove', (e) => { if (tirando) tirando = punto(e); });
    c.addEventListener('pointerup', () => {
      if (!tirando) return;
      let dx = HX - tirando.x, dy = HY - tirando.y; const l = Math.hypot(dx, dy);
      tirando = null;
      if (l < 8) return;
      const f = Math.min(l, MAXE) / MAXE;
      actual.vx = dx / l * f * 330; actual.vy = dy / l * f * 330;
      vuelo = [actual]; cuerpos.push(actual); fase = 'vuela'; quieto = 0; actual.estela = [];
    });
    function poder() {
      const a = vuelo[0]; if (!a || !a.poder || !cuerpos.includes(a)) return; a.poder = false;
      if (a.tipo === 'y') { const v = Math.hypot(a.vx, a.vy) || 1; a.vx = a.vx / v * 520; a.vy = a.vy / v * 520; }
      if (a.tipo === 'b') for (const d of [-0.25, 0.25]) { const ang = Math.atan2(a.vy, a.vx) + d, v = Math.hypot(a.vx, a.vy); const n = { ...a, w: 7, h: 7, m: 1.5, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, estela: [] }; cuerpos.push(n); vuelo.push(n); }
      if (a.tipo === 'b') { a.w = a.h = 7; a.m = 1.5; }
      if (a.tipo === 'k') explotar(a);
    }
    function explotar(a) {
      const cx = a.x + a.w / 2, cy = a.y + a.h / 2;
      for (const b of cuerpos) { if (b === a) continue; const dx = b.x + b.w / 2 - cx, dy = b.y + b.h / 2 - cy, d = Math.hypot(dx, dy); if (d < 60) { const f = (1 - d / 60); b.vx += dx / (d || 1) * f * 400 / Math.sqrt(b.m); b.vy += dy / (d || 1) * f * 400 / Math.sqrt(b.m) - 60; danar(b, f * 120); } }
      for (let k = 0; k < 24; k++) particulas.push({ x: cx, y: cy, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.5) * 300, t: 0.6, color: k % 2 ? '#ff9f2e' : '#ffc63d' });
      cuerpos.splice(cuerpos.indexOf(a), 1);
    }
    function danar(b, d) {
      if (b.ave || d < 3) return;
      b.vida -= d;
      if (b.vida <= 0 && cuerpos.includes(b)) {
        cuerpos.splice(cuerpos.indexOf(b), 1);
        puntos += b.glo ? 5000 : 500;
        const color = b.glo ? '#3fbf5f' : MAT[b.mat][0];
        for (let k = 0; k < 8; k++) particulas.push({ x: b.x + Math.random() * b.w, y: b.y + Math.random() * b.h, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 120, t: 0.7, color });
      }
    }
    function paso(dt) {
      for (const b of cuerpos) { b.vy += GRAV * dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.ave && b.estela && Math.random() < 0.5) b.estela.push([b.x + b.w / 2, b.y + b.h / 2]); }
      for (let it = 0; it < 6; it++) {
        for (const b of cuerpos) if (b.y + b.h > SUELO) { const vn = b.vy; b.y = SUELO - b.h; if (vn > 0) { if (it === 0) danar(b, (vn - 120) * b.m * 0.15); b.vy = -vn * (b.ave ? 0.3 : 0.05); b.vx *= b.ave ? 0.8 : 0.85; } }
        for (let i = 0; i < cuerpos.length; i++) for (let j = i + 1; j < cuerpos.length; j++) {
          const a = cuerpos[i], b = cuerpos[j];
          const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          if (ox <= 0 || oy <= 0) continue;
          const ma = 1 / a.m, mb = 1 / b.m, s = ma + mb;
          if (ox < oy) {
            const dir = a.x + a.w / 2 < b.x + b.w / 2 ? -1 : 1;
            a.x += dir * ox * ma / s; b.x -= dir * ox * mb / s;
            const rel = (a.vx - b.vx) * -dir;
            if (rel > 0) { const imp = rel * 1.1 / s; a.vx += dir * imp * ma; b.vx -= dir * imp * mb; if (it === 0) { danar(a, (rel - 40) * b.m * 0.25); danar(b, (rel - 40) * a.m * 0.25); } }
          } else {
            const dir = a.y + a.h / 2 < b.y + b.h / 2 ? -1 : 1;
            a.y += dir * oy * ma / s; b.y -= dir * oy * mb / s;
            const rel = (a.vy - b.vy) * -dir;
            if (rel > 0) { const imp = rel * 1.05 / s; a.vy += dir * imp * ma; b.vy -= dir * imp * mb; if (it === 0) { danar(a, (rel - 60) * b.m * 0.25); danar(b, (rel - 60) * a.m * 0.25); } }
            // rozamiento entre lo que está encima y lo de abajo
            const fr = (a.vx - b.vx) * 0.25; a.vx -= fr * ma / s; b.vx += fr * mb / s;
          }
        }
      }
      for (const b of cuerpos) { if (Math.abs(b.vx) < 2) b.vx = 0; if (Math.abs(b.vy) < 2 && b.y + b.h >= SUELO - 0.5) b.vy = 0; }
      cuerpos = cuerpos.filter((b) => b.x > -80 && b.x < W + 200 && b.y < H + 50);
    }
    function actualizar(dt) {
      for (const p of particulas) { p.vy += 300 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; } particulas = particulas.filter((p) => p.t > 0);
      if (!cuerpos) return;
      for (let k = 0; k < 2; k++) paso(dt / 2);
      const glotones = cuerpos.filter((b) => b.glo).length;
      if (fase === 'vuela' || fase === 'espera') {
        const mov = cuerpos.some((b) => Math.hypot(b.vx, b.vy) > 12);
        quieto = mov ? 0 : quieto + dt;
        const fuera = vuelo.every((a) => !cuerpos.includes(a));
        if (fase === 'vuela' && (quieto > 1 || fuera && quieto > 0.4 || (vuelo[0] && vuelo[0].t > 8))) { for (const a of vuelo) if (cuerpos.includes(a)) cuerpos.splice(cuerpos.indexOf(a), 1); vuelo = []; if (glotones) siguiente(); }
        for (const a of vuelo) a.t = (a.t || 0) + dt;
      }
      if (fase !== 'fin' && !glotones && quieto > 0.5) ganar();
      else if (fase === 'espera' && glotones && quieto > 1.2) { fase = 'fin'; finT = 0; UI.aviso('Los glotones se han salido con la suya. ¡Otra vez!', 'mal'); }
      if (fase === 'fin') finT += dt;
    }
    function ganar() {
      fase = 'fin'; finT = 0;
      puntos += (pajaros.length + (actual && !cuerpos.includes(actual) && !vuelo.includes(actual) ? 1 : 0)) * 10000;
      const est = puntos >= 30000 + N[nivel][1].filter((p) => p[0] === 'g').length * 5000 ? 3 : puntos >= 15000 ? 2 : 1;
      prog.estrellas[nivel] = Math.max(prog.estrellas[nivel] || 0, est);
      prog.nivel = Math.max(prog.nivel, Math.min(N.length - 1, nivel + 1));
      UI.guardar('honda', prog);
      const total = prog.estrellas.reduce((t, x) => t + (x || 0), 0);
      Cuenta.record('honda', total);
      UI.aviso(`¡Nivel ${nivel + 1} superado! ${'★'.repeat(est)} · ${puntos} puntos`, 'bien'); Confeti(60);
      if (nivel < N.length - 1) setTimeout(() => { if (fase === 'fin') cargar(nivel + 1); }, 2200);
      else UI.aviso('¡Has terminado todos los niveles!', 'bien');
    }
    const AVE = { r: '#ff5a36', y: '#ffc63d', b: '#4d7cfe', k: '#3a3456' };
    function pajaro(x, y, w, tipo) {
      g.fillStyle = '#1e1b2e'; g.fillRect(x - 1, y - 1, w + 2, w + 2);
      g.fillStyle = AVE[tipo]; g.fillRect(x, y, w, w);
      g.fillStyle = '#ffffff'; g.fillRect(x + w - 4, y + 2, 3, 3); g.fillStyle = '#1e1b2e'; g.fillRect(x + w - 3, y + 3, 1, 1);
      g.fillStyle = '#ff9f2e'; g.fillRect(x + w, y + w / 2, 2, 2);
    }
    function pintar() {
      g.fillStyle = '#9fdcff'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#d7f1ff'; for (const [x, y] of [[40, 30], [160, 18], [300, 40]]) { g.fillRect(x, y, 40, 8); g.fillRect(x + 8, y - 5, 22, 5); }
      g.fillStyle = '#7fd98f'; for (let x = 0; x < W; x += 30) g.fillRect(x, SUELO - 14 + (x % 60 ? 4 : 0), 34, 14);
      g.fillStyle = '#5fc46f'; g.fillRect(0, SUELO, W, H - SUELO); g.fillStyle = '#3f9a4f'; g.fillRect(0, SUELO, W, 2);
      if (!cuerpos) return;
      // honda
      g.fillStyle = '#6b4520'; g.fillRect(HX - 2, HY, 4, SUELO - HY); g.fillRect(HX - 7, HY - 6, 3, 10); g.fillRect(HX + 4, HY - 6, 3, 10);
      for (const a of vuelo) if (a.estela) { g.fillStyle = '#ffffff'; for (const [x, y] of a.estela.slice(-40)) g.fillRect(x, y, 2, 2); }
      if (fase === 'apunta' && actual) {
        let px = HX, py = HY;
        if (tirando) { let dx = tirando.x - HX, dy = tirando.y - HY; const l = Math.hypot(dx, dy) || 1; const k = Math.min(l, MAXE) / l; px = HX + dx * k; py = HY + dy * k;
          // trayectoria aproximada
          const f = Math.min(l, MAXE) / MAXE, vx = -dx / l * f * 330, vy = -dy / l * f * 330; g.fillStyle = 'rgba(30,27,46,.35)'; for (let t = 0.08; t < 1.2; t += 0.08) g.fillRect(px + vx * t, py + vy * t + GRAV * t * t / 2, 2, 2); }
        g.strokeStyle = '#3a2410'; g.lineWidth = 2; g.beginPath(); g.moveTo(HX - 6, HY - 4); g.lineTo(px, py); g.lineTo(HX + 6, HY - 4); g.stroke();
        pajaro(px - 5, py - 5, 10, actual.tipo);
      }
      pajaros.forEach((t, i) => pajaro(HX - 22 - i * 13, SUELO - 9, 8, t));
      for (const b of cuerpos) {
        if (b.ave) { pajaro(b.x, b.y, b.w, b.tipo); continue; }
        if (b.glo) { const r = b.w / 2, cx = b.x + r, cy = b.y + r; g.fillStyle = '#1e1b2e'; g.beginPath(); g.arc(cx, cy, r + 1, 0, Math.PI * 2); g.fill(); g.fillStyle = b.vida < b.max / 2 ? '#7fbf4f' : '#3fbf5f'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffffff'; g.fillRect(cx - r / 2 - 1, cy - 2, 3, 3); g.fillRect(cx + r / 2 - 2, cy - 2, 3, 3); g.fillStyle = '#2f9a4a'; g.fillRect(cx - 2, cy + 1, 4, 3); continue; }
        const M = MAT[b.mat];
        g.fillStyle = '#1e1b2e'; g.fillRect(b.x - 0.5, b.y - 0.5, b.w + 1, b.h + 1);
        g.fillStyle = M[0]; g.fillRect(b.x, b.y, b.w, b.h);
        g.fillStyle = M[1]; if (b.w > b.h) g.fillRect(b.x + 1, b.y + b.h / 2, b.w - 2, 1); else g.fillRect(b.x + b.w / 2, b.y + 1, 1, b.h - 2);
        if (b.vida < b.max * 0.5) { g.fillStyle = '#1e1b2e'; g.fillRect(b.x + b.w * 0.3, b.y + b.h * 0.3, 1, Math.min(4, b.h * 0.4)); }
      }
      for (const p of particulas) { g.fillStyle = p.color; g.fillRect(p.x, p.y, 2, 2); }
      L.texto(g, String(puntos), W - 6, 6, { tam: 8, color: '#ffffff', alinear: 'right' });
      L.texto(g, `NIVEL ${nivel + 1}`, 6, 6, { tam: 8, color: '#ffffff' });
      marcador.textContent = `Nivel ${nivel + 1} de ${N.length} · Glotones: ${cuerpos.filter((b) => b.glo).length} · Pájaros: ${pajaros.length + (fase === 'apunta' ? 1 : 0)}`;
    }
    cargar(nivel);
    L.bucle(actualizar, pintar);
  },
};
