'use strict';
// Palabrería: toca una ficha de tu atril y luego una casilla para ponerla (toca una ficha puesta para
// quitarla). El comodín pregunta qué letra es. Mientras colocas, se calcula cuánto valdría la jugada.
(() => {
  const { el, boton } = UI;
  const N = 15, LETRAS = 'abcdefghijklmnñopqrstuvwxyz'.split('');
  const NOMBRE = { TP: 'Triple palabra', DP: 'Doble palabra', TL: 'Triple letra', DL: 'Doble letra' };
  let puestas = [], sel = -1, orden = null, firma = '', cambiando = null, previa = '', pasarSeguro = 0, ctxA = null, vA = null, zonaA = null;
  const repintar = () => { if (zonaA?.isConnected) { zonaA.replaceChildren(); window.JUEGO.render(zonaA, vA, ctxA); } };
  const ficha = (l, valor, comodin, cls = '') => { const t = el('span', 'pl-ficha ' + cls); t.append(el('b', null, l === '?' ? '' : l.toUpperCase()), el('small', null, comodin ? '' : valor)); if (comodin) t.classList.add('comodin'); return t; };
  async function probar() {
    previa = '';
    if (!puestas.length) return repintar();
    const r = await ctxA.enviar({ tipo: 'probar', fichas: puestas });
    previa = r.error2 ? `⚠ ${r.error2}` : r.puntos != null ? `${r.palabras.map((w) => w.toUpperCase()).join(', ')} · ${r.puntos} puntos` : '';
    repintar();
  }
  function elegirLetra(alElegir) {
    const capa = el('div', 'pl-capa'); const caja = el('div', 'pl-letras');
    caja.append(el('p', null, '¿Qué letra es el comodín?'));
    for (const l of LETRAS) caja.append(boton(l.toUpperCase(), () => { capa.remove(); alElegir(l); }, 'mini'));
    caja.append(boton('Cancelar', () => capa.remove(), 'mini flojo'));
    capa.append(caja); capa.onclick = (e) => { if (e.target === capa) capa.remove(); };
    document.body.append(capa);
  }
  window.JUEGO = {
    render(zona, v, ctx) {
      zonaA = zona; vA = v; ctxA = ctx;
      const yo = ctx.yo, mio = v.turno === yo && !v.ganadores;
      // si cambia mi atril o el tablero, se recogen las fichas colocadas
      const f2 = v.atril.join('') + '|' + v.tablero.flat().filter(Boolean).length + '|' + v.turno;
      if (f2 !== firma) { firma = f2; puestas = []; sel = -1; previa = ''; cambiando = null; orden = v.atril.map((_, i) => i); }
      if (!orden || orden.length !== v.atril.length) orden = v.atril.map((_, i) => i);
      const usados = new Set(puestas.map((p) => p.i));
      const ult = new Set((v.ultima?.celdas || []).map(([f, c]) => f * N + c));
      // tablero
      const tab = el('div', 'pl-tablero');
      for (let f = 0; f < N; f++) for (let c = 0; c < N; c++) {
        const t = v.tablero[f][c], p = puestas.find((x) => x.f === f && x.c === c), pr = v.premio[f][c];
        const cel = el('div', 'pl-celda ' + (pr ? pr.toLowerCase() : '') + (f === 7 && c === 7 ? ' centro' : ''));
        if (pr && !t && !p) { cel.append(el('i', null, pr)); cel.title = NOMBRE[pr]; }
        if (t) cel.append(ficha(t.l, v.valor[t.l], t.comodin, ult.has(f * N + c) ? 'ultima' : ''));
        else if (p) { const fi = ficha(p.l, v.valor[p.l], p.comodin, 'puesta'); cel.append(fi); cel.onclick = () => { puestas = puestas.filter((x) => x !== p); probar(); }; }
        else if (mio) cel.onclick = () => {
          if (sel < 0) return;
          const i = sel, letra = v.atril[i];
          const poner = (l, comodin) => { puestas.push({ f, c, l, comodin, i }); sel = -1; probar(); };
          if (letra === '?') elegirLetra((l) => poner(l, true)); else poner(letra, false);
        };
        tab.append(cel);
      }
      // atril
      const atril = el('div', 'pl-atril');
      for (const i of orden) {
        const l = v.atril[i];
        if (usados.has(i)) { atril.append(el('span', 'pl-hueco')); continue; }
        const b = ficha(l, v.valor[l], l === '?', (sel === i ? 'sel' : '') + (cambiando?.has(i) ? ' cambiar' : ''));
        b.setAttribute('role', 'button'); b.tabIndex = 0;
        b.onclick = () => { if (cambiando) { cambiando.has(i) ? cambiando.delete(i) : cambiando.add(i); } else sel = sel === i ? -1 : i; repintar(); };
        atril.append(b);
      }
      const acciones = el('div', 'fila centro pl-acciones');
      if (mio && !cambiando) {
        const jugar = boton('Jugar', async () => { const r = await ctx.enviar({ tipo: 'jugar', fichas: puestas }); if (r.ok) { puestas = []; previa = ''; } }, 'oro'); jugar.disabled = !puestas.length;
        acciones.append(jugar, boton('Recoger', () => { puestas = []; previa = ''; repintar(); }, 'mini'), boton('🔀', () => { orden.sort(() => Math.random() - 0.5); repintar(); }, 'mini'));
        if (v.bolsa >= 7) acciones.append(boton('Cambiar fichas', () => { puestas = []; previa = ''; cambiando = new Set(); repintar(); }, 'mini'));
        acciones.append(boton(Date.now() - pasarSeguro < 3000 ? '¿Seguro? Pasar' : 'Pasar', () => { if (Date.now() - pasarSeguro > 3000) { pasarSeguro = Date.now(); repintar(); return; } pasarSeguro = 0; ctx.enviar({ tipo: 'pasar' }); }, 'mini flojo'));
      }
      if (mio && cambiando) {
        const ok = boton(`Cambiar ${cambiando.size}`, () => ctx.enviar({ tipo: 'cambiar', indices: [...cambiando] }), 'oro'); ok.disabled = !cambiando.size;
        acciones.append(el('span', 'suave', 'Toca las fichas que quieres devolver a la bolsa'), ok, boton('Cancelar', () => { cambiando = null; repintar(); }, 'mini flojo'));
      }
      const estado = el('p', 'turno' + (mio ? ' mio' : ''));
      estado.textContent = v.ganadores ? '' : mio ? (sel >= 0 ? 'Ahora toca una casilla libre' : 'Te toca: coloca fichas y pulsa «Jugar»') : `Turno de ${ctx.nombre(v.turno)}`;
      const marcador = el('div', 'fi-marcador');
      v.puntos.forEach((p, j) => marcador.append(el('span', j === v.turno ? 'dibuja' : '', `${ctx.nombre(j)}: ${p}${j !== yo ? ` · ${v.fichas[j]} fichas` : ''}`)));
      marcador.append(el('span', null, `🎒 ${v.bolsa} en la bolsa`));
      const u = v.ultima;
      const ultima = el('p', 'suave centro pl-ultima', u ? (u.tipo === 'jugar' ? `${ctx.nombre(u.j)}: ${u.palabras.map((w) => w.toUpperCase()).join(', ')} (+${u.puntos}${u.bingo ? ', ¡con las 7 fichas!' : ''})` : u.tipo === 'cambiar' ? `${ctx.nombre(u.j)} ha cambiado ${u.n} fichas` : `${ctx.nombre(u.j)} ha pasado`) : 'La primera palabra pasa por la estrella del centro.');
      const prev = el('p', 'pl-previa' + (previa.startsWith('⚠') ? ' mal' : ''), previa || ' ');
      zona.append(marcador, ultima, tab, estado, prev, atril, acciones);
    },
  };
})();
