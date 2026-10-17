'use strict';
// Portal de juegos: Express sirviendo el catálogo. Los juegos con salas (Socket.IO) se añadirán como módulos.
const http = require('node:http');
const path = require('node:path');
const express = require('express');
const { CATALOGO } = require('./lib/catalogo');

function start({ port = 3400, host = '127.0.0.1' } = {}) {
  const app = express();
  app.set('trust proxy', false);
  app.disable('x-powered-by');
  const server = http.createServer(app);

  app.use((req, res, next) => {
    res.set({
      'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    });
    next();
  });
  app.get('/healthz', (req, res) => res.type('text').send('ok'));
  app.get('/api/juegos', (req, res) => res.json(CATALOGO));
  app.use(express.static(path.join(__dirname, 'app', 'client'), { maxAge: '5m' }));

  return new Promise((resolve) => server.listen(port, host, () => resolve({ server, app, port: server.address().port })));
}

if (require.main === module) {
  start({ port: Number(process.env.PORT) || 3400, host: process.env.HOST || '127.0.0.1' })
    .then(({ port }) => console.log(`Portal de juegos en el puerto ${port}`));
  for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => process.exit(0));
}
module.exports = { start };
