'use strict';
// Común a todas las páginas: cuenta (cabecera, ventana de entrar/crear), avisos, confeti, animaciones de
// aparición e inclinación de tarjetas, y el atajo «/» para buscar.
(() => {
  const V = document.querySelector('meta[name=v]')?.content || '';
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const leer = (k, def) => { try { const v = localStorage.getItem('games:' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } };
  const guardar = (k, v) => { try { localStorage.setItem('games:' + k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
  const avatarUrl = (n) => `/img/avatares/${Number(n) || 0}.svg?v=${V}`;
  const post = (url, cuerpo) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo || {}) })
    .then((r) => r.json()).catch(() => ({ ok: false, error: 'Sin conexión con el servidor' }));

  // --- avisos -------------------------------------------------------------------------------------
  let pilaAvisos = null;
  function aviso(texto, tipo = '') {
    if (!pilaAvisos) { pilaAvisos = el('div', 'avisos'); pilaAvisos.setAttribute('role', 'status'); pilaAvisos.setAttribute('aria-live', 'polite'); document.body.append(pilaAvisos); }
    const t = el('div', 'aviso-item ' + tipo, texto);
    pilaAvisos.append(t);
    while (pilaAvisos.children.length > 3) pilaAvisos.firstChild.remove(); // como mucho 3 a la vez
    setTimeout(() => { t.classList.add('sale'); setTimeout(() => t.remove(), 300); }, 3200);
  }
  // un aviso que debe verse tras recargar la página (p. ej. «Has entrado»)
  try { const p = sessionStorage.getItem('games:aviso'); if (p) { sessionStorage.removeItem('games:aviso'); setTimeout(() => aviso(p, 'bien'), 300); } } catch (e) { /* nada */ }
  const avisoTrasRecargar = (t) => { try { sessionStorage.setItem('games:aviso', t); } catch (e) { /* nada */ } };

  // --- confeti en píxeles -----------------------------------------------------------------------------
  function confeti(n = 120) {
    if (quieto) return;
    const c = el('canvas', 'confeti');
    c.width = innerWidth; c.height = innerHeight;
    document.body.append(c);
    const g = c.getContext('2d');
    const colores = ['#ff5a36', '#18b39b', '#ffc63d', '#4d7cfe', '#8a5cf6', '#ff6fa8'];
    const ps = Array.from({ length: n }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .35, vx: (Math.random() - .5) * 16, vy: -Math.random() * 14 - 4, t: 4 + Math.floor(Math.random() * 3) * 2, c: colores[Math.floor(Math.random() * colores.length)] }));
    let f = 0;
    (function paso() {
      g.clearRect(0, 0, c.width, c.height);
      for (const p of ps) { p.vy += .45; p.vx *= .99; p.x += p.vx; p.y += p.vy; g.fillStyle = p.c; g.fillRect(Math.round(p.x / 2) * 2, Math.round(p.y / 2) * 2, p.t, p.t); }
      if (++f < 150) requestAnimationFrame(paso); else c.remove();
    })();
  }

  // --- cuenta ----------------------------------------------------------------------------------------
  let estado = null;
  const cargarCuenta = () => (estado ||= fetch('/api/cuenta', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ usuario: null })));

  function pintarCabecera(c) {
    const barra = document.querySelector('.top .envoltura');
    if (!barra) return;
    let hueco = barra.querySelector('.cuenta-hueco');
    if (!hueco) { hueco = el('div', 'cuenta-hueco'); barra.append(hueco); }
    hueco.replaceChildren();
    if (c.usuario) {
      const a = el('a', 'cuenta-chip'); a.href = '/cuenta'; a.title = 'Tu cuenta';
      const img = el('img', 'px'); img.src = avatarUrl(c.usuario.avatar); img.alt = ''; img.width = 32; img.height = 32;
      a.append(img, el('span', null, c.usuario.nombre));
      hueco.append(a);
    } else {
      const b = el('button', 'btn sol mini', 'Entrar'); b.type = 'button'; b.onclick = () => ventanaCuenta('entrar');
      hueco.append(b);
    }
  }

  // fuerza aproximada de la contraseña: 0 a 4
  function fuerza(c) {
    let f = 0;
    if (c.length >= 8) f++;
    if (c.length >= 12) f++;
    if (/[a-zñ]/.test(c) && /[A-ZÑ]/.test(c)) f++;
    if (/\d/.test(c) && /[^A-Za-z0-9ñÑ]/.test(c)) f++;
    return Math.min(f, 4);
  }

  function ventanaCuenta(modo = 'entrar') {
    const d = el('dialog', 'modal caja');
    d.setAttribute('aria-labelledby', 'modal-titulo');
    const cab = el('div', 'modal-cab');
    const h = el('h2', null); h.id = 'modal-titulo';
    const cerrar = el('button', 'modal-x', '×'); cerrar.type = 'button'; cerrar.setAttribute('aria-label', 'Cerrar'); cerrar.onclick = () => d.close();
    cab.append(h, cerrar);
    const pestanas = el('div', 'modal-pestanas');
    const pe = el('button', null, 'Entrar'), pc = el('button', null, 'Crear cuenta');
    pe.type = pc.type = 'button';
    pestanas.append(pe, pc);
    const f = el('form', 'caja-in modal-form');
    const campo = (etq, tipo, auto) => {
      const l = el('label', 'campo'); l.append(el('span', null, etq));
      const i = el('input'); i.type = tipo; i.autocomplete = auto; i.required = true;
      l.append(i); return [l, i];
    };
    const [ln, iNombre] = campo('Usuario', 'text', 'username');
    iNombre.maxLength = 16; iNombre.autocapitalize = 'off'; iNombre.spellcheck = false;
    const [lc, iClave] = campo('Contraseña', 'password', 'current-password');
    iClave.maxLength = 200;
    const ver = el('button', 'ver-clave', 'Ver'); ver.type = 'button';
    ver.onclick = () => { const v = iClave.type === 'password'; iClave.type = v ? 'text' : 'password'; ver.textContent = v ? 'Ocultar' : 'Ver'; };
    lc.append(ver);
    const medidor = el('div', 'medidor'); for (let i = 0; i < 4; i++) medidor.append(el('i'));
    const medTxt = el('small', 'suave medidor-txt');
    const acepto = el('label', 'check acepto');
    const ca = el('input'); ca.type = 'checkbox';
    const enlaceNormas = el('a', null, 'normas'); enlaceNormas.href = '/legal/aviso'; enlaceNormas.target = '_blank';
    const enlacePriv = el('a', null, 'política de privacidad'); enlacePriv.href = '/legal/privacidad'; enlacePriv.target = '_blank';
    const ta = el('span'); ta.append('Acepto las ', enlaceNormas, ' y la ', enlacePriv);
    acepto.append(ca, ta);
    const nota = el('p', 'suave nota');
    const error = el('p', 'error'); error.setAttribute('role', 'alert');
    const enviar = el('button', 'btn primario ancho'); enviar.type = 'submit';
    f.append(ln, lc, medidor, medTxt, acepto, nota, error, enviar);
    d.append(cab, pestanas, f);

    const poner = (m) => {
      modo = m;
      const crear = m === 'crear';
      h.textContent = crear ? 'Crea tu cuenta' : 'Entra en tu cuenta';
      pe.setAttribute('aria-pressed', String(!crear)); pc.setAttribute('aria-pressed', String(crear));
      enviar.textContent = crear ? 'Crear cuenta' : 'Entrar';
      iClave.autocomplete = crear ? 'new-password' : 'current-password';
      medidor.hidden = medTxt.hidden = acepto.hidden = !crear;
      nota.textContent = crear
        ? 'Guarda tus partidas, victorias, récords y favoritos, y reserva tu nombre. Sin correo: apunta bien la contraseña, porque no se puede recuperar.'
        : '¿No tienes cuenta? Crea una en «Crear cuenta». También puedes jugar sin cuenta.';
      error.textContent = '';
    };
    pe.onclick = () => poner('entrar'); pc.onclick = () => poner('crear');
    iClave.oninput = () => {
      const n = fuerza(iClave.value);
      medidor.dataset.n = iClave.value ? n : 0;
      medTxt.textContent = !iClave.value ? '' : iClave.value.length < 8 ? 'Mínimo 8 caracteres' : ['Floja', 'Floja', 'Normal', 'Buena', '¡Muy buena!'][n];
    };
    f.onsubmit = async (e) => {
      e.preventDefault();
      error.textContent = '';
      enviar.disabled = true; enviar.classList.add('cargando');
      const r = await post(modo === 'crear' ? '/api/cuenta/registro' : '/api/cuenta/entrar', { nombre: iNombre.value.trim(), clave: iClave.value, acepto: ca.checked });
      enviar.disabled = false; enviar.classList.remove('cargando');
      if (!r.ok) { error.textContent = r.error || 'No se pudo'; d.classList.remove('temblor'); void d.offsetWidth; d.classList.add('temblor'); return; }
      avisoTrasRecargar(modo === 'crear' ? `¡Bienvenido/a, ${iNombre.value.trim()}! Tu cuenta está creada` : `Hola de nuevo, ${iNombre.value.trim()}`);
      location.reload(); // las salas (sockets) reconocen la cuenta al reconectar
    };
    d.addEventListener('close', () => d.remove());
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    document.body.append(d);
    poner(modo);
    d.showModal();
    iNombre.focus();
  }

  window.Cuenta = {
    cargar: cargarCuenta,
    ventana: ventanaCuenta,
    avatarUrl,
    post,
    async salir() { await post('/api/cuenta/salir'); avisoTrasRecargar('Has cerrado la sesión'); location.href = '/'; },
    // favoritos: con cuenta en el servidor; sin cuenta, en este navegador
    async favoritos() { const c = await cargarCuenta(); return new Set(c.usuario ? c.favoritos : leer('favoritos', [])); },
    async marcarFavorito(juego, on) {
      const c = await cargarCuenta();
      if (c.usuario) {
        const r = await post('/api/favorito', { juego, on });
        if (!r.ok) { aviso(r.error || 'No se pudo guardar', 'mal'); return false; }
        c.favoritos = on ? [...new Set([...c.favoritos, juego])] : c.favoritos.filter((x) => x !== juego);
      } else {
        const s = new Set(leer('favoritos', []));
        on ? s.add(juego) : s.delete(juego);
        guardar('favoritos', [...s]);
      }
      return true;
    },
    // récord de un juego en solitario: se guarda en la cuenta si hay sesión
    async record(juego, valor) { const c = await cargarCuenta(); if (c.usuario) post('/api/record', { juego, valor }); },
  };
  window.Avisar = aviso;
  window.Confeti = confeti;

  // --- animaciones -----------------------------------------------------------------------------------
  // aparición al entrar en pantalla (para elementos con la clase .aparece, también los que se añadan luego)
  const obs = 'IntersectionObserver' in window && !quieto ? new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) { e.target.classList.add('visto'); obs.unobserve(e.target); }
  }, { rootMargin: '0px 0px -40px 0px' }) : null;
  window.Aparecer = (lista) => {
    let i = 0;
    for (const e of lista) {
      if (!obs) { e.classList.add('visto'); continue; }
      e.classList.add('aparece');
      e.style.setProperty('--retraso', `${Math.min(i++, 8) * 45}ms`);
      obs.observe(e);
    }
  };
  // inclinación 3D de las tarjetas al pasar el ratón (no en pantallas táctiles)
  if (!quieto && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.addEventListener('pointermove', (e) => {
      const t = e.target.closest?.('.inclina');
      document.querySelectorAll('.inclina.inclinada').forEach((x) => { if (x !== t) { x.classList.remove('inclinada'); x.style.removeProperty('--rx'); x.style.removeProperty('--ry'); } });
      if (!t) return;
      const r = t.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      t.classList.add('inclinada');
      t.style.setProperty('--rx', `${(-py * 8).toFixed(2)}deg`);
      t.style.setProperty('--ry', `${(px * 10).toFixed(2)}deg`);
      t.style.setProperty('--bx', `${((px + .5) * 100).toFixed(0)}%`);
      t.style.setProperty('--by', `${((py + .5) * 100).toFixed(0)}%`);
    });
  }
  // «/» para buscar
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.target.closest('input, textarea, select, [contenteditable]')) {
      const q = document.getElementById('q');
      if (q) { e.preventDefault(); q.focus(); q.select(); }
    }
  });

  // --- tema claro / oscuro --------------------------------------------------------------------------
  const SOL = '<svg class="sol-i" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor"><rect x="6" y="5" width="4" height="6"/><rect x="5" y="6" width="6" height="4"/><rect x="7" y="0" width="2" height="3"/><rect x="7" y="13" width="2" height="3"/><rect x="0" y="7" width="3" height="2"/><rect x="13" y="7" width="3" height="2"/><rect x="2" y="2" width="2" height="2"/><rect x="12" y="2" width="2" height="2"/><rect x="2" y="12" width="2" height="2"/><rect x="12" y="12" width="2" height="2"/></svg>';
  const LUNA = '<svg class="luna" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor"><rect x="5" y="1" width="5" height="2"/><rect x="3" y="3" width="4" height="2"/><rect x="2" y="5" width="4" height="6"/><rect x="3" y="11" width="5" height="2"/><rect x="5" y="13" width="7" height="2"/><rect x="8" y="11" width="6" height="2"/><rect x="12" y="9" width="2" height="2"/><rect x="11" y="3" width="1" height="1"/><rect x="13" y="5" width="1" height="1"/></svg>';
  function botonTema() {
    const barra = document.querySelector('.top .envoltura');
    if (!barra || barra.querySelector('.tema-btn')) return;
    const b = el('button', 'tema-btn'); b.type = 'button';
    b.innerHTML = SOL + LUNA;
    const etiqueta = () => { const o = document.documentElement.dataset.tema === 'oscuro'; b.setAttribute('aria-label', o ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'); b.title = b.getAttribute('aria-label'); };
    etiqueta();
    b.onclick = () => {
      const raizDoc = document.documentElement;
      const nuevo = raizDoc.dataset.tema === 'oscuro' ? 'claro' : 'oscuro';
      const aplicar = () => {
        raizDoc.dataset.tema = nuevo;
        try { localStorage.setItem('games:tema', nuevo); } catch (e) { /* nada */ }
        const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = nuevo === 'oscuro' ? '#14121e' : '#fbf7ee';
        etiqueta();
      };
      b.classList.remove('gira'); void b.offsetWidth; b.classList.add('gira');
      if (document.startViewTransition && !quieto) {
        const r = b.getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        raizDoc.style.setProperty('--tx', `${x}px`); raizDoc.style.setProperty('--ty', `${y}px`);
        raizDoc.style.setProperty('--tr', `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px`);
        document.startViewTransition(aplicar);
      } else {
        raizDoc.classList.add('cambiando-tema'); aplicar();
        setTimeout(() => raizDoc.classList.remove('cambiando-tema'), 450);
      }
    };
    const hueco = barra.querySelector('.cuenta-hueco');
    barra.insertBefore(b, hueco || null);
  }
  botonTema();

  cargarCuenta().then((c) => { pintarCabecera(c); botonTema(); });
})();
