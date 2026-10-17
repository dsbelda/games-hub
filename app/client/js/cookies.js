'use strict';
// Consentimiento de cookies.
// Hoy solo hay cookies y almacenamiento TÉCNICOS (exentos, art. 22.2 LSSI): no se muestra ningún aviso.
// Para añadir publicidad o analítica: declarar su categoría en CATEGORIAS, subir VERSION y cargar el script
// de terceros SOLO si Cookies.permitido('publicidad') (y al recibir el evento «cookies-cambiadas»).
// Entonces aparece el aviso con «Aceptar» y «Rechazar» igual de visibles, como pide la AEPD (guía de 2023).
(() => {
  const VERSION = 1;
  const CATEGORIAS = [
    // { id: 'publicidad', nombre: 'Publicidad', texto: 'Anuncios de Google AdSense. Pueden usar cookies para medir y personalizar anuncios.' },
  ];
  const CLAVE = 'games:cookies';
  const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE)); } catch (e) { return null; } };
  const guardar = (eleccion) => {
    try { localStorage.setItem(CLAVE, JSON.stringify({ v: VERSION, eleccion, fecha: new Date().toISOString() })); } catch (e) { /* sin almacenamiento: se volverá a preguntar */ }
    document.dispatchEvent(new CustomEvent('cookies-cambiadas', { detail: eleccion }));
  };
  const decision = () => { const d = leer(); return d && d.v === VERSION ? d : null; };
  const todas = (valor) => Object.fromEntries(CATEGORIAS.map((c) => [c.id, valor]));
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const boton = (txt, fn, cls = '') => { const b = el('button', 'btn ' + cls, txt); b.type = 'button'; b.onclick = fn; return b; };

  let banner = null;
  function quitarBanner() { if (banner) { banner.remove(); banner = null; } }
  function mostrarBanner() {
    if (!CATEGORIAS.length || decision() || banner) return;
    banner = el('section', 'cookies-banner');
    banner.setAttribute('aria-label', 'Aviso de cookies');
    const p = el('p');
    p.append('Usamos cookies técnicas para que los juegos funcionen y, si nos dejas, otras para ' + CATEGORIAS.map((c) => c.nombre.toLowerCase()).join(' y ') + '. ');
    const a = el('a', null, 'Más información'); a.href = '/legal/cookies'; p.append(a, '.');
    const fila = el('div', 'fila');
    fila.append(
      boton('Aceptar', () => { guardar(todas(true)); quitarBanner(); }),
      boton('Rechazar', () => { guardar(todas(false)); quitarBanner(); }),
      boton('Configurar', () => panel(), 'flojo'),
    );
    banner.append(p, fila);
    document.body.append(banner);
  }

  function panel() {
    const previo = document.activeElement;
    const fondo = el('div', 'cookies-fondo');
    const caja = el('section', 'caja cookies-panel');
    caja.setAttribute('role', 'dialog'); caja.setAttribute('aria-modal', 'true'); caja.setAttribute('aria-labelledby', 'cookies-titulo');
    const h = el('h2', null, 'Configurar cookies'); h.id = 'cookies-titulo';
    const cuerpo = el('div', 'caja-in');
    const tecnicas = el('div', 'cookies-cat');
    const lt = el('label', 'check'); const ct = el('input'); ct.type = 'checkbox'; ct.checked = true; ct.disabled = true;
    lt.append(ct, ' Técnicas (siempre activas)');
    tecnicas.append(lt, el('p', 'suave', 'Necesarias para que funcionen las salas y para recordar tu apodo, tus récords y esta elección. No sirven para seguirte.'));
    cuerpo.append(tecnicas);
    const actual = decision()?.eleccion || {};
    const casillas = {};
    for (const c of CATEGORIAS) {
      const d = el('div', 'cookies-cat');
      const l = el('label', 'check'); const i = el('input'); i.type = 'checkbox'; i.checked = !!actual[c.id]; casillas[c.id] = i;
      l.append(i, ' ' + c.nombre);
      d.append(l, el('p', 'suave', c.texto));
      cuerpo.append(d);
    }
    if (!CATEGORIAS.length) cuerpo.append(el('p', null, 'Ahora mismo no usamos cookies de publicidad, de analítica ni de terceros, así que no hay nada que activar o desactivar.'));
    const fila = el('div', 'fila');
    const cerrar = () => { fondo.remove(); document.removeEventListener('keydown', tecla); previo?.focus?.(); };
    const tecla = (e) => { if (e.key === 'Escape') cerrar(); };
    if (CATEGORIAS.length) {
      fila.append(
        boton('Aceptar todas', () => { guardar(todas(true)); quitarBanner(); cerrar(); }),
        boton('Rechazar todas', () => { guardar(todas(false)); quitarBanner(); cerrar(); }),
        boton('Guardar mi elección', () => { guardar(Object.fromEntries(CATEGORIAS.map((c) => [c.id, casillas[c.id].checked]))); quitarBanner(); cerrar(); }, 'flojo'),
      );
    } else fila.append(boton('Cerrar', cerrar));
    const mas = el('p'); const a = el('a', null, 'Política de cookies'); a.href = '/legal/cookies'; mas.append(a);
    cuerpo.append(fila, mas);
    caja.append(h, cuerpo);
    fondo.append(caja);
    fondo.onclick = (e) => { if (e.target === fondo) cerrar(); };
    document.addEventListener('keydown', tecla);
    document.body.append(fondo);
    fila.querySelector('button').focus();
  }

  window.Cookies = { permitido: (id) => !!decision()?.eleccion?.[id], panel };
  document.addEventListener('click', (e) => { if (e.target.closest('[data-cookies-panel]')) { e.preventDefault(); panel(); } });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mostrarBanner); else mostrarBanner();
})();
