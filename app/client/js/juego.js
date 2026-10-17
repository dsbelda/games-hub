'use strict';
// Cargador de la página de un juego (/j/ID): pone el título y carga los scripts que toquen.
(() => {
  const id = location.pathname.split('/')[2];
  const V = document.querySelector('meta[name=v]')?.content || '';
  const MULTI = ['cuatro', 'brisca', 'unidad', 'hundir', 'damas', 'ajedrez', 'tute', 'chinchon', 'poquer', 'mus', 'parchis', 'impostor', 'stop', 'dibujo', 'lobo', 'arqueros', 'billar', 'tanques', 'cabezones', 'fuegoagua'];
  const EXTRA = { ajedrez: ['piezas'], tute: ['cartas-es'], chinchon: ['cartas-es'], mus: ['cartas-es'], burbujas: ['lienzo'], torres: ['lienzo'], eras: ['lienzo'], minero: ['lienzo'], tortuga: ['lienzo'], volar: ['lienzo'], arqueros: ['lienzo'], billar: ['lienzo'], tanques: ['lienzo'], cabezones: ['lienzo'], fuegoagua: ['lienzo', 'fuegoagua-niveles'] }; // scripts que necesita antes un juego
  window.UI = {
    el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; },
    boton(txt, fn, cls = '') { const b = UI.el('button', 'btn ' + cls, txt); b.type = 'button'; b.onclick = fn; return b; },
    aviso(txt, tipo) { window.Avisar(txt, tipo); },
    // récord local (si el navegador no deja guardar, no pasa nada)
    leer(k, def) { try { const v = localStorage.getItem('games:' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    guardar(k, v) { try { localStorage.setItem('games:' + k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } },
  };
  const cargar = (src) => new Promise((ok, mal) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = mal; document.body.append(s); });

  fetch('/api/juegos').then((r) => r.json()).then(async (cat) => {
    const j = cat.find((x) => x.id === id);
    if (!j) { location.href = '/'; return; }
    const TIPOS = { cartas: 'Cartas', tablero: 'Tablero', habilidad: 'Habilidad', estrategia: 'Estrategia', palabras: 'Palabras', fiesta: 'Fiesta', casino: 'Casino' };
    document.title = `${j.nombre} · Juega gratis · dsbelda games`;
    document.getElementById('titulo').textContent = j.nombre;
    document.getElementById('miga-juego').textContent = j.nombre;
    const miga = document.getElementById('miga-tipo');
    miga.textContent = TIPOS[j.tipo]; miga.href = `/#tipo=${j.tipo}`;
    document.getElementById('como').append(UI.el('p', null, j.comoSeJuega), UI.el('p', 'suave', j.jugadores[1] === 1 ? '👤 Para jugar en solitario' : `👥 ${j.jugadores[0] === j.jugadores[1] ? j.jugadores[0] : j.jugadores.join('-')} jugadores`));
    // «Más juegos»: primero los del mismo tipo, luego el resto de los que ya se pueden jugar
    const otros = cat.filter((x) => x.id !== j.id && x.estado === 'listo').sort((a, b) => (b.tipo === j.tipo) - (a.tipo === j.tipo)).slice(0, 4);
    document.getElementById('mas').append(...otros.map((x) => {
      const a = UI.el('a', 'mini-ficha'); a.href = x.url;
      const im = UI.el('img'); im.src = `/img/juegos/${x.id}.svg?v=${V}`; im.className = 'px'; im.alt = ''; im.width = 160; im.height = 120; im.loading = 'lazy';
      a.append(im, UI.el('span', null, x.nombre));
      return a;
    }));
    document.getElementById('buscador').onsubmit = (e) => { e.preventDefault(); location.href = '/#q=' + encodeURIComponent(document.getElementById('q').value.trim()); };
    window.FICHA = j;
    window.CATALOGO = cat;
    // «Sigue jugando» de la portada
    const rec = UI.leer('recientes', []).filter((x) => x !== j.id); rec.unshift(j.id); UI.guardar('recientes', rec.slice(0, 8));
    // corazón de favorito en la barra del título
    const favs = await Cuenta.favoritos();
    const fav = UI.el('button', 'fav fav-titulo'); fav.type = 'button';
    fav.innerHTML = '<svg viewBox="0 0 14 12" aria-hidden="true"><path d="M2 0h3v1h1v1h2V1h1V0h3v1h1v1h1v4h-1v1h-1v1h-1v1h-1v1H9v1H8v1H6v-1H5v-1H4V9H3V8H2V7H1V6H0V2h1V1h1z"/></svg>';
    const pintaFav = () => { const on = favs.has(j.id); fav.setAttribute('aria-pressed', String(on)); fav.setAttribute('aria-label', on ? 'Quitar de favoritos' : 'Añadir a favoritos'); fav.title = fav.getAttribute('aria-label'); };
    fav.onclick = async () => { const on = !favs.has(j.id); if (!(await Cuenta.marcarFavorito(j.id, on))) return; on ? favs.add(j.id) : favs.delete(j.id); pintaFav(); fav.classList.remove('late'); void fav.offsetWidth; if (on) fav.classList.add('late'); UI.aviso(on ? 'En tus favoritos' : 'Fuera de favoritos'); };
    pintaFav();
    document.getElementById('titulo').append(fav);
    for (const x of EXTRA[id] || []) await cargar(`/js/juegos/${x}.js?v=${V}`);
    if (MULTI.includes(id)) { await cargar('/socket.io/socket.io.js'); await cargar(`/js/juegos/${id}.js?v=${V}`); await cargar(`/js/sala.js?v=${V}`); }
    else { await cargar(`/js/juegos/${id}.js?v=${V}`); window.JUEGO.montar(document.getElementById('raiz')); }
  }).catch(() => UI.aviso('No se pudo cargar el juego'));
})();
