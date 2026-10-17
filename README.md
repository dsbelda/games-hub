# dsbelda Games (portal de juegos)

Portal estilo «minijuegos» clásico en `games.dsbelda.dev`: pestañas de categoría, filtros, destacados y miniaturas (`node tools/miniaturas.js`). Juegos con salas y CPU (Brisca, El juego de la Unidad, Cuatro en raya) y en solitario (Serpiente, 2048, Memoria). Textos legales en `app/client/legal/` y gestor de cookies en `app/client/js/cookies.js`.

- `lib/catalogo.js`: lista de juegos (`estado: 'listo' | 'pronto'`).
- `server.js`: Express, puerto 3400 en `127.0.0.1`.
- `npm test`.
