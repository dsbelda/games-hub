'use strict';
// Parte social de las cuentas: amistades (solicitar, aceptar, rechazar, eliminar), bloqueos y mensajes privados
// entre amigos (también las invitaciones a una sala, que son un mensaje con juego y código). Usa la misma base de
// datos que las cuentas. Límites: 30 solicitudes al día, 20 mensajes por minuto, 500 caracteres; los mensajes
// se borran a los 6 meses (lo dice la política de privacidad).
const SEIS_MESES = 183 * 86400000;
const CONTROL = new RegExp('[\\u0000-\\u001f\\u007f\\u200b-\\u200f\\u2028-\\u202e\\u2066-\\u2069]', 'g');
const limpiar = (s, max) => String(s ?? '').replace(CONTROL, ' ').replace(/[ \t]+/g, ' ').trim().slice(0, max);

class Social {
  constructor(db) {
    this.db = db;
    db.exec(`
      CREATE TABLE IF NOT EXISTS amistades (
        a INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, b INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        pide INTEGER NOT NULL, aceptada INTEGER NOT NULL DEFAULT 0, fecha INTEGER NOT NULL, PRIMARY KEY (a, b), CHECK (a < b));
      CREATE TABLE IF NOT EXISTS bloqueos (
        usuario INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, bloqueado INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        PRIMARY KEY (usuario, bloqueado));
      CREATE TABLE IF NOT EXISTS mensajes (
        id INTEGER PRIMARY KEY, de INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, para INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        texto TEXT NOT NULL, juego TEXT, sala TEXT, fecha INTEGER NOT NULL, leido INTEGER NOT NULL DEFAULT 0);
      CREATE INDEX IF NOT EXISTS mensajes_para ON mensajes (para, leido);
      CREATE INDEX IF NOT EXISTS mensajes_par ON mensajes (de, para, id);
    `);
    this.ritmo = new Map(); // usuario -> marcas de tiempo (mensajes y solicitudes)
  }
  par(x, y) { return x < y ? [x, y] : [y, x]; }
  relacion(x, y) { const [a, b] = this.par(x, y); return this.db.prepare('SELECT * FROM amistades WHERE a = ? AND b = ?').get(a, b) || null; }
  sonAmigos(x, y) { return !!this.relacion(x, y)?.aceptada; }
  bloqueado(por, quien) { return !!this.db.prepare('SELECT 1 FROM bloqueos WHERE usuario = ? AND bloqueado = ?').get(por, quien); }
  usuarioPorNombre(nombre) { return this.db.prepare('SELECT id, nombre, avatar FROM usuarios WHERE clave_min = ?').get(String(nombre || '').normalize('NFC').trim().toLowerCase()) || null; }
  limite(id, clave, max, ventana) {
    const k = `${clave}:${id}`, ahora = Date.now(), v = (this.ritmo.get(k) || []).filter((t) => ahora - t < ventana);
    if (v.length >= max) { this.ritmo.set(k, v); return false; }
    v.push(ahora); this.ritmo.set(k, v); return true;
  }

  solicitar(yo, nombre) {
    const o = this.usuarioPorNombre(nombre);
    if (!o) return { ok: false, error: 'No hay nadie con ese nombre de usuario' };
    if (o.id === yo) return { ok: false, error: 'No puedes ser tu propio amigo (aunque lo seas)' };
    if (this.bloqueado(o.id, yo) || this.bloqueado(yo, o.id)) return { ok: false, error: 'No se puede enviar la solicitud' };
    const r = this.relacion(yo, o.id);
    if (r?.aceptada) return { ok: false, error: 'Ya sois amigos' };
    if (r && r.pide === yo) return { ok: false, error: 'Ya le has enviado una solicitud' };
    if (r && r.pide === o.id) return this.aceptar(yo, o.id); // los dos se lo han pedido: amigos
    if (!this.limite(yo, 'sol', 30, 86400000)) return { ok: false, error: 'Has enviado muchas solicitudes hoy' };
    const [a, b] = this.par(yo, o.id);
    this.db.prepare('INSERT INTO amistades (a, b, pide, aceptada, fecha) VALUES (?, ?, ?, 0, ?)').run(a, b, yo, Date.now());
    return { ok: true, para: o.id, nombre: o.nombre };
  }
  aceptar(yo, otro) {
    const r = this.relacion(yo, otro);
    if (!r || r.aceptada || r.pide === yo) return { ok: false, error: 'No hay solicitud que aceptar' };
    const [a, b] = this.par(yo, otro);
    this.db.prepare('UPDATE amistades SET aceptada = 1, fecha = ? WHERE a = ? AND b = ?').run(Date.now(), a, b);
    return { ok: true, para: otro, aceptada: true };
  }
  quitar(yo, otro) { // rechazar, cancelar o eliminar amistad
    const [a, b] = this.par(yo, otro);
    const r = this.db.prepare('DELETE FROM amistades WHERE a = ? AND b = ?').run(a, b);
    return r.changes ? { ok: true, para: otro } : { ok: false, error: 'No hay nada que quitar' };
  }
  bloquear(yo, otro, on) {
    if (on) { this.quitar(yo, otro); this.db.prepare('INSERT OR IGNORE INTO bloqueos (usuario, bloqueado) VALUES (?, ?)').run(yo, otro); }
    else this.db.prepare('DELETE FROM bloqueos WHERE usuario = ? AND bloqueado = ?').run(yo, otro);
    return { ok: true };
  }
  amigos(yo) {
    return this.db.prepare(`SELECT u.id, u.nombre, u.avatar, u.visto, a.aceptada, a.pide FROM amistades a JOIN usuarios u ON u.id = (CASE WHEN a.a = ? THEN a.b ELSE a.a END)
      WHERE a.a = ? OR a.b = ? ORDER BY u.nombre COLLATE NOCASE`).all(yo, yo, yo)
      .map((x) => ({ id: x.id, nombre: x.nombre, avatar: x.avatar, visto: x.visto, estado: x.aceptada ? 'amigo' : x.pide === yo ? 'enviada' : 'recibida' }));
  }
  bloqueados(yo) { return this.db.prepare('SELECT u.id, u.nombre FROM bloqueos b JOIN usuarios u ON u.id = b.bloqueado WHERE b.usuario = ?').all(yo); }

  mensajeRecibido(yo, id) { return this.db.prepare('SELECT m.id, m.de, m.texto, u.nombre FROM mensajes m JOIN usuarios u ON u.id = m.de WHERE m.id = ? AND m.para = ?').get(Number(id), yo) || null; }
  enviar(yo, otro, texto, extra = {}) {
    const hasta = this.silenciado ? this.silenciado(yo) : 0;
    if (hasta) return { ok: false, error: 'Estás silenciado unas horas por denuncias de otros jugadores' };
    if (!this.sonAmigos(yo, otro)) return { ok: false, error: 'Solo puedes escribir a tus amigos' };
    if (this.bloqueado(otro, yo)) return { ok: false, error: 'No se puede enviar' };
    const t = limpiar(texto, 500);
    if (!t) return { ok: false, error: 'Escribe algo' };
    if (!this.limite(yo, 'msg', 20, 60000)) return { ok: false, error: 'Vas muy rápido: espera un poco' };
    const fecha = Date.now();
    const r = this.db.prepare('INSERT INTO mensajes (de, para, texto, juego, sala, fecha) VALUES (?, ?, ?, ?, ?, ?)').run(yo, otro, t, extra.juego || null, extra.sala || null, fecha);
    return { ok: true, mensaje: { id: Number(r.lastInsertRowid), de: yo, para: otro, texto: t, juego: extra.juego || null, sala: extra.sala || null, fecha, leido: 0 } };
  }
  conversacion(yo, otro, antesDe) {
    const filas = this.db.prepare(`SELECT id, de, para, texto, juego, sala, fecha, leido FROM mensajes WHERE ((de = ? AND para = ?) OR (de = ? AND para = ?)) AND id < ? ORDER BY id DESC LIMIT 60`)
      .all(yo, otro, otro, yo, Number(antesDe) || 1e15);
    this.db.prepare('UPDATE mensajes SET leido = 1 WHERE de = ? AND para = ? AND leido = 0').run(otro, yo);
    return filas.reverse();
  }
  noLeidos(yo) { return Object.fromEntries(this.db.prepare('SELECT de, COUNT(*) n FROM mensajes WHERE para = ? AND leido = 0 GROUP BY de').all(yo).map((x) => [x.de, x.n])); }
  datos(yo) {
    return { amigos: this.amigos(yo).map((a) => ({ nombre: a.nombre, estado: a.estado })), bloqueados: this.bloqueados(yo).map((b) => b.nombre),
      mensajes: this.db.prepare('SELECT m.texto, m.juego, m.sala, m.fecha, d.nombre de, p.nombre para FROM mensajes m JOIN usuarios d ON d.id = m.de JOIN usuarios p ON p.id = m.para WHERE m.de = ? OR m.para = ? ORDER BY m.id').all(yo, yo) };
  }
  limpiarViejos() { this.db.prepare('DELETE FROM mensajes WHERE fecha < ?').run(Date.now() - SEIS_MESES); }
}
module.exports = { Social };
