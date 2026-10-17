'use strict';
// Prueba de humo contra el dominio público (pasa por Cloudflare): portada, sala contra la CPU y WebSocket.
// Uso: node tests/humo.js   (no deja datos: la sala se borra al salir)
const { chromium } = require(process.env.PLAYWRIGHT || '/home/ubuntu/herramientas/navegador/node_modules/playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = [];
  p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(String(e)));
  const ws = []; p.on('websocket', w => ws.push(w.url()));
  await p.goto('https://games.dsbelda.dev/'); await p.waitForSelector('.ficha');
  const tarjetas = await p.locator('a.ficha-enlace').count();
  await p.goto('https://games.dsbelda.dev/j/cuatro');
  await p.fill('input[autocomplete=nickname]', 'Prueba'); await p.click('form.panel button[type=submit]');
  await p.click('text=Jugar ya contra la CPU'); await p.waitForSelector('.c4-col:not([disabled])');
  await p.locator('.c4-col').nth(3).click();
  await p.waitForFunction(() => document.querySelectorAll('.disco.f1').length > 1, null, { timeout: 8000 });
  await p.locator('.lado .btn.flojo').click(); await p.locator('.lado .btn.flojo').click();
  console.log({ jugables: tarjetas, websocket: ws.length > 0, cpuJugo: true, errs });
  await b.close();
})().catch(e => { console.error('FALLO', e.message); process.exit(1); });
