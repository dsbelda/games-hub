'use strict';
// Hundir la flota: primero colocas tus barcos (elige barco, gíralo y tócalo en el tablero, o «Al azar»);
// después, dispara en el tablero del rival. Si aciertas, repites.
(() => {
  const { el, boton } = UI;
  const N = 10, FLOTA = [5, 4, 3, 3, 2];
  const NOMBRES = { 5: 'Portaaviones', 4: 'Acorazado', 3: 'Submarino', 2: 'Lancha' };
  let colocados = [], elegido = 0, vertical = false, hover = null, enviado = false, confirmar = 0, ultimoVisto = null;
  const celdasDe = (b) => Array.from({ length: b.largo }, (_, k) => [b.f + (b.vertical ? k : 0), b.c + (b.vertical ? 0 : k)]);
  function valido(barcos) {
    const ocu = new Map();
    for (const [i, b] of barcos.entries()) {
      const cs = celdasDe(b);
      if (cs.some(([f, c]) => f < 0 || f >= N || c < 0 || c >= N)) return false;
      for (const [f, c] of cs) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const o = ocu.get((f + dy) * N + c + dx); if (o !== undefined && o !== i) return false; }
      for (const [f, c] of cs) ocu.set(f * N + c, i);
    }
    return true;
  }
  function alAzar() {
    for (let t = 0; t < 300; t++) {
      const bs = [];
      for (const largo of FLOTA) {
        let ok = false;
        for (let k = 0; k < 200 && !ok; k++) { const v = Math.random() < .5; const b = { largo, vertical: v, f: Math.floor(Math.random() * (v ? N - largo + 1 : N)), c: Math.floor(Math.random() * (v ? N : N - largo + 1)) }; if (valido([...bs, b])) { bs.push(b); ok = true; } }
        if (!ok) break;
      }
      if (bs.length === FLOTA.length) return bs;
    }
    return [];
  }
  document.addEventListener('keydown', (e) => { if ((e.key === 'r' || e.key === 'R') && !e.target.closest('input')) { vertical = !vertical; window.__hundirRepintar?.(); } });

  function tablero(clase, celda) {
    const t = el('div', 'hf-tablero ' + clase);
    const cab = el('div', 'hf-cab'); cab.append(el('span'));
    for (let c = 0; c < N; c++) cab.append(el('span', null, 'ABCDEFGHIJ'[c]));
    t.append(cab);
    for (let f = 0; f < N; f++) {
      const fila = el('div', 'hf-fila'); fila.append(el('span', 'hf-num', String(f + 1)));
      for (let c = 0; c < N; c++) fila.append(celda(f, c));
      t.append(fila);
    }
    return t;
  }

  window.JUEGO = {
    render(zona, v, ctx) {
      const repintar = () => window.JUEGO.render(zona.replaceChildren() || zona, v, ctx);
      window.__hundirRepintar = repintar;
      const yo = ctx.yo;
      // --- fase de colocar ---
      if (v.fase === 'colocar' && !v.miFlota && yo >= 0) {
        enviado = false;
        const faltan = FLOTA.map((l, i) => i).filter((i) => !colocados.some((b) => b.idx === i));
        if (!faltan.includes(elegido)) elegido = faltan[0] ?? 0;
        const ocupadas = new Map();
        colocados.forEach((b) => celdasDe(b).forEach(([f, c]) => ocupadas.set(f * N + c, b)));
        const previa = hover && faltan.length ? { largo: FLOTA[elegido], vertical, f: hover[0], c: hover[1], idx: elegido } : null;
        const previaOk = previa && valido([...colocados, previa]);
        const previaSet = new Set(previa ? celdasDe(previa).map(([f, c]) => f * N + c) : []);
        const t = tablero('colocar', (f, c) => {
          const b = el('button', 'hf-celda'); b.type = 'button';
          const k = f * N + c;
          if (ocupadas.has(k)) b.classList.add('barco');
          if (previaSet.has(k)) b.classList.add(previaOk ? 'previa' : 'previa-mal');
          b.onpointerenter = () => { if (!hover || hover[0] !== f || hover[1] !== c) { hover = [f, c]; repintar(); } };
          b.onclick = () => {
            if (ocupadas.has(k)) { colocados = colocados.filter((x) => x !== ocupadas.get(k)); elegido = ocupadas.get(k).idx; return repintar(); }
            if (!faltan.length) return;
            const nb = { largo: FLOTA[elegido], vertical, f, c, idx: elegido };
            if (!valido([...colocados, nb])) return UI.aviso('Ahí no cabe (los barcos no pueden tocarse)');
            colocados.push(nb); hover = null; repintar();
          };
          return b;
        });
        t.onpointerleave = () => { if (hover) { hover = null; repintar(); } };
        const dique = el('div', 'hf-dique');
        FLOTA.forEach((l, i) => {
          const puesto = colocados.some((b) => b.idx === i);
          const b = el('button', 'hf-barco' + (i === elegido && !puesto ? ' sel' : '') + (puesto ? ' puesto' : '')); b.type = 'button';
          b.disabled = puesto;
          const forma = el('span', 'hf-forma'); for (let k = 0; k < l; k++) forma.append(el('i'));
          b.append(forma, el('small', null, NOMBRES[l]));
          b.onclick = () => { elegido = i; repintar(); };
          dique.append(b);
        });
        const acciones = el('div', 'fila centro');
        acciones.append(
          boton(vertical ? '↕ Vertical (R)' : '↔ Horizontal (R)', () => { vertical = !vertical; repintar(); }, 'mini'),
          boton('🎲 Al azar', () => { colocados = alAzar().map((b, i) => ({ ...b, idx: i })); repintar(); }, 'mini'),
          boton('Vaciar', () => { colocados = []; repintar(); }, 'mini flojo'),
        );
        const listo = boton('¡Flota lista!', () => { if (enviado) return; enviado = true; ctx.enviar({ tipo: 'colocar', barcos: colocados.map(({ f, c, largo, vertical: vv }) => ({ f, c, largo, vertical: vv })) }); colocados = []; }, 'oro');
        listo.disabled = colocados.length < FLOTA.length;
        zona.append(el('p', 'turno mio', 'Coloca tu flota'), dique, acciones, t, listo, el('p', 'suave centro', 'Toca un barco puesto para quitarlo. Los barcos no pueden tocarse, ni en diagonal.'));
        return;
      }
      // --- fase de disparos (o esperando al rival) ---
      const miTurno = v.fase === 'disparar' && v.turno === yo && ctx.fase === 'juego';
      const estado = el('p', 'turno' + (miTurno ? ' mio' : ''));
      if (v.fase === 'colocar') estado.textContent = 'Flota lista. Esperando a que el rival coloque la suya…';
      else if (ctx.fase === 'juego') estado.textContent = miTurno ? '¡Fuego! Elige casilla en el tablero rival' : `Dispara ${ctx.nombre(v.turno)}…`;
      // aviso del último disparo (una vez)
      const u = v.ultimo;
      const claveU = u ? `${u.j}-${u.f}-${u.c}-${u.r}` : null;
      if (u && claveU !== ultimoVisto) {
        ultimoVisto = claveU;
        const quien = u.j === yo ? 'Tu disparo' : `Disparo de ${ctx.nombre(u.j)}`;
        UI.aviso(`${quien} en ${'ABCDEFGHIJ'[u.c]}${u.f + 1}: ${u.r === 'agua' ? '¡agua!' : u.r === 'tocado' ? '¡tocado!' : `¡hundido! (${NOMBRES[u.largo] || 'barco'})`}`, u.r === 'agua' ? '' : u.j === yo ? 'bien' : 'mal');
        if (navigator.vibrate && u.r !== 'agua' && u.j !== yo) navigator.vibrate(u.r === 'hundido' ? [60, 40, 120] : 50);
      }
      const esUltimo = (j, f, c) => u && u.j === j && u.f === f && u.c === c;
      const mios = new Set((v.miFlota || []).flat());
      const mio = tablero('propio', (f, c) => {
        const d = el('div', 'hf-celda'); const k = f * N + c;
        if (mios.has(k)) d.classList.add('barco');
        const r = v.recibidos[k]; if (r) d.classList.add(r);
        if (esUltimo(1 - yo, f, c)) d.classList.add('nuevo');
        return d;
      });
      const hundidos = new Set(v.hundidosRival.flat());
      const rivalFlota = new Set((v.flotaRival || []).flat());
      const suyo = tablero('rival', (f, c) => {
        const b = el('button', 'hf-celda'); b.type = 'button'; const k = f * N + c;
        const r = v.hechos[k];
        if (r) b.classList.add(r);
        if (hundidos.has(k)) b.classList.add('hundido');
        if (!r && rivalFlota.has(k)) b.classList.add('barco', 'revelado');
        if (esUltimo(yo, f, c)) b.classList.add('nuevo');
        b.disabled = !miTurno || !!r;
        b.setAttribute('aria-label', `${'ABCDEFGHIJ'[c]}${f + 1}${r ? ': ' + r : ''}`);
        b.onclick = () => ctx.enviar({ tipo: 'disparar', f, c });
        return b;
      });
      const rival = 1 - (yo >= 0 ? yo : 0);
      const caja1 = el('div', 'hf-lado'); caja1.append(el('h3', null, 'Tu flota'), mio, quedan(v.quedan[yo >= 0 ? yo : 0]));
      const caja2 = el('div', 'hf-lado' + (miTurno ? ' activo' : '')); caja2.append(el('h3', null, `Flota de ${ctx.nombre(rival)}`), suyo, quedan(v.quedan[rival]));
      const tableros = el('div', 'hf-tableros'); tableros.append(caja2, caja1);
      const acciones = el('div', 'fila centro');
      if (ctx.fase === 'juego' && yo >= 0) acciones.append(boton(Date.now() < confirmar ? '¿Seguro? Pulsa otra vez' : 'Rendirse', () => { if (Date.now() < confirmar) ctx.enviar({ tipo: 'rendirse' }); else { confirmar = Date.now() + 3000; UI.aviso('Pulsa «Rendirse» otra vez para abandonar'); } }, 'mini flojo'));
      zona.append(estado, tableros, acciones);
    },
  };
  function quedan(lista) { const d = el('div', 'hf-quedan'); for (const l of [...lista].sort((a, b) => b - a)) { const s = el('span', 'hf-forma'); for (let k = 0; k < l; k++) s.append(el('i')); d.append(s); } if (!lista.length) d.append(el('span', 'suave', 'Sin barcos')); return d; }
})();
