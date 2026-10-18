'use strict';
// La isla que se hunde (2-4, cooperativo; puede haber CPUs de compañero). 24 losetas: firmes, inundadas o hundidas.
// En tu turno, hasta 3 acciones: moverte (a una loseta vecina no hundida), achicar (dejar firme una inundada,
// vecina o la tuya), dar una carta de tesoro a quien esté en tu loseta, o capturar un tesoro (4 cartas iguales en
// una de sus dos losetas). Después robas 2 cartas (las «¡Las aguas suben!» suben el nivel y vuelven a poner
// encima las losetas ya inundadas) y se inundan tantas losetas como marque el nivel; una inundada que vuelve a
// salir se hunde. Ganáis con los 4 tesoros, todos en el helipuerto y una carta de helicóptero. Perdéis si se hunde
// el helipuerto, si se hunden las dos losetas de un tesoro que aún no tenéis, si alguien no puede escapar al
// hundirse su loseta o si el agua llega al tope. Las manos son públicas (es cooperativo).
// Papeles: Explorador (también en diagonal), Ingeniero (achica dos losetas por acción), Piloto (una vez por
// turno vuela a cualquier loseta) y Mensajero (da cartas a cualquiera, esté donde esté).
const FORMA = [[2, 3], [1, 2, 3, 4], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5], [1, 2, 3, 4], [2, 3]];
const POS = FORMA.flatMap((cols, f) => cols.map((c) => [f, c]));
const TESOROS = ['fuego', 'caliz', 'viento', 'tierra'];
const NOMBRE_TESORO = { fuego: 'Piedra de fuego', caliz: 'Cáliz del mar', viento: 'Cristal del viento', tierra: 'Estatua de la tierra' };
const LOSETAS = [
  { n: 'Helipuerto', heli: true }, { n: 'Cueva de las Brasas', t: 'fuego' }, { n: 'Cueva de la Lava', t: 'fuego' }, { n: 'Palacio de Coral', t: 'caliz' }, { n: 'Palacio de las Mareas', t: 'caliz' },
  { n: 'Mirador del Viento', t: 'viento' }, { n: 'Torre de los Vientos', t: 'viento' }, { n: 'Jardín de los Ecos', t: 'tierra' }, { n: 'Jardín de las Raíces', t: 'tierra' },
  { n: 'Puerta de Cobre', rol: 'explorador' }, { n: 'Puerta de Bronce', rol: 'ingeniero' }, { n: 'Puerta de Plata', rol: 'mensajero' },
  { n: 'Playa de los Náufragos' }, { n: 'Faro' }, { n: 'Acantilado' }, { n: 'Pantano' }, { n: 'Bosque Perdido' }, { n: 'Duna' }, { n: 'Muelle' }, { n: 'Observatorio' }, { n: 'Puente Roto' }, { n: 'Atalaya' }, { n: 'Laguna' }, { n: 'Valle Sombrío' },
];
const ROLES = ['explorador', 'ingeniero', 'piloto', 'mensajero'];
const NOMBRE_ROL = { explorador: 'Explorador', ingeniero: 'Ingeniera', piloto: 'Piloto', mensajero: 'Mensajera' };
const INUNDA = [0, 2, 2, 3, 3, 3, 4, 4, 5, 5]; // losetas que se inundan según el nivel (1-9); el 10 es el fin
const MAX_MANO = 5;

function barajar(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(rnd() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; }
function nuevo(n, rnd = Math.random) {
  const orden = barajar(LOSETAS.map((_, i) => i), rnd); // loseta en cada posición
  const e = { n, rnd, pos: POS, loseta: orden, estado: Array(24).fill(0), nivel: 1, capturados: [], ganador: null, perdido: null, log: [], bots: Array(n).fill(null) };
  const roles = barajar([...ROLES], rnd).slice(0, n);
  e.roles = roles;
  e.donde = roles.map((r) => { const l = LOSETAS.findIndex((x) => (r === 'piloto' ? x.heli : x.rol === r)); return orden.indexOf(l); });
  e.mazo = barajar([...TESOROS.flatMap((t) => Array(5).fill(t)), 'helicoptero', 'helicoptero', 'helicoptero', 'arena', 'arena'], rnd);
  e.descartes = []; e.manos = roles.map(() => []);
  for (let j = 0; j < n; j++) for (let k = 0; k < 2; k++) e.manos[j].push(e.mazo.pop());
  e.mazo.push('aguas', 'aguas', 'aguas'); barajar(e.mazo, rnd);
  e.inund = barajar(Array.from({ length: 24 }, (_, i) => i), rnd); e.inundDesc = [];
  for (let k = 0; k < 6; k++) inundar(e, true);
  Object.assign(e, { turno: 0, acciones: 3, fase: 'acciones', voló: false, ingExtra: false, descarta: -1, tras: null });
  return e;
}
function configurar(e, asientos) { e.bots = asientos.map((a) => (a.bot ? a.nivel : null)); }
const L = (e, p) => LOSETAS[e.loseta[p]];
const vecinas = (e, p, diagonal) => {
  const [f, c] = POS[p]; const out = [];
  for (let df = -1; df <= 1; df++) for (let dc = -1; dc <= 1; dc++) { if (!df && !dc) continue; if (!diagonal && df && dc) continue; const q = POS.findIndex(([a, b]) => a === f + df && b === c + dc); if (q >= 0 && e.estado[q] < 2) out.push(q); }
  return out;
};
const log = (e, t) => { e.log.push(t); e.log = e.log.slice(-10); };
function inundar(e, inicial) {
  if (!e.inund.length) { e.inund = barajar(e.inundDesc, e.rnd); e.inundDesc = []; }
  const p = e.inund.pop();
  if (e.estado[p] === 0) { e.estado[p] = 1; e.inundDesc.push(p); if (!inicial) log(e, `Se inunda ${L(e, p).n}`); return; }
  e.estado[p] = 2; log(e, `¡Se hunde ${L(e, p).n}!`);
  // quien estuviera allí nada a una vecina (la más cercana al helipuerto)
  e.donde.forEach((d, j) => {
    if (d !== p) return;
    const ops = vecinas(e, p, e.roles[j] === 'explorador'), heli = e.loseta.indexOf(0);
    if (!ops.length) { e.perdido = `${NOMBRE_ROL[e.roles[j]]} no pudo escapar del agua`; return; }
    ops.sort((a, b) => dist(a, heli) - dist(b, heli)); e.donde[j] = ops[0];
  });
  comprobarDerrota(e);
}
const dist = (a, b) => Math.abs(POS[a][0] - POS[b][0]) + Math.abs(POS[a][1] - POS[b][1]);
function comprobarDerrota(e) {
  if (e.perdido) { e.ganador = []; return; }
  if (e.estado[e.loseta.indexOf(0)] === 2) e.perdido = 'Se hundió el helipuerto';
  for (const t of TESOROS) if (!e.capturados.includes(t) && e.loseta.every((l, p) => LOSETAS[l].t !== t || e.estado[p] === 2)) e.perdido = `Se hundieron los dos lugares de ${NOMBRE_TESORO[t]}`;
  if (e.nivel >= 10) e.perdido = 'El agua llegó al tope';
  if (e.perdido) e.ganador = [];
}
function robarTesoros(e, j) {
  for (let k = 0; k < 2; k++) {
    if (!e.mazo.length) { e.mazo = barajar(e.descartes, e.rnd); e.descartes = []; }
    const c = e.mazo.pop(); if (!c) break;
    if (c === 'aguas') { e.nivel++; e.descartes.push(c); log(e, `¡Las aguas suben! Nivel ${e.nivel}`); e.inund.push(...barajar(e.inundDesc, e.rnd)); e.inundDesc = []; comprobarDerrota(e); }
    else e.manos[j].push(c);
  }
}
function finTurno(e) {
  const j = e.turno;
  robarTesoros(e, j);
  if (e.ganador) return;
  if (e.manos[j].length > MAX_MANO) { e.fase = 'descartar'; e.descarta = j; e.tras = 'inundar'; return; }
  pasoInundar(e);
}
function pasoInundar(e) {
  for (let k = 0; k < INUNDA[Math.min(9, e.nivel)] && !e.ganador; k++) inundar(e);
  if (e.ganador) return;
  e.turno = (e.turno + 1) % e.n; Object.assign(e, { acciones: 3, fase: 'acciones', voló: false, ingExtra: false, descarta: -1, tras: null });
}
function gastar(e) { e.acciones--; e.ingExtra = false; }
const enHeli = (e) => e.donde.every((d) => d === e.loseta.indexOf(0));
function accion(e, yo, a) {
  if (e.ganador) return { ok: false, error: 'La partida ha terminado' };
  if (e.fase === 'descartar') {
    if (yo !== e.descarta) return { ok: false, error: `Tiene que descartar otra persona` };
    if (a.tipo === 'descartar') { const i = Number(a.carta); if (!e.manos[yo][i]) return { ok: false, error: 'Esa carta no' }; e.descartes.push(e.manos[yo].splice(i, 1)[0]); }
    else if (a.tipo === 'usar') { const r = usar(e, yo, a); if (!r.ok) return r; } else return { ok: false, error: 'Tienes que descartar' };
    if (e.manos[yo].length <= MAX_MANO) { if (e.tras === 'inundar') pasoInundar(e); else { e.fase = 'acciones'; e.descarta = -1; } }
    return { ok: true };
  }
  if (a.tipo === 'usar') return usar(e, yo, a); // especiales: en cualquier momento de las acciones
  if (yo !== e.turno) return { ok: false, error: 'No es tu turno' };
  const rol = e.roles[yo], aqui = e.donde[yo];
  if (a.tipo === 'terminar') { finTurno(e); return { ok: true }; }
  if (e.acciones <= 0 && !(a.tipo === 'achicar' && e.ingExtra)) return { ok: false, error: 'No te quedan acciones' };
  const p = Number(a.a);
  if (a.tipo === 'mover') {
    if (!vecinas(e, aqui, rol === 'explorador').includes(p)) return { ok: false, error: 'No puedes ir ahí' };
    e.donde[yo] = p; gastar(e); return { ok: true };
  }
  if (a.tipo === 'volar') {
    if (rol !== 'piloto' || e.voló) return { ok: false, error: 'Solo el piloto, una vez por turno' };
    if (!(p >= 0 && p < 24) || e.estado[p] === 2 || p === aqui) return { ok: false, error: 'Ahí no' };
    e.donde[yo] = p; e.voló = true; gastar(e); return { ok: true };
  }
  if (a.tipo === 'achicar') {
    if (!(p === aqui || vecinas(e, aqui, rol === 'explorador').includes(p)) || e.estado[p] !== 1) return { ok: false, error: 'Solo una loseta inundada tuya o vecina' };
    e.estado[p] = 0;
    if (e.ingExtra) { e.ingExtra = false; return { ok: true }; }
    gastar(e); if (rol === 'ingeniero') e.ingExtra = true;
    return { ok: true };
  }
  if (a.tipo === 'dar') {
    const k = Number(a.j), i = Number(a.carta), c = e.manos[yo][i];
    if (!(k >= 0 && k < e.n) || k === yo || !TESOROS.includes(c)) return { ok: false, error: 'Solo cartas de tesoro a otra persona' };
    if (rol !== 'mensajero' && e.donde[k] !== aqui) return { ok: false, error: 'Tenéis que estar en la misma loseta' };
    e.manos[k].push(e.manos[yo].splice(i, 1)[0]); gastar(e);
    if (e.manos[k].length > MAX_MANO) { e.fase = 'descartar'; e.descarta = k; e.tras = 'acciones'; }
    return { ok: true };
  }
  if (a.tipo === 'capturar') {
    const t = L(e, aqui).t;
    if (!t || e.capturados.includes(t)) return { ok: false, error: 'Aquí no hay tesoro que capturar' };
    if (e.manos[yo].filter((c) => c === t).length < 4) return { ok: false, error: 'Necesitas 4 cartas de ese tesoro' };
    for (let k = 0; k < 4; k++) e.descartes.push(e.manos[yo].splice(e.manos[yo].indexOf(t), 1)[0]);
    e.capturados.push(t); log(e, `¡Capturado: ${NOMBRE_TESORO[t]}!`); gastar(e); return { ok: true };
  }
  return { ok: false, error: 'Acción desconocida' };
}
// cartas especiales (no gastan acción): helicóptero {de, a} o arena {a}
function usar(e, yo, a) {
  const i = Number(a.carta), c = e.manos[yo][i];
  if (c === 'helicoptero') {
    if (e.capturados.length === 4 && enHeli(e)) { e.manos[yo].splice(i, 1); e.ganador = Array.from({ length: e.n }, (_, j) => j); log(e, '¡El helicóptero despega con los cuatro tesoros!'); return { ok: true }; }
    const de = Number(a.de), p = Number(a.a);
    if (!(p >= 0 && p < 24) || e.estado[p] === 2 || !e.donde.includes(de)) return { ok: false, error: 'Elige de qué loseta (con alguien) y a cuál' };
    e.donde = e.donde.map((d) => (d === de ? p : d)); e.descartes.push(e.manos[yo].splice(i, 1)[0]); return { ok: true };
  }
  if (c === 'arena') {
    const p = Number(a.a); if (!(p >= 0 && p < 24) || e.estado[p] !== 1) return { ok: false, error: 'Elige una loseta inundada' };
    e.estado[p] = 0; e.descartes.push(e.manos[yo].splice(i, 1)[0]); return { ok: true };
  }
  return { ok: false, error: 'Esa carta no se usa así' };
}
// ---- CPU ----
function camino(e, de, a, diag) { // primer paso hacia «a» por losetas no hundidas
  const prev = new Map([[de, -1]]), cola = [de];
  while (cola.length) { const x = cola.shift(); if (x === a) break; for (const v of vecinas(e, x, diag)) if (!prev.has(v)) { prev.set(v, x); cola.push(v); } }
  if (!prev.has(a)) return null;
  let cur = a; while (prev.get(cur) !== de && prev.get(cur) !== -1) cur = prev.get(cur);
  return cur === de ? null : cur;
}
function bot(e, yo, nivel, rnd) {
  if (e.ganador) return null;
  const mano = e.manos[yo];
  if (e.fase === 'descartar') {
    if (yo !== e.descarta) return null;
    const inund = e.estado.findIndex((x) => x === 1);
    if (mano.includes('arena') && inund >= 0) return { tipo: 'usar', carta: mano.indexOf('arena'), a: inund };
    const helis = mano.filter((c) => c === 'helicoptero').length;
    const cuenta = (t) => e.manos.flat().filter((c) => c === t).length;
    let mejor = 0, mv = Infinity;
    mano.forEach((c, i) => { const v = c === 'helicoptero' ? (helis > 1 ? -10 : 100) : c === 'arena' ? 90 : e.capturados.includes(c) ? -20 : cuenta(c) + mano.filter((x) => x === c).length * 2; if (v < mv) { mv = v; mejor = i; } });
    return { tipo: 'descartar', carta: mejor };
  }
  if (yo !== e.turno) return null;
  const rol = e.roles[yo], aqui = e.donde[yo], diag = rol === 'explorador', heli = e.loseta.indexOf(0);
  // ganar
  if (e.capturados.length === 4 && enHeli(e) && mano.includes('helicoptero')) return { tipo: 'usar', carta: mano.indexOf('helicoptero') };
  if (e.ingExtra) { const f = [aqui, ...vecinas(e, aqui, diag)].find((p) => e.estado[p] === 1); if (f !== undefined) return { tipo: 'achicar', a: f }; }
  // urgencias con sacos de arena: helipuerto o última loseta de un tesoro pendiente inundados
  const criticas = e.estado.map((s, p) => (s === 1 && (p === heli || (L(e, p).t && !e.capturados.includes(L(e, p).t) && e.loseta.some((l, q) => q !== p && LOSETAS[l].t === L(e, p).t && e.estado[q] === 2))) ? p : -1)).filter((p) => p >= 0);
  if (criticas.length && mano.includes('arena') && !([aqui, ...vecinas(e, aqui, diag)].includes(criticas[0]) && e.acciones > 0)) return { tipo: 'usar', carta: mano.indexOf('arena'), a: criticas[0] };
  if (e.acciones <= 0) return { tipo: 'terminar' };
  const t = L(e, aqui).t;
  if (t && !e.capturados.includes(t) && mano.filter((c) => c === t).length >= 4) return { tipo: 'capturar' };
  const alcance = [aqui, ...vecinas(e, aqui, diag)];
  const critica = criticas.find((p) => alcance.includes(p)); if (critica !== undefined) return { tipo: 'achicar', a: critica };
  const ir = (dest) => { if (dest === aqui) return null; if (rol === 'piloto' && !e.voló && dist(aqui, dest) > 2) return { tipo: 'volar', a: dest }; const s2 = camino(e, aqui, dest, diag); return s2 === null ? null : { tipo: 'mover', a: s2 }; };
  if (criticas.length) { const m = ir(criticas.sort((a2, b2) => dist(aqui, a2) - dist(aqui, b2))[0]); if (m) return m; }
  // todos los tesoros: al helipuerto (achicando por el camino lo que haga falta)
  if (e.capturados.length === 4) { const m = ir(heli); if (m) return m; const f = alcance.find((q) => e.estado[q] === 1); if (f !== undefined) return { tipo: 'achicar', a: f }; return { tipo: 'terminar' }; }
  // tengo 4 de un tesoro: a su loseta
  for (const tt of TESOROS) if (!e.capturados.includes(tt) && mano.filter((c) => c === tt).length >= 4) {
    const dests = e.loseta.map((l, q) => (LOSETAS[l].t === tt && e.estado[q] < 2 ? q : -1)).filter((q) => q >= 0).sort((a2, b2) => dist(aqui, a2) - dist(aqui, b2));
    if (dests.length && dist(aqui, dests[0]) > 3 && mano.filter((c) => c === 'helicoptero').length > 1) return { tipo: 'usar', carta: mano.indexOf('helicoptero'), de: aqui, a: dests[0] };
    for (const d of dests) { const m = ir(d); if (m) return m; }
  }
  // plan común: de cada tesoro hay una recolectora (quien más cartas tiene); el resto se las lleva
  const colectora = (tt) => { let best = 0, bv = -1; for (let k = 0; k < e.n; k++) { const v = e.manos[k].filter((c) => c === tt).length; if (v > bv) { bv = v; best = k; } } return best; };
  for (let i = 0; i < mano.length; i++) {
    const c = mano[i]; if (!TESOROS.includes(c) || e.capturados.includes(c)) continue;
    const k = colectora(c); if (k === yo) continue;
    if ((rol === 'mensajero' || e.donde[k] === aqui) && e.manos[k].length < MAX_MANO + 1) return { tipo: 'dar', j: k, carta: i };
  }
  // reunirse con quien tenga cartas del mismo tesoro (juntos sumamos 4); si hay mucha agua, antes se achica
  const importante = (q) => (L(e, q).heli || (L(e, q).t && !e.capturados.includes(L(e, q).t)) ? 1 : 0);
  const peligro = e.estado.filter((x) => x === 1).length >= (nivel === 'dificil' ? 4 : 5);
  const cerca = alcance.filter((q) => e.estado[q] === 1);
  if (peligro && cerca.length) return { tipo: 'achicar', a: cerca.sort((a2, b2) => importante(b2) - importante(a2))[0] };
  if (rol !== 'mensajero') {
    // ir hacia la recolectora del tesoro del que más cartas llevo (si entre las dos ya son 3 o más)
    let dest = -1, mejorV = 0;
    for (const tt of TESOROS) { if (e.capturados.includes(tt)) continue; const k = colectora(tt); if (k === yo || e.donde[k] === aqui) continue; const a2 = mano.filter((c) => c === tt).length, b2 = e.manos[k].filter((c) => c === tt).length; if (a2 && a2 + b2 >= 3 && a2 + b2 > mejorV) { mejorV = a2 + b2; dest = e.donde[k]; } }
    if (dest >= 0) { const m = ir(dest); if (m) return m; }
  }
  // achicar lo que tenga a mano (primero lo importante)
  const inund = alcance.filter((q) => e.estado[q] === 1).sort((a2, b2) => importante(b2) - importante(a2));
  if (inund.length && (importante(inund[0]) || nivel === 'dificil' || rnd() < 0.8)) return { tipo: 'achicar', a: inund[0] };
  // ir hacia lo inundado más cercano (lo importante antes)
  const lejos = e.estado.map((s2, q) => (s2 === 1 ? q : -1)).filter((q) => q >= 0).sort((a2, b2) => importante(b2) - importante(a2) || dist(aqui, a2) - dist(aqui, b2));
  if (lejos.length) { const m = ir(lejos[0]); if (m) return m; }
  return { tipo: 'terminar' };
}
function vista(e) {
  return {
    n: e.n, pos: POS, losetas: e.loseta.map((l) => LOSETAS[l]), estado: e.estado, donde: e.donde, roles: e.roles, manos: e.manos, nivel: e.nivel, maxNivel: 10,
    inunda: INUNDA[Math.min(9, e.nivel)], capturados: e.capturados, turno: e.turno, acciones: e.acciones, fase: e.fase, descarta: e.descarta, voló: e.voló, ingExtra: e.ingExtra,
    mazo: e.mazo.length, log: e.log, perdido: e.perdido, ganadores: e.ganador,
  };
}
const turno = (e) => (e.ganador ? -1 : e.fase === 'descartar' ? e.descarta : e.turno);
const fin = (e) => (e.ganador ? { ganadores: e.ganador, texto: e.perdido || '¡Escapasteis con los cuatro tesoros!' } : null);
module.exports = { id: 'isla', min: 2, max: 4, nuevo, configurar, vista, accion, turno, fin, bot, _: { vecinas, LOSETAS, TESOROS } };
