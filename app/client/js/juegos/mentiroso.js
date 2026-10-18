'use strict';
// Mentiroso de dados: tus dados a la vista, los de los demás bajo el cubilete. Elige cantidad y cara y apuesta,
// o di «¡Dudo!». Al dudar se levantan todos los cubiletes.
(() => {
  const { el, boton } = UI;
  const caras = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const dado = (v, cls = '') => { const d = el('div', 'pc-dado mt-dado ' + cls); for (let i = 0; i < 9; i++) d.append(el('i', caras[v].includes(i) ? 'si' : '')); return d; };
  const vale = (cara, c) => c === cara || (cara !== 1 && c === 1);
  const legal = (v, q, cara) => { const a = v.apuesta; if (q < 1 || q > v.total) return false; if (!a) return true; if (cara === 1 && a.cara !== 1) return q >= Math.ceil(a.q / 2); if (cara !== 1 && a.cara === 1) return q >= a.q * 2 + 1; return q > a.q || (q === a.q && cara > a.cara); };
  let q = 1, cara = 2, rondaVista = 0;
  window.JUEGO = {
    render(zona, v, ctx) {
      const yo = ctx.yo, mio = v.turno === yo && !v.revelado && !v.ganadores;
      // propuesta inicial: la mínima legal con la cara que más tengo
      if (mio && (rondaVista !== v.ronda + '-' + v.apuestas.length)) {
        rondaVista = v.ronda + '-' + v.apuestas.length;
        const mejorCara = [2, 3, 4, 5, 6].sort((a, b) => v.mios.filter((c) => vale(b, c)).length - v.mios.filter((c) => vale(a, c)).length)[0];
        cara = mejorCara; q = 1; while (!legal(v, q, cara) && q < v.total) q++;
        if (!legal(v, q, cara)) { cara = 1; q = 1; while (!legal(v, q, cara) && q < v.total) q++; }
      }
      const jug = el('div', 'mt-jugadores');
      for (let j = 0; j < v.n; j++) {
        const p = el('div', 'mt-jug' + (j === v.turno && !v.revelado ? ' activo' : '') + (!v.dados[j] ? ' fuera' : ''));
        p.append(el('b', null, ctx.nombre(j) + (j === yo ? ' (tú)' : '')));
        const ds = el('div', 'mt-dados');
        if (v.revelado) for (const c of v.revelado.cubiletes[j]) ds.append(dado(c, vale(v.revelado.apuesta.cara, c) ? 'cuenta' : 'apagado'));
        else if (j === yo) for (const c of v.mios) ds.append(dado(c));
        else if (v.dados[j]) ds.append(el('span', 'mt-cubilete', `🥤 ${v.dados[j]}`));
        else ds.append(el('small', null, 'eliminado'));
        p.append(ds); jug.append(p);
      }
      const ap = el('div', 'mt-apuesta');
      if (v.apuesta) { ap.append(el('span', null, `${ctx.nombre(v.apuesta.j)} dice: hay al menos`), el('b', null, `${v.apuesta.q} ×`), dado(v.apuesta.cara)); }
      else ap.append(el('span', 'suave', `Ronda ${v.ronda}: aún no hay apuesta · ${v.total} dados en la mesa · los unos son comodines`));
      const estado = el('p', 'turno' + (mio ? ' mio' : ''));
      if (v.revelado) {
        const r = v.revelado;
        estado.textContent = `${ctx.nombre(r.duda)} duda: hay ${r.hay} (se apostaron ${r.apuesta.q}). Pierde un dado ${ctx.nombre(r.pierde)}.`;
      } else estado.textContent = v.ganadores ? '' : mio ? 'Te toca: sube la apuesta o duda' : `Turno de ${ctx.nombre(v.turno)}`;
      zona.append(jug, ap, estado);
      if (mio) {
        const ctl = el('div', 'mt-control');
        const cant = el('div', 'mt-cant'); const txt = el('b', null, String(q));
        const ajustar = (d) => { q = Math.max(1, Math.min(v.total, q + d)); txt.textContent = q; pintarCaras(); apostar.disabled = !legal(v, q, cara); };
        cant.append(boton('−', () => ajustar(-1), 'mini'), txt, boton('+', () => ajustar(1), 'mini'));
        const filaCaras = el('div', 'mt-caras');
        const pintarCaras = () => { filaCaras.replaceChildren(...[1, 2, 3, 4, 5, 6].map((c) => { const b = el('button', 'mt-cara' + (c === cara ? ' sel' : '')); b.type = 'button'; b.append(dado(c)); b.onclick = () => { cara = c; pintarCaras(); apostar.disabled = !legal(v, q, cara); }; return b; })); };
        const apostar = boton('Apostar', () => ctx.enviar({ tipo: 'apostar', q, cara }), 'oro');
        pintarCaras(); apostar.disabled = !legal(v, q, cara);
        const dudo = boton('¡Dudo!', () => ctx.enviar({ tipo: 'dudar' }), 'rojo'); dudo.disabled = !v.apuesta;
        ctl.append(el('span', null, 'Hay al menos'), cant, filaCaras, el('div', 'fila centro'));
        ctl.lastChild.append(apostar, dudo);
        zona.append(ctl);
      }
      if (v.revelado && !v.ganadores) {
        const t = el('p', 'suave centro'); t.dataset.cuentaAtras = v.hasta; t.dataset.texto = 'Siguiente ronda en {s} s'; zona.append(t);
        if (yo >= 0) { const f = el('div', 'fila centro'); f.append(boton('Seguir ya', () => ctx.enviar({ tipo: 'seguir' }), 'mini')); zona.append(f); }
      }
    },
  };
})();
