'use strict';
// Guerra de eras: manda tropas contra la base rival y gana experiencia para pasar de era (de la Piedra al
// Futuro). Cada era trae tropas, torreta y ataque especial nuevos. Gana quien destruye la base contraria.
window.JUEGO = {
  montar(raiz) {
    const { el, boton } = UI;
    const L = window.Lienzo;
    const W = 320, H = 180, MUNDO = 900, SUELO = 150;
    const ERAS = [
      { nombre: 'Edad de Piedra', xp: 3500, cielo: '#9ad1ff', suelo: '#8bc34a', base: '#9a5b2e', especial: 'Lluvia de meteoritos', tropas: [['Garrote', 15, 55, 12, 0.9, 16], ['Honda', 25, 40, 8, 1.1, 70], ['Jinete de dino', 100, 180, 30, 1.2, 18]] },
      { nombre: 'Edad Media', xp: 12000, cielo: '#b8d8f0', suelo: '#7cb342', base: '#9aa0b5', especial: 'Lluvia de flechas', tropas: [['Espadachín', 50, 120, 25, 0.9, 16], ['Arquero', 75, 80, 18, 1.1, 80], ['Caballero', 300, 400, 60, 1.2, 18]] },
      { nombre: 'Edad de la Pólvora', xp: 40000, cielo: '#cfe3f0', suelo: '#689f38', base: '#c08a5a', especial: 'Bombardeo', tropas: [['Mosquetero', 150, 260, 50, 1.0, 16], ['Fusilero', 200, 180, 40, 1.0, 95], ['Cañón', 650, 900, 130, 1.6, 110]] },
      { nombre: 'Edad Moderna', xp: 150000, cielo: '#dbe8ee', suelo: '#558b2f', base: '#7c8296', especial: 'Ataque aéreo', tropas: [['Soldado', 400, 600, 110, 0.8, 18], ['Francotirador', 550, 420, 120, 1.2, 120], ['Tanque', 1800, 2400, 300, 1.4, 70]] },
      { nombre: 'Futuro', xp: Infinity, cielo: '#2b2f5e', suelo: '#5b37b8', base: '#4dd0ff', especial: 'Rayo orbital', tropas: [['Androide', 1200, 1700, 280, 0.8, 18], ['Láser', 1600, 1200, 300, 1.0, 130], ['Mecha', 5000, 7000, 800, 1.3, 30]] },
    ];
    const caja = el('div', 'solo eras');
    const barra = el('div', 'td-barra');
    const cont = el('div', 'lz-cont');
    const mandos = el('div', 'er-mandos');
    const opciones = el('div', 'fila centro');
    caja.append(barra, cont, mandos, opciones, el('p', 'suave centro', 'Mueve la vista arrastrando o con ← →. Las tropas avanzan solas.'));
    raiz.replaceChildren(caja);
    const { c, g, punto } = L.crear(cont, W, H);
    const dif = el('select'); for (const [v, t] of [['normal', 'CPU normal'], ['dificil', 'CPU difícil']]) { const o = el('option', null, t); o.value = v; dif.append(o); }

    let lados, unidades, proyectiles, efectos, camara, t, vivo, empezado, record = UI.leer('eras', null);
    const nuevoLado = (yo) => ({ yo, era: 0, oro: 175, xp: 0, vida: 500, max: 500, cola: [], prod: 0, especial: 0, torreta: 0, carga: 0, ia: 0 });
    function nueva() {
      lados = [nuevoLado(true), nuevoLado(false)]; unidades = []; proyectiles = []; efectos = []; camara = 0; t = 0; vivo = true; empezado = true;
      pintarUI();
    }
    const def = (lado, k) => { const [nombre, coste, vida, dano, cada, alcance] = ERAS[lado.era].tropas[k]; return { nombre, coste, vida, dano, cada, alcance }; };
    function comprar(li, k) {
      const lado = lados[li]; const d = def(lado, k);
      if (!vivo || lado.oro < d.coste || lado.cola.length >= 5) return;
      lado.oro -= d.coste; lado.cola.push({ k, era: lado.era, tiempo: 1 + k * 0.7 });
      pintarUI();
    }
    function evolucionar(li) {
      const lado = lados[li]; if (lado.era >= ERAS.length - 1 || lado.xp < ERAS[lado.era].xp) return;
      lado.era++; lado.max += 400 + lado.era * 300; lado.vida = Math.min(lado.max, lado.vida + 400 + lado.era * 300);
      efectos.push({ tipo: 'texto', x: li ? MUNDO - 60 : 60, y: 60, t: 2, texto: ERAS[lado.era].nombre.toUpperCase() });
      if (lado.yo) UI.aviso(`¡Llegas a la ${ERAS[lado.era].nombre}!`, 'bien');
      pintarUI();
    }
    const PRECIO_TORRETA = (era) => 250 * (era + 1) ** 2;
    function torreta(li) { const lado = lados[li]; const p = PRECIO_TORRETA(lado.era); if (lado.oro < p || lado.torreta > lado.era) return; lado.oro -= p; lado.torreta = lado.era + 1; pintarUI(); }
    function especial(li) {
      const lado = lados[li]; if (lado.especial > 0 || !vivo) return;
      lado.especial = 45;
      for (let k = 0; k < 18; k++) proyectiles.push({ x: (li ? MUNDO * 0.15 : MUNDO * 0.35) + Math.random() * MUNDO * 0.5, y: -20 - k * 22, vx: (li ? -30 : 30), vy: 160, lado: li, dano: 40 * (lado.era + 1) ** 1.6, cae: true });
      pintarUI();
    }
    const baseX = (li) => (li ? MUNDO - 40 : 40);
    function actualizar(dt) {
      if (!vivo || !empezado) return;
      t += dt;
      if (L.teclas.has('ArrowLeft')) camara -= 220 * dt;
      if (L.teclas.has('ArrowRight')) camara += 220 * dt;
      camara = Math.max(0, Math.min(MUNDO - W, camara));
      lados.forEach((lado, li) => {
        lado.oro += dt * (2 + lado.era * 2) * (lado.yo ? 1 : dif.value === 'dificil' ? 1.6 : 1.1);
        lado.especial = Math.max(0, lado.especial - dt);
        if (lado.cola.length) { lado.prod += dt; if (lado.prod >= lado.cola[0].tiempo) { const q = lado.cola.shift(); lado.prod = 0; const d = { ...def({ era: q.era }, q.k) }; unidades.push({ lado: li, k: q.k, era: q.era, x: baseX(li) + (li ? -18 : 18), ...d, max: d.vida, carga: 0, golpe: 0, paso: 0 }); } }
        // torreta de la base
        if (lado.torreta) {
          lado.carga -= dt;
          const objetivo = unidades.filter((u) => u.lado !== li && Math.abs(u.x - baseX(li)) < 140).sort((a, b) => Math.abs(a.x - baseX(li)) - Math.abs(b.x - baseX(li)))[0];
          if (objetivo && lado.carga <= 0) { lado.carga = 1.3; proyectiles.push({ x: baseX(li), y: SUELO - 50, objetivo, lado: li, dano: 18 * lado.torreta ** 2, v: 220 }); }
        }
      });
      // IA de la CPU
      const cpu = lados[1];
      cpu.ia -= dt;
      if (cpu.ia <= 0) {
        cpu.ia = dif.value === 'dificil' ? 0.8 : 1.4;
        evolucionar(1);
        const amenaza = unidades.filter((u) => u.lado === 0 && u.x > MUNDO * 0.55).length;
        if (cpu.especial <= 0 && amenaza >= 4) especial(1);
        if (cpu.oro > PRECIO_TORRETA(cpu.era) * 1.5 && cpu.torreta <= cpu.era && Math.random() < 0.3) torreta(1);
        const k = Math.random() < 0.15 ? 2 : Math.random() < 0.5 ? 1 : 0;
        if (cpu.oro >= def(cpu, k).coste) comprar(1, k);
      }
      // movimiento y combate
      for (const u of unidades) {
        u.carga -= dt; u.golpe = Math.max(0, u.golpe - dt);
        const dir = u.lado ? -1 : 1;
        const enemigos = unidades.filter((o) => o.lado !== u.lado);
        const delante = enemigos.filter((o) => (o.x - u.x) * dir > 0).sort((a, b) => Math.abs(a.x - u.x) - Math.abs(b.x - u.x))[0];
        const dBase = Math.abs(baseX(1 - u.lado) - u.x);
        const dEnemigo = delante ? Math.abs(delante.x - u.x) : Infinity;
        const aliado = unidades.filter((o) => o !== u && o.lado === u.lado && (o.x - u.x) * dir > 0 && Math.abs(o.x - u.x) < 14)[0];
        const enRango = Math.min(dEnemigo, dBase) <= u.alcance;
        if (enRango) {
          if (u.carga <= 0) {
            u.carga = u.cada; u.golpe = 0.15;
            if (u.alcance > 30) proyectiles.push({ x: u.x, y: SUELO - 12, objetivo: dEnemigo <= dBase ? delante : null, base: dEnemigo > dBase ? 1 - u.lado : null, lado: u.lado, dano: u.dano, v: 200 });
            else if (dEnemigo <= dBase) danar(delante, u.dano, u.lado); else danarBase(1 - u.lado, u.dano);
          }
        } else if (!aliado && dEnemigo > 14) { u.x += dir * 34 * dt; u.paso += dt; }
      }
      for (const p of proyectiles) {
        if (p.cae) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.y >= SUELO - 4) { p.fin = true; efectos.push({ tipo: 'boom', x: p.x, y: SUELO - 4, t: 0.4 }); for (const u of unidades) if (u.lado !== p.lado && Math.abs(u.x - p.x) < 22) danar(u, p.dano, p.lado); } continue; }
        const tx = p.objetivo ? p.objetivo.x : baseX(p.base), ty = p.objetivo ? SUELO - 10 : SUELO - 30;
        const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
        if (d < 5 || (p.objetivo && p.objetivo.vida <= 0)) { p.fin = true; if (p.objetivo && p.objetivo.vida > 0) danar(p.objetivo, p.dano, p.lado); else if (p.base !== null && p.base !== undefined) danarBase(p.base, p.dano); }
        else { p.x += dx / d * p.v * dt; p.y += dy / d * p.v * dt; }
      }
      proyectiles = proyectiles.filter((p) => !p.fin);
      unidades = unidades.filter((u) => u.vida > 0);
      for (const f of efectos) f.t -= dt;
      efectos = efectos.filter((f) => f.t > 0);
      if (Math.floor(t * 4) !== Math.floor((t - dt) * 4)) pintarUI();
    }
    function danar(u, d, deLado) {
      if (!u || u.vida <= 0) return;
      u.vida -= d;
      if (u.vida <= 0) { const premio = def({ era: u.era }, u.k).coste; lados[deLado].oro += Math.round(premio * 1.3); lados[deLado].xp += Math.round(premio * 2.2); efectos.push({ tipo: 'muere', x: u.x, y: SUELO - 10, t: 0.4 }); }
    }
    function danarBase(li, d) {
      const lado = lados[li]; lado.vida -= d;
      if (lado.vida <= 0 && vivo) {
        vivo = false;
        if (li === 1) {
          const s = Math.round(t);
          if (record == null || s < record) { record = s; UI.guardar('eras', s); UI.aviso(`¡Victoria en ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}! Nuevo récord`, 'bien'); } else UI.aviso('¡Victoria!', 'bien');
          Cuenta.record('eras', s); Confeti();
        } else UI.aviso('Han destruido tu base', 'mal');
        pintarUI();
      }
    }
    // --- interfaz ---
    // los botones se rehacen solo al cambiar de era o de estado; el resto del tiempo se actualizan (si se
    // rehicieran cada vez que cambia el oro, un clic podía perderse)
    let ultima = '', ultimaBarra = '', bots = null;
    function pintarUI() {
      const yo = lados[0];
      const cb = [Math.floor(yo.oro), yo.xp, yo.era, record].join();
      if (cb !== ultimaBarra) { ultimaBarra = cb; barra.replaceChildren(el('span', null, `💰 ${Math.floor(yo.oro)}`), el('span', null, `⭐ ${yo.xp}${yo.era < ERAS.length - 1 ? ` / ${ERAS[yo.era].xp}` : ''}`), el('span', null, ERAS[yo.era].nombre), el('span', null, `🏆 ${record == null ? '—' : `${Math.floor(record / 60)}:${String(record % 60).padStart(2, '0')}`}`)); }
      const clave = [yo.era, vivo, empezado].join();
      if (clave !== ultima) {
        ultima = clave; mandos.replaceChildren(); bots = null;
        if (!vivo || !empezado) { opciones.replaceChildren(dif, boton(empezado ? 'Otra partida' : 'Empezar', () => nueva(), 'oro')); return; }
        opciones.replaceChildren();
        const mk = (cls, titulo, fn) => { const b = el('button', 'er-boton ' + cls); b.type = 'button'; const sm = el('small'); b.append(el('b', null, titulo), sm); b.onclick = fn; mandos.append(b); return { b, sm }; };
        bots = {
          tropas: ERAS[yo.era].tropas.map((tr, k) => mk('', tr[0], () => comprar(0, k))),
          tor: mk('', 'Torreta', () => torreta(0)), esp: mk('especial', ERAS[yo.era].especial, () => especial(0)), evo: mk('evo', 'Evolucionar', () => evolucionar(0)),
          cola: el('small', 'suave'),
        };
        mandos.append(bots.cola);
      }
      if (!bots) return;
      ERAS[yo.era].tropas.forEach((tr, k) => { const x = bots.tropas[k]; x.b.disabled = yo.oro < tr[1] || yo.cola.length >= 5; x.sm.textContent = `${tr[1]} 💰`; });
      bots.tor.b.disabled = yo.oro < PRECIO_TORRETA(yo.era) || yo.torreta > yo.era; bots.tor.sm.textContent = yo.torreta > yo.era ? 'puesta' : `${PRECIO_TORRETA(yo.era)} 💰`;
      bots.esp.b.disabled = yo.especial > 0; bots.esp.sm.textContent = yo.especial > 0 ? `${Math.ceil(yo.especial)} s` : '¡listo!';
      bots.evo.b.disabled = yo.era >= ERAS.length - 1 || yo.xp < ERAS[yo.era].xp; bots.evo.sm.textContent = yo.era >= ERAS.length - 1 ? 'última era' : `${ERAS[yo.era].xp} ⭐`;
      bots.cola.textContent = yo.cola.length ? `En cola: ${yo.cola.length}` : '';
    }
    // arrastrar para mover la vista
    let arrastre = null;
    c.addEventListener('pointerdown', (e) => { arrastre = { x: punto(e).x, cam: camara }; });
    c.addEventListener('pointermove', (e) => { if (arrastre) camara = Math.max(0, Math.min(MUNDO - W, arrastre.cam - (punto(e).x - arrastre.x))); });
    c.addEventListener('pointerup', () => { arrastre = null; });
    // --- dibujo ---
    function soldado(u, x) {
      const colorLado = u.lado ? '#ff5a36' : '#4d7cfe';
      const piel = ['#e0ac7e', '#e0ac7e', '#e0ac7e', '#e0ac7e', '#9aa0b5'][u.era];
      const y = SUELO, dir = u.lado ? -1 : 1, salto = Math.floor(u.paso * 8) % 2;
      const g2 = g;
      if (u.k === 2) { // pesado: más grande
        g2.fillStyle = '#1e1b2e'; g2.fillRect(x - 9, y - 18, 18, 14);
        g2.fillStyle = ERAS[u.era].base; g2.fillRect(x - 8, y - 17, 16, 12);
        g2.fillStyle = colorLado; g2.fillRect(x - 8, y - 17, 16, 3);
        g2.fillStyle = '#1e1b2e'; g2.fillRect(x - 7, y - 4, 4, 4); g2.fillRect(x + 3, y - 4, 4, 4);
        g2.fillRect(x + dir * 8, y - 13, dir * 6, 3);
      } else {
        g2.fillStyle = '#1e1b2e'; g2.fillRect(x - 3, y - 14 - salto, 6, 6); g2.fillRect(x - 3, y - 8, 6, 6);
        g2.fillStyle = piel; g2.fillRect(x - 2, y - 13 - salto, 4, 4);
        g2.fillStyle = colorLado; g2.fillRect(x - 2, y - 8, 4, 5);
        g2.fillStyle = '#1e1b2e'; g2.fillRect(x - 2 + salto, y - 3, 1, 3); g2.fillRect(x + 1 - salto, y - 3, 1, 3);
        g2.fillStyle = u.golpe > 0 ? '#ffc63d' : '#1e1b2e'; g2.fillRect(u.lado ? x - 7 : x + 2, y - 9, 5, u.k === 1 ? 1 : 2);
      }
      g.fillStyle = '#1e1b2e'; g.fillRect(x - 6, y - 24, 12, 2); g.fillStyle = '#3fbf5f'; g.fillRect(x - 6, y - 24, 12 * Math.max(0, u.vida / u.max), 2);
    }
    function pintar() {
      if (!lados) { g.fillStyle = '#9ad1ff'; g.fillRect(0, 0, W, H); L.texto(g, 'GUERRA DE ERAS', W / 2, 70, { tam: 16, color: '#ffc63d', alinear: 'center' }); return; }
      const era = ERAS[lados[0].era];
      g.fillStyle = era.cielo; g.fillRect(0, 0, W, H);
      // montañas al fondo con paralaje
      g.fillStyle = 'rgba(30,27,46,.15)';
      for (let k = 0; k < 8; k++) { const x = k * 140 - camara * 0.4; g.beginPath(); g.moveTo(x, SUELO); g.lineTo(x + 70, SUELO - 50 - (k % 3) * 12); g.lineTo(x + 140, SUELO); g.fill(); }
      g.fillStyle = era.suelo; g.fillRect(0, SUELO, W, H - SUELO);
      g.fillStyle = 'rgba(0,0,0,.15)'; for (let x = -camara % 16; x < W; x += 16) g.fillRect(x, SUELO + 6, 8, 2);
      // bases
      lados.forEach((lado, li) => {
        const x = baseX(li) - camara;
        g.fillStyle = '#1e1b2e'; g.fillRect(x - 22, SUELO - 46, 44, 46);
        g.fillStyle = ERAS[lado.era].base; g.fillRect(x - 21, SUELO - 45, 42, 45);
        g.fillStyle = li ? '#ff5a36' : '#4d7cfe'; g.fillRect(x - 21, SUELO - 45, 42, 5);
        g.fillStyle = '#1e1b2e'; g.fillRect(x - 6, SUELO - 18, 12, 18);
        if (lado.torreta) { g.fillStyle = '#1e1b2e'; g.fillRect(x - 5, SUELO - 56, 10, 10); g.fillStyle = '#ffc63d'; g.fillRect(x - 4, SUELO - 55, 8, 8); }
        g.fillStyle = '#1e1b2e'; g.fillRect(x - 22, SUELO - 54 - (lado.torreta ? 8 : 0), 44, 4); g.fillStyle = '#3fbf5f'; g.fillRect(x - 22, SUELO - 54 - (lado.torreta ? 8 : 0), 44 * Math.max(0, lado.vida / lado.max), 4);
      });
      for (const u of unidades) { const x = Math.round(u.x - camara); if (x > -20 && x < W + 20) soldado(u, x); }
      for (const p of proyectiles) { g.fillStyle = p.cae ? '#ff9f2e' : '#1e1b2e'; g.fillRect(Math.round(p.x - camara) - (p.cae ? 2 : 1), Math.round(p.y) - (p.cae ? 2 : 1), p.cae ? 5 : 3, p.cae ? 5 : 2); }
      for (const f of efectos) {
        const x = f.x - camara;
        if (f.tipo === 'boom') { g.fillStyle = `rgba(255,159,46,${f.t * 2})`; g.beginPath(); g.arc(x, f.y, (0.4 - f.t) * 60, 0, Math.PI * 2); g.fill(); }
        if (f.tipo === 'muere') { g.fillStyle = '#ffffff'; for (let k = 0; k < 4; k++) g.fillRect(x + (k - 2) * (0.4 - f.t) * 30, f.y - (0.4 - f.t) * 40, 2, 2); }
        if (f.tipo === 'texto') L.texto(g, f.texto, x, f.y, { tam: 8, color: '#ffc63d', alinear: 'center' });
      }
      // minimapa
      g.fillStyle = 'rgba(30,27,46,.6)'; g.fillRect(W / 2 - 60, 4, 120, 6);
      g.fillStyle = '#ffffff'; g.fillRect(W / 2 - 60 + camara / MUNDO * 120, 4, W / MUNDO * 120, 6);
      for (const u of unidades) { g.fillStyle = u.lado ? '#ff5a36' : '#4d7cfe'; g.fillRect(W / 2 - 60 + u.x / MUNDO * 120, 6, 1, 2); }
      if (!vivo) { g.fillStyle = 'rgba(30,27,46,.55)'; g.fillRect(0, 0, W, H); L.texto(g, lados[1].vida <= 0 ? '¡VICTORIA!' : 'DERROTA', W / 2, H / 2 - 10, { tam: 16, color: '#ffc63d', alinear: 'center' }); }
    }
    empezado = false;
    pintarUI2();
    function pintarUI2() { opciones.replaceChildren(dif, boton('Empezar', () => nueva(), 'oro')); }
    L.bucle(actualizar, pintar);
  },
};
