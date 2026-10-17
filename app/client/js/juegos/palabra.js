'use strict';
// Palabra del día: adivina la palabra de 5 letras en 6 intentos. La misma para todo el mundo cada día (hora de Madrid).
// Verde = letra en su sitio; amarillo = está pero en otro sitio; gris = no está. Sin tildes; la Ñ es una letra más.
window.JUEGO = {
  async montar(raiz) {
    const { el, boton } = UI;
    const V = document.querySelector('meta[name=v]')?.content || '';
    const [validasTxt, soluciones] = await Promise.all([
      fetch(`/data/palabras5.txt?v=${V}`).then((r) => r.text()),
      fetch(`/data/soluciones.json?v=${V}`).then((r) => r.json()),
    ]);
    const validas = new Set(validasTxt.split('\n'));
    // día de juego según la hora de Madrid; el n.º 1 es el 17/10/2026
    const hoyMadrid = () => { const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); return p; };
    const dia = hoyMadrid();
    const numero = Math.floor((Date.parse(dia + 'T00:00:00Z') - Date.parse('2026-10-17T00:00:00Z')) / 86400000) + 1;
    const solucion = soluciones[((numero - 1) % soluciones.length + soluciones.length) % soluciones.length];
    const norm = (s) => s.toLowerCase().replace(/ñ/g, '\0').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\0/g, 'ñ');

    const guardado = UI.leer('palabra:' + dia, { intentos: [], fin: false });
    const stats = UI.leer('palabra-stats', { jugadas: 0, ganadas: 0, racha: 0, mejor: 0, dist: [0, 0, 0, 0, 0, 0], ultimo: null });
    let actual = '';
    let bloqueo = false;

    const caja = el('div', 'solo palabra');
    const cab = el('p', 'marcador', `Palabra n.º ${numero}`);
    const rejilla = el('div', 'pal-rejilla');
    rejilla.setAttribute('aria-label', 'Intentos'); rejilla.setAttribute('role', 'grid');
    const filas = [];
    for (let f = 0; f < 6; f++) {
      const fila = el('div', 'pal-fila'); fila.setAttribute('role', 'row');
      const celdas = [];
      for (let c = 0; c < 5; c++) { const t = el('div', 'pal-celda'); t.setAttribute('role', 'gridcell'); fila.append(t); celdas.push(t); }
      rejilla.append(fila); filas.push({ fila, celdas });
    }
    const teclado = el('div', 'pal-teclado');
    const teclas = {};
    for (const linea of ['qwertyuiop', 'asdfghjklñ', '>zxcvbnm<']) {
      const l = el('div', 'pal-linea');
      for (const k of linea) {
        const b = el('button', 'pal-tecla' + (k === '>' || k === '<' ? ' ancha' : ''), k === '>' ? 'Enviar' : k === '<' ? '⌫' : k.toUpperCase());
        b.type = 'button';
        if (k === '<') b.setAttribute('aria-label', 'Borrar');
        b.onclick = () => pulsar(k === '>' ? 'Enter' : k === '<' ? 'Backspace' : k);
        if (k !== '>' && k !== '<') teclas[k] = b;
        l.append(b);
      }
      teclado.append(l);
    }
    const pie = el('div', 'pal-pie');
    caja.append(cab, rejilla, teclado, pie);
    raiz.replaceChildren(caja);

    // colores de un intento (con letras repetidas bien contadas)
    function evaluar(intento) {
      const res = Array(5).fill('no');
      const quedan = {};
      for (let i = 0; i < 5; i++) { if (intento[i] === solucion[i]) res[i] = 'si'; else quedan[solucion[i]] = (quedan[solucion[i]] || 0) + 1; }
      for (let i = 0; i < 5; i++) if (res[i] !== 'si' && quedan[intento[i]]) { res[i] = 'casi'; quedan[intento[i]]--; }
      return res;
    }
    const PRIORIDAD = { no: 1, casi: 2, si: 3 };
    function pintarTeclado() {
      const estado = {};
      for (const it of guardado.intentos) evaluar(it).forEach((r, i) => { const k = it[i]; if (!estado[k] || PRIORIDAD[r] > PRIORIDAD[estado[k]]) estado[k] = r; });
      for (const [k, b] of Object.entries(teclas)) { b.className = 'pal-tecla' + (estado[k] ? ' ' + estado[k] : ''); }
    }
    function pintarFila(f, texto, res, animar) {
      const { celdas } = filas[f];
      celdas.forEach((t, i) => {
        t.textContent = (texto[i] || '').toUpperCase();
        t.classList.toggle('llena', !!texto[i]);
        if (res) {
          const poner = () => { t.classList.add(res[i]); t.setAttribute('aria-label', `${texto[i].toUpperCase()}: ${{ si: 'en su sitio', casi: 'en otro sitio', no: 'no está' }[res[i]]}`); };
          if (animar) { t.style.setProperty('--d', `${i * 260}ms`); t.classList.add('girar'); setTimeout(poner, i * 260 + 200); } else poner();
        }
      });
    }
    function sacudir() { const f = filas[guardado.intentos.length].fila; f.classList.remove('tiembla'); void f.offsetWidth; f.classList.add('tiembla'); }

    function pulsar(k) {
      if (guardado.fin || bloqueo) return;
      if (k === 'Enter') return enviar();
      if (k === 'Backspace') { actual = actual.slice(0, -1); }
      else if (/^[a-zñ]$/.test(k) && actual.length < 5) {
        actual += k;
        const t = filas[guardado.intentos.length].celdas[actual.length - 1];
        t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop');
      }
      pintarFila(guardado.intentos.length, actual);
    }
    function enviar() {
      if (actual.length < 5) { sacudir(); return UI.aviso('Faltan letras'); }
      if (!validas.has(actual)) { sacudir(); return UI.aviso('Esa palabra no está en el diccionario'); }
      const f = guardado.intentos.length;
      guardado.intentos.push(actual);
      const res = evaluar(actual);
      pintarFila(f, actual, res, true);
      actual = '';
      bloqueo = true;
      setTimeout(() => {
        bloqueo = false;
        pintarTeclado();
        const gano = res.every((r) => r === 'si');
        if (gano || guardado.intentos.length === 6) terminar(gano);
        UI.guardar('palabra:' + dia, guardado);
      }, 5 * 260 + 300);
    }
    function terminar(gano) {
      guardado.fin = true;
      guardado.gano = gano;
      if (stats.ultimo !== dia) {
        stats.jugadas++;
        // la racha sigue si ayer también se acertó
        const ayer = new Date(Date.parse(dia + 'T12:00:00Z') - 86400000).toISOString().slice(0, 10);
        if (gano) { stats.ganadas++; stats.racha = stats.ultimoGanado === ayer ? stats.racha + 1 : 1; stats.mejor = Math.max(stats.mejor, stats.racha); stats.dist[guardado.intentos.length - 1]++; stats.ultimoGanado = dia; }
        else stats.racha = 0;
        stats.ultimo = dia;
        UI.guardar('palabra-stats', stats);
        if (gano) Cuenta.record('palabra-racha', stats.racha);
      }
      if (gano) {
        const fila = filas[guardado.intentos.length - 1];
        fila.celdas.forEach((t, i) => { t.style.setProperty('--d', `${i * 90}ms`); t.classList.add('salta'); });
        Confeti();
        UI.aviso(['¡Genio!', '¡Magnífico!', '¡Muy bien!', '¡Bien!', '¡Por los pelos!', '¡Uf, en la última!'][guardado.intentos.length - 1], 'bien');
      } else UI.aviso(`La palabra era ${solucion.toUpperCase()}`, 'mal');
      pintarPie();
    }
    function pintarPie() {
      pie.replaceChildren();
      if (!guardado.fin) { pie.append(el('p', 'suave centro', 'Escribe con el teclado o pulsa las letras. Sin tildes.')); return; }
      const est = el('div', 'pal-stats');
      for (const [n, t] of [[stats.jugadas, 'Jugadas'], [stats.jugadas ? Math.round(stats.ganadas / stats.jugadas * 100) : 0, '% aciertos'], [stats.racha, 'Racha'], [stats.mejor, 'Mejor racha']]) {
        const d = el('div'); d.append(el('b', null, String(n)), el('span', null, t)); est.append(d);
      }
      const dist = el('div', 'pal-dist');
      const max = Math.max(1, ...stats.dist);
      stats.dist.forEach((n, i) => {
        const f = el('div', 'pal-dist-fila' + (guardado.gano && guardado.intentos.length === i + 1 ? ' hoy' : ''));
        const b = el('i'); b.style.width = `${Math.max(8, n / max * 100)}%`; b.textContent = n;
        f.append(el('span', null, String(i + 1)), b); dist.append(f);
      });
      const compartir = boton('Compartir resultado', async () => {
        const cuadros = guardado.intentos.map((it) => evaluar(it).map((r) => ({ si: '🟩', casi: '🟨', no: '⬛' }[r])).join('')).join('\n');
        const texto = `dsbelda games · Palabra n.º ${numero} ${guardado.gano ? guardado.intentos.length : 'X'}/6\n\n${cuadros}\n\nhttps://games.dsbelda.dev/j/palabra`;
        try { if (navigator.share) await navigator.share({ text: texto }); else { await navigator.clipboard.writeText(texto); UI.aviso('Copiado: pégalo donde quieras', 'bien'); } } catch (e) { /* cancelado */ }
      }, 'oro');
      const cuenta = el('p', 'suave centro');
      const tic = () => {
        const ahora = new Date();
        const madrid = new Date(ahora.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
        const s = Math.max(0, Math.floor((new Date(madrid).setHours(24, 0, 0, 0) - madrid) / 1000));
        cuenta.textContent = `Siguiente palabra en ${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
      };
      tic(); setInterval(tic, 1000);
      pie.append(est, dist, compartir, cuenta);
    }

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, textarea, dialog')) return;
      const k = e.key === 'Enter' || e.key === 'Backspace' ? e.key : norm(e.key);
      if (k === 'Enter' || k === 'Backspace' || /^[a-zñ]$/.test(k)) { e.preventDefault(); pulsar(k); }
    });
    guardado.intentos.forEach((it, f) => pintarFila(f, it, evaluar(it), false));
    pintarTeclado();
    pintarPie();
  },
};
