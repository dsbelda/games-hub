'use strict';
// Buscaminas: el primer toque nunca es mina. Clic = destapar; clic derecho o pulsación larga = bandera;
// en el móvil también hay modo bandera. Tocar un número con sus banderas puestas destapa los vecinos.
window.JUEGO = {
  montar(raiz) {
    const { el, boton } = UI;
    const NIVELES = { facil: [9, 9, 10, 'Fácil'], medio: [16, 16, 40, 'Medio'], dificil: [16, 30, 99, 'Difícil'] };
    const caja = el('div', 'solo buscaminas');
    const barra = el('div', 'fila centro bm-barra');
    const nivel = el('select'); nivel.setAttribute('aria-label', 'Nivel');
    for (const [k, v] of Object.entries(NIVELES)) { const o = el('option', null, `${v[3]} (${v[2]} minas)`); o.value = k; nivel.append(o); }
    nivel.value = UI.leer('buscaminas-nivel', 'facil');
    const minasTxt = el('span', 'bm-contador'), tiempoTxt = el('span', 'bm-contador');
    const cara = boton('🙂', () => nueva(), 'bm-cara'); cara.setAttribute('aria-label', 'Nueva partida');
    const modo = boton('⛏ Destapar', () => { modoBandera = !modoBandera; modo.textContent = modoBandera ? '🚩 Bandera' : '⛏ Destapar'; modo.classList.toggle('oro', modoBandera); }, 'bm-modo');
    barra.append(minasTxt, cara, tiempoTxt);
    const opciones = el('div', 'fila centro');
    opciones.append(nivel, modo);
    const tablero = el('div', 'bm-tablero');
    const marco = el('div', 'bm-marco'); marco.append(tablero);
    const record = el('p', 'suave centro');
    caja.append(opciones, barra, marco, record, el('p', 'suave centro', 'Clic derecho o mantener pulsado para poner bandera.'));
    raiz.replaceChildren(caja);

    let F, C, M, celdas, minas, abiertas, banderas, empezado, acabado, t0, reloj, modoBandera = false;
    nivel.onchange = () => { UI.guardar('buscaminas-nivel', nivel.value); nueva(); };

    function nueva() {
      [F, C, M] = NIVELES[nivel.value];
      // en pantallas estrechas el difícil se pone en vertical
      if (nivel.value === 'dificil' && innerWidth < 700) [F, C] = [C, F];
      minas = new Set(); abiertas = new Set(); banderas = new Set(); empezado = acabado = false;
      clearInterval(reloj); t0 = 0;
      cara.textContent = '🙂';
      tablero.style.gridTemplateColumns = `repeat(${C}, var(--bm))`;
      tablero.style.setProperty('--bm', C > 16 ? 'clamp(18px, 3vw, 26px)' : C > 9 ? 'clamp(20px, 5.4vw, 30px)' : 'clamp(28px, 9vw, 40px)');
      celdas = [];
      const frag = [];
      for (let i = 0; i < F * C; i++) {
        const b = el('button', 'bm-celda'); b.type = 'button'; b.dataset.i = i;
        b.setAttribute('aria-label', `Fila ${Math.floor(i / C) + 1}, columna ${i % C + 1}`);
        celdas.push(b); frag.push(b);
      }
      tablero.replaceChildren(...frag);
      const r = UI.leer('buscaminas-' + nivel.value, null);
      record.textContent = r == null ? 'Sin récord en este nivel todavía' : `Récord: ${r} s`;
      pintarContadores();
    }
    const vecinos = (i) => { const f = Math.floor(i / C), c = i % C, v = []; for (let df = -1; df <= 1; df++) for (let dc = -1; dc <= 1; dc++) { if (!df && !dc) continue; const y = f + df, x = c + dc; if (y >= 0 && y < F && x >= 0 && x < C) v.push(y * C + x); } return v; };
    const cuenta = (i) => vecinos(i).filter((v) => minas.has(v)).length;
    function poner(primera) {
      // la primera casilla y sus vecinas quedan libres
      const libres = new Set([primera, ...vecinos(primera)]);
      while (minas.size < M) { const i = Math.floor(Math.random() * F * C); if (!libres.has(i)) minas.add(i); }
      empezado = true; t0 = Date.now();
      reloj = setInterval(pintarContadores, 250);
    }
    function pintarContadores() {
      minasTxt.textContent = String(M - banderas.size).padStart(3, '0');
      tiempoTxt.textContent = String(empezado ? Math.min(999, Math.floor(((acabado || Date.now()) - t0) / 1000)) : 0).padStart(3, '0');
    }
    function abrir(i, cascada = 0) {
      if (abiertas.has(i) || banderas.has(i)) return;
      abiertas.add(i);
      const b = celdas[i];
      b.classList.add('abierta');
      b.style.setProperty('--d', `${Math.min(cascada, 30) * 12}ms`);
      if (minas.has(i)) return;
      const n = cuenta(i);
      if (n) { b.textContent = n; b.dataset.n = n; } else for (const v of vecinos(i)) abrir(v, cascada + 1);
    }
    function destapar(i) {
      if (acabado) return;
      if (!empezado) poner(i);
      if (abiertas.has(i)) {
        // «acorde»: si el número tiene sus banderas, destapa el resto de vecinos
        const vs = vecinos(i);
        if (cuenta(i) && vs.filter((v) => banderas.has(v)).length === cuenta(i)) vs.forEach((v) => { if (!banderas.has(v)) abrir(v); });
      } else abrir(i);
      if ([...abiertas].some((x) => minas.has(x))) return perder([...abiertas].find((x) => minas.has(x)));
      if (abiertas.size === F * C - M) ganar();
    }
    function bandera(i) {
      if (acabado || abiertas.has(i)) return;
      banderas.has(i) ? banderas.delete(i) : banderas.add(i);
      celdas[i].classList.toggle('bandera', banderas.has(i));
      celdas[i].textContent = banderas.has(i) ? '🚩' : '';
      if (navigator.vibrate) navigator.vibrate(15);
      pintarContadores();
    }
    function perder(i) {
      acabado = Date.now(); clearInterval(reloj); cara.textContent = '😵';
      celdas[i].classList.add('boom');
      let k = 0;
      for (const m of minas) if (!banderas.has(m)) { const b = celdas[m]; setTimeout(() => { b.classList.add('abierta', 'mina'); b.textContent = '💣'; }, 40 * k++); }
      for (const b of banderas) if (!minas.has(b)) celdas[b].classList.add('mal');
      UI.aviso('¡Boom! Prueba otra vez', 'mal');
    }
    function ganar() {
      acabado = Date.now(); clearInterval(reloj); cara.textContent = '😎';
      const s = Math.max(1, Math.round((acabado - t0) / 1000));
      for (const m of minas) { banderas.add(m); celdas[m].classList.add('bandera'); celdas[m].textContent = '🚩'; }
      pintarContadores();
      const clave = 'buscaminas-' + nivel.value;
      const r = UI.leer(clave, null);
      if (r == null || s < r) { UI.guardar(clave, s); record.textContent = `Récord: ${s} s`; UI.aviso(`¡Nuevo récord! ${s} s`, 'bien'); } else UI.aviso(`¡Despejado en ${s} s!`, 'bien');
      Cuenta.record(clave, s);
      Confeti();
    }

    // clic, clic derecho y pulsación larga
    let pulsado = null, largo = false, tipo = 'mouse';
    // en táctil el menú contextual llega con la pulsación larga, que ya pone la bandera
    tablero.addEventListener('contextmenu', (e) => { e.preventDefault(); const b = e.target.closest('.bm-celda'); if (b && tipo === 'mouse') bandera(+b.dataset.i); });
    tablero.addEventListener('pointerdown', (e) => {
      tipo = e.pointerType;
      const b = e.target.closest('.bm-celda'); if (!b || e.button === 2) return;
      largo = false; if (!acabado) cara.textContent = '😮';
      clearTimeout(pulsado);
      if (e.pointerType !== 'mouse') pulsado = setTimeout(() => { largo = true; bandera(+b.dataset.i); }, 380);
    });
    tablero.addEventListener('pointerup', () => { clearTimeout(pulsado); if (!acabado) cara.textContent = '🙂'; });
    tablero.addEventListener('pointerleave', () => clearTimeout(pulsado));
    tablero.addEventListener('click', (e) => {
      const b = e.target.closest('.bm-celda'); if (!b) return;
      if (largo) { largo = false; return; }
      modoBandera ? bandera(+b.dataset.i) : destapar(+b.dataset.i);
    });
    nueva();
  },
};
