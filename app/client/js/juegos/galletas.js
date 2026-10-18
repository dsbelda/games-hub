'use strict';
// Galletas: pulsa la galleta para hornear, compra ayudantes que hornean solos y mejoras.
// Se guarda en el navegador y sigue horneando (a medio gas) mientras no estás.
window.JUEGO = {
  montar(raiz) {
    const { el, boton } = UI;
    const EDIF = [
      ['cursor', 'Dedo mecánico', '👆', 15, 0.1], ['abuela', 'Abuela', '👵', 100, 1], ['granja', 'Huerto de galletas', '🌾', 1100, 8],
      ['mina', 'Mina de chocolate', '⛏️', 12000, 47], ['fabrica', 'Fábrica', '🏭', 130000, 260], ['banco', 'Banco', '🏦', 1.4e6, 1400],
      ['templo', 'Templo', '🛕', 2e7, 7800], ['magos', 'Torre de magos', '🧙', 3.3e8, 44000], ['cohete', 'Cohete', '🚀', 5.1e9, 260000],
    ];
    // mejoras: [id, nombre, precio, qué mejora ('clic' o un edificio), cuántos edificios hacen falta]
    const MEJ = [];
    for (const [id, nombre, , base] of EDIF) for (const [n, mul] of [[1, 10], [5, 50], [25, 500], [50, 50000]]) MEJ.push([`${id}-${n}`, `${nombre} ×2`, base * mul, id, n]);
    for (const [n, precio] of [[1, 100], [2, 5000], [3, 5e5], [4, 5e7], [5, 5e9]]) MEJ.push([`clic-${n}`, `Rodillo ${['', 'de madera', 'de piedra', 'de hierro', 'de oro', 'de diamante'][n]}`, precio, 'clic', 0]);
    const nuevoEstado = () => ({ g: 0, total: 0, clics: 0, edif: {}, mej: [], visto: Date.now() });
    let s = UI.leer('galletas', null) || nuevoEstado();
    const fmt = (n) => { if (n < 1e3) return n < 10 && n % 1 ? n.toFixed(1) : Math.floor(n).toLocaleString('es'); const u = ['mil', 'millones', 'mil millones', 'billones', 'mil billones', 'trillones']; let k = -1; while (n >= 1000 && k < u.length - 1) { n /= 1000; k++; } return `${n.toFixed(n < 10 ? 2 : 1).replace('.', ',')} ${u[k]}`; };
    const precio = (e) => Math.ceil(e[3] * 1.15 ** (s.edif[e[0]] || 0));
    const mult = (id) => 2 ** s.mej.filter((m) => MEJ.find((x) => x[0] === m)?.[3] === id).length;
    let frenesi = 0;
    const gps = () => EDIF.reduce((t, e) => t + (s.edif[e[0]] || 0) * e[4] * mult(e[0]), 0) * (frenesi > 0 ? 7 : 1);
    const porClic = () => (1 + gps() * 0.01 * Math.min(1, s.mej.filter((m) => m.startsWith('clic')).length)) * mult('clic');
    // lo horneado mientras no estabas (al 50 %, como mucho 24 h)
    const fuera = Math.min(86400, (Date.now() - (s.visto || Date.now())) / 1000);
    if (fuera > 60) { const ganado = gps() * fuera * 0.5; if (ganado >= 1) { s.g += ganado; s.total += ganado; setTimeout(() => UI.aviso(`Mientras no estabas: +${fmt(ganado)} galletas`, 'bien'), 400); } }

    const caja = el('div', 'galletas');
    const izq = el('div', 'gal-izq'), der = el('div', 'gal-der');
    const cuenta = el('p', 'gal-cuenta'), ritmo = el('p', 'suave centro');
    const galleta = el('button', 'gal-galleta'); galleta.type = 'button'; galleta.setAttribute('aria-label', 'Hornear una galleta');
    galleta.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true" shape-rendering="crispEdges"><circle cx="16" cy="16" r="14" fill="#1e1b2e"/><circle cx="16" cy="16" r="12.5" fill="#d9a35b"/><circle cx="16" cy="16" r="10" fill="#e6b672"/><rect x="9" y="10" width="3" height="3" fill="#5a3a1b"/><rect x="18" y="8" width="3" height="3" fill="#5a3a1b"/><rect x="20" y="17" width="3" height="3" fill="#5a3a1b"/><rect x="12" y="19" width="3" height="3" fill="#5a3a1b"/><rect x="15" y="14" width="2" height="2" fill="#5a3a1b"/></svg>';
    const dorada = el('button', 'gal-dorada'); dorada.type = 'button'; dorada.hidden = true; dorada.textContent = '🍪'; dorada.setAttribute('aria-label', 'Galleta dorada');
    const estado = el('p', 'gal-frenesi');
    izq.append(cuenta, ritmo, galleta, estado, dorada);
    const tienda = el('div', 'gal-tienda'), mejoras = el('div', 'gal-mejoras');
    // borrar pide dos pulsaciones seguidas (nada de ventanas del navegador)
    let seguro = 0;
    const reiniciar = boton('Empezar de cero', () => {
      if (Date.now() - seguro > 3000) { seguro = Date.now(); reiniciar.textContent = '¿Seguro? Pulsa otra vez'; setTimeout(() => { reiniciar.textContent = 'Empezar de cero'; }, 3000); return; }
      s = nuevoEstado(); guardar(); pintarTienda(true); reiniciar.textContent = 'Empezar de cero'; seguro = 0;
    }, 'mini');
    der.append(el('h3', null, 'Mejoras'), mejoras, el('h3', null, 'Ayudantes'), tienda, reiniciar);
    caja.append(izq, der);
    raiz.replaceChildren(caja);

    galleta.onclick = (e) => {
      const n = porClic(); s.g += n; s.total += n; s.clics++;
      const r = galleta.getBoundingClientRect(), f = el('span', 'gal-mas', '+' + fmt(n));
      f.style.left = (e.clientX ? e.clientX - r.left : r.width / 2) + 'px'; f.style.top = (e.clientY ? e.clientY - r.top : r.height / 2) + 'px';
      galleta.append(f); setTimeout(() => f.remove(), 900);
      galleta.classList.remove('late'); void galleta.offsetWidth; galleta.classList.add('late');
      pintar();
    };
    dorada.onclick = () => {
      dorada.hidden = true;
      if (Math.random() < 0.5) { frenesi = 77; UI.aviso('¡Frenesí! Producción ×7 durante 77 s', 'bien'); }
      else { const premio = Math.max(13, Math.min(s.g * 0.15, gps() * 900)); s.g += premio; s.total += premio; UI.aviso(`¡Suerte! +${fmt(premio)} galletas`, 'bien'); }
      Confeti(30); pintarTienda(true);
    };
    const botones = new Map();
    let firma = '';
    function pintarTienda(forzar) {
      // las mejoras visibles: las que aún no tienes y ya puedes desbloquear (como mucho 8)
      const disp = MEJ.filter((m) => !s.mej.includes(m[0]) && (m[3] === 'clic' ? s.clics >= 1 && s.total >= m[2] / 4 : (s.edif[m[3]] || 0) >= m[4])).sort((a, b) => a[2] - b[2]).slice(0, 8);
      const nueva = disp.map((m) => m[0]).join() + '|' + EDIF.filter((e, i) => i === 0 || s.total >= EDIF[i - 1][3] || s.edif[e[0]]).length;
      if (nueva !== firma || forzar) {
        firma = nueva; botones.clear();
        mejoras.replaceChildren(...(disp.length ? disp.map((m) => { const b = el('button', 'gal-mejora'); b.type = 'button'; b.append(el('b', null, m[1]), el('small', null, fmt(m[2]))); b.title = m[3] === 'clic' ? 'Cada clic hornea el doble (y un poco más según tu producción)' : `Los ${EDIF.find((e) => e[0] === m[3])[1].toLowerCase()} hornean el doble`; b.onclick = () => { if (s.g < m[2]) return; s.g -= m[2]; s.mej.push(m[0]); UI.aviso(`Mejora: ${m[1]}`, 'bien'); pintarTienda(true); }; botones.set(m[0], [b, () => m[2]]); return b; }) : [el('p', 'suave', 'Sigue horneando para desbloquear mejoras.')]));
        const vis = EDIF.filter((e, i) => i === 0 || s.total >= EDIF[i - 1][3] || s.edif[e[0]]);
        tienda.replaceChildren(...vis.map((e) => {
          const b = el('button', 'gal-edif'); b.type = 'button';
          const pr = el('small'), cant = el('span', 'gal-cant');
          b.append(el('span', 'gal-ico', e[2]), el('span', 'gal-nom'), cant); b.children[1].append(el('b', null, e[1]), pr);
          b.title = `Cada uno hornea ${fmt(e[4] * mult(e[0]))} galletas por segundo`;
          b.onclick = () => { const p = precio(e); if (s.g < p) return; s.g -= p; s.edif[e[0]] = (s.edif[e[0]] || 0) + 1; pintarTienda(true); };
          botones.set(e[0], [b, () => precio(e), pr, cant, e]);
          return b;
        }));
      }
      for (const [, [b, pr, txt, cant, e]] of botones) { b.disabled = s.g < pr(); if (txt) { txt.textContent = `${fmt(pr())} 🍪`; cant.textContent = s.edif[e[0]] || ''; } }
    }
    function pintar() {
      cuenta.textContent = `${fmt(s.g)} galletas`;
      ritmo.textContent = `${fmt(gps())} por segundo · ${fmt(porClic())} por clic`;
      estado.textContent = frenesi > 0 ? `¡Frenesí! ${Math.ceil(frenesi)} s` : '';
      document.title = `${fmt(s.g)} galletas · Galletas`;
    }
    function guardar() { s.visto = Date.now(); UI.guardar('galletas', s); }
    let ultimo = performance.now(), aGuardar = 0, aRecord = 0, aDorada = 60 + Math.random() * 120, dorVida = 0;
    function marco(t) {
      const dt = Math.min(1, (t - ultimo) / 1000); ultimo = t;
      const n = gps() * dt; s.g += n; s.total += n;
      frenesi = Math.max(0, frenesi - dt);
      aDorada -= dt;
      if (aDorada <= 0 && dorada.hidden) { dorada.hidden = false; dorada.style.left = 10 + Math.random() * 75 + '%'; dorada.style.top = 10 + Math.random() * 70 + '%'; dorVida = 13; aDorada = 120 + Math.random() * 180; }
      if (!dorada.hidden) { dorVida -= dt; if (dorVida <= 0) dorada.hidden = true; }
      aGuardar += dt; if (aGuardar > 5) { aGuardar = 0; guardar(); }
      aRecord += dt; if (aRecord > 60) { aRecord = 0; const r = Math.min(10_000_000, Math.floor(gps())); if (r) Cuenta.record('galletas', r); }
      pintar(); pintarTienda();
      requestAnimationFrame(marco);
    }
    window.addEventListener('pagehide', guardar);
    // con la pestaña oculta el navegador para la animación: al volver se suma lo horneado entre tanto
    let oculto = 0;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { guardar(); oculto = Date.now(); return; }
      if (oculto) { const n = gps() * Math.min(86400, (Date.now() - oculto) / 1000); s.g += n; s.total += n; oculto = 0; ultimo = performance.now(); }
    });
    pintarTienda(true); pintar();
    requestAnimationFrame(marco);
  },
};
