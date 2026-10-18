'use strict';
// Desactiva la bomba: la artificiera ve la bomba; el resto, el manual. Hablad (o usad el chat).
(() => {
  const { el, boton } = UI;
  const COLOR = { rojo: '#ff5a36', azul: '#4d7cfe', amarillo: '#ffc63d', blanco: '#f4f1ea', negro: '#1e1b2e' };
  let desfase = 0;
  // reloj mm:ss (uno para toda la página)
  setInterval(() => { for (const r of document.querySelectorAll('[data-reloj-bomba]')) { const s = Math.max(0, Math.ceil((+r.dataset.relojBomba - (Date.now() + desfase)) / 1000)); r.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; r.classList.toggle('poco', s <= 30); } }, 200);
  function moduloBomba(m, i, v, ctx) {
    const caja = el('div', 'bb-modulo' + (v.hechos[i] ? ' hecho' : ''));
    caja.append(el('span', 'bb-led' + (v.hechos[i] ? ' verde' : ''), ''));
    if (m.tipo === 'cables') {
      const cs = el('div', 'bb-cables');
      m.cables.forEach((c, k) => { const b = el('button', 'bb-cable' + (m.cortados.includes(k) ? ' cortado' : '')); b.type = 'button'; b.style.setProperty('--c', COLOR[c]); b.title = `Cable ${k + 1} (${c})`; b.disabled = v.hechos[i] || m.cortados.includes(k); b.onclick = () => ctx.enviar({ tipo: 'cortar', m: i, c: k }); cs.append(b); });
      caja.append(el('small', null, 'Cables'), cs);
    } else if (m.tipo === 'boton') {
      const b = el('button', 'bb-boton', m.texto); b.type = 'button'; b.style.setProperty('--c', COLOR[m.color]); b.disabled = v.hechos[i];
      if (!v.hechos[i]) UI.mantener(b, () => ctx.enviar({ tipo: 'boton', m: i, fase: 'abajo' }), () => ctx.enviar({ tipo: 'boton', m: i, fase: 'arriba' }));
      const tira = el('div', 'bb-tira'); if (m.tira) tira.style.background = COLOR[m.tira];
      caja.append(el('small', null, 'Botón'), b, tira);
    } else {
      const g = el('div', 'bb-simbolos');
      m.simbolos.forEach((s) => { const b = el('button', 'bb-simbolo' + (m.pulsados.includes(s) ? ' pulsado' : ''), s); b.type = 'button'; b.disabled = v.hechos[i] || m.pulsados.includes(s); b.onclick = () => ctx.enviar({ tipo: 'simbolo', m: i, s }); g.append(b); });
      caja.append(el('small', null, 'Símbolos'), g);
    }
    return caja;
  }
  function manual(v) {
    const r = v.manual.reglas, d = el('div', 'bb-manual');
    d.append(el('h3', null, '📕 Manual de desactivación'), el('p', 'suave', 'Pide a quien tiene la bomba que te describa lo que ve. Tú no ves la bomba; ella no ve el manual.'));
    const sec = (titulo, lis) => { const s = el('section'); s.append(el('h4', null, titulo)); const ol = el('ol'); for (const x of lis) ol.append(el('li', null, x)); s.append(ol); d.append(s); };
    for (const n of [3, 4, 5, 6]) sec(`Cables · ${n} cables (se cuentan de arriba abajo)`, r.cables[n]);
    sec('Botón', r.boton); sec('Botón · la tira', r.tira); sec('Símbolos', r.simbolos);
    const t = el('div', 'bb-columnas'); v.manual.simbolos.forEach((col, k) => { const c = el('div'); c.append(el('b', null, String(k + 1))); for (const s of col) c.append(el('span', null, s)); t.append(c); }); d.append(t);
    return d;
  }
  window.JUEGO = {
    cooperativo: true,
    render(zona, v, ctx) {
      desfase = ctx.desfase || 0;
      const yo = ctx.yo, art = yo === v.artificiero;
      const cab = el('div', 'bb-cab');
      const rel = el('b', 'bb-reloj'); if (v.fase === 'activa') rel.dataset.relojBomba = v.hasta; else rel.textContent = '--:--';
      cab.append(el('span', 'etiqueta', `Bomba ${v.bomba}/${v.bombas}`), rel, el('span', 'bb-fallos', '✖'.repeat(v.fallos) + '·'.repeat(3 - v.fallos)));
      const rol = el('p', 'turno' + (v.fase === 'activa' ? ' mio' : ''), art ? '💣 Tienes la bomba delante: describe lo que ves y haz lo que te digan.' : `📕 Tienes el manual. ${ctx.nombre(v.artificiero)} tiene la bomba: pregúntale y dile qué hacer.`);
      zona.append(cab, rol);
      if (v.aviso && v.fase === 'activa') zona.append(el('p', 'bb-aviso ' + v.aviso.tipo, v.aviso.tipo === 'ok' ? `✔ Módulo ${v.aviso.i + 1} desactivado` : `✖ ${v.aviso.texto} (módulo ${v.aviso.i + 1})`));
      if (v.fase === 'preparados' || v.fase === 'desactivada') {
        const p = el('div', 'panel'); p.append(el('h3', null, v.fase === 'desactivada' ? '✔ ¡Bomba desactivada!' : 'Preparaos'), el('p', null, v.fase === 'desactivada' ? 'La siguiente es más difícil y cambia quién la tiene delante.' : `La bomba la tendrá ${ctx.nombre(v.artificiero)}. Cuando estéis todos, ¡listos! (y empieza la cuenta atrás)`));
        const listos = el('p', 'suave', 'Listos: ' + v.listos.map((l, j) => (l ? ctx.nombre(j) : null)).filter(Boolean).join(', '));
        if (yo >= 0 && !(v.fase === 'preparados' && v.listos[yo])) p.append(boton(v.fase === 'desactivada' ? 'Siguiente bomba' : '¡Listos!', () => ctx.enviar({ tipo: 'listo' }), 'oro'));
        p.append(listos); zona.append(p);
      }
      if (art || v.fase === 'boom') {
        if (v.serie) zona.append(el('div', 'bb-serie', `Nº de serie: ${v.serie}`));
        if (v.fase === 'activa' || v.fase === 'boom') { const g = el('div', 'bb-bomba'); v.modulos.forEach((m, i) => g.append(moduloBomba(m, i, v, ctx))); zona.append(g); }
      }
      if (!art && v.manual) {
        const est = el('div', 'fi-marcador'); v.modulos.forEach((m, i) => est.append(el('span', v.hechos[i] ? 'acierto' : '', `${i + 1}: ${{ cables: 'cables', boton: 'botón', simbolos: 'símbolos' }[m.tipo]}${v.hechos[i] ? ' ✔' : ''}`)));
        zona.append(est, manual(v));
      }
    },
  };
})();
