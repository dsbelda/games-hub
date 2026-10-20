'use strict';
// Traductor de la interfaz (castellano → inglés / francés). El código sigue escrito en castellano: este script
// traduce el DOM, los atributos visibles y el texto de los lienzos con un diccionario (i18n/en.json, fr.json).
// Textos con {0}, {1}… (variables) se traducen con plantillas; los bloques con etiquetas internas, por su HTML.
(function () {
  const IDIOMAS = { es: 'Español', en: 'English', fr: 'Français' };
  const V = (document.querySelector('meta[name="v"]') || {}).content || '';
  let lang = 'es';
  try { lang = localStorage.getItem('games:lang') || ''; } catch (e) { /* nada */ }
  if (!IDIOMAS[lang]) {
    const n = (navigator.languages && navigator.languages[0]) || navigator.language || 'es';
    const c = String(n).slice(0, 2).toLowerCase();
    lang = c === 'es' ? 'es' : c === 'fr' ? 'fr' : 'en';
  }
  document.documentElement.lang = lang;
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const esc = (t) => t.replace(/[.*+?^$()|[\]\\]/g, '\\$&');

  let dic = null, plantillas = [];
  if (lang !== 'es') {
    try {
      const x = new XMLHttpRequest();
      x.open('GET', `/i18n/${lang}.json?v=${V}`, false); // síncrono: así no se ve el castellano un instante
      x.send();
      if (x.status === 200) dic = JSON.parse(x.responseText);
    } catch (e) { /* sin diccionario: se queda en castellano */ }
  }
  if (dic) {
    plantillas = Object.keys(dic).filter((k) => /\{[0-9s]\}/.test(k) && !k.startsWith('<h>'))
      .sort((a, b) => b.replace(/\{[0-9s]\}/g, '').length - a.replace(/\{[0-9s]\}/g, '').length)
      .map((k) => [new RegExp('^' + esc(k).replace(/\{[0-9s]\}/g, '(.+?)') + '$'), dic[k]]);
  }

  const memo = new Map();
  function T(s) {
    if (!dic || typeof s !== 'string' || !s) return s;
    const k = norm(s);
    if (!k || !/[A-Za-zÁ-ÿ¿¡]{2}/.test(k)) return s;
    let r = memo.get(k);
    if (r === undefined) {
      r = dic[k];
      if (r === undefined) {
        for (const [re, tr] of plantillas) {
          const m = re.exec(k);
          if (m) { r = tr.replace(/\{(\d|s)\}/g, (_, i) => { const g = m[(i === 's' ? 1 : +i + 1)]; return g === undefined ? '' : T(g); }); break; }
        }
      }
      if (r === undefined) r = k === s ? s : null; // null = sin traducción (conserva el original)
      if (memo.size > 6000) memo.clear();
      memo.set(k, r);
    }
    return r === null || r === s || r === undefined ? s : r;
  }

  const SALTAR = /^(SCRIPT|STYLE|TEXTAREA|CODE|PRE|NOSCRIPT|SVG)$/;
  const ATRIBUTOS = ['placeholder', 'title', 'aria-label', 'alt'];
  function texto(n) {
    const v = n.nodeValue; if (!v || !v.trim()) return;
    const lead = v.match(/^\s*/)[0], trail = v.match(/\s*$/)[0];
    const t = T(v);
    if (t !== v) { const nuevo = lead + t + trail; if (nuevo !== v) n.nodeValue = nuevo; }
  }
  function atributos(e) {
    for (const a of ATRIBUTOS) { const v = e.getAttribute && e.getAttribute(a); if (v) { const t = T(v); if (t !== v) e.setAttribute(a, t); } }
    if (e.tagName === 'INPUT' && /^(button|submit)$/.test(e.type) && e.value) { const t = T(e.value); if (t !== e.value) e.value = t; }
  }
  function recorre(raiz) {
    if (raiz.nodeType === 3) { texto(raiz); return; }
    if (raiz.nodeType !== 1 || SALTAR.test(raiz.tagName) || raiz.closest && raiz.closest('[data-no-i18n]')) return;
    atributos(raiz);
    // bloque con etiquetas dentro: se busca por su HTML completo
    if (raiz.children.length && raiz.innerHTML.length < 2500) {
      const h = dic['<h>' + norm(raiz.innerHTML)];
      if (h !== undefined) { raiz.innerHTML = h; return; }
    }
    for (let n = raiz.firstChild; n; n = n.nextSibling) recorre(n);
  }

  function traducirPagina() {
    if (!dic) return;
    const d = document.title; const t = T(d); if (t !== d) document.title = t;
    for (const m of document.querySelectorAll('meta[name="description"],meta[property="og:description"],meta[property="og:title"]')) { const c = m.content; const r = T(c); if (r !== c) m.content = r; }
    recorre(document.body);
  }

  if (dic) {
    // lienzos: los juegos dibujan texto con fillText
    const P = CanvasRenderingContext2D.prototype;
    for (const f of ['fillText', 'strokeText', 'measureText']) {
      const o = P[f];
      P[f] = function (t, ...r) { return o.call(this, typeof t === 'string' ? T(t) : t, ...r); };
    }
    traducirPagina();
    new MutationObserver((ms) => {
      for (const m of ms) {
        if (m.type === 'characterData') texto(m.target);
        else if (m.type === 'attributes') atributos(m.target);
        else for (const n of m.addedNodes) recorre(n);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATRIBUTOS });
  }

  // botón de idioma en la cabecera
  function boton() {
    const barra = document.querySelector('.top .envoltura');
    if (!barra || barra.querySelector('.idioma-btn')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tema-btn idioma-btn';
    b.textContent = lang.toUpperCase(); b.setAttribute('data-no-i18n', '');
    b.setAttribute('aria-label', 'Idioma / Language / Langue: ' + IDIOMAS[lang]); b.title = b.getAttribute('aria-label');
    b.onclick = () => {
      const orden = Object.keys(IDIOMAS), sig = orden[(orden.indexOf(lang) + 1) % orden.length];
      try { localStorage.setItem('games:lang', sig); } catch (e) { /* nada */ }
      location.reload();
    };
    barra.insertBefore(b, barra.querySelector('.tema-btn') || barra.querySelector('.cuenta-hueco') || null);
  }
  boton();
  document.addEventListener('DOMContentLoaded', boton);

  window.I18N = { lang, T, idiomas: IDIOMAS };
})();
