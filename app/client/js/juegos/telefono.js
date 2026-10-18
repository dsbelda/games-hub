'use strict';
// Teléfono dibujado: escribir → dibujar → describir… y al final se repasan las cadenas una a una.
// Lo que se escribe o dibuja se guarda solo cada poco (si se acaba el tiempo, cuenta lo guardado).
(() => {
  const { el, boton } = UI;
  let cache = null;
  function crearPaso(v, ctx) {
    const caja = el('div', 'tf-paso');
    let t = null;
    const guardar = (datos, ya) => { clearTimeout(t); if (ya) return ctx.enviar({ tipo: 'guardar', ...datos }); t = setTimeout(() => ctx.enviar({ tipo: 'guardar', ...datos }), 1200); };
    let datos = () => ({});
    if (v.tipo === 'dibujo') {
      caja.append(el('p', 'tf-consigna', 'Dibuja esto:'), el('div', 'tf-frase', `«${v.anterior?.frase || '…'}»`));
      const pz = Pizarra.crear(v.mio || [], (tr) => guardar({ trazos: tr }));
      const marco = el('div', 'dj-marco'); marco.append(pz.lienzo);
      caja.append(marco, pz.herramientas);
      datos = () => ({ trazos: pz.trazos });
    } else {
      if (v.tipo === 'describir') { caja.append(el('p', 'tf-consigna', '¿Qué han dibujado? Descríbelo en una frase:')); const m = el('div', 'dj-marco'); m.append(Pizarra.dibujo(v.anterior?.trazos)); caja.append(m); }
      else caja.append(el('p', 'tf-consigna', 'Escribe una frase para que otro la dibuje (cuanto más loca, mejor):'));
      const i = el('input', 'tf-input'); i.maxLength = 80; i.value = v.mio || ''; i.placeholder = v.tipo === 'frase' ? 'Un pulpo jugando al mus en la playa' : 'Yo veo…';
      i.oninput = () => guardar({ frase: i.value });
      i.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); listo.click(); } };
      caja.append(i);
      datos = () => ({ frase: i.value });
      requestAnimationFrame(() => i.focus());
    }
    const listo = boton('¡Listo!', async () => { clearTimeout(t); await ctx.enviar({ tipo: 'listo', ...datos() }); }, 'oro');
    caja.append(listo);
    return { paso: v.paso, caja, listo };
  }
  window.JUEGO = {
    render(zona, v, ctx) {
      const yo = ctx.yo;
      const cab = el('div', 'fi-cab');
      if (v.fase === 'jugar') {
        const reloj = el('span', 'fi-reloj'); reloj.dataset.cuentaAtras = v.hasta; reloj.dataset.texto = '⏱ {s} s';
        cab.append(el('span', 'etiqueta', `Paso ${v.paso + 1}/${v.pasos}`), reloj);
        const listos = el('div', 'fi-marcador'); v.listos.forEach((l, j) => listos.append(el('span', l ? 'acierto' : '', `${l ? '✔ ' : '✏️ '}${ctx.nombre(j)}`)));
        zona.append(cab);
        if (yo < 0) { zona.append(el('p', 'turno', 'Están jugando… mira cómo acaba en el repaso')); zona.append(listos); return; }
        if (!cache || cache.paso !== v.paso) cache = crearPaso(v, ctx);
        cache.listo.textContent = v.listos[yo] ? 'Cambiar' : '¡Listo!';
        cache.caja.classList.toggle('hecho', v.listos[yo]);
        zona.append(el('p', 'turno' + (v.listos[yo] ? '' : ' mio'), v.listos[yo] ? 'Esperando a los demás… (puedes cambiarlo)' : v.tipo === 'frase' ? 'Escribe tu frase' : v.tipo === 'dibujo' ? '¡A dibujar!' : '¿Qué es?'), cache.caja, listos);
        return;
      }
      // repaso: la cadena que se está enseñando
      cache = null;
      const r = v.revela;
      cab.append(el('span', 'etiqueta', `Cadena ${r.c + 1}/${v.n}`), el('span', null, `empezó ${ctx.nombre(r.autor)}`));
      const lista = el('div', 'tf-cadena');
      r.items.forEach((it, k) => {
        const p = el('div', 'tf-item' + (k === r.items.length - 1 ? ' nuevo' : ''));
        p.append(el('small', null, `${ctx.nombre(it.j)} ${it.tipo === 'dibujo' ? 'dibujó' : k === 0 ? 'escribió' : 'creyó ver'}:`));
        if (it.tipo === 'dibujo') p.append(Pizarra.dibujo(it.trazos, 'peque')); else p.append(el('div', 'tf-frase', `«${it.frase}»`));
        lista.append(p);
      });
      const ultima = r.k === v.n - 1;
      const sig = boton(ultima ? (r.c === v.n - 1 ? 'Terminar' : 'Siguiente cadena') : 'Ver el siguiente', () => ctx.enviar({ tipo: 'siguiente' }), 'oro');
      const f = el('div', 'fila centro'); if (yo >= 0 && !v.terminado) f.append(sig);
      zona.append(cab, lista, f);
      requestAnimationFrame(() => lista.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    },
  };
})();
