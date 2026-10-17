# dsbelda Games (portal de juegos)

Portal de juegos con diseño propio (pixel art suave, modo oscuro) en `games.dsbelda.dev`: 24 juegos. Con salas y CPU: Brisca, El juego de la Unidad, Cuatro en raya, Hundir la flota, Damas, Ajedrez, Tute, Chinchón, Póquer, Mus y Parchís. Solo personas: El impostor, Stop, Dibuja y adivina y Hombre lobo. En solitario: Serpiente, 2048, Memoria, Palabra del día, Buscaminas, Bloques y Solitario. Cuentas opcionales (`lib/cuentas.js`, SQLite). Miniaturas con `node tools/miniaturas.js`.

- `lib/catalogo.js`: lista de juegos (`estado: 'listo' | 'pronto'`).
- `server.js`: Express, puerto 3400 en `127.0.0.1`.
- `npm test`.
