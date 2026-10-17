'use strict';
// Damas: toca una de tus piezas que pueda mover (brillan) y después la casilla de destino.
(() => {
  const { el, boton } = UI;
  let sel = null, confirmar = 0;
  window.JUEGO = {
    render(zona, v, ctx) {
      const yo = ctx.yo, negras = yo === 1;
      const miTurno = v.turno === yo && ctx.fase === 'juego';
      if (!miTurno) sel = null;
      const origenes = new Set(v.legales.map((r) => r[0].join()));
      const rutasSel = sel ? v.legales.filter((r) => r[0].join() === sel) : [];
      const destinos = new Map(rutasSel.map((r) => [r[r.length - 1].join(), r]));
      const estado = el('p', 'turno' + (miTurno ? ' mio' : ''));
      if (ctx.fase === 'juego') estado.textContent = miTurno ? (v.obligaComer ? 'Te toca: ¡tienes que comer!' : 'Te toca') : `Turno de ${ctx.nombre(v.turno)}`;
      const marcador = el('div', 'fila centro dm-marcador');
      for (const j of [0, 1]) { const s = el('span', 'dm-jug'); s.append(el('i', 'dm-ficha ' + (j ? 'n' : 'b')), ` ${ctx.nombre(j)} · ${12 - v.comidas[1 - j]} piezas`); marcador.append(s); }
      const tablero = el('div', 'dm-tablero');
      const rutaUltima = new Set((v.ultima?.ruta || []).map((x) => x.join()));
      const comidasUltima = new Set((v.ultima?.comidas || []).map((x) => x.join()));
      for (let k = 0; k < 64; k++) {
        const i = negras ? 63 - k : k, f = Math.floor(i / 8), c = i % 8, id = `${f},${c}`;
        const oscura = (f + c) % 2 === 1;
        const b = el('button', 'dm-casilla ' + (oscura ? 'oscura' : 'clara'));
        b.type = 'button'; b.disabled = !miTurno || !oscura;
        if (rutaUltima.has(id)) b.classList.add('ultima');
        if (comidasUltima.has(id)) b.classList.add('comida');
        const p = v.t[f][c];
        if (p) { const s = el('span', `dm-ficha ${p.j ? 'n' : 'b'}${p.dama ? ' dama' : ''}`); if (v.ultima && rutaUltima.has(id) && v.ultima.ruta.at(-1).join() === id) s.classList.add('llega'); b.append(s); }
        if (miTurno && origenes.has(id)) b.classList.add('puede');
        if (sel === id) b.classList.add('sel');
        if (destinos.has(id)) b.classList.add('destino');
        b.onclick = () => {
          if (destinos.has(id)) { ctx.enviar({ tipo: 'mover', ruta: destinos.get(id) }); sel = null; return; }
          sel = origenes.has(id) && sel !== id ? id : null;
          window.JUEGO.render(zona.replaceChildren() || zona, v, ctx);
        };
        tablero.append(b);
      }
      const acciones = el('div', 'fila centro');
      if (ctx.fase === 'juego' && yo >= 0) acciones.append(boton(Date.now() < confirmar ? '¿Seguro? Pulsa otra vez' : 'Rendirse', () => { if (Date.now() < confirmar) ctx.enviar({ tipo: 'rendirse' }); else { confirmar = Date.now() + 3000; UI.aviso('Pulsa «Rendirse» otra vez para abandonar'); } }, 'mini flojo'));
      zona.append(marcador, estado, tablero, acciones);
    },
  };
})();
