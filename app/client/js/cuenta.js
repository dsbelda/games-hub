'use strict';
// Página /cuenta: perfil, avatar, estadísticas, récords, favoritos, contraseña y datos (descargar / borrar).
(() => {
  const raiz = document.getElementById('perfil');
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const boton = (txt, fn, cls = '') => { const b = el('button', 'btn ' + cls, txt); b.type = 'button'; b.onclick = fn; return b; };
  const V = document.querySelector('meta[name=v]')?.content || '';
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RECORDS = [['serpiente', 'Serpiente', 'puntos'], ['2048', '2048', 'puntos'], ['memoria-facil', 'Memoria 4×4', 'intentos'], ['memoria-medio', 'Memoria 6×4', 'intentos'], ['memoria-dificil', 'Memoria 6×6', 'intentos']];
  const caja = (titulo, ...hijos) => { const c = el('section', 'caja'); const h = el('h2', null, titulo); const d = el('div', 'caja-in'); d.append(...hijos); c.append(h, d); return c; };
  // números que cuentan hacia arriba
  const contar = (nodo, fin) => {
    if (quieto || !fin) { nodo.textContent = fin; return; }
    const t0 = performance.now();
    (function paso(t) { const k = Math.min(1, (t - t0) / 700); nodo.textContent = Math.round(fin * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(paso); })(t0);
  };

  function sinCuenta() {
    const c = el('section', 'caja bienvenida');
    const d = el('div', 'caja-in');
    d.append(el('h1', null, 'Tu cuenta'),
      el('p', null, 'Con una cuenta se guardan tus partidas, victorias, récords y favoritos, y nadie más puede usar tu nombre. Es gratis, sin correo y opcional: puedes seguir jugando sin cuenta.'));
    const f = el('div', 'fila');
    f.append(boton('Crear cuenta', () => Cuenta.ventana('crear'), 'primario'), boton('Ya tengo cuenta', () => Cuenta.ventana('entrar')));
    d.append(f);
    c.append(d);
    raiz.replaceChildren(c);
  }

  function conCuenta(c, juegos) {
    const nombreDe = (id) => juegos.find((j) => j.id === id)?.nombre || id;
    const u = c.usuario;
    // cabecera del perfil
    const cab = el('section', 'perfil-cab caja');
    const av = el('button', 'perfil-avatar'); av.type = 'button'; av.title = 'Cambiar avatar';
    const avImg = el('img', 'px'); avImg.src = Cuenta.avatarUrl(u.avatar); avImg.alt = 'Tu avatar'; avImg.width = 96; avImg.height = 96;
    av.append(avImg, el('span', null, 'Cambiar'));
    const datos = el('div', 'perfil-datos');
    datos.append(el('span', 'etiqueta', 'Jugador/a'), el('h1', null, u.nombre), el('p', 'suave', `En dsbelda games desde el ${new Date(u.creado).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`));
    const acciones = el('div', 'fila');
    acciones.append(boton('Cerrar sesión', () => Cuenta.salir(), 'flojo'));
    datos.append(acciones);
    cab.append(av, datos);
    // selector de avatar
    const selector = el('div', 'selector-avatar'); selector.hidden = true;
    for (let i = 0; i < 12; i++) {
      const b = el('button', 'av-op'); b.type = 'button'; b.setAttribute('aria-pressed', String(i === u.avatar)); b.setAttribute('aria-label', `Avatar ${i + 1}`);
      const im = el('img', 'px'); im.src = Cuenta.avatarUrl(i); im.alt = ''; im.width = 48; im.height = 48;
      b.append(im);
      b.onclick = async () => {
        const r = await Cuenta.post('/api/cuenta/avatar', { avatar: i });
        if (!r.ok) return Avisar(r.error, 'mal');
        u.avatar = i; avImg.src = Cuenta.avatarUrl(i);
        document.querySelector('.cuenta-chip img')?.setAttribute('src', Cuenta.avatarUrl(i));
        selector.querySelectorAll('.av-op').forEach((x, k) => x.setAttribute('aria-pressed', String(k === i)));
        avImg.animate?.([{ transform: 'scale(.6) rotate(-10deg)' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.3,1.6,.5,1)' });
        Avisar('Avatar cambiado', 'bien');
      };
      selector.append(b);
    }
    av.onclick = () => { selector.hidden = !selector.hidden; };
    cab.append(selector);

    // resumen
    const total = c.estadisticas.reduce((s, x) => s + x.partidas, 0), gan = c.estadisticas.reduce((s, x) => s + x.victorias, 0);
    const resumen = el('div', 'resumen');
    for (const [etq, valor, color] of [['Partidas', total, 'sol'], ['Victorias', gan, 'menta'], ['% victorias', total ? Math.round(gan / total * 100) : 0, 'cielo'], ['Favoritos', c.favoritos.length, 'rosa']]) {
      const t = el('div', 'dato ' + color); const n = el('b', null, '0'); t.append(n, el('span', null, etq)); resumen.append(t);
      setTimeout(() => contar(n, valor), 150);
    }
    // estadísticas por juego
    const est = el('div', 'estadisticas');
    if (!c.estadisticas.length) est.append(el('p', 'suave', 'Todavía no has terminado ninguna partida con tu cuenta. ¡Ve a por la primera!'));
    for (const x of c.estadisticas) {
      const fila = el('div', 'est-fila');
      const pct = x.partidas ? Math.round(x.victorias / x.partidas * 100) : 0;
      const barra = el('div', 'barra'); const relleno = el('i'); barra.append(relleno);
      fila.append(el('b', null, nombreDe(x.juego)), el('span', 'suave', `${x.victorias} de ${x.partidas} ganadas`), barra, el('span', 'pct', `${pct} %`));
      est.append(fila);
      requestAnimationFrame(() => setTimeout(() => { relleno.style.width = pct + '%'; }, 100));
    }
    // récords
    const rec = el('div', 'records');
    for (const [id, nombre, unidad] of RECORDS) {
      const v = c.records[id];
      const t = el('div', 'record' + (v == null ? ' sin-record' : ''));
      t.append(el('span', null, nombre), el('b', null, v == null ? '—' : String(v)), el('small', 'suave', v == null ? 'sin récord' : unidad));
      rec.append(t);
    }
    // favoritos
    const fav = el('div', 'tira');
    for (const id of c.favoritos) {
      const j = juegos.find((x) => x.id === id); if (!j || j.estado !== 'listo') continue;
      const a = el('a', 'mini-juego'); a.href = j.url;
      const im = el('img', 'px'); im.src = `/img/juegos/${j.id}.svg?v=${V}`; im.alt = ''; im.width = 160; im.height = 120;
      a.append(im, el('span', null, j.nombre)); fav.append(a);
    }
    if (!fav.children.length) fav.append(el('p', 'suave', 'Pulsa el corazón de cualquier juego en la portada para tenerlo aquí.'));

    // contraseña
    const fc = el('form', 'form-cuenta');
    const campo = (etq, auto) => { const l = el('label', 'campo'); const i = el('input'); i.type = 'password'; i.autocomplete = auto; i.required = true; l.append(el('span', null, etq), i); return [l, i]; };
    const [l1, actual] = campo('Contraseña actual', 'current-password');
    const [l2, nueva] = campo('Nueva contraseña (mínimo 8)', 'new-password');
    const enviar = el('button', 'btn', 'Cambiar contraseña'); enviar.type = 'submit';
    fc.append(l1, l2, enviar);
    fc.onsubmit = async (e) => {
      e.preventDefault();
      const r = await Cuenta.post('/api/cuenta/clave', { actual: actual.value, nueva: nueva.value });
      if (!r.ok) return Avisar(r.error, 'mal');
      try { sessionStorage.setItem('games:aviso', 'Contraseña cambiada. Entra con la nueva'); } catch (x) { /* nada */ }
      location.reload();
    };
    // datos y baja
    const fd = el('div');
    const desc = el('a', 'btn', 'Descargar mis datos'); desc.href = '/api/cuenta/datos'; desc.download = 'mis-datos-dsbelda-games.json';
    fd.append(el('p', null, 'Puedes llevarte todo lo que guardamos de ti en un fichero, o borrar la cuenta para siempre (con tus estadísticas, récords y favoritos).'), desc);
    const fb = el('form', 'form-cuenta peligro');
    const [l3, claveB] = campo('Tu contraseña', 'current-password');
    const conf = el('label', 'check'); const cb = el('input'); cb.type = 'checkbox'; cb.required = true; conf.append(cb, ' Entiendo que no se puede deshacer');
    const borrar = el('button', 'btn rojo', 'Borrar mi cuenta'); borrar.type = 'submit';
    fb.append(l3, conf, borrar);
    fb.onsubmit = async (e) => {
      e.preventDefault();
      const r = await Cuenta.post('/api/cuenta/borrar', { clave: claveB.value });
      if (!r.ok) return Avisar(r.error, 'mal');
      try { sessionStorage.setItem('games:aviso', 'Tu cuenta se ha borrado. ¡Hasta pronto!'); } catch (x) { /* nada */ }
      location.href = '/';
    };
    fd.append(fb);

    const rejilla = el('div', 'perfil-rejilla');
    const col1 = el('div'), col2 = el('div');
    col1.append(caja('Tus partidas', resumen, est), caja('Récords', rec), caja('Favoritos', fav));
    col2.append(caja('Seguridad', fc), caja('Tus datos', fd));
    rejilla.append(col1, col2);
    raiz.replaceChildren(cab, rejilla);
    Aparecer(raiz.querySelectorAll('.caja'));
  }

  Promise.all([Cuenta.cargar(), fetch('/api/juegos').then((r) => r.json())])
    .then(([c, juegos]) => (c.usuario ? conCuenta(c, juegos) : sinCuenta()))
    .catch(() => { raiz.replaceChildren(el('p', 'suave', 'No se pudo cargar tu cuenta. Prueba a recargar.')); });
})();
