'use strict';
// Cuentas opcionales: usuario + contraseña (sin correo). SQLite nativo (node:sqlite) en data/games.db (600).
// Contraseñas con scrypt; sesiones con un token aleatorio en cookie HttpOnly (en la base solo su sha256).
// Guarda: estadísticas por juego (partidas, victorias), récords de los juegos en solitario y favoritos.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const SESION_DIAS = 90;
const AVATARES = 12;
// juegos en solitario con récord: true = más es mejor; false = menos es mejor (intentos)
const RECORDS = {
  serpiente: true, '2048': true, 'memoria-facil': false, 'memoria-medio': false, 'memoria-dificil': false,
  'palabra-racha': true, 'buscaminas-facil': false, 'buscaminas-medio': false, 'buscaminas-dificil': false, bloques: true, solitario: false,
  burbujas: true, torres: true, eras: false, minero: true, tortuga: true, volar: true, test: true,
  pajaro: true, saltos: true, frutas: true, carretera: true, dino: true, galletas: true, honda: true, plantas: true,
};
const NOMBRE_RE = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ_-]{3,16}$/;
const TIPICAS = new Set(['12345678', '123456789', '1234567890', 'password', 'contraseña', 'contrasena', 'qwertyui', 'qwerty123', '11111111', '00000000', 'abcd1234', 'iloveyou', 'password1', '87654321', 'asdfghjk']);

const scrypt = (clave, sal) => new Promise((ok, mal) => crypto.scrypt(clave, sal, 64, SCRYPT, (e, k) => (e ? mal(e) : ok(k))));
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');
const minus = (n) => n.normalize('NFC').toLowerCase();

class Cuentas {
  constructor(fichero) {
    if (fichero !== ':memory:') {
      fs.mkdirSync(path.dirname(fichero), { recursive: true, mode: 0o700 });
      const existia = fs.existsSync(fichero);
      this.db = new DatabaseSync(fichero);
      if (!existia) fs.chmodSync(fichero, 0o600);
    } else this.db = new DatabaseSync(':memory:');
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, clave_min TEXT NOT NULL UNIQUE,
        hash TEXT NOT NULL, sal TEXT NOT NULL, avatar INTEGER NOT NULL DEFAULT 0,
        creado INTEGER NOT NULL, visto INTEGER NOT NULL, fallos INTEGER NOT NULL DEFAULT 0, bloqueo INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS sesiones (
        token TEXT PRIMARY KEY, usuario INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, caduca INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS estadisticas (
        usuario INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, juego TEXT NOT NULL,
        partidas INTEGER NOT NULL DEFAULT 0, victorias INTEGER NOT NULL DEFAULT 0, ultima INTEGER, PRIMARY KEY (usuario, juego));
      CREATE TABLE IF NOT EXISTS records (
        usuario INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, juego TEXT NOT NULL, valor INTEGER NOT NULL, fecha INTEGER NOT NULL,
        PRIMARY KEY (usuario, juego));
      CREATE TABLE IF NOT EXISTS favoritos (
        usuario INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, juego TEXT NOT NULL, PRIMARY KEY (usuario, juego));
    `);
  }

  // --- validación ------------------------------------------------------------------------------
  static validarNombre(n) {
    n = String(n ?? '').normalize('NFC').trim();
    if (!NOMBRE_RE.test(n)) return { error: 'El nombre de usuario debe tener de 3 a 16 letras, números, «_» o «-» (sin espacios)' };
    return { nombre: n };
  }
  static validarClave(c, nombre) {
    c = String(c ?? '');
    if (c.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
    if (c.length > 200) return 'La contraseña es demasiado larga';
    if (TIPICAS.has(c.toLowerCase())) return 'Esa contraseña es de las más usadas; elige otra';
    if (nombre && c.toLowerCase().includes(minus(nombre))) return 'La contraseña no puede contener tu nombre de usuario';
    return null;
  }
  existe(nombre) { return !!this.db.prepare('SELECT 1 FROM usuarios WHERE clave_min = ?').get(minus(String(nombre || '').trim())); }

  // --- alta, entrada y sesiones ---------------------------------------------------------------------
  async registrar(nombreIn, clave) {
    const v = Cuentas.validarNombre(nombreIn);
    if (v.error) return { ok: false, error: v.error };
    const e = Cuentas.validarClave(clave, v.nombre);
    if (e) return { ok: false, error: e };
    if (this.existe(v.nombre)) return { ok: false, error: 'Ese nombre de usuario ya existe' };
    const sal = crypto.randomBytes(16).toString('hex');
    const hash = (await scrypt(clave, sal)).toString('hex');
    if (this.existe(v.nombre)) return { ok: false, error: 'Ese nombre de usuario ya existe' };
    const ahora = Date.now();
    const r = this.db.prepare('INSERT INTO usuarios (nombre, clave_min, hash, sal, avatar, creado, visto) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(v.nombre, minus(v.nombre), hash, sal, crypto.randomInt(AVATARES), ahora, ahora);
    return { ok: true, id: Number(r.lastInsertRowid) };
  }

  async entrar(nombre, clave) {
    const u = this.db.prepare('SELECT * FROM usuarios WHERE clave_min = ?').get(minus(String(nombre || '').trim()));
    const ahora = Date.now();
    // siempre se calcula un scrypt, exista o no el usuario, para no delatar qué nombres existen por el tiempo
    const hash = (await scrypt(String(clave ?? ''), u ? u.sal : 'sal-ficticia')).toString('hex');
    if (!u) return { ok: false, error: 'Usuario o contraseña incorrectos' };
    if (u.bloqueo > ahora) return { ok: false, error: `Demasiados intentos. Prueba de nuevo en ${Math.ceil((u.bloqueo - ahora) / 60000)} min` };
    if (!crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(u.hash, 'hex'))) {
      const fallos = u.fallos + 1;
      this.db.prepare('UPDATE usuarios SET fallos = ?, bloqueo = ? WHERE id = ?').run(fallos >= 5 ? 0 : fallos, fallos >= 5 ? ahora + 15 * 60000 : 0, u.id);
      return { ok: false, error: 'Usuario o contraseña incorrectos' };
    }
    this.db.prepare('UPDATE usuarios SET fallos = 0, bloqueo = 0, visto = ? WHERE id = ?').run(ahora, u.id);
    return { ok: true, id: u.id };
  }

  crearSesion(usuario) {
    const token = crypto.randomBytes(32).toString('hex');
    this.db.prepare('INSERT INTO sesiones (token, usuario, caduca) VALUES (?, ?, ?)').run(sha(token), usuario, Date.now() + SESION_DIAS * 86400000);
    return { token, maxAge: SESION_DIAS * 86400 };
  }
  usuarioDeSesion(token) {
    if (!/^[a-f0-9]{64}$/.test(token || '')) return null;
    const r = this.db.prepare('SELECT u.id, u.nombre, u.avatar, u.creado, u.visto FROM sesiones s JOIN usuarios u ON u.id = s.usuario WHERE s.token = ? AND s.caduca > ?').get(sha(token), Date.now());
    if (r && Date.now() - r.visto > 3600000) this.db.prepare('UPDATE usuarios SET visto = ? WHERE id = ?').run(Date.now(), r.id);
    return r ? { id: r.id, nombre: r.nombre, avatar: r.avatar, creado: r.creado } : null;
  }
  cerrarSesion(token) { if (token) this.db.prepare('DELETE FROM sesiones WHERE token = ?').run(sha(token)); }

  // --- perfil ------------------------------------------------------------------------------------
  perfil(id) {
    const u = this.db.prepare('SELECT id, nombre, avatar, creado FROM usuarios WHERE id = ?').get(id);
    if (!u) return null;
    return {
      usuario: { nombre: u.nombre, avatar: u.avatar, creado: u.creado },
      estadisticas: this.db.prepare('SELECT juego, partidas, victorias, ultima FROM estadisticas WHERE usuario = ? ORDER BY ultima DESC').all(id).map((x) => ({ ...x })),
      records: Object.fromEntries(this.db.prepare('SELECT juego, valor FROM records WHERE usuario = ?').all(id).map((x) => [x.juego, x.valor])),
      favoritos: this.db.prepare('SELECT juego FROM favoritos WHERE usuario = ?').all(id).map((x) => x.juego),
    };
  }
  avatar(id, n) {
    n = Number(n);
    if (!Number.isInteger(n) || n < 0 || n >= AVATARES) return { ok: false, error: 'Avatar no válido' };
    this.db.prepare('UPDATE usuarios SET avatar = ? WHERE id = ?').run(n, id);
    return { ok: true };
  }
  async cambiarClave(id, actual, nueva) {
    const u = this.db.prepare('SELECT nombre FROM usuarios WHERE id = ?').get(id);
    const r = await this.entrar(u.nombre, actual);
    if (!r.ok) return { ok: false, error: 'La contraseña actual no es correcta' };
    const e = Cuentas.validarClave(nueva, u.nombre);
    if (e) return { ok: false, error: e };
    const sal = crypto.randomBytes(16).toString('hex');
    const hash = (await scrypt(nueva, sal)).toString('hex');
    this.db.prepare('UPDATE usuarios SET hash = ?, sal = ? WHERE id = ?').run(hash, sal, id);
    this.db.prepare('DELETE FROM sesiones WHERE usuario = ?').run(id); // cierra las demás sesiones
    return { ok: true };
  }
  async borrar(id, clave) {
    const u = this.db.prepare('SELECT nombre FROM usuarios WHERE id = ?').get(id);
    const r = await this.entrar(u.nombre, clave);
    if (!r.ok) return { ok: false, error: 'La contraseña no es correcta' };
    this.db.prepare('DELETE FROM usuarios WHERE id = ?').run(id); // en cascada: sesiones, estadísticas, récords y favoritos
    return { ok: true };
  }
  datos(id) {
    const u = this.db.prepare('SELECT nombre, avatar, creado, visto FROM usuarios WHERE id = ?').get(id);
    const p = this.perfil(id);
    return { cuenta: { nombre: u.nombre, avatar: u.avatar, creada: new Date(u.creado).toISOString(), ultimoAcceso: new Date(u.visto).toISOString() }, estadisticas: p.estadisticas, records: p.records, favoritos: p.favoritos, sesionesAbiertas: this.db.prepare('SELECT COUNT(*) n FROM sesiones WHERE usuario = ?').get(id).n };
  }

  // --- juego -------------------------------------------------------------------------------------
  apuntarPartida(id, juego, gano) {
    this.db.prepare(`INSERT INTO estadisticas (usuario, juego, partidas, victorias, ultima) VALUES (?, ?, 1, ?, ?)
      ON CONFLICT (usuario, juego) DO UPDATE SET partidas = partidas + 1, victorias = victorias + excluded.victorias, ultima = excluded.ultima`).run(id, juego, gano ? 1 : 0, Date.now());
  }
  record(id, juego, valor) {
    if (!(juego in RECORDS)) return { ok: false, error: 'Ese juego no tiene récords' };
    valor = Number(valor);
    if (!Number.isInteger(valor) || valor < 0 || valor > 10_000_000) return { ok: false, error: 'Valor no válido' };
    const mas = RECORDS[juego];
    const r = this.db.prepare(`INSERT INTO records (usuario, juego, valor, fecha) VALUES (?, ?, ?, ?)
      ON CONFLICT (usuario, juego) DO UPDATE SET valor = excluded.valor, fecha = excluded.fecha
      WHERE ${mas ? 'excluded.valor > records.valor' : 'excluded.valor < records.valor'}`).run(id, juego, valor, Date.now());
    return { ok: true, nuevo: r.changes > 0 };
  }
  favorito(id, juego, on) {
    if (on) this.db.prepare('INSERT OR IGNORE INTO favoritos (usuario, juego) VALUES (?, ?)').run(id, juego);
    else this.db.prepare('DELETE FROM favoritos WHERE usuario = ? AND juego = ?').run(id, juego);
    return { ok: true };
  }

  // limpieza diaria: sesiones caducadas y cuentas sin entrar en 2 años (lo dice la política de privacidad)
  limpiar() {
    const ahora = Date.now();
    this.db.prepare('DELETE FROM sesiones WHERE caduca < ?').run(ahora);
    this.db.prepare('DELETE FROM usuarios WHERE visto < ?').run(ahora - 2 * 365 * 86400000);
  }
}

module.exports = { Cuentas, AVATARES, RECORDS };
