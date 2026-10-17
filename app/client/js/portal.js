'use strict';
// Portada: pestañas de categoría, filtros laterales, destacados y rejilla de miniaturas.
// Los filtros viven en la URL (#...) para poder compartir una búsqueda.
(() => {
  const TIPOS = [['', 'Todos'], ['cartas', 'Cartas'], ['tablero', 'Tablero'], ['habilidad', 'Habilidad'], ['dibujo', 'Dibujo'], ['rol', 'Rol'], ['casino', 'Casino']];
  const OPCIONES = {
    jugadores: [['1', 'Solo'], ['2', '2'], ['3-4', '3-4'], ['5+', '5 o más']],
    duracion: [['rapido', 'Rápido'], ['medio', 'Medio'], ['largo', 'Largo']],
    modo: [['solo', 'En solitario'], ['amigos', 'Con amigos'], ['cpu', 'Contra la CPU']],
  };
  const DURACION = { rapido: '⏱ Rápido', medio: '⏱ Medio', largo: '⏱ Largo' };
  const $ = (s, r = document) => r.querySelector(s);
  const f = { q: '', tipo: '', jugadores: new Set(), duracion: new Set(), modo: new Set(), listos: false };
  let juegos = [];

  const cabeJugadores = (j, k) => {
    const [mn, mx] = j.jugadores;
    if (k === '1') return mn <= 1;
    if (k === '2') return mn <= 2 && mx >= 2;
    if (k === '3-4') return mx >= 3 && mn <= 4;
    return mx >= 5;
  };
  const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const pasa = (j) =>
    (!f.q || sinTildes(j.nombre + ' ' + j.descripcion + ' ' + j.tipo).includes(sinTildes(f.q))) &&
    (!f.tipo || j.tipo === f.tipo) &&
    (!f.listos || j.estado === 'listo') &&
    (!f.jugadores.size || [...f.jugadores].some((k) => cabeJugadores(j, k))) &&
    (!f.duracion.size || f.duracion.has(j.duracion)) &&
    (!f.modo.size || j.modo.some((m) => f.modo.has(m)));
  const hayFiltros = () => f.q || f.tipo || f.listos || f.jugadores.size || f.duracion.size || f.modo.size;

  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const img = (j) => { const i = el('img'); i.src = `/img/juegos/${j.id}.svg`; i.alt = ''; i.width = 160; i.height = 120; i.loading = 'lazy'; return i; };
  const rango = (j) => (j.jugadores[0] === j.jugadores[1] ? `${j.jugadores[0]}` : `${j.jugadores[0]}-${j.jugadores[1]}`);

  function ficha(j) {
    const listo = j.estado === 'listo';
    const t = el(listo ? 'a' : 'div', 'ficha' + (listo ? '' : ' pronto'));
    if (listo) t.href = j.url;
    t.append(img(j), el('h3', null, j.nombre));
    const tags = el('div', 'tags');
    tags.append(el('span', null, `👥 ${rango(j)}`), el('span', null, DURACION[j.duracion]));
    if (j.modo.includes('cpu')) tags.append(el('span', null, '🤖 CPU'));
    t.append(tags);
    const sello = !listo ? ['pronto', 'PRONTO'] : j.externo ? ['externo', 'WEB APARTE'] : j.nuevo ? ['nuevo', '¡NUEVO!'] : null;
    if (sello) t.append(el('span', 'sello ' + sello[0], sello[1]));
    t.title = j.descripcion;
    return t;
  }
  function destacado(j) {
    const a = el('a', 'destacado'); a.href = j.url;
    const txt = el('div');
    txt.append(el('h3', null, j.nombre), el('p', null, j.descripcion), el('span', 'btn jugar mini', '¡Jugar!'));
    a.append(img(j), txt);
    return a;
  }

  function pintar() {
    const visibles = juegos.filter(pasa);
    $('#lista').replaceChildren(...visibles.map(ficha));
    if (!visibles.length) $('#lista').append(el('p', 'vacio', 'Ningún juego cumple esos filtros.'));
    $('#cuenta').textContent = `(${visibles.length})`;
    $('#titulo-lista').textContent = f.tipo ? `Juegos de ${TIPOS.find(([k]) => k === f.tipo)[1].toLowerCase()}` : hayFiltros() ? 'Resultados' : 'Todos los juegos';
    $('#zona-destacados').hidden = !!hayFiltros();
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
    f.q = p.get('q') || '';
    f.tipo = TIPOS.some(([k]) => k && k === p.get('tipo')) ? p.get('tipo') : '';
    for (const k of Object.keys(OPCIONES)) f[k] = new Set((p.get(k) || '').split(',').filter((v) => OPCIONES[k].some(([c]) => c === v)));
    f.listos = p.get('listos') === '1';
  }

  function montar() {
    for (const [k, txt] of TIPOS) {
      const b = el('button', `pestana c-${k || 'todos'}`, txt);
      b.type = 'button'; b.dataset.tipo = k;
      b.onclick = () => { f.tipo = k; pintar(); };
      $('#pestanas').append(b);
    }
    for (const [k, ops] of Object.entries(OPCIONES)) {
      const g = $(`[data-filtro="${k}"]`);
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
    $('#buscador').onsubmit = (e) => { e.preventDefault(); f.q = $('#q').value.trim(); pintar(); $('#lista').scrollIntoView({ behavior: 'smooth' }); };
    $('#solo-listos').checked = f.listos;
    $('#solo-listos').onchange = (e) => { f.listos = e.target.checked; pintar(); };
    $('#limpiar').onclick = () => {
      Object.assign(f, { q: '', tipo: '', listos: false }); for (const k of Object.keys(OPCIONES)) f[k].clear();
      $('#q').value = ''; $('#solo-listos').checked = false;
      document.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      pintar();
    };
  }

  leerHash();
  montar();
  // en el ordenador los filtros se ven abiertos; en el móvil, plegados (y abiertos si ya hay alguno puesto)
  $('#filtros').open = matchMedia('(min-width: 761px)').matches || !!hayFiltros();
  fetch('/api/juegos').then((r) => r.json()).then((d) => {
    juegos = d;
    $('#destacados').replaceChildren(...juegos.filter((j) => j.destacado && j.estado === 'listo').map(destacado));
    pintar();
  }).catch(() => { $('#cuenta').textContent = 'No se pudo cargar el catálogo.'; });
})();
