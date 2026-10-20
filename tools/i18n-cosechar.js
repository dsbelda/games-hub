#!/usr/bin/env node
'use strict';
// Abre las páginas del portal en Chromium y recoge lo que se ve: textos sueltos, atributos y bloques con
// etiquetas dentro (con su innerHTML exacto, para traducir párrafos con <b> o <a> enteros). Añade a i18n/base.json.
const fs = require('fs'), path = require('path');
const { chromium } = require('/home/ubuntu/herramientas/navegador/node_modules/playwright');
const { start } = require('../server');
const RAIZ = path.join(__dirname, '..');
(async () => {
  const { server, io, port } = await start({ port: 0, baseDatos: ':memory:' });
  const base = `http://127.0.0.1:${port}`;
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const hallado = new Map();
  const cosecha = () => p.evaluate(() => {
    const out = [];
    // bloques de texto con etiquetas en línea dentro (se traducen enteros, con su innerHTML)
    const TEXTO = new Set(['P', 'LI', 'TD', 'TH', 'H1', 'H2', 'H3', 'H4', 'SUMMARY', 'DD', 'DT', 'BLOCKQUOTE', 'LABEL']);
    const EN_LINEA = new Set(['A', 'B', 'EM', 'I', 'STRONG', 'SPAN', 'CODE', 'SMALL', 'BR', 'KBD', 'U']);
    const norm = (t) => t.replace(/\s+/g, ' ').trim();
    const propio = (e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.data).join('');
    const esBloque = (e) => TEXTO.has(e.tagName) && e.children.length && [...e.children].every((c) => EN_LINEA.has(c.tagName)) && /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3}/.test(propio(e)) && /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(e.textContent);
    const visitar = (e) => {
      if (['SCRIPT', 'STYLE', 'svg', 'CANVAS', 'NOSCRIPT'].includes(e.tagName)) return;
      for (const a of ['placeholder', 'title', 'aria-label', 'alt']) if (e.getAttribute(a)) out.push(['t', norm(e.getAttribute(a))]);
      if (esBloque(e)) { out.push(['h', norm(e.innerHTML)]); return; }
      for (const n of e.childNodes) { if (n.nodeType === 3) out.push(['t', norm(n.data)]); else if (n.nodeType === 1) visitar(n); }
    };
    visitar(document.body);
    out.push(['t', norm(document.title)]);
    const m = document.querySelector('meta[name=description]'); if (m) out.push(['t', norm(m.content)]);
    return out;
  });
  const paginas = ['/', '/cuenta', '/legal/aviso', '/legal/privacidad', '/legal/cookies', '/j/brisca', '/j/palabra', '/no-existe'];
  for (const ruta of paginas) {
    await p.goto(base + ruta); await p.waitForTimeout(900);
    for (const [tipo, t] of await cosecha()) if (t && t.length > 1 && /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(t)) hallado.set(tipo + '|' + t, ruta);
  }
  // pulsaciones típicas para ver lo que sale después (filtros, ventana de entrar…)
  await p.goto(base + '/'); await p.waitForTimeout(600);
  for (const sel of ['.top .btn.sol', 'button:has-text("Crear cuenta")', 'button:has-text("¿Has olvidado")']) { await p.locator(sel).first().click().catch(() => {}); await p.waitForTimeout(300); for (const [tipo, t] of await cosecha()) if (t && /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(t)) hallado.set(tipo + '|' + t, 'ventana'); }
  await b.close(); io.close(); server.close();
  const f = path.join(RAIZ, 'i18n/base.json');
  const base0 = JSON.parse(fs.readFileSync(f, 'utf8'));
  let nuevos = 0;
  for (const [k, ruta] of hallado) { const [tipo, ...r] = k.split('|'); const t = r.join('|'); const clave = tipo === 'h' ? `<h>${t}` : t; if (!(clave in base0)) { base0[clave] = [`html:${ruta}`]; nuevos++; } }
  fs.writeFileSync(f, JSON.stringify(Object.fromEntries(Object.entries(base0).sort(([a], [b]) => a.localeCompare(b, 'es'))), null, 1));
  console.log(`${hallado.size} textos de páginas, ${nuevos} nuevos; total ${Object.keys(base0).length}`);
  process.exit(0);
})();
