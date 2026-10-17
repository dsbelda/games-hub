'use strict';
// Catálogo del portal. Cada juego:
//   id, nombre, icono (emoji), descripcion
//   tipo: 'cartas' | 'tablero' | 'dibujo' | 'habilidad' | 'casino' | 'rol'
//   jugadores: [min, max]   duracion: 'rapido' (<10 min) | 'medio' (10-30) | 'largo' (>30)
//   modo: 'solo' | 'amigos' | 'cpu' (lista: se puede jugar así)
//   estado: 'listo' | 'pronto'    url: enlace (externo o ruta del portal) cuando está listo
const CATALOGO = [
  { id: 'catan', nombre: 'Catán', icono: '🏰', descripcion: 'Catán clásico con CPU, chat, música y diseño pixel art medieval.',
    tipo: 'tablero', jugadores: [2, 4], duracion: 'largo', modo: ['amigos', 'cpu'], estado: 'listo', url: 'https://catan.dsbelda.dev', externo: true },
  { id: 'swjack', nombre: 'SwJacK', icono: '🎰', descripcion: 'Casino pixel art multijugador: ruleta, blackjack, gallos, fútbol, tu habitación…',
    tipo: 'casino', jugadores: [1, 30], duracion: 'largo', modo: ['solo', 'amigos'], estado: 'listo', url: 'https://swjack.dsbelda.dev', externo: true },

  { id: 'brisca', nombre: 'Brisca', icono: '🃏', descripcion: 'La de toda la vida con baraja española: 2 o 4 jugadores, por parejas.',
    tipo: 'cartas', jugadores: [2, 4], duracion: 'rapido', modo: ['amigos', 'cpu'], estado: 'listo', url: '/j/brisca' },
  { id: 'unidad', nombre: 'El juego de la Unidad', icono: '🎴', descripcion: 'Cartas de colores y números: descártalas todas antes que nadie.',
    tipo: 'cartas', jugadores: [2, 8], duracion: 'rapido', modo: ['amigos', 'cpu'], estado: 'listo', url: '/j/unidad' },
  { id: 'mus', nombre: 'Mus', icono: '♠️', descripcion: 'Envida, órdago y señas (las de verdad, no valen). Por parejas.',
    tipo: 'cartas', jugadores: [4, 4], duracion: 'medio', modo: ['amigos'], estado: 'pronto' },
  { id: 'parchis', nombre: 'Parchís', icono: '🎲', descripcion: 'Come, cuéntate veinte y vuelve a casa. Hasta 4 jugadores.',
    tipo: 'tablero', jugadores: [2, 4], duracion: 'medio', modo: ['amigos', 'cpu'], estado: 'pronto' },
  { id: 'cuatro', nombre: 'Cuatro en raya', icono: '🔴', descripcion: 'Alinea cuatro fichas antes que tu rival.',
    tipo: 'tablero', jugadores: [2, 2], duracion: 'rapido', modo: ['amigos', 'cpu'], estado: 'listo', url: '/j/cuatro' },
  { id: 'dibujo', nombre: 'Dibuja y adivina', icono: '🖍️', descripcion: 'Uno dibuja, el resto adivina antes de que acabe el tiempo.',
    tipo: 'dibujo', jugadores: [3, 12], duracion: 'medio', modo: ['amigos'], estado: 'pronto' },
  { id: 'lobo', nombre: 'Hombre lobo', icono: '🐺', descripcion: 'De noche matan, de día se acusa. Ideal con voz aparte.',
    tipo: 'rol', jugadores: [6, 12], duracion: 'medio', modo: ['amigos'], estado: 'pronto' },

  { id: 'serpiente', nombre: 'Serpiente', icono: '🐍', descripcion: 'Come, crece y no te muerdas la cola.',
    tipo: 'habilidad', jugadores: [1, 1], duracion: 'rapido', modo: ['solo'], estado: 'listo', url: '/j/serpiente' },
  { id: '2048', nombre: '2048', icono: '🔢', descripcion: 'Suma fichas iguales hasta llegar al 2048.',
    tipo: 'habilidad', jugadores: [1, 1], duracion: 'rapido', modo: ['solo'], estado: 'listo', url: '/j/2048' },
  { id: 'memoria', nombre: 'Memoria', icono: '🧠', descripcion: 'Encuentra las parejas: en solitario o dos en el mismo móvil.',
    tipo: 'habilidad', jugadores: [1, 2], duracion: 'rapido', modo: ['solo', 'amigos'], estado: 'listo', url: '/j/memoria' },
];

module.exports = { CATALOGO };
