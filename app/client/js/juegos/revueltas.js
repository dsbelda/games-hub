'use strict';
// Letras revueltas: arrastra el dedo por letras vecinas para formar palabras (o tócalas una a una y vuelve a
// tocar la última para enviar). El tablero se conserva entre repintados para no cortar un trazo a medias.
(() => {
  const { el, boton } = UI;
  const VALOR = { a: 1, e: 1, o: 1, i: 1, u: 1, s: 1, r: 1, n: 1, l: 1, t: 1, d: 2, g: 2, c: 3, m: 3, p: 3, b: 3, v: 4, f: 4, h: 4, y: 4, j: 8, ñ: 8, x: 8, z: 10 };
  const vecinas = (a, b) => a !== b && Math.abs((a % 4) - (b % 4)) <= 1 && Math.abs(Math.floor(a / 4) - Math.floor(b / 4)) <= 1;
  let cache = null, ctxActual = null;
  function crearTablero(v) {
    const caja = el('div', 'rv-tablero');
    const palabra = el('div', 'rv-palabra', ' ');
    const fichas = v.t.map((l, i) => { const f = el('div', 'rv-ficha'); f.dataset.i = i; f.append(el('b', null, l.toUpperCase()), el('small', null, VALOR[l] || 1)); caja.append(f); return f; });
    let ruta = [], arrastrando = false;
    const pintar = () => { fichas.forEach((f, i) => f.classList.toggle('sel', ruta.includes(i))); palabra.textContent = ruta.map((i) => v.t[i].toUpperCase()).join('') || ' '; };
    const fichaEn = (x, y) => { const t = document.elementFromPoint(x, y)?.closest('.rv-ficha'); if (!t) return -1; const r = t.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2; return Math.hypot(x - cx, y - cy) < r.width * 0.42 ? Number(t.dataset.i) : -1; };
    const anadir = (i) => {
      if (i < 0) return;
      if (ruta.length > 1 && ruta[ruta.length - 2] === i) { ruta.pop(); pintar(); return; } // volver atrás
      if (ruta.includes(i) || (ruta.length && !vecinas(ruta[ruta.length - 1], i))) return;
      ruta.push(i); pintar();
    };
    const enviar = async () => {
      const r = ruta; ruta = []; arrastrando = false;
      if (r.length < 3) { pintar(); return; }
      const w = r.map((i) => v.t[i]).join('');
      const res = await ctxActual.enviar({ tipo: 'palabra', ruta: r });
      palabra.textContent = w.toUpperCase(); palabra.className = 'rv-palabra ' + (res.ok ? 'bien' : 'mal');
      for (const i of r) { fichas[i].classList.add(res.ok ? 'bien' : 'mal'); setTimeout(() => fichas[i].classList.remove('bien', 'mal'), 450); }
      setTimeout(() => { palabra.className = 'rv-palabra'; pintar(); }, 600);
    };
    caja.addEventListener('pointerdown', (e) => {
      if (!caja.classList.contains('activo')) return;
      e.preventDefault();
      const i = fichaEn(e.clientX, e.clientY); if (i < 0) return;
      if (ruta.length && ruta[ruta.length - 1] === i && !arrastrando) { enviar(); return; } // tocar otra vez la última = enviar
      if (!ruta.length || !vecinas(ruta[ruta.length - 1], i) || ruta.includes(i)) ruta = [];
      arrastrando = true; caja.setPointerCapture(e.pointerId); anadir(i);
    });
    caja.addEventListener('pointermove', (e) => { if (arrastrando) anadir(fichaEn(e.clientX, e.clientY)); });
    const soltar = () => { if (!arrastrando) return; arrastrando = false; if (ruta.length >= 3) enviar(); };
    caja.addEventListener('pointerup', soltar); caja.addEventListener('pointercancel', soltar);
    return { ronda: v.ronda, caja, palabra, limpiar: () => { ruta = []; pintar(); } };
  }
  window.JUEGO = {
    evento(ev) {
      if (!cache || !ctxActual || ev.j !== ctxActual.yo) return;
      const f = el('span', 'rv-mas', `+${ev.p}`); cache.palabra.append(f); setTimeout(() => f.remove(), 900);
    },
    render(zona, v, ctx) {
      ctxActual = ctx;
      const yo = ctx.yo;
      const cab = el('div', 'fi-cab');
      const reloj = el('span', 'fi-reloj'); if (v.hasta) { reloj.dataset.cuentaAtras = v.hasta; reloj.dataset.texto = v.fase === 'jugar' ? '⏱ {s} s' : 'Siguiente en {s} s'; }
      cab.append(el('span', 'etiqueta', `Ronda ${v.ronda}/${v.rondas}`), reloj);
      const marcador = el('div', 'fi-marcador');
      v.puntos.forEach((p, j) => marcador.append(el('span', j === yo ? 'dibuja' : '', `${ctx.nombre(j)}: ${p}${v.fase === 'jugar' ? ` · ${v.cuantas[j]} pal.` : ''}`)));
      if (v.fase === 'jugar') {
        if (!cache || cache.ronda !== v.ronda) cache = crearTablero(v);
        cache.caja.classList.toggle('activo', yo >= 0);
        const mias = el('div', 'rv-mias');
        for (const w of [...v.mias].reverse()) mias.append(el('span', null, w));
        const cuerpo = el('div', 'rv-cuerpo');
        const izq = el('div', 'rv-izq'); izq.append(cache.palabra, cache.caja);
        const der = el('div', 'rv-der'); der.append(el('h3', null, `Tus palabras (${v.mias.length}) · ${v.ptsRonda[yo] || 0} puntos`), mias);
        cuerpo.append(izq, der);
        zona.append(cab, cuerpo, el('p', 'suave centro', 'Arrastra por letras vecinas (también en diagonal). O tócalas una a una y toca otra vez la última para enviar.'), marcador);
        return;
      }
      // resultado de la ronda: todas las palabras que había y quién encontró cada una
      cache = null;
      const r = v.resumen;
      const tab = el('div', 'rv-mini'); v.t.forEach((l) => tab.append(el('span', null, l.toUpperCase())));
      const lista = el('div', 'rv-todas');
      for (const [w, p, quien] of r.todas) {
        const s = el('span', quien.length ? (quien.includes(yo) ? 'mia' : 'otro') : '', w);
        s.title = `${p} puntos${quien.length ? ' · ' + quien.map(ctx.nombre).join(', ') : ' · nadie la vio'}`;
        if (quien.length && !quien.includes(yo)) s.append(el('small', null, ' ' + quien.map((j) => ctx.nombre(j).slice(0, 3)).join(' ')));
        lista.append(s);
      }
      const ronda = el('div', 'fi-marcador'); v.ptsRonda.forEach((p, j) => ronda.append(el('span', null, `${ctx.nombre(j)}: +${p} (${v.cuantas[j]})`)));
      zona.append(cab, el('h3', 'centro', `Había ${r.total} palabras · la más larga: «${r.mejor}»`), tab, ronda,
        el('p', 'suave centro', 'En verde las tuyas; con nombre, las de los demás; en gris, las que nadie vio.'), lista, marcador);
      if (v.fase === 'resultado' && yo >= 0) { const f = el('div', 'fila centro'); f.append(boton('Siguiente ronda ya', () => ctx.enviar({ tipo: 'seguir' }), 'oro')); zona.append(f); }
    },
  };
})();
