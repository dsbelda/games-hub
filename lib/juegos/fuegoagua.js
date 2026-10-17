'use strict';
// Fuego y Agua (cooperativo, 2 personas). La partida la lleva el navegador de quien crea la sala (asiento 0,
// Fuego); el servidor solo reenvía las teclas de Agua y las fotos de la partida, y apunta los niveles superados.
const NIVELES = 4;
function nuevo() { return { nivel: 0, tiempos: [], ganado: false }; }
function accion(e, yo, a) {
  if (a.tipo === 'teclas') { if (yo !== 1) return { ok: false }; return { ok: true, evento: { tipo: 'teclas', k: Number(a.k) & 7 }, sinVista: true }; }
  if (a.tipo === 'foto') {
    if (yo !== 0) return { ok: false };
    const f = a.f; if (!f || typeof f !== 'object' || JSON.stringify(f).length > 4000) return { ok: false };
    return { ok: true, evento: { tipo: 'foto', f }, sinVista: true };
  }
  if (a.tipo === 'nivel') {
    if (yo !== 0 || Number(a.n) !== e.nivel) return { ok: false, error: 'Nivel no válido' };
    e.tiempos.push(Math.max(0, Math.round(Number(a.segundos) || 0)));
    e.nivel++;
    if (e.nivel >= NIVELES) e.ganado = true;
    return { ok: true };
  }
  return { ok: false, error: 'Acción desconocida' };
}
const vista = (e) => ({ nivel: e.nivel, total: NIVELES, tiempos: e.tiempos, ganado: e.ganado });
const turno = () => -1;
const fin = (e) => (e.ganado ? { ganadores: [0, 1], texto: `¡Todos los niveles en ${e.tiempos.reduce((a, b) => a + b, 0)} s!` } : null);
const bot = () => null;
module.exports = { id: 'fuegoagua', min: 2, max: 2, sinCpu: true, nuevo, vista, accion, turno, fin, bot };
