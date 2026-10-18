'use strict';
// Teléfono dibujado (3-10): cada uno escribe una frase; la siguiente persona la dibuja, la siguiente describe
// el dibujo, otra dibuja esa descripción… hasta que cada cadena ha pasado por todos. Al final se enseñan las
// cadenas una a una para reírse de cómo ha cambiado el mensaje. No hay puntos.
// Nadie ve las demás cadenas hasta el final; en el repaso la vista solo lleva la cadena que se enseña.
const { DIBUJO } = require('./palabras-fiesta');
const T = { frase: 60000, dibujo: 100000, describir: 50000 }, MAX_PUNTOS = 8000, MAX_TRAZOS = 400;

function nuevo(n, rnd = Math.random) {
  const e = { n, rnd, paso: 0, cadenas: Array.from({ length: n }, () => []), fase: 'jugar', borrador: Array(n).fill(null), listos: Array(n).fill(false), revela: null, terminado: false };
  e.hasta = Date.now() + T.frase;
  return e;
}
const tipoPaso = (paso) => (paso === 0 ? 'frase' : paso % 2 ? 'dibujo' : 'describir');
const cadenaDe = (e, j) => (j - e.paso + e.n * 10) % e.n;
function limpiarTrazos(tr) {
  if (!Array.isArray(tr)) return null;
  let total = 0; const out = [];
  for (const t of tr.slice(0, MAX_TRAZOS)) {
    if (!t || !Array.isArray(t.p)) continue;
    const p = t.p.slice(0, 800).map((x) => Math.max(0, Math.min(1000, Math.round(Number(x) || 0))));
    if (p.length < 2 || p.length % 2) continue;
    total += p.length / 2; if (total > MAX_PUNTOS) break;
    out.push({ c: Math.max(0, Math.min(11, Number(t.c) | 0)), g: Math.max(0, Math.min(3, Number(t.g) | 0)), p });
  }
  return out;
}
const limpiarFrase = (f) => String(f ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
function avanzar(e) {
  const tipo = tipoPaso(e.paso);
  for (let j = 0; j < e.n; j++) {
    let b = e.borrador[j];
    if (tipo === 'dibujo') b = b || [];
    else if (!b) b = tipo === 'frase' ? DIBUJO[Math.floor(e.rnd() * DIBUJO.length)] : '(no le dio tiempo)';
    e.cadenas[cadenaDe(e, j)].push(tipo === 'dibujo' ? { tipo, j, trazos: b } : { tipo: 'frase', j, frase: b });
  }
  e.paso++; e.borrador.fill(null); e.listos.fill(false);
  if (e.paso >= e.n) { e.fase = 'revelar'; e.revela = { c: 0, k: 0 }; e.hasta = 0; return; }
  e.hasta = Date.now() + T[tipoPaso(e.paso)];
}
function accion(e, yo, a) {
  if (e.terminado) return { ok: false, error: 'La partida ha terminado' };
  if (a.tipo === 'guardar' || a.tipo === 'listo') {
    if (e.fase !== 'jugar') return { ok: false, error: 'Ahora no' };
    const tipo = tipoPaso(e.paso);
    if ('trazos' in a || 'frase' in a) e.borrador[yo] = tipo === 'dibujo' ? limpiarTrazos(a.trazos) : limpiarFrase(a.frase) || null;
    if (a.tipo === 'guardar') return { ok: true, sinVista: true };
    if (tipo !== 'dibujo' && !e.borrador[yo]) return { ok: false, error: 'Escribe algo antes' };
    e.listos[yo] = !e.listos[yo] || !!a.forzar;
    if (e.listos.every(Boolean)) avanzar(e);
    return { ok: true };
  }
  if (a.tipo === 'siguiente') {
    if (e.fase !== 'revelar') return { ok: false, error: 'Ahora no' };
    const r = e.revela;
    if (r.k < e.n - 1) r.k++;
    else if (r.c < e.n - 1) { r.c++; r.k = 0; }
    else e.terminado = true;
    return { ok: true };
  }
  return { ok: false, error: 'Acción desconocida' };
}
function tiempo(e, ahora) {
  if (e.fase !== 'jugar' || !e.hasta || ahora < e.hasta) return false;
  avanzar(e); return true;
}
function vista(e, yo) {
  const v = { n: e.n, fase: e.fase, paso: e.paso, pasos: e.n, hasta: e.hasta, listos: e.listos, terminado: e.terminado };
  if (e.fase === 'jugar') {
    v.tipo = tipoPaso(e.paso);
    if (yo >= 0) {
      const c = e.cadenas[cadenaDe(e, yo)];
      v.anterior = c.length ? c[c.length - 1] : null; // lo que me toca dibujar o describir
      v.mio = e.borrador[yo];
    }
  } else {
    const r = e.revela;
    v.revela = { c: r.c, k: r.k, autor: e.cadenas[r.c][0].j, items: e.cadenas[r.c].slice(0, r.k + 1) };
  }
  return v;
}
const turno = () => -1;
const fin = (e) => (e.terminado ? { ganadores: Array.from({ length: e.n }, (_, i) => i), texto: '¡Todas las cadenas vistas!' } : null);
const bot = () => null;
module.exports = { id: 'telefono', min: 3, max: 10, sinCpu: true, nuevo, vista, accion, turno, fin, bot, tiempo, _: { cadenaDe, tipoPaso } };
