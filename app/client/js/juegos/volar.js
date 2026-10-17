'use strict';
// Aprende a volar: el pingüino baja por la rampa y sale volando. ↑ / ↓ (o tocar arriba / abajo) para subir o
// bajar el morro: al bajarlo ganas velocidad y al subirlo la cambias por altura. Con el cohete (espacio o el
// botón) acelera mientras quede combustible. Con lo ganado mejora rampa, trineo, alas, cohete y combustible.
// Meta: romper el muro de hielo a 3000 m.
window.JUEGO = {
  montar(raiz) {
    const { el, boton } = UI;
    const L = window.Lienzo;
    const W = 320, H = 180, SUELO = 1000, META = 3000;
    const MEJ = {
      rampa: { n: 'Rampa', p: [0, 200, 600, 1600, 4000, 9000], v: [80, 115, 155, 200, 250, 310] },
      trineo: { n: 'Trineo', p: [0, 150, 450, 1200, 3000, 7000], v: [0.04, 0.032, 0.026, 0.021, 0.017, 0.014] },
      alas: { n: 'Alas', p: [0, 300, 900, 2400, 6000, 13000], v: [0.6, 1, 1.5, 2.1, 2.8, 3.6] },
      cohete: { n: 'Cohete', p: [0, 500, 1400, 3500, 8000, 16000], v: [0, 200, 280, 380, 500, 650] },
      gasolina: { n: 'Combustible', p: [0, 250, 800, 2000, 5000, 11000], v: [0, 2.5, 4, 6, 8, 11] },
    };
    const caja = el('div', 'solo volar');
    const barra = el('div', 'td-barra');
    const cont = el('div', 'lz-cont');
    const mandos = el('div', 'fila centro');
    const tienda = el('div', 'mn-tienda');
    caja.append(barra, cont, mandos, tienda);
    raiz.replaceChildren(caja);
    const { c, g, punto } = L.crear(cont, W, H);
    const s = UI.leer('volar', { dinero: 0, dias: 0, niv: { rampa: 0, trineo: 0, alas: 0, cohete: 0, gasolina: 0 }, record: 0, ganado: false });
    const val = (k) => MEJ[k].v[s.niv[k]];
    // física arcade (estable): «s» es la velocidad y «a» el ángulo de vuelo (positivo = hacia abajo).
    // Bajar gana velocidad y subir la gasta; sin tocar, el pingüino tiende a su planeo natural, más plano
    // cuanto mejores alas. Por debajo de la velocidad de pérdida, cae.
    const K = { g: 300, drag: 0.00055, a0: 0.26, deriva: 1.2, giro: 1.4, perdida: 70, alto: 420, empuje: 2.4 };
    let fase, p, gas, max, tocaArriba = false, tocaAbajo = false, cohete = false;
    function preparar() { fase = 'listo'; p = { x: 0, y: SUELO - K.alto, s: 0, a: 0, ang: 0.9 }; gas = val('gasolina'); max = { alt: 0, vel: 0 }; pintarTienda(); }
    const rampaY = (x) => (x < 140 ? SUELO - K.alto + x * ((K.alto - 10) / 140) : SUELO - 10 - (x - 140) * 0.5);
    function actualizar(dt) {
      if (fase === 'listo' || fase === 'fin') return;
      const arriba = L.teclas.has('ArrowUp') || tocaArriba, abajo = L.teclas.has('ArrowDown') || tocaAbajo;
      cohete = (L.teclas.has('Space') || cohete && tocaCohete) && gas > 0 && val('cohete') > 0;
      if (fase === 'rampa') {
        p.s += val('rampa') * K.empuje * dt; p.x += p.s * dt; p.y = rampaY(p.x); p.ang = p.x < 140 ? Math.atan((K.alto - 10) / 140) : -0.46;
        if (p.x >= 160) { fase = 'aire'; p.a = -0.46; }
        return;
      }
      if (fase === 'aire') {
        const orden = arriba ? -1 : abajo ? 1 : 0;
        const giro = K.giro * Math.min(2, 0.6 + val('alas') * 0.4);
        if (orden) p.a += orden * giro * dt; else p.a += (K.a0 / val('alas') - p.a) * K.deriva * dt;
        if (p.s < K.perdida) p.a += (1.2 - p.a) * 2 * dt;
        p.a = Math.max(-1.3, Math.min(1.4, p.a));
        p.s += K.g * Math.sin(p.a) * dt - K.drag / (0.4 + val('alas') * 0.6) * p.s * p.s * dt;
        if (cohete) { p.s += val('cohete') * dt; gas -= dt; }
        p.s = Math.max(20, p.s);
        p.x += Math.cos(p.a) * p.s * dt; p.y += Math.sin(p.a) * p.s * dt; p.ang = p.a;
        max.alt = Math.max(max.alt, SUELO - p.y); max.vel = Math.max(max.vel, p.s);
        if (p.x - 160 >= META * 10 && !s.ganado) { s.ganado = true; UI.aviso('¡Has roto el muro de hielo! ¡El pingüino vuela!', 'bien'); Confeti(200); }
        if (p.y >= SUELO) { p.y = SUELO; fase = 'suelo'; const choque = p.a > 0.6; p.s *= choque ? 0.2 : 0.8; if (choque) UI.aviso('¡Plof!'); }
        return;
      }
      if (fase === 'suelo') { p.s -= p.s * val('trineo') * 18 * dt + 15 * dt; p.ang = 0; p.x += p.s * dt; if (p.s <= 1) terminar(); }
    }
    function terminar() {
      fase = 'fin'; s.dias++;
      const m = Math.max(0, Math.round((p.x - 160) / 10));
      const ganado = Math.round(m * 0.5 + max.alt * 0.2 + max.vel * 0.3);
      s.dinero += ganado;
      if (m > s.record) { s.record = m; UI.aviso(`¡Récord! ${m} m · +${ganado} 💰`, 'bien'); } else UI.aviso(`${m} m · +${ganado} 💰`);
      Cuenta.record('volar', m);
      UI.guardar('volar', s);
      pintarTienda();
    }
    let tocaCohete = false;
    function pintarTienda() {
      barra.replaceChildren(el('span', null, `💰 ${s.dinero}`), el('span', null, `🏆 ${s.record} m`), el('span', null, `📅 Día ${s.dias + 1}`), el('span', null, `🧱 Muro: ${META} m`));
      mandos.replaceChildren();
      tienda.replaceChildren();
      if (fase === 'listo') mandos.append(boton('🐧 ¡A volar!', () => { fase = 'rampa'; pintarTienda(); }, 'oro'));
      if (fase === 'rampa' || fase === 'aire') {
        const mk = (txt, on, off) => { const b = boton(txt, null, 'mini'); b.addEventListener('pointerdown', (e) => { e.preventDefault(); on(); }); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, off); return b; };
        mandos.append(mk('▲ Subir morro', () => { tocaArriba = true; }, () => { tocaArriba = false; }), mk('▼ Bajar morro', () => { tocaAbajo = true; }, () => { tocaAbajo = false; }));
        if (val('cohete')) mandos.append(mk('🚀 Cohete', () => { tocaCohete = true; cohete = true; }, () => { tocaCohete = false; cohete = false; }));
      }
      if (fase === 'listo' || fase === 'fin') {
        const pnl = el('div', 'panel'); pnl.append(el('h2', null, 'Tienda'));
        for (const [k, mj] of Object.entries(MEJ)) {
          const nv = s.niv[k]; const f = el('div', 'fila');
          f.append(el('span', 'grow', `${mj.n} · nivel ${nv + 1}/${mj.p.length}`));
          if (nv < mj.p.length - 1) { const precio = mj.p[nv + 1]; const b = boton(`${precio} 💰`, () => { if (s.dinero >= precio) { s.dinero -= precio; s.niv[k]++; UI.guardar('volar', s); preparar(); } }, 'mini oro'); b.disabled = s.dinero < precio; f.append(b); } else f.append(el('small', 'suave', 'al máximo'));
          pnl.append(f);
        }
        if (fase === 'fin') pnl.append(boton('Otro día', () => preparar(), 'oro'));
        tienda.append(pnl);
      }
    }
    c.addEventListener('pointerdown', (e) => { if (fase === 'listo') { fase = 'rampa'; pintarTienda(); return; } const q = punto(e); if (q.y < H / 2) tocaArriba = true; else tocaAbajo = true; });
    c.addEventListener('pointerup', () => { tocaArriba = tocaAbajo = false; });
    function pintar() {
      const camX = p.x - 100, camY = Math.min(SUELO - H + 20, p.y - H / 2);
      const alt = Math.max(0, SUELO - p.y);
      const cielo = alt > 300 ? '#7fb8ff' : '#a8d4ff';
      g.fillStyle = cielo; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,.85)'; for (let k = 0; k < 7; k++) { const x = ((k * 130 - camX * 0.3) % (W + 60) + W + 60) % (W + 60) - 30; const y = 20 + (k % 3) * 20 - (camY - (SUELO - H + 20)) * 0.1; g.fillRect(x, y, 28, 6); g.fillRect(x + 6, y - 4, 16, 6); }
      // montañas de hielo
      g.fillStyle = '#dbe8ee'; for (let k = 0; k < 10; k++) { const x = ((k * 110 - camX * 0.5) % (W + 110) + W + 110) % (W + 110) - 55; g.beginPath(); g.moveTo(x, SUELO - camY); g.lineTo(x + 55, SUELO - camY - 60 - (k % 3) * 15); g.lineTo(x + 110, SUELO - camY); g.fill(); }
      // suelo de nieve
      g.fillStyle = '#f4f8fb'; g.fillRect(0, SUELO - camY, W, H);
      g.fillStyle = '#c9d6e3'; for (let x = -camX % 20; x < W; x += 20) g.fillRect(x, SUELO - camY + 3, 10, 2);
      // rampa
      g.fillStyle = '#9a5b2e'; g.beginPath(); g.moveTo(-camX, SUELO - K.alto - camY); for (let x = 0; x <= 160; x += 10) g.lineTo(x - camX, rampaY(x) - camY); g.lineTo(160 - camX, SUELO - camY); g.lineTo(-camX, SUELO - camY); g.fill();
      // marcas cada 500 m y el muro
      for (let m = 500; m <= META; m += 500) { const x = 160 + m * 10 - camX; if (x > -40 && x < W + 40) { if (m === META) { g.fillStyle = s.ganado ? 'rgba(143,233,255,.4)' : '#8fe9ff'; g.fillRect(x, SUELO - camY - 120, 24, 120); g.fillStyle = '#ffffff'; g.fillRect(x + 4, SUELO - camY - 110, 4, 100); } else { g.fillStyle = '#ff5a36'; g.fillRect(x, SUELO - camY - 20, 2, 20); L.texto(g, `${m}m`, x + 4, SUELO - camY - 20, { tam: 8, color: '#1e1b2e', sombra: null }); } } }
      // pingüino
      const x = p.x - camX, y = p.y - camY;
      g.save(); g.translate(x, y - 6); g.rotate(p.ang);
      g.fillStyle = '#1e1b2e'; g.fillRect(-9, -5, 18, 10); g.fillStyle = '#ffffff'; g.fillRect(-5, -2, 12, 6); g.fillStyle = '#ffc63d'; g.fillRect(9, -2, 4, 3); g.fillStyle = '#1e1b2e'; g.fillRect(5, -4, 2, 2);
      if (val('alas') > 0.6) { g.fillStyle = '#9aa0b5'; g.fillRect(-4, -9, 10, 3); }
      if (cohete && gas > 0) { g.fillStyle = '#ff9f2e'; g.fillRect(-15, -2, 6, 4); g.fillStyle = '#ffc63d'; g.fillRect(-13, -1, 4, 2); }
      g.restore();
      // datos
      L.texto(g, `${Math.max(0, Math.round((p.x - 160) / 10))} m`, W - 6, 6, { tam: 16, color: '#ffffff', alinear: 'right' });
      L.texto(g, `ALT ${Math.round(alt / 10)} m  VEL ${Math.round(p.s / 10)}`, 6, 6, { tam: 8, color: '#ffffff' });
      if (val('cohete')) { g.fillStyle = '#1e1b2e'; g.fillRect(6, 18, 52, 6); g.fillStyle = '#ff9f2e'; g.fillRect(7, 19, 50 * Math.max(0, gas / val('gasolina')), 4); }
      if (fase === 'listo') L.texto(g, 'TOCA PARA SALIR', W / 2, H / 2, { tam: 8, color: '#1e1b2e', alinear: 'center', sombra: null });
    }
    preparar();
    L.bucle(actualizar, pintar);
  },
};
