'use strict';
// Portada: categorías, filtros (en la URL), favoritos, «sigue jugando», «sorpréndeme» y rejilla animada.
(() => {
  const TIPOS = [['', 'Todos'], ['cartas', 'Cartas'], ['tablero', 'Tablero'], ['habilidad', 'Habilidad'], ['palabras', 'Palabras'], ['fiesta', 'Fiesta'], ['casino', 'Casino']];
  const OPCIONES = {
    jugadores: [['1', 'Solo'], ['2', '2'], ['3-4', '3-4'], ['5+', '5 o más']],
    duracion: [['rapido', 'Rápido'], ['medio', 'Medio'], ['largo', 'Largo']],
    modo: [['solo', 'En solitario'], ['amigos', 'Con amigos'], ['cpu', 'Contra la CPU']],
  };
  // iconos de 8×5 píxeles para las categorías
  const ICONOS = {
    '': '0110011001100110000000000110011001100110',
    cartas: '0111110001000100010101000100010001111100',
    tablero: '1100110011001100001100110011001111001100',
    habilidad: '0001000000111000011111001111111000111000',
    palabras: '0011100001000100011111000100010001000100',
    fiesta: '0000001000010100001001000100100011110000',
    casino: '0011100001000100010101000100010000111000',
  };
  const DURACION = { rapido: 'Rápido', medio: 'Medio', largo: 'Largo' };
  const $ = (s, r = document) => r.querySelector(s);
  const V = document.querySelector('meta[name=v]')?.content || '';
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const f = { q: '', tipo: '', jugadores: new Set(), duracion: new Set(), modo: new Set(), listos: false };
  let juegos = [], favs = new Set();
  const fichas = new Map(); // id -> elemento (se reutilizan para animar al filtrar)

  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const icono = (k) => {
    const bits = ICONOS[k] || ICONOS[''];
    let r = '';
    for (let i = 0; i < bits.length; i++) if (bits[i] === '1') r += `<rect x="${(i % 8) * 2}" y="${Math.floor(i / 8) * 2 + 3}" width="2" height="2" fill="currentColor"/>`;
    return `<svg viewBox="0 0 16 16" aria-hidden="true">${r}</svg>`;
  };
  const img = (j) => { const i = el('img', 'px'); i.src = `/img/juegos/${j.id}.svg?v=${V}`; i.alt = ''; i.width = 160; i.height = 120; i.loading = 'lazy'; return i; };
  const rango = (j) => (j.jugadores[0] === j.jugadores[1] ? `${j.jugadores[0]}` : `${j.jugadores[0]}-${j.jugadores[1]}`);
  const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const cabeJugadores = (j, k) => {
    const [mn, mx] = j.jugadores;
    if (k === '1') return mn <= 1;
    if (k === '2') return mn <= 2 && mx >= 2;
    if (k === '3-4') return mx >= 3 && mn <= 4;
    return mx >= 5;
  };
  const pasa = (j) =>
    (!f.q || sinTildes(j.nombre + ' ' + j.descripcion + ' ' + j.tipo).includes(sinTildes(f.q))) &&
    (!f.tipo || j.tipo === f.tipo) &&
    (!f.listos || j.estado === 'listo') &&
    (!f.jugadores.size || [...f.jugadores].some((k) => cabeJugadores(j, k))) &&
    (!f.duracion.size || f.duracion.has(j.duracion)) &&
    (!f.modo.size || j.modo.some((m) => f.modo.has(m)));
  const hayFiltros = () => f.q || f.tipo || f.listos || f.jugadores.size || f.duracion.size || f.modo.size;

  // --- corazón de favorito -----------------------------------------------------------------------------
  function corazon(j) {
    const b = el('button', 'fav');
    b.type = 'button';
    const pintar = () => { const on = favs.has(j.id); b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? `Quitar ${j.nombre} de favoritos` : `Añadir ${j.nombre} a favoritos`); b.title = on ? 'Quitar de favoritos' : 'Añadir a favoritos'; };
    b.innerHTML = '<svg viewBox="0 0 14 12" aria-hidden="true"><path d="M2 0h3v1h1v1h2V1h1V0h3v1h1v1h1v4h-1v1h-1v1h-1v1h-1v1H9v1H8v1H6v-1H5v-1H4V9H3V8H2V7H1V6H0V2h1V1h1z"/></svg>';
    b.onclick = async (e) => {
      e.preventDefault(); e.stopPropagation();
      const on = !favs.has(j.id);
      if (!(await Cuenta.marcarFavorito(j.id, on))) return;
      on ? favs.add(j.id) : favs.delete(j.id);
      document.querySelectorAll(`.fav[data-id="${j.id}"]`).forEach((x) => x.pintar());
      b.classList.remove('late'); void b.offsetWidth; if (on) b.classList.add('late');
      Avisar(on ? `${j.nombre}: en tus favoritos` : `${j.nombre}: fuera de favoritos`);
      pintarFilas();
    };
    b.dataset.id = j.id;
    b.pintar = pintar;
    pintar();
    return b;
  }

  function ficha(j) {
    const listo = j.estado === 'listo';
    const t = el('article', 'ficha inclina' + (listo ? '' : ' pronto'));
    const enlace = el(listo ? 'a' : 'span', 'ficha-enlace');
    if (listo) enlace.href = j.url;
    const marco = el('div', 'ficha-img');
    marco.append(img(j));
    if (listo) marco.append(el('span', 'ficha-jugar', '▶ Jugar'));
    const dentro = el('div', 'ficha-in');
    const h = el('h3'); enlace.append(j.nombre); h.append(enlace);
    const tags = el('div', 'tags');
    tags.append(el('span', null, `${rango(j)} jug.`), el('span', null, DURACION[j.duracion]));
    if (j.modo.includes('cpu')) tags.append(el('span', null, 'CPU'));
    dentro.append(h, el('p', 'ficha-desc', j.descripcion), tags);
    t.append(marco, dentro, corazon(j));
    const sello = !listo ? ['pronto', 'Pronto'] : j.externo ? ['externo', 'Web aparte'] : j.nuevo ? ['nuevo', '¡Nuevo!'] : null;
    if (sello) t.append(el('span', 'sello ' + sello[0], sello[1]));
    return t;
  }
  function destacado(j) {
    const a = el('a', 'destacado inclina'); a.href = j.url;
    const txt = el('div');
    txt.append(el('h3', null, j.nombre), el('p', null, j.descripcion), el('span', 'btn primario mini', '▶ Jugar'));
    a.append(img(j), txt);
    return a;
  }
  function mini(j) {
    const a = el('a', 'mini-juego'); a.href = j.url;
    a.append(img(j), el('span', null, j.nombre));
    return a;
  }

  // --- filas «Tus favoritos» y «Sigue jugando» ---------------------------------------------------------------
  function pintarFilas() {
    const porId = new Map(juegos.map((j) => [j.id, j]));
    const recientes = (UI_leer('recientes', []) || []).map((id) => porId.get(id)).filter((j) => j && j.estado === 'listo').slice(0, 6);
    const favoritos = [...favs].map((id) => porId.get(id)).filter((j) => j && j.estado === 'listo');
    for (const [zona, lista] of [['#fila-favoritos', favoritos], ['#fila-recientes', recientes]]) {
      $(zona).hidden = !lista.length;
      $(zona + ' .tira').replaceChildren(...lista.map(mini));
    }
  }
  function UI_leer(k, def) { try { const v = localStorage.getItem('games:' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } }

  // --- rejilla con animación al filtrar (técnica FLIP) ----------------------------------------------------
  function pintar() {
    const lista = $('#lista');
    const antes = new Map();
    for (const [id, e] of fichas) if (e.isConnected) antes.set(id, e.getBoundingClientRect());
    const visibles = juegos.filter(pasa);
    const nuevos = visibles.map((j) => { if (!fichas.has(j.id)) fichas.set(j.id, ficha(j)); return fichas.get(j.id); });
    lista.replaceChildren(...nuevos);
    if (!visibles.length) lista.append(el('p', 'vacio', 'Ningún juego cumple esos filtros. ¿Quitamos alguno?'));
    if (!quieto && antes.size) {
      for (const j of visibles) {
        const e = fichas.get(j.id), a = antes.get(j.id), d = e.getBoundingClientRect();
        if (a) {
          const dx = a.left - d.left, dy = a.top - d.top;
          if (dx || dy) e.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
        } else e.animate([{ opacity: 0, transform: 'scale(.85)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' });
      }
    }
    $('#cuenta').textContent = `${visibles.length} ${visibles.length === 1 ? 'juego' : 'juegos'}`;
    $('#titulo-lista').textContent = f.tipo ? TIPOS.find(([k]) => k === f.tipo)[1] : hayFiltros() ? 'Resultados' : 'Todos los juegos';
    $('#zona-destacados').hidden = !!hayFiltros();
    const n = f.jugadores.size + f.duracion.size + f.modo.size + (f.listos ? 1 : 0);
    $('#n-filtros').textContent = n ? `(${n})` : '';
    document.querySelectorAll('.pestana').forEach((p) => p.setAttribute('aria-pressed', String(p.dataset.tipo === f.tipo)));
    guardarHash();
  }

  function guardarHash() {
    const p = new URLSearchParams();
    if (f.q) p.set('q', f.q);
    if (f.tipo) p.set('tipo', f.tipo);
    for (const k of Object.keys(OPCIONES)) if (f[k].size) p.set(k, [...f[k]].join(','));
    if (f.listos) p.set('listos', '1');
    const s = p.toString();
    history.replaceState(null, '', s ? '#' + s : location.pathname);
  }
  function leerHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    f.q = p.get('q') || new URLSearchParams(location.search).get('q') || '';
    f.tipo = TIPOS.some(([k]) => k && k === p.get('tipo')) ? p.get('tipo') : '';
    for (const k of Object.keys(OPCIONES)) f[k] = new Set((p.get(k) || '').split(',').filter((v) => OPCIONES[k].some(([c]) => c === v)));
    f.listos = p.get('listos') === '1';
  }

  function montar() {
    for (const [k, txt] of TIPOS) {
      const b = el('button', `pestana c-${k || 'todos'}`);
      b.type = 'button'; b.dataset.tipo = k;
      b.innerHTML = icono(k); b.append(txt);
      b.onclick = () => { f.tipo = k; pintar(); };
      $('#pestanas').append(b);
    }
    for (const [k, ops] of Object.entries(OPCIONES)) {
      const g = $(`[data-filtro="${k}"] .opciones`);
      for (const [clave, texto] of ops) {
        const b = el('button', 'chip', texto);
        b.type = 'button';
        b.setAttribute('aria-pressed', String(f[k].has(clave)));
        b.onclick = () => { f[k].has(clave) ? f[k].delete(clave) : f[k].add(clave); b.setAttribute('aria-pressed', String(f[k].has(clave))); pintar(); };
        g.append(b);
      }
    }
    $('#q').value = f.q;
    $('#q').oninput = (e) => { f.q = e.target.value.trim(); pintar(); };
    $('#buscador').onsubmit = (e) => { e.preventDefault(); f.q = $('#q').value.trim(); pintar(); $('#catalogo').scrollIntoView({ behavior: quieto ? 'auto' : 'smooth' }); };
    $('#solo-listos').checked = f.listos;
    $('#solo-listos').onchange = (e) => { f.listos = e.target.checked; pintar(); };
    $('#limpiar').onclick = () => {
      Object.assign(f, { q: '', tipo: '', listos: false }); for (const k of Object.keys(OPCIONES)) f[k].clear();
      $('#q').value = ''; $('#solo-listos').checked = false;
      document.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      pintar();
    };
    $('#filtros').open = !!(f.jugadores.size || f.duracion.size || f.modo.size || f.listos);
    if (f.q) history.replaceState(null, '', location.pathname + location.hash);
    // «Sorpréndeme»: el dado rueda y te lleva a un juego al azar
    $('#sorpresa').onclick = () => {
      const posibles = juegos.filter((j) => j.estado === 'listo' && !j.externo);
      const j = posibles[Math.floor(Math.random() * posibles.length)];
      const b = $('#sorpresa');
      b.disabled = true; b.classList.add('rodando');
      Avisar(`🎲 ¡Te toca jugar a ${j.nombre}!`);
      setTimeout(() => { location.href = j.url; }, quieto ? 300 : 1100);
    };
    // la ilustración se mueve un poco con el ratón
    const hero = $('.hero-img');
    if (hero && !quieto && matchMedia('(pointer: fine)').matches) {
      $('.hero').addEventListener('pointermove', (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        hero.style.setProperty('--px', `${(((e.clientX - r.left) / r.width) - .5) * -14}px`);
        hero.style.setProperty('--py', `${(((e.clientY - r.top) / r.height) - .5) * -10}px`);
      });
    }
  }

  leerHash();
  montar();
  Promise.all([fetch('/api/juegos').then((r) => r.json()), Cuenta.favoritos()]).then(([d, fv]) => {
    juegos = d; favs = fv;
    $('#destacados').replaceChildren(...juegos.filter((j) => j.destacado && j.estado === 'listo').map(destacado));
    pintarFilas();
    pintar();
    Aparecer(document.querySelectorAll('.destacado, #lista .ficha'));
  }).catch(() => { $('#cuenta').textContent = 'No se pudo cargar el catálogo.'; });
})();
