'use strict';
// Corta frutas: desliza el ratón o el dedo para cortar las frutas que saltan. No cortes las bombas.
// Si se te caen tres frutas sin cortar, se acaba. Varias de un tajo = combo.
window.JUEGO = {
  montar(raiz) {
    const { el, boton } = UI;
    const L = window.Lienzo;
    const W = 320, H = 240;
    const FRUTAS = [['Sandía', '#3fbf5f', '#ff5a36', 13], ['Naranja', '#ff9f2e', '#ffd08a', 9], ['Manzana', '#ff5a36', '#fff1c7', 9], ['Plátano', '#ffc63d', '#fff1c7', 9], ['Uva', '#8a5cf6', '#c9b0ff', 7], ['Kiwi', '#9a5b2e', '#7fd98f', 8]];
    const caja = el('div', 'solo frutas');
    const marcador = el('p', 'marcador');
    const cont = el('div', 'lz-cont');
    const otra = boton('Empezar', () => nueva(), 'oro');
    caja.append(marcador, cont, otra);
    raiz.replaceChildren(caja);
    const { c, g, punto } = L.crear(cont, W, H);
    let objs = null, trozos = [], salpicones = [], estela = [], puntos = 0, vidas = 3, vivo = false, t = 0, siguiente = 0, record = UI.leer('frutas', 0), cortando = false, avisos = [];
    function nueva() { objs = []; trozos = []; salpicones = []; estela = []; puntos = 0; vidas = 3; vivo = true; t = 0; siguiente = 0.5; avisos = []; otra.hidden = true; }
    function lanzar() {
      const n = 1 + Math.floor(Math.random() * Math.min(4, 1 + t / 15));
      for (let k = 0; k < n; k++) {
        const bomba = Math.random() < Math.min(0.25, 0.05 + t / 300);
        const f = FRUTAS[Math.floor(Math.random() * FRUTAS.length)];
        const x = 40 + Math.random() * (W - 80);
        objs.push({ x, y: H + 10, vx: (W / 2 - x) * (0.3 + Math.random() * 0.4), vy: -(380 + Math.random() * 80), r: bomba ? 9 : f[3], bomba, f, giro: Math.random() * 6, vg: (Math.random() - 0.5) * 8 });
      }
    }
    c.addEventListener('pointerdown', (e) => { cortando = true; estela = [{ ...punto(e), t: performance.now() }]; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', (e) => { if (!cortando || !vivo) return; const p = { ...punto(e), t: performance.now() }; const a = estela[estela.length - 1]; estela.push(p); if (a) cortar(a, p); });
    for (const ev of ['pointerup', 'pointercancel']) c.addEventListener(ev, () => { cortando = false; });
    let combo = [], comboT = 0;
    function cortar(a, b) {
      for (const o of objs) {
        if (o.cortado) continue;
        // distancia del centro al segmento
        const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
        const k = Math.max(0, Math.min(1, ((o.x - a.x) * dx + (o.y - a.y) * dy) / l2));
        if (Math.hypot(a.x + dx * k - o.x, a.y + dy * k - o.y) > o.r + 2) continue;
        o.cortado = true;
        if (o.bomba) { vidas = 0; salpicones.push({ x: o.x, y: o.y, t: 0.6, color: '#ffffff', r: 60 }); return fin(); }
        puntos++; combo.push(o); comboT = 0.25;
        const ang = Math.atan2(dy, dx);
        for (const s of [-1, 1]) trozos.push({ x: o.x, y: o.y, vx: o.vx + Math.cos(ang + s * Math.PI / 2) * 60, vy: o.vy * 0.3 + Math.sin(ang + s * Math.PI / 2) * 60, r: o.r, f: o.f, ang, lado: s, giro: 0 });
        salpicones.push({ x: o.x, y: o.y, t: 0.5, color: o.f[2], r: o.r * 2 });
      }
    }
    function fin() {
      vivo = false; otra.textContent = 'Otra vez'; otra.hidden = false;
      if (puntos > record) { record = puntos; UI.guardar('frutas', record); UI.aviso(`¡Récord! ${puntos}`, 'bien'); Confeti(60); } else UI.aviso(vidas <= 0 && objs.some((o) => o.bomba && o.cortado) ? '¡BOOM!' : 'Fin de la partida', 'mal');
      if (puntos) Cuenta.record('frutas', puntos);
    }
    function actualizar(dt) {
      if (comboT > 0) { comboT -= dt; if (comboT <= 0 && combo.length >= 3) { puntos += combo.length; avisos.push({ x: combo[0].x, y: combo[0].y, t: 1, txt: `¡COMBO ×${combo.length}!` }); } if (comboT <= 0) combo = []; }
      for (const s of salpicones) s.t -= dt; salpicones = salpicones.filter((s) => s.t > 0);
      for (const a of avisos) { a.t -= dt; a.y -= 20 * dt; } avisos = (avisos || []).filter((a) => a.t > 0);
      for (const p of trozos) { p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.giro += p.lado * 4 * dt; } trozos = trozos.filter((p) => p.y < H + 30);
      estela = estela.filter((p) => performance.now() - p.t < 150);
      if (!vivo) return;
      t += dt; siguiente -= dt;
      if (siguiente <= 0) { lanzar(); siguiente = Math.max(0.6, 1.6 - t / 60); }
      for (const o of objs) { o.vy += 500 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.giro += o.vg * dt; if (!o.cortado && !o.bomba && !o.caida && o.vy > 0 && o.y > H + o.r) { o.caida = true; vidas--; if (vidas <= 0) return fin(); } }
      objs = objs.filter((o) => !o.cortado && !(o.vy > 0 && o.y > H + 20));
    }
    function fruta(x, y, r, f, ang, medio) {
      g.save(); g.translate(x, y); g.rotate(ang || 0);
      g.fillStyle = '#1e1b2e'; g.beginPath(); g.arc(0, 0, r + 1.5, medio ? (medio > 0 ? 0 : Math.PI) : 0, medio ? (medio > 0 ? Math.PI : 2 * Math.PI) : Math.PI * 2); g.fill();
      g.fillStyle = f[1]; g.beginPath(); g.arc(0, 0, r, medio ? (medio > 0 ? 0 : Math.PI) : 0, medio ? (medio > 0 ? Math.PI : 2 * Math.PI) : Math.PI * 2); g.fill();
      if (medio) { g.fillStyle = f[2]; g.fillRect(-r + 2, -1, 2 * r - 4, 2); } else { g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-r / 2, -r / 2, 3, 3); }
      g.restore();
    }
    function pintar() {
      g.fillStyle = '#6b4520'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#5a3a1b'; for (let y = 0; y < H; y += 24) g.fillRect(0, y, W, 2);
      if (!objs) { L.texto(g, 'CORTA FRUTAS', W / 2, 90, { tam: 16, color: '#ffc63d', alinear: 'center' }); return; }
      for (const s of salpicones) { g.fillStyle = s.color; g.globalAlpha = s.t * 1.5; g.beginPath(); g.arc(s.x, s.y, s.r * (1 - s.t), 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
      for (const o of objs) {
        if (o.bomba) { g.fillStyle = '#1e1b2e'; g.beginPath(); g.arc(o.x, o.y, o.r + 1, 0, Math.PI * 2); g.fill(); g.fillStyle = '#3a3456'; g.beginPath(); g.arc(o.x, o.y, o.r, 0, Math.PI * 2); g.fill(); g.fillStyle = (performance.now() / 100) % 2 < 1 ? '#ff5a36' : '#ffc63d'; g.fillRect(o.x + 3, o.y - o.r - 5, 3, 4); }
        else fruta(o.x, o.y, o.r, o.f, o.giro);
      }
      for (const p of trozos) fruta(p.x, p.y, p.r, p.f, p.ang + p.giro, p.lado);
      if (estela.length > 1) { g.strokeStyle = '#ffffff'; g.lineCap = 'round'; for (let i = 1; i < estela.length; i++) { g.lineWidth = 1 + i / estela.length * 4; g.beginPath(); g.moveTo(estela[i - 1].x, estela[i - 1].y); g.lineTo(estela[i].x, estela[i].y); g.stroke(); } }
      for (const a of avisos) L.texto(g, a.txt, a.x, a.y, { tam: 8, color: '#ffc63d', alinear: 'center' });
      L.texto(g, String(puntos), 8, 6, { tam: 16, color: '#ffc63d' });
      L.texto(g, '✕'.repeat(3 - Math.max(0, vidas)) + '·'.repeat(Math.max(0, vidas)), W - 8, 8, { tam: 8, color: '#ff5a36', alinear: 'right' });
      marcador.textContent = `Frutas: ${puntos} · Récord: ${record}`;
    }
    L.bucle(actualizar, pintar);
  },
};
