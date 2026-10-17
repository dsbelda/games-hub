'use strict';
// Hombre lobo (5-12 personas). Papeles: lobos (1 hasta 6 jugadores, 2 hasta 9, 3 desde 10), vidente, bruja
// (desde 7) y aldeanos. Noche: los lobos eligen víctima (chat propio), la vidente descubre el papel de alguien
// y luego la bruja puede salvar a la víctima (una vez) o matar a alguien (una vez). Día: se sabe quién ha
// muerto, se debate y se vota a quién expulsar (en empate, nadie). Gana el pueblo si caen todos los lobos;
// ganan los lobos si son tantos como el resto.
const T_NOCHE = 45000, T_BRUJA = 20000, T_DIA = 120000, T_VOTO = 45000, T_AMANECER = 7000;
const NOMBRE = { lobo: 'Lobo', vidente: 'Vidente', bruja: 'Bruja', aldeano: 'Aldeano' };

function nuevo(n, rnd = Math.random) {
  const lobos = n <= 6 ? 1 : n <= 9 ? 2 : 3;
  const papeles = [...Array(lobos).fill('lobo'), 'vidente', ...(n >= 7 ? ['bruja'] : [])];
  while (papeles.length < n) papeles.push('aldeano');
  for (let i = papeles.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [papeles[i], papeles[j]] = [papeles[j], papeles[i]]; }
  const e = { n, papeles, vivos: Array(n).fill(true), dia: 0, log: [], lobochat: [], visto: {}, pociones: { salvar: true, matar: true }, ganador: null };
  empezarNoche(e);
  return e;
}
const vivosDe = (e, papel) => e.papeles.map((p, i) => (e.vivos[i] && (!papel || p === papel) ? i : -1)).filter((i) => i >= 0);
function empezarNoche(e) {
  e.dia++;
  Object.assign(e, { fase: 'noche', hasta: Date.now() + T_NOCHE, votosLobo: {}, mira: null, victima: null, bruja: { salva: false, mata: null, hecho: false }, votos: {}, listos: {} });
  e.log.push({ t: `🌙 Noche ${e.dia}. El pueblo duerme…` });
}
function finNoche(e) {
  // víctima: la más votada por los lobos (empate: al azar entre ellas)
  const cuenta = {};
  for (const v of Object.values(e.votosLobo)) cuenta[v] = (cuenta[v] || 0) + 1;
  const max = Math.max(0, ...Object.values(cuenta));
  const cands = Object.keys(cuenta).filter((k) => cuenta[k] === max).map(Number);
  e.victima = cands.length ? cands[Math.floor(Math.random() * cands.length)] : null;
  if (e.mira !== null) e.visto[e.mira] = e.papeles[e.mira] === 'lobo';
  const bruja = vivosDe(e, 'bruja')[0];
  if (bruja !== undefined && (e.pociones.salvar || e.pociones.matar)) { e.fase = 'bruja'; e.hasta = Date.now() + T_BRUJA; return; }
  amanecer(e);
}
function amanecer(e) {
  const muertos = [];
  if (e.victima !== null && !(e.bruja.salva)) muertos.push(e.victima);
  if (e.bruja.mata !== null && !muertos.includes(e.bruja.mata)) muertos.push(e.bruja.mata);
  for (const m of muertos) e.vivos[m] = false;
  e.muertosNoche = muertos;
  e.log.push({ t: muertos.length ? `☀️ Amanece. Han muerto: ${muertos.map((m) => `{${m}} (${NOMBRE[e.papeles[m]]})`).join(', ')}.` : '☀️ Amanece y… ¡no ha muerto nadie!' });
  if (comprobar(e)) return;
  e.fase = 'dia'; e.hasta = Date.now() + T_DIA; e.listos = {};
}
function votacion(e) { e.fase = 'votar'; e.hasta = Date.now() + T_VOTO; e.votos = {}; }
function finVotacion(e) {
  const cuenta = {};
  for (const v of Object.values(e.votos)) if (v >= 0) cuenta[v] = (cuenta[v] || 0) + 1;
  const max = Math.max(0, ...Object.values(cuenta));
  const mas = Object.keys(cuenta).filter((k) => cuenta[k] === max).map(Number);
  e.recuento = cuenta;
  if (max > 0 && mas.length === 1) { const x = mas[0]; e.vivos[x] = false; e.log.push({ t: `⚖️ El pueblo expulsa a {${x}}, que era ${NOMBRE[e.papeles[x]].toLowerCase()}.` }); }
  else e.log.push({ t: '⚖️ Empate en la votación: nadie es expulsado.' });
  if (comprobar(e)) return;
  e.fase = 'amanecer'; e.hasta = Date.now() + T_AMANECER; // pausa antes de la noche
}
function comprobar(e) {
  const lobos = vivosDe(e, 'lobo').length, resto = vivosDe(e).length - lobos;
  if (!lobos) { e.ganador = 'pueblo'; e.log.push({ t: '🎉 ¡El pueblo ha acabado con los lobos!' }); }
  else if (lobos >= resto) { e.ganador = 'lobos'; e.log.push({ t: '🐺 Los lobos se han hecho con el pueblo.' }); }
  if (e.ganador) { e.fase = 'fin'; e.hasta = 0; return true; }
  return false;
}

function accion(e, yo, a) {
  if (e.ganador) return { ok: false, error: 'La partida ha terminado' };
  const papel = e.papeles[yo];
  const objetivo = Number(a.a);
  const valido = (x) => Number.isInteger(x) && x >= 0 && x < e.n && e.vivos[x];
  if (a.tipo === 'lobochat') {
    if (papel !== 'lobo' && e.vivos[yo]) return { ok: false, error: 'Solo los lobos' };
    const t = String(a.texto ?? '').replace(/\s+/g, ' ').trim().slice(0, 160);
    if (!t || papel !== 'lobo') return { ok: false };
    e.lobochat.push({ j: yo, t }); if (e.lobochat.length > 40) e.lobochat.shift();
    return { ok: true };
  }
  if (!e.vivos[yo]) return { ok: false, error: 'Estás muerto: solo puedes mirar' };
  if (a.tipo === 'matar' && e.fase === 'noche' && papel === 'lobo') {
    if (!valido(objetivo) || e.papeles[objetivo] === 'lobo') return { ok: false, error: 'Elige a alguien del pueblo' };
    e.votosLobo[yo] = objetivo;
  } else if (a.tipo === 'mirar' && e.fase === 'noche' && papel === 'vidente') {
    if (!valido(objetivo) || objetivo === yo || e.mira !== null) return { ok: false, error: 'No puedes mirar a esa persona' };
    e.mira = objetivo;
  } else if (a.tipo === 'pocion' && e.fase === 'bruja' && papel === 'bruja') {
    if (a.cual === 'salvar') { if (!e.pociones.salvar || e.victima === null) return { ok: false, error: 'No puedes salvar' }; e.bruja.salva = true; e.pociones.salvar = false; }
    else if (a.cual === 'matar') { if (!e.pociones.matar || !valido(objetivo) || objetivo === yo) return { ok: false, error: 'No puedes envenenar a esa persona' }; e.bruja.mata = objetivo; e.pociones.matar = false; }
    else if (a.cual === 'nada') { amanecer(e); return { ok: true }; }
    else return { ok: false, error: 'Poción desconocida' };
    return { ok: true };
  } else if (a.tipo === 'listo' && e.fase === 'dia') {
    e.listos[yo] = true;
    if (vivosDe(e).every((j) => e.listos[j])) votacion(e);
    return { ok: true };
  } else if (a.tipo === 'votar' && e.fase === 'votar') {
    if (!(objetivo === -1 || (valido(objetivo) && objetivo !== yo))) return { ok: false, error: 'Voto no válido' };
    e.votos[yo] = objetivo;
    if (vivosDe(e).every((j) => e.votos[j] !== undefined)) finVotacion(e);
    return { ok: true };
  } else return { ok: false, error: 'Ahora no puedes hacer eso' };
  // ¿ya han actuado todos los de la noche?
  const lobosVivos = vivosDe(e, 'lobo'), vidente = vivosDe(e, 'vidente')[0];
  if (lobosVivos.every((l) => e.votosLobo[l] !== undefined) && (vidente === undefined || e.mira !== null)) finNoche(e);
  return { ok: true };
}
function tiempo(e, ahora) {
  if (e.ganador || !e.hasta || ahora < e.hasta) return false;
  if (e.fase === 'noche') finNoche(e);
  else if (e.fase === 'bruja') amanecer(e);
  else if (e.fase === 'dia') votacion(e);
  else if (e.fase === 'votar') finVotacion(e);
  else if (e.fase === 'amanecer') empezarNoche(e);
  else return false;
  return true;
}
function vista(e, yo) {
  const papel = yo >= 0 ? e.papeles[yo] : null;
  const muerto = yo >= 0 && !e.vivos[yo];
  const todo = !!e.ganador || muerto; // los muertos y, al final, todos, lo ven todo
  const lobo = papel === 'lobo';
  return {
    n: e.n, fase: e.fase, dia: e.dia, hasta: e.hasta, vivos: e.vivos, log: e.log.slice(-25), ganador: e.ganador,
    papel, muerto, papeles: todo ? e.papeles : e.papeles.map((p, i) => (!e.vivos[i] || i === yo || (lobo && p === 'lobo') ? p : null)),
    companerosLobo: lobo ? vivosDe(e, 'lobo') : null, lobochat: lobo || todo ? e.lobochat : null,
    votosLobo: lobo ? e.votosLobo : null, visto: papel === 'vidente' || todo ? e.visto : null, yaMire: papel === 'vidente' && e.mira !== null,
    bruja: papel === 'bruja' && e.fase === 'bruja' ? { victima: e.victima, pociones: e.pociones, salva: e.bruja.salva, mata: e.bruja.mata } : papel === 'bruja' ? { pociones: e.pociones } : null,
    listos: e.fase === 'dia' ? Object.keys(e.listos).map(Number) : [], votaron: e.fase === 'votar' ? Object.keys(e.votos).map(Number) : [],
    miVoto: yo >= 0 ? (e.fase === 'votar' ? e.votos[yo] ?? null : null) : null,
    lobos: vivosDe(e, 'lobo').length, total: e.papeles.filter((p) => p === 'lobo').length,
  };
}
const turno = () => -1;
const fin = (e) => (e.ganador ? { ganadores: e.papeles.map((p, i) => ((e.ganador === 'lobos') === (p === 'lobo') ? i : -1)).filter((i) => i >= 0), texto: e.ganador === 'lobos' ? 'Ganan los lobos' : 'Gana el pueblo' } : null);
const bot = () => null;
module.exports = { id: 'lobo', min: 5, max: 12, sinCpu: true, nuevo, vista, accion, turno, fin, bot, tiempo };
