'use strict';
// Cargador de la página de un juego (/j/ID): pone el título y carga los scripts que toquen.
(() => {
  const id = location.pathname.split('/')[2];
  const MULTI = ['cuatro', 'brisca', 'unidad'];
  window.UI = {
    el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; },
    boton(txt, fn, cls = '') { const b = UI.el('button', 'btn ' + cls, txt); b.type = 'button'; b.onclick = fn; return b; },
    aviso(txt) {
      const t = document.getElementById('aviso');
      t.textContent = txt; t.hidden = false;
      clearTimeout(UI._t); UI._t = setTimeout(() => { t.hidden = true; }, 3000);
    },
    // récord local (si el navegador no deja guardar, no pasa nada)
    leer(k, def) { try { const v = localStorage.getItem('games:' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    guardar(k, v) { try { localStorage.setItem('games:' + k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } },
  };
  const cargar = (src) => new Promise((ok, mal) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = mal; document.body.append(s); });

  fetch('/api/juegos').then((r) => r.json()).then(async (cat) => {
    const j = cat.find((x) => x.id === id);
    if (!j) { location.href = '/'; return; }
    const TIPOS = { cartas: 'Cartas', tablero: 'Tablero', habilidad: 'Habilidad', dibujo: 'Dibujo', rol: 'Rol', casino: 'Casino' };
    document.title = `${j.nombre} · Juega gratis · dsbelda Games`;
    document.getElementById('titulo').textContent = j.nombre;
    document.getElementById('miga-juego').textContent = j.nombre;
    const miga = document.getElementById('miga-tipo');
    miga.textContent = TIPOS[j.tipo]; miga.href = `/#tipo=${j.tipo}`;
    document.getElementById('como').append(UI.el('p', null, j.comoSeJuega), UI.el('p', 'suave', `👥 ${j.jugadores[0] === j.jugadores[1] ? j.jugadores[0] : j.jugadores.join('-')} jugadores`));
    // «Más juegos»: primero los del mismo tipo, luego el resto de los que ya se pueden jugar
    const otros = cat.filter((x) => x.id !== j.id && x.estado === 'listo').sort((a, b) => (b.tipo === j.tipo) - (a.tipo === j.tipo)).slice(0, 4);
    document.getElementById('mas').append(...otros.map((x) => {
      const a = UI.el('a', 'mini-ficha'); a.href = x.url;
      const im = UI.el('img'); im.src = `/img/juegos/${x.id}.svg`; im.alt = ''; im.width = 160; im.height = 120; im.loading = 'lazy';
      a.append(im, UI.el('span', null, x.nombre));
      return a;
    }));
    document.getElementById('buscador').onsubmit = (e) => { e.preventDefault(); location.href = '/#q=' + encodeURIComponent(document.getElementById('q').value.trim()); };
    window.FICHA = j;
    if (MULTI.includes(id)) { await cargar('/socket.io/socket.io.js'); await cargar(`/js/juegos/${id}.js`); await cargar('/js/sala.js'); }
    else { await cargar(`/js/juegos/${id}.js`); window.JUEGO.montar(document.getElementById('raiz')); }
  }).catch(() => UI.aviso('No se pudo cargar el juego'));
})();
