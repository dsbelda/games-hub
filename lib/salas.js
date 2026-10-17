'use strict';
// Salas genéricas para cualquier juego por turnos. No sabe nada de sockets: el servidor le
// pregunta y reparte. Cada juego (lib/juegos/*.js) cumple esta interfaz:
//   id, min, max                      jugadores admitidos
//   nuevo(n, rnd)                     estado inicial para n jugadores
//   vista(e, yo)                      lo que ve el asiento `yo` (-1 = espectador); nunca las manos ajenas
//   accion(e, yo, a)                  aplica la acción; devuelve { ok } o { ok: false, error }
//   turno(e)                          asiento al que le toca (-1 si nadie)
//   fin(e)                            null o { ganadores: [asientos], texto }
//   bot(e, yo, nivel, rnd)            acción que haría la CPU (o null si no tiene nada que hacer)
const crypto = require('node:crypto');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const NIVELES = ['normal', 'dificil'];
const MAX_SALAS = 300;
const TTL_ESPERA = 60 * 60 * 1000;
const TTL_JUEGO = 12 * 60 * 60 * 1000;
const TTL_FIN = 30 * 60 * 1000;
const AUSENTE_MS = 30 * 1000; // a un jugador desconectado le juega la CPU pasado este tiempo en su turno

const rnd = () => crypto.randomBytes(4).readUInt32LE() / 4294967296;
const CONTROL = new RegExp('[\\u0000-\\u001f\\u007f\\u200b-\\u200f\\u2028-\\u202e\\u2066-\\u2069]', 'g');
const limpiar = (s, max) => String(s ?? '').replace(CONTROL, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const NOMBRES_CPU = ['Tomasa', 'Paco', 'Remedios', 'Vicent', 'Amparo', 'Pepe', 'Fina', 'Ximo'];

class Salas {
  // retardoCpu = 0 → las CPUs juegan de golpe (tests). alCambiar(sala) avisa al servidor para repartir vistas.
  constructor({ juegos, retardoCpu = 700, ahora = Date.now, conectado = () => true, alCambiar = () => {} }) {
    this.juegos = juegos;
    this.retardoCpu = retardoCpu;
    this.ahora = ahora;
    this.conectado = conectado;
    this.alCambiar = alCambiar;
    this.jugadores = new Map(); // id -> { id, nombre, sala }
    this.salas = new Map(); // código -> sala
  }

  // --- jugadores ---------------------------------------------------------------------------
  hola(id, nombre) {
    const n = limpiar(nombre, 16);
    if (n.length < 2) return { ok: false, error: 'El apodo debe tener al menos 2 letras' };
    let p = this.jugadores.get(id);
    if (!p) { p = { id, nombre: n, sala: null }; this.jugadores.set(id, p); }
    p.nombre = n;
    const s = this.salaDe(id);
    if (s) { const a = s.asientos.find((x) => x.id === id); if (a) a.nombre = this.nombreUnico(s, n, id); this.alCambiar(s); }
    return { ok: true };
  }
  nombreUnico(sala, n, id) {
    let r = n, i = 2;
    while (sala.asientos.some((a) => a.id !== id && a.nombre === r)) r = `${n.slice(0, 13)} ${i++}`;
    return r;
  }
  salaDe(id) { const p = this.jugadores.get(id); return (p && p.sala && this.salas.get(p.sala)) || null; }
  asientoDe(sala, id) { return sala.asientos.findIndex((a) => a.id === id && !a.bot); }

  // --- salas -------------------------------------------------------------------------------
  crear(id, juegoId, { publica = true } = {}) {
    const p = this.jugadores.get(id);
    if (!p) return { ok: false, error: 'Elige un apodo primero' };
    const J = this.juegos[juegoId];
    if (!J) return { ok: false, error: 'Ese juego no existe' };
    if (this.salas.size >= MAX_SALAS) return { ok: false, error: 'Hay demasiadas salas abiertas; prueba en un rato' };
    this.salir(id);
    let code;
    do { code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(rnd() * CODE_CHARS.length)]).join(''); } while (this.salas.has(code));
    const sala = { code, juego: juegoId, publica: !!publica, anfitrion: id, asientos: [{ id, nombre: p.nombre, bot: false }], fase: 'espera', estado: null, resultado: null, chat: [], tocada: this.ahora(), turnoDesde: 0 };
    this.salas.set(code, sala);
    p.sala = code;
    return { ok: true, sala };
  }

  unirse(id, code) {
    const p = this.jugadores.get(id);
    if (!p) return { ok: false, error: 'Elige un apodo primero' };
    const sala = this.salas.get(String(code || '').toUpperCase());
    if (!sala) return { ok: false, error: 'No hay ninguna sala con ese código' };
    if (p.sala === sala.code) return { ok: true, sala };
    // ¿ya tenía asiento (p. ej. vuelve tras salir al menú)? Recuperarlo
    const mio = sala.asientos.find((a) => a.id === id);
    if (mio) { this.salir(id); p.sala = sala.code; if (mio.sustituto) { mio.bot = false; delete mio.sustituto; delete mio.nivel; } this.tocar(sala); return { ok: true, sala }; }
    if (sala.fase !== 'espera') return { ok: false, error: 'La partida ya ha empezado' };
    if (sala.asientos.length >= this.juegos[sala.juego].max) return { ok: false, error: 'La sala está llena' };
    this.salir(id);
    sala.asientos.push({ id, nombre: this.nombreUnico(sala, p.nombre, id), bot: false });
    p.sala = sala.code;
    this.tocar(sala);
    return { ok: true, sala };
  }

  salir(id) {
    const p = this.jugadores.get(id);
    const sala = this.salaDe(id);
    if (!p || !sala) return { ok: true };
    p.sala = null;
    const i = sala.asientos.findIndex((a) => a.id === id);
    if (sala.fase === 'espera' || sala.fase === 'fin') {
      if (i >= 0) sala.asientos.splice(i, 1);
    } else if (i >= 0) {
      // en plena partida la CPU ocupa su sitio; si vuelve con el enlace, lo recupera
      Object.assign(sala.asientos[i], { bot: true, nivel: 'normal', sustituto: true });
    }
    const humanos = sala.asientos.filter((a) => !a.bot);
    if (!humanos.length) { this.borrar(sala); return { ok: true }; }
    if (sala.anfitrion === id) sala.anfitrion = humanos[0].id;
    this.tocar(sala);
    this.moverCpu(sala);
    return { ok: true };
  }

  borrar(sala) {
    clearTimeout(sala.temporizador);
    for (const a of sala.asientos) { const p = this.jugadores.get(a.id); if (p && p.sala === sala.code) p.sala = null; }
    this.salas.delete(sala.code);
  }

  anadirCpu(id, nivel) {
    const sala = this.salaDe(id);
    if (!sala || sala.anfitrion !== id) return { ok: false, error: 'Solo el anfitrión puede añadir CPUs' };
    if (sala.fase !== 'espera') return { ok: false, error: 'La partida ya ha empezado' };
    if (sala.asientos.length >= this.juegos[sala.juego].max) return { ok: false, error: 'La sala está llena' };
    const usados = new Set(sala.asientos.map((a) => a.nombre));
    const nombre = NOMBRES_CPU.find((n) => !usados.has(n)) || `CPU ${sala.asientos.length + 1}`;
    sala.asientos.push({ id: 'cpu-' + crypto.randomBytes(6).toString('hex'), nombre, bot: true, nivel: NIVELES.includes(nivel) ? nivel : 'normal' });
    this.tocar(sala);
    return { ok: true };
  }

  quitar(id, idx) {
    const sala = this.salaDe(id);
    if (!sala || sala.anfitrion !== id) return { ok: false, error: 'Solo el anfitrión puede quitar jugadores' };
    if (sala.fase !== 'espera') return { ok: false, error: 'La partida ya ha empezado' };
    const a = sala.asientos[idx];
    if (!a || a.id === id) return { ok: false, error: 'No se puede quitar' };
    sala.asientos.splice(idx, 1);
    if (!a.bot) { const p = this.jugadores.get(a.id); if (p) p.sala = null; }
    this.tocar(sala);
    return { ok: true, expulsado: a.bot ? null : a.id };
  }

  // reordenar asientos (en Brisca a 4 importan las parejas)
  mover(id, idx, dir) {
    const sala = this.salaDe(id);
    if (!sala || sala.anfitrion !== id || sala.fase !== 'espera') return { ok: false, error: 'Solo el anfitrión, antes de empezar' };
    const j = idx + (dir < 0 ? -1 : 1);
    if (!sala.asientos[idx] || !sala.asientos[j]) return { ok: false, error: 'No se puede mover' };
    [sala.asientos[idx], sala.asientos[j]] = [sala.asientos[j], sala.asientos[idx]];
    this.tocar(sala);
    return { ok: true };
  }

  empezar(id) {
    const sala = this.salaDe(id);
    if (!sala || sala.anfitrion !== id) return { ok: false, error: 'Solo el anfitrión puede empezar' };
    if (sala.fase === 'juego') return { ok: false, error: 'Ya ha empezado' };
    const J = this.juegos[sala.juego];
    // la revancha vacía los asientos de quien se fue
    sala.asientos = sala.asientos.filter((a) => a.bot ? !a.sustituto : this.jugadores.get(a.id)?.sala === sala.code);
    if (sala.asientos.length < J.min) return { ok: false, error: `Hacen falta al menos ${J.min} jugadores (puedes añadir CPUs)` };
    if (sala.asientos.length > J.max) return { ok: false, error: `Como mucho ${J.max} jugadores` };
    sala.estado = J.nuevo(sala.asientos.length, rnd);
    sala.fase = 'juego';
    sala.resultado = null;
    sala.turnoDesde = this.ahora();
    this.tocar(sala);
    this.moverCpu(sala);
    return { ok: true };
  }

  accion(id, a) {
    const sala = this.salaDe(id);
    if (!sala || sala.fase !== 'juego') return { ok: false, error: 'No hay partida en marcha' };
    const yo = this.asientoDe(sala, id);
    if (yo < 0) return { ok: false, error: 'No juegas en esta sala' };
    return this.aplicar(sala, yo, a);
  }

  aplicar(sala, yo, a) {
    const J = this.juegos[sala.juego];
    if (!a || typeof a !== 'object' || typeof a.tipo !== 'string') return { ok: false, error: 'Acción no válida' };
    const antes = J.turno(sala.estado);
    let r;
    try { r = J.accion(sala.estado, yo, a); } catch (e) { console.error('[salas]', sala.juego, e); r = { ok: false, error: 'Error del juego' }; }
    if (!r.ok) return r;
    if (J.turno(sala.estado) !== antes) sala.turnoDesde = this.ahora();
    const f = J.fin(sala.estado);
    if (f) { sala.fase = 'fin'; sala.resultado = f; for (const s of sala.asientos) if (s.sustituto) s.bot = true; }
    this.tocar(sala);
    this.moverCpu(sala);
    return { ok: true };
  }

  // Hace jugar a la CPU si le toca. Con retardo 0 juega de golpe (bucle); si no, una jugada cada retardoCpu.
  moverCpu(sala) {
    clearTimeout(sala.temporizador);
    if (sala.fase !== 'juego' || !this.salas.has(sala.code)) return;
    const J = this.juegos[sala.juego];
    const paso = () => {
      if (sala.fase !== 'juego') return false;
      for (const i of this.quienesCpu(sala, J)) {
        const a = J.bot(sala.estado, i, sala.asientos[i].nivel || 'normal', rnd);
        if (a && J.accion(sala.estado, i, a).ok) {
          sala.turnoDesde = this.ahora();
          const f = J.fin(sala.estado);
          if (f) { sala.fase = 'fin'; sala.resultado = f; }
          this.tocar(sala);
          return true;
        }
      }
      return false;
    };
    if (this.retardoCpu === 0) { let n = 0; while (n++ < 5000 && paso()); return; }
    if (!this.quienesCpu(sala, J).length) return;
    sala.temporizador = setTimeout(() => { if (paso()) this.moverCpu(sala); }, this.retardoCpu);
  }
  // asientos de CPU que podrían querer actuar: primero el del turno, luego el resto (p. ej. «¡pillado!» en La Unidad)
  quienesCpu(sala, J) {
    const t = J.turno(sala.estado);
    const out = [];
    if (t >= 0 && sala.asientos[t]?.bot) out.push(t);
    sala.asientos.forEach((a, i) => { if (a.bot && i !== t) out.push(i); });
    return out;
  }

  chat(id, texto) {
    const sala = this.salaDe(id);
    const p = this.jugadores.get(id);
    const t = limpiar(texto, 200);
    if (!sala || !p || !t) return { ok: false };
    sala.chat.push({ nombre: p.nombre, texto: t, hora: this.ahora() });
    if (sala.chat.length > 60) sala.chat.splice(0, sala.chat.length - 60);
    this.tocar(sala);
    return { ok: true };
  }

  tocar(sala) { sala.tocada = this.ahora(); this.alCambiar(sala); }

  // --- vistas ------------------------------------------------------------------------------
  vista(sala, id) {
    const J = this.juegos[sala.juego];
    const yo = sala.asientos.findIndex((a) => a.id === id);
    return {
      code: sala.code, juego: sala.juego, fase: sala.fase, publica: sala.publica,
      soyAnfitrion: sala.anfitrion === id, yo,
      min: J.min, max: J.max,
      asientos: sala.asientos.map((a) => ({ nombre: a.nombre, bot: !!a.bot, nivel: a.bot ? a.nivel : undefined, sustituto: !!a.sustituto, conectado: a.bot || this.conectado(a.id), anfitrion: a.id === sala.anfitrion })),
      partida: sala.estado ? J.vista(sala.estado, sala.asientos[yo]?.bot ? -1 : yo) : null,
      resultado: sala.resultado,
      chat: sala.chat,
    };
  }
  lista(juegoId) {
    return [...this.salas.values()]
      .filter((s) => s.publica && s.fase === 'espera' && s.juego === juegoId && s.asientos.length < this.juegos[s.juego].max)
      .slice(0, 30)
      .map((s) => ({ code: s.code, anfitrion: this.jugadores.get(s.anfitrion)?.nombre || '?', jugadores: s.asientos.length, max: this.juegos[s.juego].max }));
  }

  // --- mantenimiento (cada pocos segundos) ---------------------------------------------------
  tick() {
    const ahora = this.ahora();
    for (const sala of [...this.salas.values()]) {
      const ttl = sala.fase === 'espera' ? TTL_ESPERA : sala.fase === 'juego' ? TTL_JUEGO : TTL_FIN;
      if (ahora - sala.tocada > ttl) { this.borrar(sala); continue; }
      if (sala.fase !== 'juego') continue;
      // jugador humano desconectado en su turno: juega la CPU por él (sin quitarle el asiento)
      const J = this.juegos[sala.juego];
      const t = J.turno(sala.estado);
      const a = sala.asientos[t];
      if (a && !a.bot && !this.conectado(a.id) && ahora - sala.turnoDesde > AUSENTE_MS) {
        const acc = J.bot(sala.estado, t, 'normal', rnd);
        if (acc) this.aplicar(sala, t, acc);
      }
    }
  }
}

module.exports = { Salas, NIVELES, limpiar };
