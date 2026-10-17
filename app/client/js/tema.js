'use strict';
// Se carga en <head>, antes de pintar: aplica el tema guardado (o el del sistema) para que no haya destello.
(() => {
  let t = null;
  try { t = localStorage.getItem('games:tema'); } catch (e) { /* sin almacenamiento */ }
  if (t !== 'claro' && t !== 'oscuro') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
  document.documentElement.dataset.tema = t;
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = t === 'oscuro' ? '#14121e' : '#fbf7ee';
})();
