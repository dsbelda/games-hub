'use strict';
// Torres de defensa: coloca torres junto al camino para reventar los globos antes de que lleguen al final.
// Cada globo que revientas baja un nivel (el rojo desaparece). Gana dinero, mejora tus torres y aguanta.
window.JUEGO = {
  montar(raiz) {
    const { el, boton } = UI;
    const L = window.Lienzo;
    const T = 16, COLS = 20, FILAS = 12, W = COLS * T, H = FILAS * T;
    // camino (en casillas): de izquierda a derecha con curvas
    const RUTA = [[-1, 2], [4, 2], [4, 8], [9, 8], [9, 3], [14, 3], [14, 9], [18, 9], [18, 5], [20, 5]];
    const NIVELES = [null,
      { color: '#ff5a36', v: 38 }, { color: '#4d7cfe', v: 52 }, { color: '#3fbf5f', v: 66 },
      { color: '#ffc63d', v: 92 }, { color: '#ff6fa8', v: 120 }, { color: '#2b2840', v: 70, blindado: 3 }];
    const TORRES = {
      dardo: { nombre: 'Dardos', precio: 100, alcance: 52, cada: 0.75, dano: 1, color: '#9a5b2e', mejoras: [['Más alcance', 90, (t) => { t.alcance *= 1.35; }], ['Lanza más rápido', 140, (t) => { t.cada *= 0.55; }]] },
      canon: { nombre: 'Cañón', precio: 250, alcance: 46, cada: 1.4, dano: 1, area: 18, color: '#3a3456', mejoras: [['Explosión grande', 180, (t) => { t.area *= 1.6; }], ['Daño doble', 260, (t) => { t.dano = 2; }]] },
      hielo: { nombre: 'Hielo', precio: 200, alcance: 38, cada: 2.2, dano: 0, hielo: 1.2, color: '#8fdcff', mejoras: [['Congela más', 150, (t) => { t.hielo *= 1.8; }], ['Hielo cortante', 220, (t) => { t.dano = 1; }]] },
      franco: { nombre: 'Francotirador', precio: 320, alcance: 999, cada: 1.8, dano: 2, color: '#3fbf5f', mejoras: [['Recarga rápida', 300, (t) => { t.cada *= 0.5; }], ['Balas perforantes', 380, (t) => { t.dano = 4; }]] },
    };
    // casillas del camino
    const camino = new Set();
    const puntos = RUTA.map(([c, f]) => ({ x: c * T + T / 2, y: f * T + T / 2 }));
    for (let i = 0; i < RUTA.length - 1; i++) {
      const [c1, f1] = RUTA[i], [c2, f2] = RUTA[i + 1];
      for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) for (let f = Math.min(f1, f2); f <= Math.max(f1, f2); f++) camino.add(`${c},${f}`);
    }
    const largos = []; let total = 0;
    for (let i = 0; i < puntos.length - 1; i++) { const d = Math.hypot(puntos[i + 1].x - puntos[i].x, puntos[i + 1].y - puntos[i].y); largos.push(d); total += d; }
    const enRuta = (d) => { let i = 0; while (i < largos.length && d > largos[i]) { d -= largos[i]; i++; } if (i >= largos.length) return { ...puntos[puntos.length - 1], fin: true }; const a = puntos[i], b = puntos[i + 1], k = d / largos[i]; return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; };

    const caja = el('div', 'solo torres');
    const barra = el('div', 'td-barra');
    const cont = el('div', 'lz-cont');
    const tienda = el('div', 'td-tienda');
    const panel = el('div', 'td-panel');
    const mandos = el('div', 'fila centro');
    caja.append(barra, cont, tienda, panel, mandos, el('p', 'suave centro', 'Elige una torre y toca una casilla libre (no el camino). Toca una torre para mejorarla o venderla.'));
    raiz.replaceChildren(caja);
    const { c, g, punto } = L.crear(cont, W, H);

    let dinero, vidas, oleada, enemigos, torres, balas, efectos, cola, elegida, seleccion, velocidad, enMarcha, vivo, record = UI.leer('torres', 0), raton = null;
    function nueva() {
      dinero = 350; vidas = 100; oleada = 0; enemigos = []; torres = []; balas = []; efectos = []; cola = []; elegida = null; seleccion = null; velocidad = 1; enMarcha = false; vivo = true;
      pintarUI();
    }
    function siguienteOleada() {
      if (enMarcha || !vivo) return;
      oleada++; enMarcha = true;
      const n = 8 + oleada * 3;
      cola = [];
      for (let i = 0; i < n; i++) {
        const r = Math.random();
        let nivel = 1 + Math.floor(Math.min(5, oleada / 4) * r * r + (oleada > 6 ? Math.random() * 1.5 : 0));
        if (oleada >= 12 && Math.random() < 0.08) nivel = 6;
        cola.push({ nivel: Math.min(6, nivel), espera: i * Math.max(0.18, 0.7 - oleada * 0.02) });
      }
      if (oleada % 10 === 0) cola.push({ nivel: 7, espera: n * 0.4 }); // zepelín
      t0Oleada = 0;
      pintarUI();
    }
    let t0Oleada = 0;
    function crearGlobo(nivel) { return nivel === 7 ? { nivel, d: 0, vida: 40 + oleada * 3, max: 40 + oleada * 3, frio: 0 } : { nivel, d: 0, blindaje: NIVELES[nivel].blindado || 0, frio: 0 }; }
    function golpear(e, dano) {
      if (e.muerto) return;
      if (e.nivel === 7) { e.vida -= dano; dinero += 1; if (e.vida <= 0) { e.muerto = true; dinero += 50; explosion(e, '#8a5cf6', 20); for (let k = 0; k < 6; k++) enemigos.push({ ...crearGlobo(5), d: Math.max(0, e.d - k * 8) }); } return; }
      while (dano > 0 && !e.muerto) {
        if (e.blindaje) { e.blindaje--; dano--; continue; }
        e.nivel--; dano--; dinero += 1;
        const p = enRuta(e.d); efectos.push({ x: p.x, y: p.y, t: 0.25, tipo: 'pop', color: NIVELES[e.nivel + 1].color });
        if (e.nivel <= 0) e.muerto = true;
      }
    }
    const explosion = (e, color, r) => { const p = enRuta(e.d); efectos.push({ x: p.x, y: p.y, t: 0.35, tipo: 'boom', color, r }); };
    function actualizar(dt0) {
      if (!vivo) return;
      for (let paso = 0; paso < velocidad; paso++) {
        const dt = dt0;
        if (enMarcha) {
          t0Oleada += dt;
          while (cola.length && cola[0].espera <= t0Oleada) enemigos.push(crearGlobo(cola.shift().nivel));
        }
        for (const e of enemigos) {
          if (e.muerto) continue;
          const v = e.nivel === 7 ? 22 : NIVELES[e.nivel].v;
          e.frio = Math.max(0, e.frio - dt);
          e.d += v * (e.frio > 0 ? 0.35 : 1) * dt;
          if (e.d >= total) { e.muerto = true; vidas -= e.nivel === 7 ? 30 : e.nivel + (e.blindaje || 0); if (vidas <= 0) return perder(); }
        }
        for (const t of torres) {
          t.carga -= dt;
          if (t.carga > 0) continue;
          const objetivos = enemigos.filter((e) => !e.muerto && Math.hypot(enRuta(e.d).x - t.x, enRuta(e.d).y - t.y) <= t.alcance);
          if (!objetivos.length) continue;
          const obj = objetivos.reduce((a, b) => (b.d > a.d ? b : a)); // el más adelantado
          t.carga = t.cada;
          if (t.tipo === 'hielo') { for (const e of objetivos) { e.frio = t.hielo; if (t.dano) golpear(e, 1); } efectos.push({ x: t.x, y: t.y, t: 0.3, tipo: 'hielo', r: t.alcance }); continue; }
          if (t.tipo === 'franco') { golpear(obj, t.dano); const p = enRuta(obj.d); efectos.push({ x: t.x, y: t.y, x2: p.x, y2: p.y, t: 0.1, tipo: 'rayo' }); t.ang = Math.atan2(p.y - t.y, p.x - t.x); continue; }
          const p = enRuta(obj.d + 8);
          t.ang = Math.atan2(p.y - t.y, p.x - t.x);
          balas.push({ x: t.x, y: t.y, obj, tipo: t.tipo, dano: t.dano, area: t.area, v: t.tipo === 'canon' ? 160 : 260 });
        }
        for (const b of balas) {
          const p = enRuta(b.obj.d);
          const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy);
          if (d < 4 || b.obj.muerto) {
            b.fin = true;
            if (b.tipo === 'canon') { efectos.push({ x: b.x, y: b.y, t: 0.3, tipo: 'boom', color: '#ffc63d', r: b.area }); for (const e of enemigos) if (!e.muerto && Math.hypot(enRuta(e.d).x - b.x, enRuta(e.d).y - b.y) <= b.area) golpear(e, b.dano); }
            else if (!b.obj.muerto) golpear(b.obj, b.dano);
          } else { b.x += dx / d * b.v * dt; b.y += dy / d * b.v * dt; }
        }
        balas = balas.filter((b) => !b.fin);
        enemigos = enemigos.filter((e) => !e.muerto);
        for (const f of efectos) f.t -= dt;
        efectos = efectos.filter((f) => f.t > 0);
        if (enMarcha && !cola.length && !enemigos.length) {
          enMarcha = false; dinero += 80 + oleada * 6;
          if (oleada > record) { record = oleada; UI.guardar('torres', record); }
          Cuenta.record('torres', oleada);
          UI.aviso(`¡Oleada ${oleada} superada!`, 'bien');
          if (auto.checked) setTimeout(siguienteOleada, 1200);
        }
      }
      pintarUI();
    }
    function perder() { vivo = false; enMarcha = false; UI.aviso(`¡Se acabó! Llegaste a la oleada ${oleada}`, 'mal'); if (oleada - 1 > record) { record = oleada - 1; UI.guardar('torres', record); } pintarUI(); }
    // --- interfaz ---
    // la interfaz se crea una vez y solo se actualiza: si se rehiciera con cada globo reventado (el dinero
    // cambia sin parar), un botón podía desaparecer entre pulsar y soltar y el clic se perdía
    const auto = el('input'); auto.type = 'checkbox';
    const botTienda = {};
    for (const [k, t] of Object.entries(TORRES)) { const b = el('button', 'td-torre'); b.type = 'button'; b.append(icono(k), el('b', null, t.nombre), el('small', null, `${t.precio} 💰`)); b.onclick = () => { elegida = elegida === k ? null : k; seleccion = null; pintarUI(); }; botTienda[k] = b; tienda.append(b); }
    let ultimaBarra = '', ultimoPanel = '', ultimosMandos = '', botMejora = null, precioMejora = 0;
    function pintarUI() {
      const cb = [dinero, vidas, oleada, record].join();
      if (cb !== ultimaBarra) { ultimaBarra = cb; barra.replaceChildren(el('span', null, `💰 ${dinero}`), el('span', null, `❤️ ${Math.max(0, vidas)}`), el('span', null, `🎈 Oleada ${oleada}`), el('span', null, `🏆 ${record}`)); }
      for (const [k, b] of Object.entries(botTienda)) { b.disabled = dinero < TORRES[k].precio || !vivo; b.classList.toggle('sel', elegida === k); }
      const cp = seleccion ? `${seleccion.id}|${seleccion.nivel}` : '';
      if (cp !== ultimoPanel) {
        ultimoPanel = cp; panel.replaceChildren(); botMejora = null;
        if (seleccion) {
          const t = seleccion, def = TORRES[t.tipo];
          panel.append(el('b', null, `${def.nombre} (mejoras: ${t.nivel}/2)`));
          if (t.nivel < 2) { const [n, pr, f] = def.mejoras[t.nivel]; precioMejora = pr; botMejora = boton(`${n} · ${pr} 💰`, () => { if (dinero >= pr) { dinero -= pr; f(t); t.nivel++; t.gastado += pr; pintarUI(); } }, 'mini oro'); panel.append(botMejora); }
          panel.append(boton(`Vender · ${Math.floor(t.gastado * 0.7)} 💰`, () => { dinero += Math.floor(t.gastado * 0.7); torres = torres.filter((x) => x !== t); seleccion = null; pintarUI(); }, 'mini flojo'));
        }
      }
      if (botMejora) botMejora.disabled = dinero < precioMejora;
      const cm = [enMarcha, vivo, velocidad, oleada].join();
      if (cm !== ultimosMandos) {
        ultimosMandos = cm; mandos.replaceChildren();
        if (vivo) {
          const sig = boton(enMarcha ? 'Oleada en marcha…' : `▶ Oleada ${oleada + 1}`, siguienteOleada, 'oro'); sig.disabled = enMarcha;
          const lab = el('label', 'check'); lab.append(auto, ' Seguidas');
          mandos.append(sig, boton(velocidad === 1 ? '⏩ ×2' : '▶ ×1', () => { velocidad = velocidad === 1 ? 2 : 1; pintarUI(); }, 'mini'), lab);
        } else mandos.append(boton('Nueva partida', () => nueva(), 'oro'));
      }
    }
    function icono(k) { const cv = document.createElement('canvas'); cv.width = cv.height = 16; const gg = cv.getContext('2d'); dibujarTorre(gg, { tipo: k, x: 8, y: 8, ang: -0.6, nivel: 0 }); cv.className = 'td-icono'; return cv; }
    function dibujarTorre(gg, t) {
      const def = TORRES[t.tipo];
      gg.fillStyle = '#1e1b2e'; gg.fillRect(t.x - 7, t.y - 7, 14, 14);
      gg.fillStyle = def.color; gg.fillRect(t.x - 6, t.y - 6, 12, 12);
      gg.fillStyle = 'rgba(255,255,255,.35)'; gg.fillRect(t.x - 6, t.y - 6, 12, 2);
      gg.save(); gg.translate(t.x, t.y); gg.rotate(t.ang || 0);
      gg.fillStyle = '#1e1b2e'; gg.fillRect(0, -2, t.tipo === 'franco' ? 10 : 7, 4);
      gg.restore();
      for (let k = 0; k < t.nivel; k++) { gg.fillStyle = '#ffc63d'; gg.fillRect(t.x - 5 + k * 4, t.y + 4, 3, 2); }
    }
    c.addEventListener('pointermove', (e) => { raton = punto(e); });
    c.addEventListener('pointerleave', () => { raton = null; });
    c.addEventListener('pointerdown', (e) => {
      const p = punto(e); const col = Math.floor(p.x / T), fila = Math.floor(p.y / T);
      const aqui = torres.find((t) => t.col === col && t.fila === fila);
      if (aqui) { seleccion = aqui; elegida = null; pintarUI(); return; }
      if (elegida && !camino.has(`${col},${fila}`) && dinero >= TORRES[elegida].precio) {
        const def = TORRES[elegida];
        torres.push({ id: Math.random(), tipo: elegida, col, fila, x: col * T + T / 2, y: fila * T + T / 2, alcance: def.alcance, cada: def.cada, dano: def.dano, area: def.area, hielo: def.hielo, carga: 0, nivel: 0, gastado: def.precio });
        dinero -= def.precio;
        if (dinero < def.precio) elegida = null;
        pintarUI();
      } else { seleccion = null; pintarUI(); }
    });
    function pintar() {
      // césped a cuadros y camino de tierra
      for (let f = 0; f < FILAS; f++) for (let k = 0; k < COLS; k++) { g.fillStyle = camino.has(`${k},${f}`) ? ((k + f) % 2 ? '#d9b27c' : '#cfa56c') : ((k + f) % 2 ? '#5fc46f' : '#55b865'); g.fillRect(k * T, f * T, T, T); }
      const sel = seleccion || (elegida && raton ? { x: Math.floor(raton.x / T) * T + T / 2, y: Math.floor(raton.y / T) * T + T / 2, alcance: TORRES[elegida].alcance } : null);
      if (sel && sel.alcance < 999) { g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(sel.x, sel.y, sel.alcance, 0, Math.PI * 2); g.fill(); }
      if (elegida && raton) { const col = Math.floor(raton.x / T), fila = Math.floor(raton.y / T); g.fillStyle = camino.has(`${col},${fila}`) ? 'rgba(255,90,54,.5)' : 'rgba(255,255,255,.4)'; g.fillRect(col * T, fila * T, T, T); }
      for (const t of torres) dibujarTorre(g, t);
      for (const e of enemigos) {
        const p = enRuta(e.d);
        if (e.nivel === 7) { g.fillStyle = '#1e1b2e'; g.fillRect(p.x - 13, p.y - 7, 26, 14); g.fillStyle = '#8a5cf6'; g.fillRect(p.x - 12, p.y - 6, 24, 12); g.fillStyle = '#ff5a36'; g.fillRect(p.x - 12, p.y - 10, 24 * e.vida / e.max, 2); continue; }
        const n = NIVELES[e.nivel];
        g.fillStyle = '#1e1b2e'; g.fillRect(p.x - 5, p.y - 6, 10, 11); g.fillRect(p.x - 6, p.y - 5, 12, 9);
        g.fillStyle = e.frio > 0 ? '#bfe9ff' : n.color; g.fillRect(p.x - 4, p.y - 5, 8, 9); g.fillRect(p.x - 5, p.y - 4, 10, 7);
        g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(p.x - 3, p.y - 4, 2, 2);
        g.fillStyle = '#1e1b2e'; g.fillRect(p.x, p.y + 5, 1, 3);
        if (e.blindaje) { g.fillStyle = '#9aa0b5'; g.fillRect(p.x - 5, p.y - 1, 10, 2); }
      }
      for (const b of balas) { g.fillStyle = b.tipo === 'canon' ? '#1e1b2e' : '#ffffff'; g.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 1, b.tipo === 'canon' ? 4 : 2, b.tipo === 'canon' ? 4 : 2); }
      for (const f of efectos) {
        if (f.tipo === 'pop') { g.fillStyle = f.color; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; const r = (0.25 - f.t) * 40; g.fillRect(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, 2, 2); } }
        if (f.tipo === 'boom') { g.fillStyle = 'rgba(255,198,61,.6)'; g.beginPath(); g.arc(f.x, f.y, f.r * (1 - f.t), 0, Math.PI * 2); g.fill(); }
        if (f.tipo === 'hielo') { g.strokeStyle = 'rgba(191,233,255,.8)'; g.lineWidth = 2; g.beginPath(); g.arc(f.x, f.y, f.r * (1 - f.t / 0.3), 0, Math.PI * 2); g.stroke(); }
        if (f.tipo === 'rayo') { g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x2, f.y2); g.stroke(); }
      }
      if (!vivo) { g.fillStyle = 'rgba(30,27,46,.6)'; g.fillRect(0, 0, W, H); L.texto(g, 'FIN DE LA PARTIDA', W / 2, H / 2 - 8, { tam: 16, color: '#ffc63d', alinear: 'center' }); }
    }
    nueva();
    L.bucle(actualizar, pintar);
  },
};
