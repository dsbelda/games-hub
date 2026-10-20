'use strict';
// Denuncias de mensajes (del chat de una sala o privados) y silencios automáticos.
// Cada denuncia guarda el texto del mensaje, quién denuncia, a quién y cuándo (12 meses). Si 3 cuentas distintas
// denuncian a la misma persona en 24 h, se la silencia 24 h (en chats de sala y privados). Las denuncias de
// invitados (sin cuenta) se guardan, pero no cuentan para el silencio automático (evita que alguien con muchos
// navegadores silencie a otra persona). El titular las revisa con `node tools/denuncias.js`.
const MOTIVOS = ['insultos', 'acoso', 'spam', 'inapropiado', 'datos', 'otro'];
const DOCE_MESES = 365 * 86400000;
class Moderacion {
  constructor(db) {
    this.db = db;
    db.exec(`
      CREATE TABLE IF NOT EXISTS denuncias (
        id INTEGER PRIMARY KEY, fecha INTEGER NOT NULL, de_usuario INTEGER, de_clave TEXT NOT NULL,
        contra_nombre TEXT NOT NULL, contra_usuario INTEGER, contra_clave TEXT NOT NULL,
        contexto TEXT NOT NULL, sala TEXT, texto TEXT NOT NULL, motivo TEXT NOT NULL, estado TEXT NOT NULL DEFAULT 'nueva');
      CREATE INDEX IF NOT EXISTS denuncias_contra ON denuncias (contra_clave, fecha);
      CREATE TABLE IF NOT EXISTS silencios (clave TEXT PRIMARY KEY, hasta INTEGER NOT NULL, motivo TEXT);
    `);
  }
  // clave de una persona: 'u:ID' si tiene cuenta; 'g:IDENTIDAD' si es invitada
  static clave(usuarioId, identidad) { return usuarioId ? `u:${usuarioId}` : `g:${identidad}`; }
  silenciadoHasta(clave) { const r = this.db.prepare('SELECT hasta FROM silencios WHERE clave = ?').get(clave); return r && r.hasta > Date.now() ? r.hasta : 0; }
  silenciar(clave, horas, motivo = 'manual') { this.db.prepare('INSERT INTO silencios (clave, hasta, motivo) VALUES (?, ?, ?) ON CONFLICT (clave) DO UPDATE SET hasta = excluded.hasta, motivo = excluded.motivo').run(clave, Date.now() + horas * 3600000, motivo); }
  quitarSilencio(clave) { this.db.prepare('DELETE FROM silencios WHERE clave = ?').run(clave); }
  denunciar({ deUsuario = null, deIdentidad, contraNombre, contraUsuario = null, contraIdentidad, contexto, sala = null, texto, motivo }) {
    const deClave = Moderacion.clave(deUsuario, deIdentidad), contraClave = Moderacion.clave(contraUsuario, contraIdentidad);
    if (deClave === contraClave) return { ok: false, error: 'No puedes denunciarte a ti mismo' };
    if (!MOTIVOS.includes(motivo)) motivo = 'otro';
    const ahora = Date.now();
    if (this.db.prepare('SELECT COUNT(*) n FROM denuncias WHERE de_clave = ? AND fecha > ?').get(deClave, ahora - 3600000).n >= 10) return { ok: false, error: 'Has enviado muchas denuncias en poco tiempo' };
    if (this.db.prepare('SELECT 1 FROM denuncias WHERE de_clave = ? AND contra_clave = ? AND texto = ? AND fecha > ?').get(deClave, contraClave, texto, ahora - 86400000)) return { ok: true, repetida: true };
    this.db.prepare('INSERT INTO denuncias (fecha, de_usuario, de_clave, contra_nombre, contra_usuario, contra_clave, contexto, sala, texto, motivo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(ahora, deUsuario, deClave, String(contraNombre).slice(0, 40), contraUsuario, contraClave, contexto, sala, String(texto).slice(0, 500), motivo);
    console.log(`[denuncia] ${contraNombre} · ${motivo} · ${contexto}`);
    const n = this.db.prepare('SELECT COUNT(DISTINCT de_usuario) n FROM denuncias WHERE contra_clave = ? AND fecha > ? AND de_usuario IS NOT NULL').get(contraClave, ahora - 86400000).n;
    let silenciado = false;
    if (n >= 3 && !this.silenciadoHasta(contraClave)) { this.silenciar(contraClave, 24, 'automático por denuncias'); silenciado = true; console.log(`[denuncia] silencio automático de 24 h para ${contraNombre}`); }
    return { ok: true, silenciado };
  }
  pendientes() { return this.db.prepare("SELECT * FROM denuncias WHERE estado = 'nueva' ORDER BY id").all(); }
  limpiar() { this.db.prepare('DELETE FROM denuncias WHERE fecha < ?').run(Date.now() - DOCE_MESES); this.db.prepare('DELETE FROM silencios WHERE hasta < ?').run(Date.now()); }
}
module.exports = { Moderacion, MOTIVOS };
