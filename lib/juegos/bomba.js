'use strict';
// Desactiva la bomba (2-6, cooperativo, solo personas). Una persona (la artificiera) ve la bomba; las demás tienen
// el manual. Hay que hablar (en persona, por llamada o por el chat) para desactivar todos los módulos antes de
// que se acabe el tiempo. Tres fallos y explota. Tres bombas cada vez más difíciles; la artificiera cambia.
// Módulos: cables, botón y símbolos. Las reglas están aquí y el manual del navegador las cuenta con las mismas
// palabras (REGLAS); el servidor es quien decide si lo hecho es correcto.
const COLORES = ['rojo', 'azul', 'amarillo', 'blanco', 'negro'];
const SIMBOLOS = [
  ['☾', '★', '✿', '♠', '☂', '⚓', '♫'],
  ['☀', '✿', '♣', '☯', '⚓', '✈', '☘'],
  ['♞', '☯', '★', '♥', '✂', '☀', '⌛'],
  ['✂', '♫', '☘', '♞', '⚡', '♠', '❄'],
  ['⚡', '♥', '☂', '❄', '✈', '♣', '☾'],
];
const BOMBAS = [{ modulos: 3, tiempo: 300 }, { modulos: 4, tiempo: 300 }, { modulos: 5, tiempo: 270 }];
const ultimaCifra = (serie) => Number([...serie].reverse().find((c) => /\d/.test(c)));
const contar = (cs, c) => cs.filter((x) => x === c).length;
// ---- reglas (índices desde 0) ----
function cableCorrecto(cs, serie) {
  const par = ultimaCifra(serie) % 2 === 0, n = cs.length, ultimoDe = (c) => cs.lastIndexOf(c);
  if (n === 3) {
    const rep = COLORES.find((c) => contar(cs, c) === 2);
    if (rep) return cs.findIndex((c) => c !== rep);
    if (cs.includes('negro')) return cs.indexOf('negro');
    return 1;
  }
  if (n === 4) {
    if (par && cs.includes('rojo')) return cs.indexOf('rojo');
    if (!cs.includes('amarillo')) return 2;
    if (contar(cs, 'azul') === 1) return cs.indexOf('azul');
    return 3;
  }
  if (n === 5) {
    if (contar(cs, 'blanco') > contar(cs, 'negro')) return ultimoDe('blanco');
    if (cs[0] === cs[4]) return 1;
    if (!cs.includes('rojo')) return 3;
    return 0;
  }
  if (contar(cs, 'amarillo') === 1) return (cs.indexOf('amarillo') + 1) % 6;
  if (!par) return 4;
  if (contar(cs, 'azul') > 2) return ultimoDe('azul');
  return 1;
}
const VOCALES = /[AEIOU]/;
// ¿pulsar y soltar (true) o mantener (false)?
function botonRapido(b, serie) {
  if (b.color === 'rojo' && b.texto === 'MANTENER') return true;
  if (b.texto === 'ABORTAR') return false;
  if (b.color === 'azul') return false;
  if (VOCALES.test(serie)) return true;
  return false;
}
const cifraTira = (tira) => (tira === 'azul' ? '4' : tira === 'amarillo' ? '5' : '1');
const ordenSimbolos = (m) => [...m.simbolos].sort((a, b) => SIMBOLOS[m.columna].indexOf(a) - SIMBOLOS[m.columna].indexOf(b));
const REGLAS = {
  cables: {
    3: ['Si hay dos cables del mismo color, corta el que es distinto.', 'Si no, si hay un cable negro, córtalo.', 'Si no, corta el del medio.'],
    4: ['Si la última cifra del número de serie es par y hay algún cable rojo, corta el primer rojo.', 'Si no, si no hay ningún amarillo, corta el tercero.', 'Si no, si hay exactamente un azul, córtalo.', 'Si no, corta el último.'],
    5: ['Si hay más blancos que negros, corta el último blanco.', 'Si no, si el primero y el último son del mismo color, corta el segundo.', 'Si no, si no hay ningún rojo, corta el cuarto.', 'Si no, corta el primero.'],
    6: ['Si hay exactamente un amarillo, corta el que va justo después de él (si el amarillo es el último, el primero).', 'Si no, si la última cifra del número de serie es impar, corta el quinto.', 'Si no, si hay más de dos azules, corta el último azul.', 'Si no, corta el segundo.'],
  },
  boton: ['Si el botón es rojo y pone «MANTENER», púlsalo y suéltalo enseguida.', 'Si no, si pone «ABORTAR», mantenlo pulsado.', 'Si no, si es azul, mantenlo pulsado.', 'Si no, si el número de serie tiene alguna vocal, púlsalo y suéltalo.', 'Si no, mantenlo pulsado.'],
  tira: ['Al mantenerlo se enciende una tira de color. Suelta el botón cuando el reloj muestre esta cifra en cualquier posición:', 'azul → 4 · amarillo → 5 · cualquier otro color → 1'],
  simbolos: ['Busca la única columna que tenga los cuatro símbolos y pulsa los cuatro en el orden en que aparecen en ella (de arriba abajo).'],
};
function moduloAlAzar(rnd, tipo) {
  if (tipo === 'cables') {
    const n = 3 + Math.floor(rnd() * 4);
    let cs; do { cs = Array.from({ length: n }, () => COLORES[Math.floor(rnd() * 5)]); } while (n === 3 && new Set(cs).size === 1);
    return { tipo, cables: cs, cortados: [] };
  }
  if (tipo === 'boton') return { tipo, color: ['rojo', 'azul', 'blanco', 'amarillo'][Math.floor(rnd() * 4)], texto: ['ABORTAR', 'DETONAR', 'MANTENER', 'PULSAR'][Math.floor(rnd() * 4)], tira: null };
  // símbolos: cuatro de una columna que no estén los cuatro en ninguna otra
  for (;;) {
    const columna = Math.floor(rnd() * SIMBOLOS.length), col = [...SIMBOLOS[columna]];
    for (let i = col.length - 1; i > 0; i--) { const k = Math.floor(rnd() * (i + 1)); [col[i], col[k]] = [col[k], col[i]]; }
    const simbolos = col.slice(0, 4);
    if (SIMBOLOS.every((c, k) => k === columna || !simbolos.every((s) => c.includes(s)))) return { tipo, columna, simbolos, pulsados: [] };
  }
}
function nuevo(n, rnd = Math.random) { const e = { n, rnd, bomba: -1, ganador: null, explotada: false }; armar(e); return e; }
function armar(e) {
  e.bomba++;
  const b = BOMBAS[e.bomba];
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXZ';
  const serie = Array.from({ length: 6 }, (_, i) => (i === 5 || e.rnd() < 0.4 ? String(Math.floor(e.rnd() * 10)) : letras[Math.floor(e.rnd() * letras.length)])).join('');
  const tipos = ['cables', 'boton', 'simbolos'];
  e.modulos = Array.from({ length: b.modulos }, (_, i) => moduloAlAzar(e.rnd, i < 3 ? tipos[i] : tipos[Math.floor(e.rnd() * 3)]));
  e.modulos.sort(() => e.rnd() - 0.5);
  Object.assign(e, { serie, fallos: 0, hechos: Array(b.modulos).fill(false), fase: 'preparados', artificiero: e.bomba % e.n, hasta: 0, duracion: b.tiempo, aviso: null, listos: Array(e.n).fill(false) });
}
const restante = (e, ahora) => Math.max(0, Math.ceil((e.hasta - ahora) / 1000));
const reloj = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
function fallo(e, i, texto) { e.fallos++; e.aviso = { tipo: 'fallo', i, texto }; if (e.fallos >= 3) explotar(e); }
function explotar(e) { e.fase = 'boom'; e.explotada = true; e.ganador = []; }
function resuelto(e, i) {
  e.hechos[i] = true; e.aviso = { tipo: 'ok', i };
  if (e.hechos.every(Boolean)) { if (e.bomba >= BOMBAS.length - 1) { e.fase = 'desactivada'; e.ganador = Array.from({ length: e.n }, (_, j) => j); } else { e.fase = 'desactivada'; e.hasta = 0; } }
}
function accion(e, yo, a, ahora = Date.now()) {
  if (e.ganador) return { ok: false, error: 'La partida ha terminado' };
  if (a.tipo === 'listo') {
    if (e.fase === 'desactivada') { armar(e); return { ok: true }; }
    if (e.fase !== 'preparados') return { ok: false, error: 'Ahora no' };
    e.listos[yo] = true;
    if (e.listos.every(Boolean)) { e.fase = 'activa'; e.hasta = ahora + e.duracion * 1000; }
    return { ok: true };
  }
  if (e.fase !== 'activa') return { ok: false, error: 'La bomba no está activa' };
  if (yo !== e.artificiero) return { ok: false, error: 'Solo quien tiene la bomba delante' };
  const i = Number(a.m), m = e.modulos[i];
  if (!m || e.hechos[i]) return { ok: false, error: 'Ese módulo no' };
  if (a.tipo === 'cortar') {
    const c = Number(a.c); if (m.tipo !== 'cables' || !Number.isInteger(c) || c < 0 || c >= m.cables.length || m.cortados.includes(c)) return { ok: false, error: 'Ese cable no' };
    m.cortados.push(c);
    if (c === cableCorrecto(m.cables, e.serie)) resuelto(e, i); else fallo(e, i, 'Cable equivocado');
    return { ok: true };
  }
  if (a.tipo === 'boton') {
    if (m.tipo !== 'boton') return { ok: false, error: 'No es un botón' };
    if (a.fase === 'abajo') { m.abajo = ahora; m.tira = ['azul', 'amarillo', 'blanco', 'rojo'][Math.floor(e.rnd() * 4)]; return { ok: true }; }
    if (a.fase === 'arriba') {
      if (!m.abajo) return { ok: false, error: 'Primero hay que pulsarlo' };
      const rapido = ahora - m.abajo < 900, debe = botonRapido(m, e.serie);
      const lectura = reloj(restante(e, ahora)), tira = m.tira; m.abajo = null; m.tira = null;
      if (debe) { if (rapido) resuelto(e, i); else fallo(e, i, 'Había que soltarlo enseguida'); }
      else if (rapido) fallo(e, i, 'Había que mantenerlo');
      else if (lectura.includes(cifraTira(tira))) resuelto(e, i); else fallo(e, i, `Soltado con el reloj en ${lectura}`);
      return { ok: true };
    }
  }
  if (a.tipo === 'simbolo') {
    const s = String(a.s);
    if (m.tipo !== 'simbolos' || !m.simbolos.includes(s) || m.pulsados.includes(s)) return { ok: false, error: 'Ese símbolo no' };
    const toca = ordenSimbolos(m)[m.pulsados.length];
    if (s === toca) { m.pulsados.push(s); if (m.pulsados.length === 4) resuelto(e, i); } else { m.pulsados = []; fallo(e, i, 'Orden equivocado'); }
    return { ok: true };
  }
  return { ok: false, error: 'Acción desconocida' };
}
function tiempo(e, ahora) { if (e.ganador || e.fase !== 'activa' || ahora < e.hasta) return false; explotar(e); return true; }
function vista(e, yo) {
  const art = yo === e.artificiero;
  return {
    n: e.n, bomba: e.bomba + 1, bombas: BOMBAS.length, artificiero: e.artificiero, fase: e.fase, hasta: e.hasta, fallos: e.fallos, hechos: e.hechos, listos: e.listos, aviso: e.aviso,
    modulos: art || e.fase === 'boom' ? e.modulos.map((m) => (m.tipo === 'cables' ? { tipo: 'cables', cables: m.cables, cortados: m.cortados } : m.tipo === 'boton' ? { tipo: 'boton', color: m.color, texto: m.texto, tira: m.tira } : { tipo: 'simbolos', simbolos: m.simbolos, pulsados: m.pulsados })) : e.modulos.map((m) => ({ tipo: m.tipo })),
    serie: art || e.fase === 'boom' ? e.serie : null, manual: art ? null : { reglas: REGLAS, simbolos: SIMBOLOS }, ganadores: e.ganador,
  };
}
const turno = (e) => (e.ganador ? -1 : e.fase === 'activa' ? e.artificiero : -1);
const fin = (e) => (e.ganador ? { ganadores: e.ganador, texto: e.explotada ? `¡BUM! Explotó la bomba ${e.bomba + 1}` : '¡Las tres bombas desactivadas!' } : null);
const bot = () => null;
module.exports = { id: 'bomba', min: 2, max: 6, sinCpu: true, nuevo, vista, accion: (e, yo, a) => accion(e, yo, a), turno, fin, bot, tiempo, _: { accion, cableCorrecto, botonRapido, cifraTira, ordenSimbolos, SIMBOLOS, REGLAS } };
