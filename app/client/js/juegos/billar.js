'use strict';
// Billar a bola 8: mueve el ratón (o el dedo) por la mesa para apuntar, elige la fuerza y pulsa «Tirar»
// (o espacio). Con bola en mano, toca donde quieras dejar la blanca.
(() => {
  const { el, boton } = UI;
  const COLOR = { 1: '#ffc63d', 2: '#2f63c9', 3: '#ff5a36', 4: '#8a5cf6', 5: '#ff9f2e', 6: '#24863e', 7: '#9a2a1a', 8: '#1e1b2e' };
  const MW = 1000, MH = 500, M = 18, ESC = 0.5, W = MW * ESC + M * 2, H = MH * ESC + M * 2;
  let lz = null, ctxB = null, vB = null, anim = null, ultimoVisto = null, ang = 0, fuerza = 0.5, confirmar = 0;
  const aP = (x, y) => [M + x * ESC, M + y * ESC];
  function bola(g, n, x, y) {
    const [px, py] = aP(x, y), r = 11 * ESC + 0.5;
    g.fillStyle = '#1e1b2e'; g.beginPath(); g.arc(px, py, r + 0.8, 0, Math.PI * 2); g.fill();
    const c = n === 0 ? '#fbf7ee' : COLOR[n > 8 ? n - 8 : n];
    g.fillStyle = n > 8 ? '#fbf7ee' : c; g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill();
    if (n > 8) { g.save(); g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.clip(); g.fillStyle = c; g.fillRect(px - r, py - r * 0.5, r * 2, r); g.restore(); }
    if (n) { g.fillStyle = '#fbf7ee'; g.beginPath(); g.arc(px, py, r * 0.45, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(Math.round(px - r * 0.5), Math.round(py - r * 0.6), 1.5, 1.5);
  }
  // guía: primer choque del tiro con una bola o la banda
  function guia(bolas, x0, y0, a) {
    const dx = Math.cos(a), dy = Math.sin(a), R2 = 22;
    let mejor = null, t = Infinity;
    for (const b of bolas) { if (!b.n || b.dentro) continue; const fx = b.x - x0, fy = b.y - y0, p = fx * dx + fy * dy; if (p < 0) continue; const d2 = fx * fx + fy * fy - p * p; if (d2 > R2 * R2) continue; const tt = p - Math.sqrt(R2 * R2 - d2); if (tt < t) { t = tt; mejor = b; } }
    const tb = Math.min(dx > 0 ? (MW - 11 - x0) / dx : dx < 0 ? (11 - x0) / dx : Infinity, dy > 0 ? (MH - 11 - y0) / dy : dy < 0 ? (11 - y0) / dy : Infinity);
    if (!mejor || tb < t) return { x: x0 + dx * tb, y: y0 + dy * tb, bola: null };
    return { x: x0 + dx * t, y: y0 + dy * t, bola: mejor };
  }
  function pintar() {
    if (!lz || !vB) return;
    const g = lz.g, v = vB;
    g.fillStyle = '#6b4520'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1b7a43'; g.fillRect(M, M, MW * ESC, MH * ESC);
    g.fillStyle = 'rgba(255,255,255,.06)'; for (let y = M; y < M + MH * ESC; y += 6) for (let x = M + (y % 12 ? 3 : 0); x < M + MW * ESC; x += 6) g.fillRect(x, y, 1, 1);
    g.fillStyle = '#1e1b2e'; for (const [x, y] of [[0, 0], [MW / 2, -6], [MW, 0], [0, MH], [MW / 2, MH + 6], [MW, MH]]) { const [px, py] = aP(x, y); g.beginPath(); g.arc(px, py, 12, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(M + 250 * ESC, M, 1, MH * ESC);
    // bolas: animación o estado final
    let pos = null;
    if (anim) { const k = Math.min(anim.u.fotos.length - 1, Math.floor((performance.now() - anim.t0) / 33)); pos = anim.u.fotos[k]; if (k >= anim.u.fotos.length - 1) { anim = null; repintarUI(); } }
    const bolas = pos ? pos.map((p, n) => (p ? { n, x: p[0], y: p[1], dentro: false } : { n, dentro: true })) : v.b;
    // guía de tiro
    const yo = ctxB.yo, blanca = bolas[0];
    if (!anim && v.turno === yo && ctxB.fase === 'juego' && !v.enMano && !blanca.dentro) {
      const gd = guia(bolas, blanca.x, blanca.y, ang);
      const [ax, ay] = aP(blanca.x, blanca.y), [bx, by] = aP(gd.x, gd.y);
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.setLineDash([]);
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(bx, by, 11 * ESC, 0, Math.PI * 2); g.stroke();
      if (gd.bola) { const nx = gd.bola.x - gd.x, ny = gd.bola.y - gd.y, d = Math.hypot(nx, ny); const [cx, cy] = aP(gd.bola.x, gd.bola.y); g.strokeStyle = 'rgba(255,198,61,.9)'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + nx / d * 40, cy + ny / d * 40); g.stroke(); }
      // taco
      g.strokeStyle = '#c08a5a'; g.lineWidth = 3; g.beginPath(); const off = 8 + fuerza * 30; g.moveTo(ax - Math.cos(ang) * off, ay - Math.sin(ang) * off); g.lineTo(ax - Math.cos(ang) * (off + 90), ay - Math.sin(ang) * (off + 90)); g.stroke(); g.lineWidth = 1;
    }
    for (const b of bolas) if (!b.dentro) bola(g, b.n, b.x, b.y);
    if (v.enMano && v.turno === yo && !anim) window.Lienzo.texto(g, 'TOCA PARA COLOCAR LA BLANCA', W / 2, H / 2 - 4, { tam: 8, color: '#ffffff', alinear: 'center' });
  }
  let ui = null;
  function repintarUI() {
    if (!ui) return;
    const v = vB, yo = ctxB.yo;
    const miTurno = v.turno === yo && ctxB.fase === 'juego' && !anim;
    ui.estado.className = 'turno' + (miTurno ? ' mio' : '');
    ui.estado.textContent = ctxB.fase !== 'juego' ? (v.ultimo?.texto || '') : anim ? (v.ultimo?.texto ? `${ctxB.nombre(v.ultimo.j)} ${v.ultimo.texto}` : '…') : miTurno ? (v.enMano ? 'Bola en mano: colócala' : `Te toca${v.objetivo === 'negra' ? ': ¡a por la negra!' : v.objetivo === 'abierta' ? '' : ` (${v.objetivo})`}`) : `Tira ${ctxB.nombre(v.turno)}…`;
    ui.tirar.disabled = !miTurno || v.enMano;
  }
  function tirar() { if (!vB || vB.turno !== ctxB.yo || anim || vB.enMano) return; ctxB.enviar({ tipo: 'tirar', ang, fuerza }); }
  document.addEventListener('keydown', (e) => { if (e.code === 'Space' && vB && !e.target.closest('input')) { e.preventDefault(); tirar(); } if (e.code === 'ArrowLeft') ang -= 0.01; if (e.code === 'ArrowRight') ang += 0.01; });
  window.JUEGO = {
    render(zona, v, ctx) {
      ctxB = ctx; vB = v;
      const clave = v.ultimo ? JSON.stringify([v.ultimo.j, v.ultimo.metidas, v.ultimo.fotos.length, v.ultimo.fotos.at(-1)]) : null;
      if (clave && clave !== ultimoVisto) { if (ultimoVisto !== null) anim = { u: v.ultimo, t0: performance.now() }; ultimoVisto = clave; if (ultimoVisto && v.ultimo.texto && ctx.fase === 'juego') UI.aviso(`${ctx.nombre(v.ultimo.j)} ${v.ultimo.texto}`, v.ultimo.falta ? 'mal' : ''); }
      const cont = el('div', 'lz-cont');
      if (!lz) {
        lz = window.Lienzo.crear(cont, W, H, { clase: 'billar-mesa' });
        const mesa = (e) => { const p = lz.punto(e); return [(p.x - M) / ESC, (p.y - M) / ESC]; };
        lz.c.addEventListener('pointermove', (e) => { if (!vB || vB.turno !== ctxB.yo || anim || vB.enMano) return; const [x, y] = mesa(e); const b = vB.b[0]; ang = Math.atan2(y - b.y, x - b.x); });
        lz.c.addEventListener('pointerdown', (e) => { if (!vB || vB.turno !== ctxB.yo || anim) return; const [x, y] = mesa(e); if (vB.enMano) ctxB.enviar({ tipo: 'colocar', x, y }); else { const b = vB.b[0]; ang = Math.atan2(y - b.y, x - b.x); } });
        window.Lienzo.bucle(() => {}, pintar);
      } else cont.append(lz.c);
      const marcador = el('div', 'fila centro dm-marcador');
      for (const j of [0, 1]) { const s = el('span', 'dm-jug' + (v.turno === j ? ' activo' : '')); s.textContent = `${ctx.nombre(j)}: ${v.grupos[j] || 'mesa abierta'}`; marcador.append(s); }
      const quedan = el('div', 'bl-quedan');
      for (let n = 1; n <= 15; n++) { const b = v.b[n]; const s = el('span', 'bl-bola' + (b.dentro ? ' dentro' : '') + (n > 8 ? ' rayada' : '')); s.style.setProperty('--c', COLOR[n > 8 ? n - 8 : n]); s.textContent = n; quedan.append(s); }
      const estado = el('p', 'turno');
      const fila = el('div', 'fila centro');
      const f = el('input'); f.type = 'range'; f.min = 5; f.max = 100; f.value = Math.round(fuerza * 100); f.setAttribute('aria-label', 'Fuerza'); f.oninput = () => { fuerza = f.value / 100; };
      const tir = boton('🎱 Tirar', tirar, 'oro');
      fila.append(el('span', null, 'Fuerza'), f, tir);
      ui = { estado, tirar: tir };
      const acciones = el('div', 'fila centro');
      if (ctx.fase === 'juego' && ctx.yo >= 0) acciones.append(boton(Date.now() < confirmar ? '¿Seguro? Pulsa otra vez' : 'Rendirse', () => { if (Date.now() < confirmar) ctx.enviar({ tipo: 'rendirse' }); else { confirmar = Date.now() + 3000; UI.aviso('Pulsa «Rendirse» otra vez para abandonar'); } }, 'mini flojo'));
      zona.append(marcador, quedan, estado, cont, fila, acciones);
      repintarUI();
    },
  };
})();
