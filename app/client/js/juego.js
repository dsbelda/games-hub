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
    document.title = `${j.nombre} · Salón de juegos`;
    document.getElementById('titulo').textContent = `${j.icono} ${j.nombre}`;
    window.FICHA = j;
    if (MULTI.includes(id)) { await cargar('/socket.io/socket.io.js'); await cargar(`/js/juegos/${id}.js`); await cargar('/js/sala.js'); }
    else { await cargar(`/js/juegos/${id}.js`); window.JUEGO.montar(document.getElementById('raiz')); }
  }).catch(() => UI.aviso('No se pudo cargar el juego'));
})();
