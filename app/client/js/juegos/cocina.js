'use strict';
// Cocina loca: ← ↑ → ↓ o WASD para moverte, espacio para coger/soltar, E (mantener) para cortar.
// En el móvil, cruceta y botones. Las teclas se mandan al cambiar; la pulsación de «coger» no se pierde.
(() => {
  const { el, boton } = UI;
  const T = 40;
  const ICO = { tomate: '🍅', lechuga: '🥬', pan: '🍞', carne: '🥩', plato: '🍽️' };
  const RECETA = { ensalada: ['Ensalada', '🥗'], hamburguesa: ['Hamburguesa', '🍔'], bocadillo: ['Bocadillo vegetal', '🥪'] };
  const COLORES = ['#4d7cfe', '#ff5a36', '#3fbf5f', '#ffc63d'];
  const ARR = 1, ABA = 2, IZQ = 4, DER = 8, COGER = 16, USAR = 32;
  const MAPA_T = { ArrowUp: ARR, KeyW: ARR, ArrowDown: ABA, KeyS: ABA, ArrowLeft: IZQ, KeyA: IZQ, ArrowRight: DER, KeyD: DER, Space: COGER, KeyE: USAR, KeyF: USAR };
  let lz = null, ctxC = null, vC = null, fotos = [], mias = 0, botonesK = 0, enviadas = -1, pedidosDiv = null, avisoVisto = 0;
  function mandar() { const k = mias | botonesK; if (k !== enviadas && ctxC && ctxC.fase === 'juego') { enviadas = k; ctxC.enviar({ tipo: 'teclas', k }); } }
  document.addEventListener('keydown', (e) => { if (!vC || e.target.closest('input, textarea') || !MAPA_T[e.code]) return; e.preventDefault(); if (e.repeat) return; mias |= MAPA_T[e.code]; mandar(); });
  document.addEventListener('keyup', (e) => { if (!MAPA_T[e.code]) return; mias &= ~MAPA_T[e.code]; mandar(); });
  window.addEventListener('blur', () => { mias = 0; botonesK = 0; mandar(); });
  function emoji(g, t, x, y, tam = 22) { g.font = `${tam}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x, y); }
  function cosa(g, it, x, y, tam = 22) {
    if (!it) return;
    if (it.tipo === 'plato') { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x, y + 4, 15, 9, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#1e1b2e'; g.lineWidth = 2; g.stroke(); it.cosas.forEach((c, i) => emoji(g, ICO[c], x - (it.cosas.length - 1) * 7 + i * 14, y, 14)); return; }
    emoji(g, ICO[it.tipo], x, y, tam);
    if (it.cortado && it.tipo !== 'pan') { g.fillStyle = '#ffffff'; g.font = 'bold 10px sans-serif'; g.fillText('✂', x + 10, y - 10); }
    if (it.tipo === 'carne' && it.hecho > 0) { const q = it.hecho >= 2; g.fillStyle = '#1e1b2e'; g.fillRect(x - 15, y + 13, 30, 5); g.fillStyle = q ? '#1e1b2e' : it.hecho >= 1 ? '#3fbf5f' : '#ffc63d'; g.fillRect(x - 14, y + 14, 28 * Math.min(1, it.hecho >= 1 ? 1 : it.hecho), 3); if (q) emoji(g, '💨', x + 12, y - 12, 14); else if (it.hecho >= 1.5) emoji(g, '⚠️', x + 12, y - 12, 12); }
  }
  function pintar() {
    if (!lz || !vC || !fotos.length) return;
    const g = lz.g, f = fotos[fotos.length - 1].f, a = fotos[fotos.length - 2]?.f || f;
    const k = Math.min(1, (performance.now() - fotos[fotos.length - 1].t) / 50);
    const M = vC.mapa;
    g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, lz.c.width, lz.c.height);
    for (let y = 0; y < M.length; y++) for (let x = 0; x < M[0].length; x++) {
      const t = M[y][x], px = x * T, py = y * T;
      if (t === '.') { g.fillStyle = (x + y) % 2 ? '#f3eddc' : '#ebe2cc'; g.fillRect(px, py, T, T); continue; }
      g.fillStyle = '#1e1b2e'; g.fillRect(px, py, T, T);
      g.fillStyle = { K: '#c08a5a', F: '#6b7088', D: '#dde6ff', E: '#3fbf5f', B: '#4a4560', T: '#ffd6c7', L: '#d3f3ec', P: '#fff1c7', C: '#ffd6d6' }[t] || '#9a5b2e';
      g.fillRect(px + 2, py + 2, T - 4, T - 4);
      if (t === 'K') { g.fillStyle = '#e6b672'; g.fillRect(px + 7, py + 9, T - 14, T - 18); }
      if (t === 'F') { g.fillStyle = '#1e1b2e'; g.beginPath(); g.arc(px + T / 2, py + T / 2, 12, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#ff5a36'; g.lineWidth = 2; g.stroke(); }
      if ('TLPC'.includes(t)) emoji(g, ICO[{ T: 'tomate', L: 'lechuga', P: 'pan', C: 'carne' }[t]], px + T / 2, py + T / 2, 20);
      if (t === 'D') emoji(g, '🍽️', px + T / 2, py + T / 2, 20);
      if (t === 'E') emoji(g, '🛎️', px + T / 2, py + T / 2, 18);
      if (t === 'B') emoji(g, '🗑️', px + T / 2, py + T / 2, 18);
    }
    for (const [clave, it] of Object.entries(f.o)) { const [x, y] = clave.split(',').map(Number); cosa(g, it, x * T + T / 2, y * T + T / 2); }
    f.c.forEach((c, j) => {
      const ca = a.c[j] || c, x = (ca[0] + (c[0] - ca[0]) * k) * T, y = (ca[1] + (c[1] - ca[1]) * k) * T;
      g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x, y + 12, 13, 5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1e1b2e'; g.beginPath(); g.arc(x, y, 14, 0, Math.PI * 2); g.fill();
      g.fillStyle = COLORES[j]; g.beginPath(); g.arc(x, y, 12, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff'; g.fillRect(x - 9, y - 22, 18, 9); g.fillRect(x - 6, y - 26, 12, 5);
      g.fillStyle = '#1e1b2e'; g.fillRect(x + c[2] * 6 - 2, y + c[3] * 6 - 2, 4, 4);
      if (c[4]) cosa(g, c[4], x + c[2] * 16, y + c[3] * 16 - 6, 18);
      if (c[5] > 0) { g.fillStyle = '#1e1b2e'; g.fillRect(x - 16, y + 17, 32, 6); g.fillStyle = '#ffc63d'; g.fillRect(x - 15, y + 18, 30 * c[5], 4); }
      if (j === ctxC.yo) { g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 16, 0, Math.PI * 2); g.stroke(); }
    });
  }
  function pintarPedidos(f) {
    if (!pedidosDiv) return;
    pedidosDiv.replaceChildren(...f.p.map(([id, r, q, tot]) => { const d = el('div', 'co-pedido' + (q < 15 ? ' prisa' : '')); d.append(el('span', 'co-plato', RECETA[r][1]), el('b', null, RECETA[r][0]), el('small', null, vC.recetas[r].map((c) => ICO[c]).join(' + '))); const b = el('i', 'co-barra'); b.style.width = `${(q / tot) * 100}%`; d.append(b); return d; }));
    if (!f.p.length) pedidosDiv.append(el('p', 'suave', 'Sin pedidos… ¡de momento!'));
    const r = document.querySelector('.co-reloj'); if (r) r.textContent = `⏱ ${Math.floor(f.r / 60)}:${String(f.r % 60).padStart(2, '0')} · ${f.pt} puntos`;
    if (f.av && f.av.id !== avisoVisto) { avisoVisto = f.av.id; UI.aviso(f.av.texto, f.av.tipo); }
  }
  window.JUEGO = {
    cooperativo: true,
    evento(ev) { if (ev.tipo !== 'foto') return; fotos.push({ t: performance.now(), f: ev.f }); if (fotos.length > 4) fotos.shift(); pintarPedidos(ev.f); },
    render(zona, v, ctx) {
      ctxC = ctx; vC = v;
      if (!fotos.length) fotos.push({ t: performance.now(), f: v.foto });
      const cont = el('div', 'lz-cont');
      if (!lz) { lz = window.Lienzo.crear(cont, v.mapa[0].length * T, v.mapa.length * T, { clase: 'co-lienzo' }); lz.g.imageSmoothingEnabled = true; window.Lienzo.bucle(() => {}, pintar); } else cont.append(lz.c);
      pedidosDiv = el('div', 'co-pedidos');
      const cab = el('div', 'fila centro'); cab.append(el('b', 'co-reloj', ''));
      const mandos = el('div', 'co-mandos');
      const cruz = el('div', 'co-cruz');
      for (const [t, bit, cls] of [['▲', ARR, 'arr'], ['◀', IZQ, 'izq'], ['▶', DER, 'der'], ['▼', ABA, 'aba']]) { const b = UI.mantener(boton(t, null, 'mini ' + cls), () => { botonesK |= bit; mandar(); }, () => { botonesK &= ~bit; mandar(); }); cruz.append(b); }
      const acc = el('div', 'co-acc');
      acc.append(UI.mantener(boton('✋ Coger / soltar', null, 'oro'), () => { botonesK |= COGER; mandar(); }, () => { botonesK &= ~COGER; mandar(); }), UI.mantener(boton('🔪 Cortar', null, ''), () => { botonesK |= USAR; mandar(); }, () => { botonesK &= ~USAR; mandar(); }));
      mandos.append(cruz, acc);
      zona.append(cab, pedidosDiv, cont, mandos, el('p', 'suave centro', 'Flechas o WASD para moverte · espacio: coger / soltar / emplatar · E (mantener) en la tabla: cortar · la carne cortada va al fogón · entrega en la campanilla 🛎️'));
      pintarPedidos(fotos[fotos.length - 1].f);
    },
  };
})();
