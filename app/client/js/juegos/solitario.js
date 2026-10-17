'use strict';
// Solitario (Klondike): baja las cartas a las cuatro pilas de la derecha, del As al Rey y por palos.
// En las columnas: de mayor a menor alternando rojo y negro; en un hueco solo puede ir un Rey.
// Arrastra cartas (ratón o dedo) o tócalas y van solas al mejor sitio. Deshacer ilimitado.
window.JUEGO = {
  montar(raiz) {
    const { el, boton } = UI;
    const PALOS = ['♠', '♥', '♦', '♣'];
    const ROJO = new Set(['♥', '♦']);
    const NOMBRE = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
    const caja = el('div', 'solo solitario');
    const barra = el('div', 'fila centro');
    const marcador = el('p', 'marcador');
    const tres = el('label', 'check'); const ct = el('input'); ct.type = 'checkbox'; ct.checked = UI.leer('solitario-tres', false); tres.append(ct, ' Robar de 3 en 3');
    const deshacerB = boton('↶ Deshacer', () => deshacer(), 'mini');
    const autoB = boton('✨ Terminar', () => autoTerminar(), 'mini oro'); autoB.hidden = true;
    barra.append(boton('Nueva partida', () => nueva(), 'mini'), deshacerB, autoB, tres);
    const mesa = el('div', 'sl-mesa');
    caja.append(marcador, barra, mesa, el('p', 'suave centro', 'Toca una carta para moverla sola, o arrástrala. Doble clic también la sube a las pilas.'));
    raiz.replaceChildren(caja);
    ct.onchange = () => { UI.guardar('solitario-tres', ct.checked); nueva(); };

    let st, historial, movs, t0, reloj, ganado;
    const color = (c) => (ROJO.has(c.s) ? 'r' : 'n');
    const copia = () => JSON.parse(JSON.stringify(st));
    function nueva() {
      const baraja = [];
      for (const s of PALOS) for (let r = 1; r <= 13; r++) baraja.push({ s, r, up: false });
      for (let i = baraja.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [baraja[i], baraja[j]] = [baraja[j], baraja[i]]; }
      st = { tab: [], mazo: [], des: [], pilas: [[], [], [], []] };
      for (let c = 0; c < 7; c++) { st.tab.push(baraja.splice(0, c + 1)); st.tab[c][c].up = true; }
      st.mazo = baraja;
      historial = []; movs = 0; t0 = null; ganado = false; clearInterval(reloj);
      pintar(true);
    }
    const guardarPaso = () => { historial.push(copia()); if (historial.length > 300) historial.shift(); if (!t0) { t0 = Date.now(); reloj = setInterval(pintarMarcador, 1000); } };
    function deshacer() { if (!historial.length || ganado) return; st = historial.pop(); movs++; pintar(); }
    function robar() {
      guardarPaso(); movs++;
      if (!st.mazo.length) { st.mazo = st.des.reverse().map((c) => ({ ...c, up: false })); st.des = []; }
      else for (let k = 0; k < (ct.checked ? 3 : 1) && st.mazo.length; k++) { const c = st.mazo.pop(); c.up = true; st.des.push(c); }
      pintar();
    }
    // origen: { de: 'tab'|'des'|'pila', i, k } (k = índice de la carta dentro de la columna)
    const cartasDe = (o) => (o.de === 'tab' ? st.tab[o.i].slice(o.k) : o.de === 'des' ? [st.des[st.des.length - 1]] : [st.pilas[o.i][st.pilas[o.i].length - 1]]);
    function puedePila(c, i) { const p = st.pilas[i]; return p.length ? p[p.length - 1].s === c.s && p[p.length - 1].r === c.r - 1 : c.r === 1; }
    function puedeCol(c, i) { const col = st.tab[i]; if (!col.length) return c.r === 13; const u = col[col.length - 1]; return u.up && color(u) !== color(c) && u.r === c.r + 1; }
    function quitar(o, n) { if (o.de === 'tab') { st.tab[o.i].splice(o.k); const col = st.tab[o.i]; if (col.length && !col[col.length - 1].up) col[col.length - 1].up = true; } else if (o.de === 'des') st.des.pop(); else st.pilas[o.i].pop(); }
    function mover(o, destino) {
      const cs = cartasDe(o);
      if (!cs.length || cs.some((c) => !c.up)) return false;
      if (destino.a === 'pila') { if (cs.length !== 1 || !puedePila(cs[0], destino.i)) return false; }
      else if (!puedeCol(cs[0], destino.i) || (o.de === 'tab' && o.i === destino.i)) return false;
      guardarPaso(); movs++;
      quitar(o, cs.length);
      if (destino.a === 'pila') st.pilas[destino.i].push(cs[0]); else st.tab[destino.i].push(...cs);
      return true;
    }
    // mejor destino automático: primero las pilas (si es una sola carta), luego otra columna
    function moverSola(o) {
      const cs = cartasDe(o);
      if (cs.length === 1) for (let i = 0; i < 4; i++) if (puedePila(cs[0], i) && mover(o, { a: 'pila', i })) return true;
      if (o.de === 'pila') { for (let i = 0; i < 7; i++) if (mover(o, { a: 'col', i })) return true; return false; }
      const orden = [...Array(7).keys()].sort((a, b) => (st.tab[a].length ? 0 : 1) - (st.tab[b].length ? 0 : 1));
      for (const i of orden) if (!(cs[0].r === 13 && o.de === 'tab' && o.k === 0) && mover(o, { a: 'col', i })) return true;
      return false;
    }
    const todoBocaArriba = () => !st.mazo.length && !st.des.length && st.tab.every((c) => c.every((x) => x.up));
    function autoTerminar() {
      const paso = () => {
        for (let i = 0; i < 7; i++) { const col = st.tab[i]; if (col.length && moverSolaPila({ de: 'tab', i, k: col.length - 1 })) { pintar(); return setTimeout(paso, 70); } }
        pintar();
      };
      paso();
    }
    function moverSolaPila(o) { const c = cartasDe(o)[0]; for (let i = 0; i < 4; i++) if (puedePila(c, i)) return mover(o, { a: 'pila', i }); return false; }

    function pintarMarcador() {
      const s = t0 ? Math.floor(((ganado || Date.now()) - t0) / 1000) : 0;
      const r = UI.leer('solitario', null);
      marcador.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} · ${movs} movimientos${r != null ? ` · Récord ${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}` : ''}`;
    }
    function carta(c, extra = '') {
      const d = el('div', `carta-f ${c.up ? color(c) : 'dorso'} ${extra}`);
      if (c.up) { const n = NOMBRE[c.r] || String(c.r); d.append(el('span', 'cf-esq', n + c.s), el('span', 'cf-centro', c.s)); d.setAttribute('aria-label', `${n} de ${c.s}`); }
      return d;
    }
    function pintar(repartir) {
      const arriba = el('div', 'sl-arriba');
      const mazo = el('button', 'sl-hueco sl-mazo'); mazo.type = 'button'; mazo.setAttribute('aria-label', st.mazo.length ? 'Robar carta' : 'Dar la vuelta al montón');
      if (st.mazo.length) mazo.append(carta({ up: false }), el('span', 'sl-n', String(st.mazo.length))); else mazo.append(el('span', 'sl-vuelta', '↻'));
      mazo.onclick = robar;
      const des = el('div', 'sl-hueco sl-des');
      const vis = st.des.slice(ct.checked ? -3 : -1);
      vis.forEach((c, k) => { const e = carta(c, k === vis.length - 1 ? 'arrastrable' : ''); e.style.setProperty('--x', k); if (k === vis.length - 1) e.dataset.origen = JSON.stringify({ de: 'des' }); des.append(e); });
      arriba.append(mazo, des, el('div', 'sl-espacio'));
      st.pilas.forEach((p, i) => {
        const h = el('div', 'sl-hueco sl-pila'); h.dataset.destino = JSON.stringify({ a: 'pila', i });
        h.append(el('span', 'sl-fondo', PALOS[i]));
        if (p.length) { const e = carta(p[p.length - 1], 'arrastrable'); e.dataset.origen = JSON.stringify({ de: 'pila', i }); h.append(e); }
        arriba.append(h);
      });
      const cols = el('div', 'sl-cols');
      st.tab.forEach((col, i) => {
        const c = el('div', 'sl-col'); c.dataset.destino = JSON.stringify({ a: 'col', i });
        let y = 0;
        col.forEach((x, k) => {
          const e = carta(x, x.up ? 'arrastrable' : '');
          e.style.setProperty('--y', y);
          if (repartir) e.style.setProperty('--d', `${(i + k * 7) * 18}ms`), e.classList.add('reparte');
          if (x.up) e.dataset.origen = JSON.stringify({ de: 'tab', i, k });
          y += x.up ? 1 : 0.45;
          c.append(e);
        });
        c.style.setProperty('--alto', y);
        cols.append(c);
      });
      mesa.replaceChildren(arriba, cols);
      deshacerB.disabled = !historial.length;
      autoB.hidden = !(todoBocaArriba() && !ganado);
      pintarMarcador();
      if (!ganado && st.pilas.every((p) => p.length === 13)) ganar();
    }
    function ganar() {
      ganado = Date.now(); clearInterval(reloj);
      const s = Math.max(1, Math.floor((ganado - t0) / 1000));
      const r = UI.leer('solitario', null);
      if (r == null || s < r) { UI.guardar('solitario', s); UI.aviso(`¡Nuevo récord! ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, 'bien'); } else UI.aviso('¡Solitario completado!', 'bien');
      Cuenta.record('solitario', s);
      Confeti(200);
      mesa.querySelectorAll('.sl-pila .carta-f').forEach((e, i) => e.animate?.([{ transform: 'none' }, { transform: 'translateY(-24px) rotate(-8deg)' }, { transform: 'none' }], { duration: 600, delay: i * 120, iterations: 3 }));
      pintarMarcador();
    }

    // arrastrar y soltar (ratón y dedo); un toque sin arrastrar mueve la carta sola
    let arr = null;
    mesa.addEventListener('pointerdown', (e) => {
      const c = e.target.closest('.carta-f.arrastrable'); if (!c || ganado) return;
      const o = JSON.parse(c.dataset.origen);
      arr = { o, x0: e.clientX, y0: e.clientY, activo: false, fantasma: null, id: e.pointerId, origenEl: c };
    });
    mesa.addEventListener('pointermove', (e) => {
      if (!arr || e.pointerId !== arr.id) return;
      const dx = e.clientX - arr.x0, dy = e.clientY - arr.y0;
      if (!arr.activo && Math.hypot(dx, dy) > 6) {
        arr.activo = true;
        const r = arr.origenEl.getBoundingClientRect();
        const f = el('div', 'sl-fantasma');
        f.style.left = r.left + 'px'; f.style.top = r.top + 'px'; f.style.width = r.width + 'px';
        cartasDe(arr.o).forEach((x, k) => { const e2 = carta(x); e2.style.setProperty('--y', k); f.append(e2); });
        document.body.append(f);
        arr.fantasma = f; arr.r = r;
        // ocultar las originales mientras se arrastran
        const col = arr.origenEl.parentElement;
        [...col.children].filter((x) => x.dataset.origen && (arr.o.de !== 'tab' || JSON.parse(x.dataset.origen).k >= arr.o.k)).forEach((x) => { if (x === arr.origenEl || arr.o.de === 'tab') x.classList.add('oculta'); });
        mesa.setPointerCapture?.(e.pointerId);
      }
      if (arr.activo) { arr.fantasma.style.transform = `translate(${dx}px, ${dy}px) rotate(${Math.max(-6, Math.min(6, dx / 30))}deg)`; e.preventDefault(); }
    });
    const soltar = (e) => {
      if (!arr || e.pointerId !== arr.id) return;
      const a = arr; arr = null;
      if (!a.activo) { if (!moverSola(a.o)) { a.origenEl.classList.remove('nope'); void a.origenEl.offsetWidth; a.origenEl.classList.add('nope'); } else pintar(); return; }
      a.fantasma.style.display = 'none';
      const bajo = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-destino]');
      a.fantasma.remove();
      if (!(bajo && mover(a.o, JSON.parse(bajo.dataset.destino)))) UI.aviso('Ahí no se puede');
      pintar();
    };
    mesa.addEventListener('pointerup', soltar);
    mesa.addEventListener('pointercancel', soltar);
    mesa.addEventListener('dblclick', (e) => { const c = e.target.closest('.carta-f.arrastrable'); if (c) { const o = JSON.parse(c.dataset.origen); if (o.de !== 'pila' && moverSolaPila(o.de === 'tab' ? { ...o, k: st.tab[o.i].length - 1 } : o)) pintar(); } });
    document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); deshacer(); } });
    nueva();
  },
};
