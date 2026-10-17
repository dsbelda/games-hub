'use strict';
// Minero: excava con tu máquina, recoge minerales, súbelos a la superficie y véndelos. Con el dinero mejoras
// taladro, depósito, bodega, casco y motor para bajar más hondo. Ojo con el combustible, las caídas y la lava.
// La partida se guarda en este navegador.
window.JUEGO = {
  montar(raiz) {
    const { el, boton } = UI;
    const L = window.Lienzo;
    const T = 16, VW = 20, VH = 14, W = VW * T, H = VH * T, ANCHO = 32, HONDO = 260, SUP = 4;
    // 0 aire, 1 tierra, 2 roca, 3 lava, 10+ minerales
    const MIN = [
      { n: 'Cobre', v: 30, c: '#d9803a', desde: 2 }, { n: 'Hierro', v: 60, c: '#9aa0b5', desde: 10 }, { n: 'Plata', v: 130, c: '#e6e9f2', desde: 30 },
      { n: 'Oro', v: 260, c: '#ffc63d', desde: 55 }, { n: 'Esmeralda', v: 550, c: '#3fbf5f', desde: 90 }, { n: 'Rubí', v: 1100, c: '#ff5a36', desde: 130 },
      { n: 'Diamante', v: 2600, c: '#8fe9ff', desde: 180 },
    ];
    const MEJORAS = {
      taladro: { n: 'Taladro', niveles: [1, 1.5, 2.1, 2.9, 4], precio: [0, 600, 2000, 6000, 18000] },
      deposito: { n: 'Depósito', niveles: [10, 15, 25, 40, 60], precio: [0, 500, 1800, 5000, 14000] },
      bodega: { n: 'Bodega', niveles: [7, 12, 20, 32, 50], precio: [0, 600, 2000, 5500, 15000] },
      casco: { n: 'Casco', niveles: [10, 17, 28, 45, 70], precio: [0, 700, 2400, 6500, 17000] },
      motor: { n: 'Motor', niveles: [1, 1.3, 1.65, 2, 2.5], precio: [0, 800, 2500, 7000, 20000] },
    };
    const caja = el('div', 'solo minero');
    const barra = el('div', 'td-barra');
    const cont = el('div', 'lz-cont');
    const tiendaUI = el('div', 'mn-tienda');
    const cruceta = el('div', 'mn-cruceta');
    caja.append(barra, cont, tiendaUI, cruceta, el('p', 'suave centro', '← → moverse y taladrar a los lados · ↓ taladrar · ↑ volar (gasta combustible). Para en un edificio para entrar.'));
    raiz.replaceChildren(caja);
    const { c, g } = L.crear(cont, W, H);
    // mandos táctiles
    const pulsadas = new Set();
    for (const [txt, k] of [['◀', 'ArrowLeft'], ['▲', 'ArrowUp'], ['▼', 'ArrowDown'], ['▶', 'ArrowRight']]) {
      const b = boton(txt, null, 'mini'); b.setAttribute('aria-label', k);
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); pulsadas.add(k); });
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => pulsadas.delete(k));
      cruceta.append(b);
    }
    const tecla = (k) => L.teclas.has(k) || pulsadas.has(k);

    const EDIFICIOS = [{ n: 'Gasolinera', x0: 2, x1: 5, c: '#ff5a36' }, { n: 'Venta', x0: 9, x1: 12, c: '#ffc63d' }, { n: 'Taller', x0: 17, x1: 20, c: '#4d7cfe' }, { n: 'Reparación', x0: 25, x1: 28, c: '#3fbf5f' }];
    let mundo, m, cam, abierto = null, particulas = [];
    function generar() {
      const w = [];
      for (let y = 0; y < HONDO; y++) {
        const fila = [];
        for (let x = 0; x < ANCHO; x++) {
          if (y < SUP) { fila.push(0); continue; }
          const p = y - SUP, r = Math.random();
          if (p > 0 && r < Math.min(0.12, 0.02 + p / 1500)) { fila.push(2); continue; }
          if (p > 120 && r < 0.12 + Math.min(0.06, (p - 120) / 2000)) { fila.push(3); continue; }
          if (p > 1 && r > 0.85) { fila.push(0); continue; } // huecos
          const posibles = MIN.map((mi, i) => [mi, i]).filter(([mi]) => p >= mi.desde);
          if (posibles.length && Math.random() < 0.1) { const [, i] = posibles[Math.min(posibles.length - 1, Math.floor(Math.pow(Math.random(), 1.6) * posibles.length))]; fila.push(10 + i); continue; }
          fila.push(1);
        }
        w.push(fila);
      }
      for (let x = 0; x < ANCHO; x++) w[SUP][x] = 1; // suelo firme arriba
      return w;
    }
    function cargar() {
      const s = UI.leer('minero', null);
      if (s && s.mundo && s.m) { mundo = s.mundo; m = s.m; return; }
      mundo = generar();
      m = { x: 14 * T, y: (SUP - 1) * T, vx: 0, vy: 0, dinero: 0, carga: [], gas: 10, vida: 10, niv: { taladro: 0, deposito: 0, bodega: 0, casco: 0, motor: 0 }, record: 0, taladrando: null };
    }
    let guardado = 0;
    const guardar = () => UI.guardar('minero', { mundo, m });
    const max = (k) => MEJORAS[k].niveles[m.niv[k]];
    const celda = (x, y) => (y < 0 ? 0 : y >= HONDO || x < 0 || x >= ANCHO ? 2 : mundo[y][x]);
    const solida = (v) => v === 1 || v === 2 || v >= 10;
    function actualizar(dt) {
      if (abierto) return;
      const motor = max('motor');
      const cx = Math.floor((m.x + T / 2) / T), cy = Math.floor((m.y + T / 2) / T);
      const enSuelo = solida(celda(cx, Math.floor((m.y + T) / T))) && m.y % T < 1;
      // taladrar
      if (m.taladrando) {
        const td = m.taladrando;
        td.t += dt * max('taladro') * (celda(td.x, td.y) >= 10 ? 0.8 : 1);
        m.x += (td.x * T - m.x) * Math.min(1, dt * 6); m.y += (td.y * T - m.y) * Math.min(1, dt * 6);
        if (Math.random() < 0.5) particulas.push({ x: td.x * T + 8, y: td.y * T + 8, vx: (Math.random() - .5) * 80, vy: -Math.random() * 60, t: .4, c: celda(td.x, td.y) >= 10 ? MIN[celda(td.x, td.y) - 10].c : '#8a5a35' });
        if (td.t >= 0.55) {
          const v = celda(td.x, td.y);
          if (v >= 10) { if (m.carga.length < max('bodega')) { m.carga.push(v - 10); UI.aviso(`+ ${MIN[v - 10].n}`); } else UI.aviso('¡La bodega está llena!', 'mal'); }
          mundo[td.y][td.x] = 0; m.x = td.x * T; m.y = td.y * T; m.vx = 0; m.vy = 0; m.taladrando = null;
          m.gas -= 0.08;
        }
        return comprobar();
      }
      // moverse
      const izq = tecla('ArrowLeft'), der = tecla('ArrowRight'), arr = tecla('ArrowUp'), aba = tecla('ArrowDown');
      if (izq) m.vx -= 300 * motor * dt; if (der) m.vx += 300 * motor * dt;
      if (!izq && !der) m.vx *= Math.pow(0.001, dt);
      m.vx = Math.max(-70 * motor, Math.min(70 * motor, m.vx));
      if (arr && m.gas > 0) { m.vy -= 420 * motor * dt; m.gas -= 0.6 * dt; }
      m.vy += 420 * dt; m.vy = Math.max(-110 * motor, Math.min(260, m.vy));
      m.gas -= 0.12 * dt * (Math.abs(m.vx) > 5 ? 1.5 : 1);
      // taladrar abajo o a los lados (solo apoyado)
      if (enSuelo && aba) { const v = celda(cx, cy + 1); if (v !== 2 && solida(v)) { m.taladrando = { x: cx, y: cy + 1, t: 0 }; return; } }
      if (enSuelo && (izq || der)) { const dx = izq ? -1 : 1; const v = celda(cx + dx, cy); if (v !== 2 && solida(v) && cy >= SUP) { m.taladrando = { x: cx + dx, y: cy, t: 0 }; return; } }
      // colisiones por ejes
      const choca = (x, y) => { for (const [px, py] of [[x + 2, y + 2], [x + T - 3, y + 2], [x + 2, y + T - 1], [x + T - 3, y + T - 1]]) if (solida(celda(Math.floor(px / T), Math.floor(py / T)))) return true; return false; };
      const nx = m.x + m.vx * dt; if (!choca(nx, m.y)) m.x = nx; else m.vx = 0;
      const ny = m.y + m.vy * dt;
      if (!choca(m.x, ny)) m.y = ny;
      else {
        if (m.vy > 190) { const dano = (m.vy - 190) / 25; m.vida -= dano; UI.aviso('¡Golpe!', 'mal'); }
        if (m.vy > 0) m.y = Math.floor((ny + T) / T) * T - T; else m.y = Math.ceil(ny / T) * T;
        m.vy = 0;
      }
      m.x = Math.max(0, Math.min((ANCHO - 1) * T, m.x));
      // lava
      for (const [px, py] of [[m.x + 8, m.y + 15], [m.x + 2, m.y + 8], [m.x + 14, m.y + 8]]) if (celda(Math.floor(px / T), Math.floor(py / T)) === 3) { m.vida -= 6 * dt; if (Math.random() < 0.1) UI.aviso('¡Lava!', 'mal'); }
      // edificios (en la superficie, parado)
      if (cy === SUP - 1 && enSuelo && Math.abs(m.vx) < 8) { const ed = EDIFICIOS.find((e) => cx >= e.x0 && cx <= e.x1); if (ed && (!m.ultimoEd || m.ultimoEd !== ed.n)) { m.ultimoEd = ed.n; abrir(ed.n); } }
      if (cy !== SUP - 1 || !EDIFICIOS.some((e) => cx >= e.x0 && cx <= e.x1)) m.ultimoEd = null;
      comprobar();
    }
    function comprobar() {
      const prof = Math.max(0, Math.floor(m.y / T) - SUP + 1);
      if (prof > m.record) { m.record = prof; if (prof % 10 === 0) Cuenta.record('minero', prof); UI.guardar('minero-record', Math.max(UI.leer('minero-record', 0), prof)); }
      if (m.gas <= 0 && !tecla('ArrowUp') && Math.floor(m.y / T) >= SUP) m.gas = Math.max(m.gas, 0);
      if (m.vida <= 0 || (m.gas <= 0 && Math.floor(m.y / T) >= SUP && m.vy === 0 && !m.taladrando)) {
        const rescate = Math.floor(m.dinero * 0.2);
        UI.aviso(m.vida <= 0 ? `¡Máquina destrozada! Rescate: ${rescate} 💰` : `¡Sin combustible! Rescate: ${rescate} 💰`, 'mal');
        m.dinero -= rescate; m.carga = []; m.vida = max('casco'); m.gas = max('deposito'); m.x = 14 * T; m.y = (SUP - 1) * T; m.vx = m.vy = 0;
        guardar();
      }
      guardado += 1 / 60; if (guardado > 5) { guardado = 0; guardar(); }
    }
    function abrir(n) {
      abierto = n; m.vx = 0; m.vy = 0;
      tiendaUI.replaceChildren();
      const p = el('div', 'panel');
      p.append(el('h2', null, n));
      const cerrar = () => { abierto = null; tiendaUI.replaceChildren(); guardar(); };
      if (n === 'Gasolinera') { const falta = max('deposito') - m.gas; const precio = Math.ceil(falta * 4); p.append(el('p', null, `Llenar el depósito: ${precio} 💰`)); const b = boton('Llenar', () => { const pagable = Math.min(falta, m.dinero / 4); m.gas += pagable; m.dinero -= Math.ceil(pagable * 4); cerrar(); }, 'oro'); b.disabled = falta < 0.1 || m.dinero < 1; p.append(b); }
      if (n === 'Venta') {
        const total = m.carga.reduce((s, i) => s + MIN[i].v, 0);
        const resumen = {}; for (const i of m.carga) resumen[MIN[i].n] = (resumen[MIN[i].n] || 0) + 1;
        p.append(el('p', null, m.carga.length ? Object.entries(resumen).map(([k, v]) => `${k} ×${v}`).join(' · ') : 'No llevas nada para vender.'));
        const b = boton(`Vender por ${total} 💰`, () => { m.dinero += total; m.carga = []; UI.aviso(`+${total} 💰`, 'bien'); if (total >= 1000) Confeti(60); cerrar(); }, 'oro'); b.disabled = !total; p.append(b);
      }
      if (n === 'Taller') for (const [k, mj] of Object.entries(MEJORAS)) {
        const nv = m.niv[k]; const f = el('div', 'fila');
        f.append(el('span', 'grow', `${mj.n} · nivel ${nv + 1}/${mj.niveles.length}`));
        if (nv < mj.niveles.length - 1) { const precio = mj.precio[nv + 1]; const b = boton(`Mejorar · ${precio} 💰`, () => { if (m.dinero >= precio) { m.dinero -= precio; m.niv[k]++; if (k === 'casco') m.vida = max('casco'); if (k === 'deposito') m.gas = max('deposito'); abrir(n); } }, 'mini oro'); b.disabled = m.dinero < precio; f.append(b); } else f.append(el('small', 'suave', 'al máximo'));
        p.append(f);
      }
      if (n === 'Reparación') { const falta = max('casco') - m.vida; const precio = Math.ceil(falta * 15); p.append(el('p', null, `Reparar el casco: ${precio} 💰`)); const b = boton('Reparar', () => { const pagable = Math.min(falta, m.dinero / 15); m.vida += pagable; m.dinero -= Math.ceil(pagable * 15); cerrar(); }, 'oro'); b.disabled = falta < 0.1 || m.dinero < 1; p.append(b); }
      p.append(boton('Salir', cerrar, 'flojo'));
      tiendaUI.append(p);
    }
    function pintar() {
      if (!m) return;
      cam = { x: Math.max(0, Math.min(ANCHO * T - W, m.x - W / 2 + 8)), y: Math.max(0, m.y - H / 2 + 8) };
      const prof = Math.floor(m.y / T) - SUP + 1;
      g.fillStyle = prof < 0 ? '#9ad1ff' : '#2a1c12'; g.fillRect(0, 0, W, H);
      const x0 = Math.floor(cam.x / T), y0 = Math.floor(cam.y / T);
      for (let y = y0; y <= y0 + VH + 1; y++) for (let x = x0; x <= x0 + VW + 1; x++) {
        const v = celda(x, y), px = x * T - cam.x, py = y * T - cam.y;
        if (y < SUP) { g.fillStyle = '#9ad1ff'; g.fillRect(px, py, T, T); continue; }
        if (v === 0) { g.fillStyle = '#2a1c12'; g.fillRect(px, py, T, T); continue; }
        const oscuro = Math.min(0.55, (y - SUP) / 400);
        g.fillStyle = v === 2 ? '#6b6680' : v === 3 ? '#ff7a1a' : y === SUP ? '#5fc46f' : '#8a5a35'; g.fillRect(px, py, T, T);
        g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(px, py + T - 2, T, 2); g.fillRect(px + T - 2, py, 2, T);
        if (v === 3) { g.fillStyle = '#ffc63d'; g.fillRect(px + 3 + (Date.now() / 200 % 8), py + 4, 3, 2); }
        if (v >= 10) { const mi = MIN[v - 10]; g.fillStyle = '#1e1b2e'; g.fillRect(px + 4, py + 4, 8, 8); g.fillStyle = mi.c; g.fillRect(px + 5, py + 5, 6, 6); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(px + 6, py + 6, 2, 2); }
        if (oscuro) { g.fillStyle = `rgba(0,0,0,${oscuro})`; g.fillRect(px, py, T, T); }
      }
      // edificios
      for (const e of EDIFICIOS) { const px = e.x0 * T - cam.x, py = (SUP - 3) * T - cam.y; g.fillStyle = '#1e1b2e'; g.fillRect(px - 1, py - 1, (e.x1 - e.x0 + 1) * T + 2, 2 * T + 2); g.fillStyle = e.c; g.fillRect(px, py, (e.x1 - e.x0 + 1) * T, 2 * T); g.fillStyle = '#fbf7ee'; g.fillRect(px + 4, py + 6, (e.x1 - e.x0 + 1) * T - 8, 10); L.texto(g, e.n.toUpperCase(), px + (e.x1 - e.x0 + 1) * T / 2, py + 8, { tam: 8, color: '#1e1b2e', alinear: 'center', sombra: null }); }
      // máquina
      const px = Math.round(m.x - cam.x), py = Math.round(m.y - cam.y);
      g.fillStyle = '#1e1b2e'; g.fillRect(px + 1, py + 3, 14, 11); g.fillStyle = '#ffc63d'; g.fillRect(px + 2, py + 4, 12, 9); g.fillStyle = '#4d7cfe'; g.fillRect(px + 8, py + 5, 4, 3);
      g.fillStyle = '#1e1b2e'; g.fillRect(px + 2, py + 13, 4, 3); g.fillRect(px + 10, py + 13, 4, 3);
      g.fillStyle = '#9aa0b5'; if (m.taladrando) { const dx = m.taladrando.x * T - m.x, dy = m.taladrando.y * T - m.y; g.fillRect(px + 6 + Math.sign(dx) * 9, py + 6 + Math.sign(dy) * 9, 4, 4); } else g.fillRect(px + 6, py + 14, 4, 2);
      if (tecla('ArrowUp') && m.gas > 0) { g.fillStyle = '#9aa0b5'; g.fillRect(px + 2, py, 12, 2); }
      for (const p of particulas) { p.x += p.vx / 60; p.y += p.vy / 60; p.vy += 4; p.t -= 1 / 60; g.fillStyle = p.c; g.fillRect(p.x - cam.x, p.y - cam.y, 2, 2); }
      particulas = particulas.filter((p) => p.t > 0);
      // indicadores
      const barraV = (x, y, v, mx, color, etq) => { g.fillStyle = '#1e1b2e'; g.fillRect(x, y, 62, 7); g.fillStyle = color; g.fillRect(x + 1, y + 1, 60 * Math.max(0, v / mx), 5); L.texto(g, etq, x + 64, y - 1, { tam: 8, color: '#fff' }); };
      barraV(4, 4, m.gas, max('deposito'), m.gas < max('deposito') * 0.25 ? '#ff5a36' : '#ffc63d', 'GAS');
      barraV(4, 14, m.vida, max('casco'), '#3fbf5f', 'CASCO');
      const clave = [Math.floor(m.dinero), Math.max(0, prof), m.carga.length, max('bodega'), m.record].join();
      if (clave !== pintar.ultima) { pintar.ultima = clave; barra.replaceChildren(el('span', null, `💰 ${Math.floor(m.dinero)}`), el('span', null, `⛏️ ${Math.max(0, prof)} m`), el('span', null, `🎒 ${m.carga.length}/${max('bodega')}`), el('span', null, `🏆 ${m.record} m`)); }
    }
    cargar();
    L.bucle(actualizar, pintar);
    window.addEventListener('pagehide', guardar);
  },
};
