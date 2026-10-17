'use strict';
// Catálogo del portal. Cada juego:
//   id, nombre, icono (emoji), descripcion
//   tipo: 'cartas' | 'tablero' | 'habilidad' | 'palabras' | 'fiesta' | 'casino'
//   jugadores: [min, max]   duracion: 'rapido' (<10 min) | 'medio' (10-30) | 'largo' (>30)
//   modo: 'solo' | 'amigos' | 'cpu' (lista: se puede jugar así)
//   estado: 'listo' | 'pronto'    url: enlace (externo o ruta del portal) cuando está listo
//   miniatura: /img/juegos/ID.svg (la genera tools/miniaturas.js)   destacado, nuevo: marcas del portal
//   comoSeJuega: instrucciones cortas de la página del juego
const CATALOGO = [
  { id: 'catan', nombre: 'Catán', icono: '🏰', descripcion: 'Catán clásico con CPU, chat, música y diseño pixel art medieval.',
    tipo: 'tablero', jugadores: [2, 4], duracion: 'largo', modo: ['amigos', 'cpu'], estado: 'listo', url: 'https://catan.dsbelda.dev', externo: true,
    destacado: true, comoSeJuega: 'Coloca poblados, recoge recursos con los dados, comercia y construye. Gana quien llega a 10 puntos.' },
  { id: 'swjack', nombre: 'SwJacK', icono: '🎰', descripcion: 'Casino pixel art multijugador: ruleta, blackjack, gallos, fútbol, tu habitación…',
    tipo: 'casino', jugadores: [1, 30], duracion: 'largo', modo: ['solo', 'amigos'], estado: 'listo', url: 'https://swjack.dsbelda.dev', externo: true,
    comoSeJuega: 'Crea tu cuenta, recoge fichas y prueba la ruleta, el blackjack, la feria y mucho más con tus amigos.' },

  { id: 'brisca', nombre: 'Brisca', icono: '🃏', descripcion: 'La de toda la vida con baraja española: 2 o 4 jugadores, por parejas.',
    tipo: 'cartas', jugadores: [2, 4], duracion: 'rapido', modo: ['amigos', 'cpu'], estado: 'listo', url: '/j/brisca',
    destacado: true, nuevo: true, comoSeJuega: 'Cada uno tira una carta por turno y gana la baza la más alta del triunfo o, si no hay, la más alta del palo que salió. As 11, tres 10, rey 4, caballo 3 y sota 2. Gana quien pase de 60.' },
  { id: 'unidad', nombre: 'El juego de la Unidad', icono: '🎴', descripcion: 'Cartas de colores y números: descártalas todas antes que nadie.',
    tipo: 'cartas', jugadores: [2, 8], duracion: 'rapido', modo: ['amigos', 'cpu'], estado: 'listo', url: '/j/unidad',
    destacado: true, nuevo: true, comoSeJuega: 'Tira una carta del mismo color o número. Si no puedes, roba. Cuando te quede una, pulsa «¡Unidad!» o te pueden pillar. Gana quien se quede sin cartas.' },
  { id: 'mus', nombre: 'Mus', icono: '♠️', descripcion: 'Envida, órdago y señas (las de verdad, no valen). Por parejas.',
    tipo: 'cartas', jugadores: [4, 4], duracion: 'medio', modo: ['amigos'], estado: 'pronto',
    comoSeJuega: 'Grande, chica, pares y juego. Por parejas, con envites y órdagos.' },
  { id: 'parchis', nombre: 'Parchís', icono: '🎲', descripcion: 'Come, cuéntate veinte y vuelve a casa. Hasta 4 jugadores.',
    tipo: 'tablero', jugadores: [2, 4], duracion: 'medio', modo: ['amigos', 'cpu'], estado: 'pronto',
    comoSeJuega: 'Saca un 5 para salir, da la vuelta al tablero y mete tus cuatro fichas en casa. Comer cuenta 20.' },
  { id: 'cuatro', nombre: 'Cuatro en raya', icono: '🔴', descripcion: 'Alinea cuatro fichas antes que tu rival.',
    tipo: 'tablero', jugadores: [2, 2], duracion: 'rapido', modo: ['amigos', 'cpu'], estado: 'listo', url: '/j/cuatro',
    nuevo: true, comoSeJuega: 'Pulsa una columna para soltar tu ficha. Gana quien junte cuatro en línea: en horizontal, vertical o diagonal.' },
  { id: 'dibujo', nombre: 'Dibuja y adivina', icono: '🖍️', descripcion: 'Uno dibuja, el resto adivina antes de que acabe el tiempo.',
    tipo: 'fiesta', jugadores: [3, 12], duracion: 'medio', modo: ['amigos'], estado: 'pronto',
    comoSeJuega: 'Por turnos, uno dibuja una palabra secreta y los demás la adivinan en el chat.' },
  { id: 'lobo', nombre: 'Hombre lobo', icono: '🐺', descripcion: 'De noche matan, de día se acusa. Ideal con voz aparte.',
    tipo: 'fiesta', jugadores: [5, 12], duracion: 'medio', modo: ['amigos'], estado: 'pronto',
    comoSeJuega: 'Los lobos eligen víctima de noche; de día, el pueblo vota a quién echar.' },

  { id: 'serpiente', nombre: 'Serpiente', icono: '🐍', descripcion: 'Come, crece y no te muerdas la cola.',
    tipo: 'habilidad', jugadores: [1, 1], duracion: 'rapido', modo: ['solo'], estado: 'listo', url: '/j/serpiente',
    nuevo: true, comoSeJuega: 'Mueve la serpiente con las flechas (o deslizando el dedo), come manzanas y no choques con las paredes ni contigo.' },
  { id: '2048', nombre: '2048', icono: '🔢', descripcion: 'Suma fichas iguales hasta llegar al 2048.',
    tipo: 'habilidad', jugadores: [1, 1], duracion: 'rapido', modo: ['solo'], estado: 'listo', url: '/j/2048',
    nuevo: true, comoSeJuega: 'Desliza las fichas: dos iguales se juntan y suman. Intenta llegar al 2048 sin llenar el tablero.' },
  { id: 'memoria', nombre: 'Memoria', icono: '🧠', descripcion: 'Encuentra las parejas: en solitario o dos en el mismo móvil.',
    tipo: 'habilidad', jugadores: [1, 2], duracion: 'rapido', modo: ['solo', 'amigos'], estado: 'listo', url: '/j/memoria',
    nuevo: true, comoSeJuega: 'Da la vuelta a dos cartas cada vez y encuentra todas las parejas con los menos intentos posibles.' },

  { id: 'palabra', nombre: 'Palabra del día', icono: '🔤', descripcion: 'Adivina la palabra de 5 letras en 6 intentos. Una nueva cada día, la misma para todos.',
    tipo: 'palabras', jugadores: [1, 1], duracion: 'rapido', modo: ['solo'], estado: 'listo', url: '/j/palabra', destacado: true, nuevo: true,
    comoSeJuega: 'Escribe una palabra de 5 letras. Verde: la letra está en su sitio. Amarillo: está, pero en otro sitio. Gris: no está. Sin tildes.' },
  { id: 'buscaminas', nombre: 'Buscaminas', icono: '💣', descripcion: 'Destapa todo el campo sin pisar ninguna mina. Tres tamaños y récord de tiempo.',
    tipo: 'habilidad', jugadores: [1, 1], duracion: 'rapido', modo: ['solo'], estado: 'listo', url: '/j/buscaminas', nuevo: true,
    comoSeJuega: 'Cada número dice cuántas minas tocan esa casilla. Clic para destapar; clic derecho o mantener pulsado para poner bandera. El primer toque nunca es mina.' },
  { id: 'bloques', nombre: 'Bloques', icono: '🧱', descripcion: 'Piezas que caen: encájalas y completa líneas. Cada vez más rápido.',
    tipo: 'habilidad', jugadores: [1, 1], duracion: 'medio', modo: ['solo'], estado: 'listo', url: '/j/bloques', nuevo: true,
    comoSeJuega: 'Mueve y gira las piezas para completar líneas, que desaparecen. Cuatro de golpe dan muchos puntos. Si llegan arriba, se acaba.' },
  { id: 'solitario', nombre: 'Solitario', icono: '🂡', descripcion: 'El de cartas de toda la vida: ordénalas por palos del As al Rey.',
    tipo: 'cartas', jugadores: [1, 1], duracion: 'medio', modo: ['solo'], estado: 'listo', url: '/j/solitario', nuevo: true,
    comoSeJuega: 'Baja las cartas a las cuatro pilas, del As al Rey y por palos. En las columnas, de mayor a menor alternando rojo y negro. En un hueco solo va un Rey.' },
  { id: 'hundir', nombre: 'Hundir la flota', icono: '🚢', descripcion: 'Coloca tus barcos y hunde la flota rival antes de que hunda la tuya.',
    tipo: 'tablero', jugadores: [2, 2], duracion: 'medio', modo: ['amigos', 'cpu'], estado: 'listo', url: '/j/hundir', nuevo: true,
    comoSeJuega: 'Coloca 5 barcos sin que se toquen. Por turnos, dispara a una casilla del rival: agua, tocado o hundido. Si aciertas, repites. Gana quien hunda toda la flota contraria.' },
  { id: 'damas', nombre: 'Damas', icono: '⚪', descripcion: 'Damas españolas: comer es obligatorio y la dama vuela.',
    tipo: 'tablero', jugadores: [2, 2], duracion: 'medio', modo: ['amigos', 'cpu'], estado: 'listo', url: '/j/damas', nuevo: true,
    comoSeJuega: 'Mueve en diagonal hacia delante. Comer es obligatorio, y por donde más piezas comas. Al llegar al final, tu peón se hace dama y vuela por las diagonales. Pierde quien no puede mover.' },
  { id: 'ajedrez', nombre: 'Ajedrez', icono: '♞', descripcion: 'Ajedrez de verdad con enroque, al paso y coronación. Contra un amigo o contra la CPU.',
    tipo: 'tablero', jugadores: [2, 2], duracion: 'largo', modo: ['amigos', 'cpu'], estado: 'listo', url: '/j/ajedrez', nuevo: true,
    comoSeJuega: 'Toca una pieza para ver adónde puede ir y luego la casilla de destino. Gana quien da jaque mate. Si juegas con negras, el tablero se gira.' },
];

module.exports = { CATALOGO };
