'use strict';
// Listas de palabras para los juegos de fiesta (Dibuja y adivina, El impostor) y utilidades de texto.
// texto normalizado para comparar respuestas: minúsculas, sin tildes (la ñ se queda), sin espacios de más
const normalizar = (s) => String(s ?? '').toLowerCase().replace(/ñ/g, '\0').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\0/g, 'ñ').replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();
function distancia(a, b) { // Levenshtein
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const DIBUJO = `casa árbol sol luna estrella nube lluvia rayo arcoíris montaña volcán isla playa ola barco avión cohete coche
bicicleta moto tren autobús camión tractor helicóptero globo cometa paraguas sombrero gafas zapato bota calcetín camiseta
pantalón vestido corbata reloj anillo corona llave candado puerta ventana escalera silla mesa cama sofá lámpara vela
televisión ordenador teléfono cámara guitarra piano tambor trompeta violín micrófono auriculares libro lápiz tijeras regla
mochila maleta regalo tarta helado pizza hamburguesa perrito palomitas manzana plátano uva fresa sandía piña zanahoria
tomate patata seta huevo pan queso pescado pollo galleta caramelo taza vaso botella tenedor cuchara cuchillo sartén olla
perro gato ratón conejo caballo vaca cerdo oveja gallina pato pájaro búho loro pingüino pez tiburón ballena delfín pulpo
cangrejo tortuga serpiente cocodrilo rana león tigre elefante jirafa mono oso zorro lobo ardilla erizo murciélago araña
abeja mariposa caracol hormiga mosca dragón unicornio sirena fantasma robot extraterrestre pirata vampiro bruja mago
princesa rey castillo pirámide faro puente torre iglesia molino tienda cárcel hospital colegio fuente columpio tobogán
balón portería canasta raqueta bate patines trineo esquís hoguera tesoro mapa brújula ancla espada escudo
flecha arco cañón bomba dinamita imán bombilla enchufe batería martillo sierra destornillador clavo tornillo escoba cubo
jabón ducha bañera inodoro cepillo peine espejo toalla pasta-de-dientes nariz ojo boca oreja mano pie diente corazón
esqueleto calavera momia muñeco-de-nieve árbol-de-navidad calabaza huevo-de-pascua cactus flor rosa girasol hoja seta
semáforo señal-de-stop gasolinera aparcamiento mapamundi planeta satélite telescopio microscopio lupa termómetro jeringa
tirita ambulancia bomberos policía semáforo avioneta submarino velero canoa remo kayak paracaídas ascensor escalera-mecánica`.split(/\s+/).filter(Boolean).map((p) => p.replace(/-/g, ' '));
const DIBUJO_UNICAS = [...new Set(DIBUJO)];

const IMPOSTOR = {
  'Comida': ['paella', 'tortilla de patatas', 'gazpacho', 'croquetas', 'pizza', 'sushi', 'hamburguesa', 'macarrones', 'churros', 'jamón', 'cocido', 'lentejas', 'ensalada', 'helado', 'flan'],
  'Animales': ['perro', 'gato', 'jirafa', 'elefante', 'pingüino', 'tiburón', 'caballo', 'pulpo', 'águila', 'serpiente', 'mono', 'oso', 'vaca', 'loro', 'canguro'],
  'Lugares': ['playa', 'hospital', 'aeropuerto', 'colegio', 'gimnasio', 'biblioteca', 'cine', 'supermercado', 'iglesia', 'discoteca', 'piscina', 'zoo', 'museo', 'estadio', 'cárcel'],
  'Profesiones': ['médico', 'bombero', 'profesor', 'cocinero', 'policía', 'piloto', 'peluquero', 'fontanero', 'astronauta', 'abogado', 'futbolista', 'cantante', 'carpintero', 'enfermera', 'payaso'],
  'Objetos de casa': ['nevera', 'sofá', 'lavadora', 'microondas', 'espejo', 'almohada', 'escoba', 'televisión', 'lámpara', 'cortina', 'grifo', 'cuchara', 'plancha', 'mando a distancia', 'paraguas'],
  'Deportes': ['fútbol', 'baloncesto', 'tenis', 'natación', 'ciclismo', 'pádel', 'boxeo', 'esquí', 'golf', 'voleibol', 'atletismo', 'surf', 'escalada', 'balonmano', 'ajedrez'],
  'Transporte': ['bicicleta', 'avión', 'tren', 'barco', 'moto', 'autobús', 'patinete', 'helicóptero', 'metro', 'taxi', 'submarino', 'globo aerostático', 'tractor', 'cohete', 'caballo'],
  'Fiestas': ['Navidad', 'Fallas', 'Halloween', 'cumpleaños', 'boda', 'Nochevieja', 'Carnaval', 'San Juan', 'Semana Santa', 'Reyes Magos', 'San Fermín', 'La Tomatina', 'feria', 'graduación', 'despedida de soltero'],
  'Ropa': ['bufanda', 'chanclas', 'corbata', 'pijama', 'bañador', 'abrigo', 'gorra', 'calcetines', 'vaqueros', 'vestido', 'guantes', 'botas', 'chaqueta', 'falda', 'sombrero'],
  'Instrumentos': ['guitarra', 'piano', 'batería', 'violín', 'trompeta', 'flauta', 'saxofón', 'arpa', 'acordeón', 'castañuelas', 'dulzaina', 'tambor', 'ukelele', 'gaita', 'xilófono'],
  'Naturaleza': ['volcán', 'cascada', 'desierto', 'selva', 'glaciar', 'río', 'montaña', 'isla', 'cueva', 'bosque', 'arcoíris', 'tormenta', 'arrecife', 'pradera', 'lago'],
  'Cosas de clase': ['pizarra', 'mochila', 'estuche', 'examen', 'recreo', 'compás', 'calculadora', 'goma', 'cuaderno', 'tiza', 'pupitre', 'deberes', 'diccionario', 'regla', 'profesor'],
};

// Stop: categorías y letras (sin las más difíciles)
const STOP_CATEGORIAS = ['Nombre', 'Animal', 'País o ciudad', 'Comida', 'Color', 'Objeto', 'Profesión', 'Marca'];
const STOP_LETRAS = 'ABCDEFGHIJLMNOPRSTUV'.split('');

module.exports = { DIBUJO: DIBUJO_UNICAS, IMPOSTOR, STOP_CATEGORIAS, STOP_LETRAS, normalizar, distancia };
