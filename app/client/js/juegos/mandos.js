'use strict';
// Mandos por bits para los juegos en tiempo real (Bombas, Carreras): teclado y botones táctiles de mantener.
// Manda {tipo: 'teclas', k} en cuanto cambia algo (el servidor guarda las pulsaciones cortas).
window.Mandos = (() => {
  const { el, boton } = UI;
  function crear({ teclas, botones, clase = '' }) {
    const st = { k: 0, botK: 0, enviada: -1, ctx: null };
    const mandar = () => { const k = st.k | st.botK; if (k !== st.enviada && st.ctx && st.ctx.fase === 'juego' && st.ctx.yo >= 0) { st.enviada = k; st.ctx.enviar({ tipo: 'teclas', k }); } };
    document.addEventListener('keydown', (e) => { if (!st.ctx || e.target.closest('input, textarea') || !teclas[e.code]) return; e.preventDefault(); if (e.repeat) return; st.k |= teclas[e.code]; mandar(); });
    document.addEventListener('keyup', (e) => { if (!teclas[e.code]) return; st.k &= ~teclas[e.code]; mandar(); });
    window.addEventListener('blur', () => { st.k = 0; st.botK = 0; mandar(); });
    st.el = el('div', 'md-mandos ' + clase);
    for (const grupo of botones) {
      const g = el('div', 'md-grupo ' + (grupo.clase || ''));
      for (const [txt, bit, cls] of grupo.botones) g.append(UI.mantener(boton(txt, null, 'mini ' + (cls || '')), () => { st.botK |= bit; mandar(); }, () => { st.botK &= ~bit; mandar(); }));
      st.el.append(g);
    }
    st.usar = (ctx) => { st.ctx = ctx; };
    return st;
  }
  return { crear };
})();
