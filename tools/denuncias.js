#!/usr/bin/env node
'use strict';
// Revisión de denuncias y silencios. Uso (en el servidor, como ubuntu):
//   node tools/denuncias.js                      denuncias nuevas
//   node tools/denuncias.js --todas              todas
//   node tools/denuncias.js --revisada 12        marca la denuncia 12 como revisada (o «--revisada todas»)
//   node tools/denuncias.js --silenciar NOMBRE [horas]   silencia a una cuenta (24 h por defecto)
//   node tools/denuncias.js --quitar NOMBRE      quita el silencio
//   node tools/denuncias.js --silencios          quién está silenciado ahora
// Por defecto usa /home/app/apps/games/data/games.db (o la ruta de la variable DB).
const { DatabaseSync } = require('node:sqlite');
const ruta = process.env.DB || '/home/app/apps/games/data/games.db';
const db = new DatabaseSync(ruta);
const a = process.argv.slice(2);
const cuenta = (n) => db.prepare('SELECT id FROM usuarios WHERE clave_min = ?').get(String(n || '').toLowerCase());
const f = (t) => new Date(t).toLocaleString('es');
if (a[0] === '--revisada') {
  if (a[1] === 'todas') console.log(db.prepare("UPDATE denuncias SET estado = 'revisada' WHERE estado = 'nueva'").run().changes, 'marcadas');
  else console.log(db.prepare("UPDATE denuncias SET estado = 'revisada' WHERE id = ?").run(Number(a[1])).changes, 'marcada');
} else if (a[0] === '--silenciar') {
  const u = cuenta(a[1]); if (!u) { console.error('No hay una cuenta con ese nombre (los invitados no se pueden silenciar a mano)'); process.exit(1); }
  const h = Number(a[2]) || 24;
  db.prepare("INSERT INTO silencios (clave, hasta, motivo) VALUES (?, ?, 'manual') ON CONFLICT (clave) DO UPDATE SET hasta = excluded.hasta, motivo = 'manual'").run('u:' + u.id, Date.now() + h * 3600000);
  console.log(`${a[1]} silenciado ${h} h`);
} else if (a[0] === '--quitar') {
  const u = cuenta(a[1]); if (!u) { console.error('No hay una cuenta con ese nombre'); process.exit(1); }
  console.log(db.prepare('DELETE FROM silencios WHERE clave = ?').run('u:' + u.id).changes, 'silencio quitado');
} else if (a[0] === '--silencios') {
  for (const s of db.prepare('SELECT clave, hasta, motivo FROM silencios WHERE hasta > ?').all(Date.now())) {
    const u = s.clave.startsWith('u:') ? db.prepare('SELECT nombre FROM usuarios WHERE id = ?').get(Number(s.clave.slice(2))) : null;
    console.log(`${u ? u.nombre : s.clave.slice(0, 10) + '… (invitado)'} hasta ${f(s.hasta)} · ${s.motivo}`);
  }
} else {
  const filas = db.prepare(a[0] === '--todas' ? 'SELECT * FROM denuncias ORDER BY id DESC LIMIT 200' : "SELECT * FROM denuncias WHERE estado = 'nueva' ORDER BY id").all();
  if (!filas.length) console.log('No hay denuncias nuevas.');
  for (const d of filas) {
    const de = d.de_usuario ? db.prepare('SELECT nombre FROM usuarios WHERE id = ?').get(d.de_usuario)?.nombre || '(cuenta borrada)' : 'invitado';
    console.log(`#${d.id} ${f(d.fecha)} [${d.estado}] ${d.contexto}${d.sala ? ' sala ' + d.sala : ''} · motivo: ${d.motivo}\n   ${d.contra_nombre}${d.contra_usuario ? ' (cuenta)' : ' (invitado)'}: «${d.texto}»\n   denuncia: ${de}`);
  }
}
