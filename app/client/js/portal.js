'use strict';
// Catálogo con filtros. Los filtros viven en la URL (#...) para poder compartir una búsqueda.
(() => {
  const OPCIONES = {
    jugadores: [['1', 'Solo'], ['2', '2'], ['3-4', '3-4'], ['5+', '5 o más']],
    duracion: [['rapido', 'Rápido'], ['medio', 'Medio'], ['largo', 'Largo']],
    tipo: [['cartas', 'Cartas'], ['tablero', 'Tablero'], ['dibujo', 'Dibujo'], ['habilidad', 'Habilidad'], ['rol', 'Rol'], ['casino', 'Casino']],
    modo: [['solo', 'En solitario'], ['amigos', 'Con amigos'], ['cpu', 'Contra CPU']],
  };
  const DURACION = { rapido: 'Rápido', medio: 'Medio', largo: 'Largo' };
  const MODO = { solo: 'Solitario', amigos: 'Amigos', cpu: 'CPU' };
  const $ = (s, r = document) => r.querySelector(s);
  const f = { q: '', jugadores: new Set(), duracion: new Set(), tipo: new Set(), modo: new Set(), listos: false };
  let juegos = [];

  const cabeJugadores = (j, k) => {
    const [mn, mx] = j.jugadores;
    if (k === '1') return mn <= 1 && mx >= 1;
    if (k === '2') return mn <= 2 && mx >= 2;
    if (k === '3-4') return mx >= 3 && mn <= 4;
    return mx >= 5;
  };
  const pasa = (j) =>
    (!f.q || (j.nombre + ' ' + j.descripcion).toLowerCase().includes(f.q)) &&
    (!f.listos || j.estado === 'listo') &&
    (!f.jugadores.size || [...f.jugadores].some((k) => cabeJugadores(j, k))) &&
    (!f.duracion.size || f.duracion.has(j.duracion)) &&
    (!f.tipo.size || f.tipo.has(j.tipo)) &&
    (!f.modo.size || j.modo.some((m) => f.modo.has(m)));

  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const rango = (j) => (j.jugadores[0] === j.jugadores[1] ? `${j.jugadores[0]}` : `${j.jugadores[0]}-${j.jugadores[1]}`);

  function tarjeta(j) {
    const listo = j.estado === 'listo';
    const t = el(listo ? 'a' : 'div', 'tarjeta' + (listo ? '' : ' pronto'));
    if (listo) { t.href = j.url; if (j.externo) t.rel = 'noopener'; }
    t.append(el('div', 'icono', j.icono), el('h2', null, j.nombre), el('p', 'desc', j.descripcion));
    const meta = el('div', 'meta');
    meta.append(el('span', null, `👥 ${rango(j)}`), el('span', null, `⏱ ${DURACION[j.duracion]}`));
    for (const m of j.modo) meta.append(el('span', null, MODO[m]));
    t.append(meta, el('div', 'estado', listo ? 'Jugar →' : 'Próximamente'));
    return t;
  }

  function pintar() {
    const lista = $('#lista');
    const visibles = juegos.filter(pasa);
    lista.replaceChildren(...visibles.map(tarjeta));
    $('#cuenta').textContent = visibles.length === juegos.length ? `${juegos.length} juegos` : `${visibles.length} de ${juegos.length} juegos`;
    if (!visibles.length) lista.append(el('p', 'vacio', 'Ningún juego cumple esos filtros.'));
    guardarHash();
  }

  function guardarHash() {
    const p = new URLSearchParams();
    if (f.q) p.set('q', f.q);
    for (const k of Object.keys(OPCIONES)) if (f[k].size) p.set(k, [...f[k]].join(','));
    if (f.listos) p.set('listos', '1');
    const s = p.toString();
    history.replaceState(null, '', s ? '#' + s : location.pathname);
  }
  function leerHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    f.q = (p.get('q') || '').toLowerCase();
    for (const k of Object.keys(OPCIONES)) f[k] = new Set((p.get(k) || '').split(',').filter((v) => OPCIONES[k].some(([c]) => c === v)));
    f.listos = p.get('listos') === '1';
  }

  function montarFiltros() {
    for (const [k, ops] of Object.entries(OPCIONES)) {
      const g = $(`[data-filtro="${k}"]`);
      for (const [clave, texto] of ops) {
        const b = el('button', 'chip', texto);
        b.type = 'button'; b.dataset.k = k; b.dataset.v = clave;
        b.setAttribute('aria-pressed', String(f[k].has(clave)));
        b.onclick = () => {
          f[k].has(clave) ? f[k].delete(clave) : f[k].add(clave);
          b.setAttribute('aria-pressed', String(f[k].has(clave)));
          pintar();
        };
        g.append(b);
      }
    }
    $('#q').value = f.q;
    $('#q').oninput = (e) => { f.q = e.target.value.trim().toLowerCase(); pintar(); };
    $('#solo-listos').checked = f.listos;
    $('#solo-listos').onchange = (e) => { f.listos = e.target.checked; pintar(); };
    $('#limpiar').onclick = () => {
      f.q = ''; f.listos = false; for (const k of Object.keys(OPCIONES)) f[k].clear();
      $('#q').value = ''; $('#solo-listos').checked = false;
      document.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      pintar();
    };
  }

  leerHash();
  montarFiltros();
  fetch('/api/juegos').then((r) => r.json()).then((d) => { juegos = d; pintar(); })
    .catch(() => { $('#cuenta').textContent = 'No se pudo cargar el catálogo.'; });
})();
