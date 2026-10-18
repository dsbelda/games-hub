'use strict';
// La isla que se hunde: tablero de 24 losetas. Elige un modo (mover, achicar, volar) y toca una loseta.
// Tus cartas: tócalas para darlas o usarlas. Las manos de todos se ven (es cooperativo).
(() => {
  const { el, boton } = UI;
  const ICONO = { fuego: '🔥', caliz: '🏆', viento: '💎', tierra: '🗿', helicoptero: '🚁', arena: '🧱' };
  const NOMBRE = { fuego: 'Piedra de fuego', caliz: 'Cáliz del mar', viento: 'Cristal del viento', tierra: 'Estatua de la tierra', helicoptero: 'Helicóptero', arena: 'Sacos de arena' };
  const ROL = { explorador: ['Explorador', '#3fbf5f', 'Se mueve y achica también en diagonal'], ingeniero: ['Ingeniera', '#ff5a36', 'Achica dos losetas por acción'], piloto: ['Piloto', '#4d7cfe', 'Una vez por turno vuela a cualquier loseta'], mensajero: ['Mensajera', '#ffc63d', 'Da cartas a cualquiera, esté donde esté'] };
  let modo = 'mover', cartaSel = null, heliDe = null;
  const vecinas = (v, p, diag) => { const [f, c] = v.pos[p]; return v.pos.map((q, k) => [q, k]).filter(([[a, b], k]) => k !== p && v.estado[k] < 2 && Math.abs(a - f) <= 1 && Math.abs(b - c) <= 1 && (diag || a === f || b === c)).map(([, k]) => k); };
  window.JUEGO = {
    cooperativo: true,
    render(zona, v, ctx) {
      const yo = ctx.yo, mio = v.turno === yo && v.fase === 'acciones' && !v.ganadores, descarto = v.fase === 'descartar' && v.descarta === yo;
      if (!mio) { if (modo !== 'mover') modo = 'mover'; }
      if (!mio && !descarto) { cartaSel = null; heliDe = null; }
      const rol = yo >= 0 ? v.roles[yo] : null, aqui = yo >= 0 ? v.donde[yo] : -1, diag = rol === 'explorador';
      const repintar = () => { zona.replaceChildren(); window.JUEGO.render(zona, v, ctx); };
      // cabecera: nivel del agua y tesoros
      const cab = el('div', 'is-cab');
      const agua = el('div', 'is-agua'); for (let k = 1; k <= 10; k++) agua.append(el('i', k <= v.nivel ? (k === 10 ? 'muerte' : 'si') : k === 10 ? 'calavera' : '', k === 10 ? '☠' : ''));
      cab.append(el('span', null, `🌊 Agua ${v.nivel} (inunda ${v.inunda} por turno)`), agua);
      const tes = el('div', 'is-tesoros'); for (const t of ['fuego', 'caliz', 'viento', 'tierra']) { const s = el('span', v.capturados.includes(t) ? 'si' : '', ICONO[t]); s.title = NOMBRE[t] + (v.capturados.includes(t) ? ' ✔' : ''); tes.append(s); }
      cab.append(tes);
      // objetivos según el modo
      let validas = new Set();
      if (mio && aqui >= 0) {
        if (modo === 'mover') validas = new Set(vecinas(v, aqui, diag));
        if (modo === 'achicar') validas = new Set([aqui, ...vecinas(v, aqui, diag)].filter((p) => v.estado[p] === 1));
        if (modo === 'volar') validas = new Set(v.estado.map((s, p) => (s < 2 && p !== aqui ? p : -1)).filter((p) => p >= 0));
      }
      if ((mio || descarto) && cartaSel !== null) {
        const c = v.manos[yo][cartaSel];
        if (c === 'arena') validas = new Set(v.estado.map((s, p) => (s === 1 ? p : -1)).filter((p) => p >= 0));
        if (c === 'helicoptero') validas = new Set(heliDe === null ? v.donde : v.estado.map((s, p) => (s < 2 && p !== heliDe ? p : -1)).filter((p) => p >= 0));
      }
      const tab = el('div', 'is-tablero');
      v.pos.forEach(([f, c], p) => {
        const l = v.losetas[p], s = v.estado[p];
        const d = el('button', 'is-loseta ' + ['firme', 'inundada', 'hundida'][s] + (validas.has(p) ? ' valida' : '') + (heliDe === p ? ' sel' : ''));
        d.type = 'button'; d.style.gridRow = String(f + 1); d.style.gridColumn = String(c + 1);
        if (s < 2) { d.append(el('small', null, l.n)); if (l.t || l.heli) d.append(el('span', 'is-ico', l.heli ? '🚁' : ICONO[l.t])); }
        const peones = el('div', 'is-peones'); v.donde.forEach((q, j) => { if (q === p) { const pe = el('i', 'is-peon' + (j === v.turno ? ' activo' : '')); pe.style.background = ROL[v.roles[j]][1]; pe.title = `${ctx.nombre(j)} (${ROL[v.roles[j]][0]})`; peones.append(pe); } }); d.append(peones);
        d.disabled = !validas.has(p);
        d.onclick = () => {
          if (cartaSel !== null) {
            const cc = v.manos[yo][cartaSel];
            if (cc === 'arena') { ctx.enviar({ tipo: 'usar', carta: cartaSel, a: p }); cartaSel = null; return; }
            if (cc === 'helicoptero') { if (heliDe === null) { heliDe = p; repintar(); } else { ctx.enviar({ tipo: 'usar', carta: cartaSel, de: heliDe, a: p }); cartaSel = null; heliDe = null; } return; }
          }
          ctx.enviar({ tipo: modo, a: p });
        };
        tab.append(d);
      });
      const estado = el('p', 'turno' + (mio || descarto ? ' mio' : ''));
      if (v.ganadores) estado.textContent = '';
      else if (descarto) estado.textContent = 'Tienes más de 5 cartas: toca una para descartarla (o usa una especial)';
      else if (v.fase === 'descartar') estado.textContent = `${ctx.nombre(v.descarta)} está descartando…`;
      else if (mio) estado.textContent = cartaSel !== null ? (v.manos[yo][cartaSel] === 'helicoptero' ? (heliDe === null ? 'Helicóptero: ¿de qué loseta (con alguien)?' : '¿A qué loseta?') : '¿Qué loseta inundada achicas con los sacos?') : `Te quedan ${v.acciones} acciones${v.ingExtra ? ' (y un achique gratis)' : ''}`;
      else estado.textContent = `Turno de ${ctx.nombre(v.turno)} (${ROL[v.roles[v.turno]][0]}) · ${v.acciones} acciones`;
      const acc = el('div', 'fila centro is-acc');
      if (mio) {
        const mb = (m, t) => { const b = boton(t, () => { modo = m; cartaSel = null; heliDe = null; repintar(); }, 'mini' + (modo === m && cartaSel === null ? ' oro' : '')); b.disabled = v.acciones <= 0 && !(m === 'achicar' && v.ingExtra); return b; };
        acc.append(mb('mover', '🚶 Mover'), mb('achicar', '🪣 Achicar'));
        if (rol === 'piloto' && !v.voló) acc.append(mb('volar', '✈️ Volar'));
        const t = v.losetas[aqui].t;
        if (t && !v.capturados.includes(t) && v.manos[yo].filter((c) => c === t).length >= 4) acc.append(boton(`Capturar ${ICONO[t]}`, () => ctx.enviar({ tipo: 'capturar' }), 'oro'));
        acc.append(boton('Terminar turno', () => ctx.enviar({ tipo: 'terminar' }), 'mini flojo'));
      }
      // manos
      const manos = el('div', 'is-manos');
      v.manos.forEach((m, j) => {
        const caja = el('div', 'is-mano' + (j === v.turno ? ' activa' : ''));
        const tit = el('div', 'is-quien'); const pe = el('i', 'is-peon'); pe.style.background = ROL[v.roles[j]][1]; tit.append(pe, el('b', null, `${ctx.nombre(j)}${j === yo ? ' (tú)' : ''}`), el('small', null, ` ${ROL[v.roles[j]][0]}: ${ROL[v.roles[j]][2]}`));
        const cs = el('div', 'is-cartas');
        m.forEach((c, i) => {
          const b = el('button', 'is-carta' + (j === yo && cartaSel === i ? ' sel' : '')); b.type = 'button'; b.append(el('span', null, ICONO[c] || '🌊'), el('small', null, NOMBRE[c] || c)); b.disabled = j !== yo || !(mio || descarto);
          b.onclick = () => {
            if (descarto && c !== 'helicoptero' && c !== 'arena') { ctx.enviar({ tipo: 'descartar', carta: i }); return; }
            cartaSel = cartaSel === i ? null : i; heliDe = null; repintar();
          };
          cs.append(b);
        });
        caja.append(tit, cs);
        if (j === yo && cartaSel !== null && (mio || descarto)) {
          const c = m[cartaSel], opc = el('div', 'fila centro');
          if (descarto) opc.append(boton('Descartar esta', () => { ctx.enviar({ tipo: 'descartar', carta: cartaSel }); cartaSel = null; }, 'mini flojo'));
          if (mio && ['fuego', 'caliz', 'viento', 'tierra'].includes(c)) for (let k = 0; k < v.n; k++) if (k !== yo && (rol === 'mensajero' || v.donde[k] === aqui)) opc.append(boton(`Dar a ${ctx.nombre(k)}`, () => { ctx.enviar({ tipo: 'dar', j: k, carta: cartaSel }); cartaSel = null; }, 'mini'));
          if (mio && ['fuego', 'caliz', 'viento', 'tierra'].includes(c) && !opc.children.length) opc.append(el('small', 'suave', 'Para darla tenéis que estar en la misma loseta'));
          caja.append(opc);
        }
        manos.append(caja);
      });
      const log = el('div', 'is-log'); for (const t of v.log.slice(-5)) log.append(el('p', null, t));
      zona.append(cab, estado, acc, tab, manos, log);
    },
  };
})();
