'use strict';
// Arqueros: arrastra hacia atrás desde cualquier punto para tensar el arco (dirección = ángulo, largo = fuerza)
// y suelta para disparar. También con ← → (ángulo), ↑ ↓ (fuerza) y espacio. Se ven tus últimas flechas.
(() => {
  const { el, boton } = UI;
  let lz = null, ctxA = null, vA = null, anim = null, ultimoVisto = null, apunte = null, ang = 45, fuerza = 0.6, confirmar = 0, textoFlotante = null;
  const W = 320, H = 180;
  function encuadre(v) {
    const xs = [v.pos[0].x, v.pos[1].x];
    const ancho = Math.max(...xs) - Math.min(...xs) + 260, esc = W / ancho;
    return { esc, x0: Math.min(...xs) - 130, y0: -H / esc + 30 / esc };
  }
  const aPantalla = (cam, x, y) => [(x - cam.x0) * cam.esc, H - 24 + y * cam.esc];
  function arquero(g, cam, p, j, vida, tenso) {
    const [x, y] = aPantalla(cam, p.x, p.y), e = Math.max(1, cam.esc * 1.6);
    g.fillStyle = '#9a5b2e'; g.fillRect(x - 8 * cam.esc, y, 16 * cam.esc, H - y); // torre
    g.fillStyle = '#7a4520'; for (let k = y + 4; k < H - 24; k += 6) g.fillRect(x - 8 * cam.esc, k, 16 * cam.esc, 1);
    const c = j ? '#ff5a36' : '#4d7cfe';
    g.fillStyle = '#1e1b2e'; g.fillRect(x - 3 * e, y - 22 * e, 6 * e, 22 * e); g.fillRect(x - 4 * e, y - 30 * e, 8 * e, 8 * e);
    g.fillStyle = '#e0ac7e'; g.fillRect(x - 3 * e, y - 29 * e, 6 * e, 6 * e);
    g.fillStyle = c; g.fillRect(x - 2 * e, y - 21 * e, 4 * e, 12 * e);
    g.strokeStyle = '#9a5b2e'; g.lineWidth = Math.max(1, e); g.beginPath();
    const d = j ? -1 : 1, a = (tenso ? ang : 40) * Math.PI / 180;
    g.arc(x, y - 16 * e, 7 * e, -a * d - (d > 0 ? Math.PI / 2 : -Math.PI / 2) * 0.9 + (d > 0 ? 0 : Math.PI), -a * d + (d > 0 ? Math.PI / 2 : -Math.PI / 2) * 0.9 + (d > 0 ? 0 : Math.PI)); g.stroke();
    g.fillStyle = '#1e1b2e'; g.fillRect(x - 12, y - 40 * e, 24, 4); g.fillStyle = vida > 30 ? '#3fbf5f' : '#ff5a36'; g.fillRect(x - 11, y - 39 * e, 22 * vida / 100, 2);
  }
  function pintar() {
    if (!lz || !vA) return;
    const g = lz.g, v = vA, cam = encuadre(v);
    g.fillStyle = '#9ad1ff'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.8)'; for (let k = 0; k < 5; k++) { const x = (k * 90 + performance.now() / 200 * Math.sign(v.viento || 1) * Math.min(3, Math.abs(v.viento) / 20)) % (W + 60) - 30; g.fillRect(x, 18 + (k % 3) * 14, 26, 6); }
    g.fillStyle = '#7cb342'; g.fillRect(0, H - 24, W, 24); g.fillStyle = '#689f38'; for (let x = 0; x < W; x += 8) g.fillRect(x, H - 24, 4, 2);
    // mis flechas anteriores (referencia)
    const yo = ctxA.yo;
    if (yo >= 0) for (const tr of v.tiros[yo]) { g.fillStyle = 'rgba(30,27,46,.25)'; for (const [x, y] of tr) { const [px, py] = aPantalla(cam, x, y); g.fillRect(px, py, 1, 1); } }
    v.pos.forEach((p, j) => arquero(g, cam, p, j, v.vida[j], j === yo && apunte));
    // flecha en vuelo
    if (anim) {
      const k = Math.min(anim.u.puntos.length - 1, Math.floor((performance.now() - anim.t0) / 33));
      const pts = anim.u.puntos;
      const [x, y] = aPantalla(cam, ...pts[k]), [x0, y0] = aPantalla(cam, ...pts[Math.max(0, k - 1)]);
      const a = Math.atan2(y - y0, x - x0);
      g.strokeStyle = '#1e1b2e'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - Math.cos(a) * 8, y - Math.sin(a) * 8); g.lineTo(x, y); g.stroke();
      if (k >= pts.length - 1) { const im = anim.u.impacto; textoFlotante = { t0: performance.now(), x, y, txt: im.tipo === 'cabeza' ? `¡CABEZA! -${im.dano}` : im.tipo === 'cuerpo' ? `-${im.dano}` : '¡Fallo!', color: im.dano ? '#ff5a36' : '#ffffff' }; anim = null; repintarUI(); }
    } else if (v.ultimo) {
      const pts = v.ultimo.puntos; if (pts.length) { const [x, y] = aPantalla(cam, ...pts[pts.length - 1]); g.fillStyle = '#1e1b2e'; g.fillRect(x - 3, y - 1, 6, 2); }
    }
    if (textoFlotante) { const t = (performance.now() - textoFlotante.t0) / 1000; if (t < 1.4) window.Lienzo.texto(g, textoFlotante.txt, textoFlotante.x, textoFlotante.y - 14 - t * 16, { tam: 8, color: textoFlotante.color, alinear: 'center' }); else textoFlotante = null; }
    // viento
    window.Lienzo.texto(g, `VIENTO ${v.viento > 0 ? '→' : v.viento < 0 ? '←' : '·'} ${Math.abs(Math.round(v.viento / 6))}`, W / 2, 4, { tam: 8, color: '#1e1b2e', alinear: 'center', sombra: null });
    // apunte
    if (apunte && yo >= 0) {
      const [x, y] = aPantalla(cam, v.pos[yo].x, v.pos[yo].y - 16); const d = yo ? -1 : 1, a = ang * Math.PI / 180;
      g.strokeStyle = 'rgba(255,90,54,.8)'; g.lineWidth = 1; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * d * 30 * (0.4 + fuerza), y - Math.sin(a) * 30 * (0.4 + fuerza)); g.stroke(); g.setLineDash([]);
      window.Lienzo.texto(g, `${Math.round(ang)}°  ${Math.round(fuerza * 100)}%`, x, y - 52, { tam: 8, color: '#1e1b2e', alinear: 'center', sombra: null });
    }
  }
  let cuerpoUI = null;
  function repintarUI() {
    if (!cuerpoUI) return;
    const v = vA, yo = ctxA.yo;
    const miTurno = v.turno === yo && ctxA.fase === 'juego' && !anim;
    cuerpoUI.estado.className = 'turno' + (miTurno ? ' mio' : '');
    cuerpoUI.estado.textContent = ctxA.fase !== 'juego' ? '' : anim ? '¡Flecha!' : miTurno ? 'Te toca: arrastra hacia atrás y suelta' : `Apunta ${ctxA.nombre(v.turno)}…`;
  }
  function disparar() { if (!vA || vA.turno !== ctxA.yo || anim) return; ctxA.enviar({ tipo: 'disparar', ang, fuerza }); apunte = null; }
  document.addEventListener('keydown', (e) => {
    if (!vA || vA.turno !== ctxA?.yo || anim || e.target.closest('input')) return;
    if (e.code === 'ArrowLeft') { ang = Math.min(89, ang + 1); apunte = true; } else if (e.code === 'ArrowRight') { ang = Math.max(0, ang - 1); apunte = true; }
    else if (e.code === 'ArrowUp') { fuerza = Math.min(1, fuerza + 0.02); apunte = true; } else if (e.code === 'ArrowDown') { fuerza = Math.max(0, fuerza - 0.02); apunte = true; }
    else if (e.code === 'Space') { e.preventDefault(); disparar(); }
  });
  window.JUEGO = {
    render(zona, v, ctx) {
      ctxA = ctx; vA = v;
      const clave = v.ultimo ? JSON.stringify([v.ultimo.j, v.ultimo.ang, v.ultimo.fuerza, v.vida]) : null;
      if (clave && clave !== ultimoVisto) { if (ultimoVisto !== null || v.ultimo.puntos.length) anim = { u: v.ultimo, t0: performance.now() }; ultimoVisto = clave; }
      const cont = el('div', 'lz-cont');
      if (!lz) {
        lz = window.Lienzo.crear(cont, W, H);
        let ini = null;
        lz.c.addEventListener('pointerdown', (e) => { if (vA.turno !== ctxA.yo || anim) return; ini = lz.punto(e); apunte = true; lz.c.setPointerCapture(e.pointerId); });
        lz.c.addEventListener('pointermove', (e) => { if (!ini) return; const p = lz.punto(e); const dx = ini.x - p.x, dy = ini.y - p.y; const d = vA.turno === 1 ? -1 : 1; ang = Math.max(0, Math.min(89, Math.atan2(-dy, dx * d) * 180 / Math.PI)); fuerza = Math.min(1, Math.hypot(dx, dy) / 90); });
        lz.c.addEventListener('pointerup', () => { if (ini) { ini = null; if (fuerza > 0.05) disparar(); else apunte = null; } });
        window.Lienzo.bucle(() => {}, pintar);
      } else cont.append(lz.c);
      const marcador = el('div', 'fila centro dm-marcador');
      for (const j of [0, 1]) marcador.append(el('span', 'dm-jug', `${j ? '🔴' : '🔵'} ${ctx.nombre(j)}: ${v.vida[j]} ❤️`));
      const estado = el('p', 'turno');
      cuerpoUI = { estado };
      const acciones = el('div', 'fila centro');
      if (ctx.fase === 'juego' && ctx.yo >= 0) acciones.append(boton(Date.now() < confirmar ? '¿Seguro? Pulsa otra vez' : 'Rendirse', () => { if (Date.now() < confirmar) ctx.enviar({ tipo: 'rendirse' }); else { confirmar = Date.now() + 3000; UI.aviso('Pulsa «Rendirse» otra vez para abandonar'); } }, 'mini flojo'));
      zona.append(marcador, estado, cont, acciones, el('p', 'suave centro', 'Arrastra hacia atrás desde donde quieras y suelta. Teclado: ← → ángulo, ↑ ↓ fuerza, espacio.'));
      repintarUI();
    },
  };
})();
