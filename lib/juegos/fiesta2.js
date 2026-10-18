'use strict';
// Contenido de Farol, Tabú y En la onda.
// Farol: palabras poco conocidas con su significado (del diccionario de la RAE, resumido).
const FAROL = [
  ['acmé', 'Momento de mayor intensidad de una enfermedad.'], ['albricias', 'Regalo que se da a quien trae una buena noticia.'],
  ['ataraxia', 'Tranquilidad total del ánimo; no dejarse perturbar por nada.'], ['bonhomía', 'Afabilidad, sencillez y bondad en el carácter.'],
  ['cenutrio', 'Persona lerda, torpe o necia.'], ['clepsidra', 'Reloj que mide el tiempo con el agua que cae de un recipiente a otro.'],
  ['conticinio', 'Hora de la noche en que todo está en silencio.'], ['defenestrar', 'Tirar a alguien por una ventana.'],
  ['escolio', 'Nota que se pone a un texto para explicarlo.'], ['galimatías', 'Lenguaje oscuro y confuso que no se entiende.'],
  ['garambaina', 'Adorno de mal gusto y que sobra.'], ['gualdrapa', 'Manta larga que cubre las ancas del caballo.'],
  ['jeribeque', 'Guiño, mueca o contorsión de la cara o del cuerpo.'], ['lechuguino', 'Muchacho que presume de ir muy arreglado y a la moda.'],
  ['melifluo', 'Dulce, suave y delicado, sobre todo al hablar (a veces en exceso).'], ['nefelibata', 'Persona soñadora que no se da cuenta de la realidad.'],
  ['paparrucha', 'Noticia falsa y disparatada que corre entre la gente.'], ['perendengue', 'Pendiente u otro adorno de poco valor.'],
  ['prístino', 'Antiguo, primero, original; tal como era al principio.'], ['rebujo', 'Envoltorio o lío hecho de cualquier manera.'],
  ['soponcio', 'Desmayo, desvanecimiento.'], ['tiquismiquis', 'Reparos o escrúpulos sin importancia; persona que los pone.'],
  ['trapisonda', 'Lío, enredo o jaleo.'], ['ubérrimo', 'Muy abundante y fértil.'],
  ['zangolotear', 'Mover algo sin parar y sin propósito.'], ['zascandil', 'Persona inquieta y enredadora, que va de un lado a otro sin hacer nada de provecho.'],
  ['zarandajas', 'Cosas menudas, sin valor o de poca importancia.'], ['arrebol', 'Color rojo de las nubes cuando las ilumina el sol.'],
  ['arrumaco', 'Gesto o caricia de cariño.'], ['baladí', 'De poca importancia.'],
  ['bisoño', 'Nuevo e inexperto en un oficio o actividad.'], ['chirimbolo', 'Cachivache u objeto de forma rara que no se sabe bien cómo llamar.'],
  ['dédalo', 'Laberinto, lugar o asunto muy enrevesado.'], ['espurio', 'Falso, ilegítimo.'],
  ['fruslería', 'Cosa de poco valor o importancia.'], ['gazmoño', 'Que finge devoción, escrúpulos o virtudes que no tiene.'],
  ['hipocorístico', 'Nombre cariñoso o abreviado, como «Pepe» por José.'], ['lipotimia', 'Pérdida pasajera del sentido, desmayo.'],
  ['mequetrefe', 'Persona entrometida, bulliciosa y de poco provecho.'], ['ósculo', 'Beso.'],
  ['pazguato', 'Simple, que se queda pasmado con cualquier cosa.'], ['pusilánime', 'Falto de ánimo y de valor.'],
  ['sempiterno', 'Que dura siempre, que no tiene fin.'], ['serendipia', 'Hallazgo valioso que se hace por casualidad.'],
  ['trampantojo', 'Trampa o ilusión con que se engaña a alguien haciéndole ver lo que no es.'], ['vituperio', 'Ofensa o deshonra que se dice contra alguien.'],
  ['zaherir', 'Decir o hacer algo que mortifique a otra persona.'], ['abigarrado', 'De varios colores mal combinados.'],
  ['albur', 'Azar o casualidad de la que depende un resultado.'], ['batiburrillo', 'Mezcla de cosas que no tienen nada que ver.'],
  ['cuchipanda', 'Comida alegre que hacen juntas varias personas.'], ['guirigay', 'Griterío y confusión de gente que habla a la vez.'],
  ['morrocotudo', 'De mucha importancia o dificultad; enorme.'], ['repantigarse', 'Acomodarse en el asiento extendiendo el cuerpo.'],
  ['pamplina', 'Cosa o dicho sin sustancia ni importancia.'], ['chisgarabís', 'Hombre entrometido, bullicioso y de poca importancia.'],
  ['cacofonía', 'Sonido desagradable por la repetición de los mismos sonidos.'], ['inefable', 'Que no se puede explicar con palabras.'],
  ['deleznable', 'Que se rompe o deshace con facilidad; también, despreciable.'], ['quisquilla', 'Reparo o dificultad pequeña; también, un camarón.'],
];
// Tabú: [palabra, cinco prohibidas]
const TABU = `perro: ladrar, animal, mascota, gato, hueso
playa: arena, mar, verano, toalla, sol
paella: arroz, valenciana, gambas, sartén, domingo
fútbol: balón, gol, partido, equipo, jugador
cumpleaños: tarta, velas, regalos, años, fiesta
hospital: médico, enfermera, enfermo, urgencias, cama
avión: volar, aeropuerto, piloto, alas, viaje
guitarra: cuerdas, tocar, música, instrumento, flamenco
pizza: italiana, queso, masa, horno, tomate
lluvia: agua, nubes, paraguas, mojar, tormenta
escuela: colegio, profesor, alumnos, clase, deberes
nieve: blanco, frío, invierno, esquiar, copos
dentista: dientes, boca, caries, muela, médico
café: taza, leche, desayuno, cafeína, bar
bicicleta: pedales, ruedas, montar, ciclista, manillar
teléfono: llamar, móvil, número, hablar, mensaje
reloj: hora, tiempo, muñeca, agujas, despertador
cine: película, pantalla, palomitas, entrada, butaca
libro: leer, páginas, autor, biblioteca, novela
fantasma: sábana, miedo, muerto, castillo, susto
pirata: barco, tesoro, parche, loro, mar
vampiro: sangre, colmillos, Drácula, noche, murciélago
Navidad: diciembre, regalos, árbol, Papá Noel, turrón
Fallas: Valencia, fuego, ninot, marzo, petardos
tortilla: huevo, patata, cebolla, española, sartén
semáforo: rojo, verde, coche, calle, luz
ascensor: subir, bajar, pisos, botón, edificio
jirafa: cuello, alto, animal, manchas, África
elefante: trompa, grande, colmillos, orejas, gris
dinosaurio: extinto, fósil, prehistoria, grande, reptil
volcán: lava, erupción, montaña, fuego, cráter
piscina: agua, nadar, verano, bañador, cloro
helado: frío, verano, cucurucho, sabor, chocolate
espejo: reflejo, cristal, mirarse, imagen, baño
almohada: dormir, cama, cabeza, pluma, sueño
paraguas: lluvia, abrir, mojar, agua, sombrilla
calcetín: pie, zapato, par, lana, ropa
gafas: ver, ojos, cristales, sol, miope
sombrero: cabeza, ala, gorra, vaquero, llevar
bombero: fuego, apagar, camión, manguera, incendio
policía: ley, ladrón, multa, comisaría, agente
cocinero: cocina, chef, comida, restaurante, receta
astronauta: espacio, luna, cohete, nave, planeta
abuela: nieto, mayor, madre, familia, vieja
boda: novios, casarse, iglesia, anillo, vestido
vacaciones: verano, viaje, descanso, trabajo, playa
domingo: semana, día, descanso, lunes, sábado
chocolate: cacao, dulce, negro, tableta, marrón
huevo: gallina, yema, clara, cáscara, frito
manzana: fruta, roja, árbol, verde, comer
plátano: fruta, amarillo, Canarias, mono, pelar
sandía: fruta, verano, roja, pepitas, verde
tren: vías, estación, vagón, viajar, AVE
barco: mar, navegar, puerto, vela, capitán
coche: conducir, ruedas, volante, carretera, motor
moto: ruedas, casco, conducir, dos, rápida
caballo: montar, animal, galope, silla, cuadra
gato: maullar, animal, ratón, felino, bigotes
ratón: queso, pequeño, animal, ordenador, gato
ordenador: pantalla, teclado, internet, portátil, ratón
internet: red, web, conexión, wifi, ordenador
ajedrez: tablero, rey, peón, jaque, piezas
baraja: cartas, palos, jugar, mus, naipes
música: canción, escuchar, notas, cantar, instrumento
baile: bailar, música, pasos, pareja, discoteca
cama: dormir, sábanas, almohada, colchón, habitación
cocina: cocinar, nevera, horno, comida, fogones
nevera: frío, comida, frigorífico, cocina, hielo
ventana: cristal, abrir, casa, cortina, mirar
puerta: abrir, cerrar, entrar, llave, casa
llave: abrir, cerradura, puerta, llavero, candado
dinero: euros, billete, monedas, pagar, banco
banco: dinero, sentarse, cuenta, cajero, parque
mapa: lugar, país, plano, perdido, orientarse
brújula: norte, aguja, orientarse, imán, sur
tormenta: rayos, truenos, lluvia, nubes, relámpago
arcoíris: colores, lluvia, sol, cielo, siete
luna: noche, cielo, satélite, llena, Tierra
sol: luz, calor, día, estrella, verano
estrella: cielo, noche, brillar, cine, fugaz
montaña: subir, alta, cima, nieve, escalar
río: agua, corriente, puente, orilla, pez
isla: mar, agua, rodeada, náufrago, playa
desierto: arena, calor, camello, sed, Sáhara
selva: árboles, animales, Tarzán, jungla, Amazonas
castillo: rey, princesa, torre, medieval, fortaleza
princesa: rey, corona, castillo, príncipe, cuento
dragón: fuego, volar, alas, monstruo, escamas
bruja: escoba, magia, sombrero, hechizo, verruga
payaso: circo, nariz, reír, maquillaje, gracioso
circo: payaso, carpa, malabares, trapecio, animales
magia: mago, truco, chistera, conejo, varita
robot: máquina, metal, programa, androide, inteligencia
zapato: pie, calzado, tacón, cordones, andar
camiseta: ropa, manga, algodón, ponerse, prenda
lavadora: ropa, lavar, sucia, detergente, centrifugar
dormir: cama, sueño, noche, cansado, siesta
siesta: dormir, tarde, comer, sofá, descansar
sofá: sentarse, salón, cojines, tele, tumbarse
televisión: tele, ver, programa, mando, canal
mando: tele, botones, control, pilas, cambiar
fiesta: celebrar, música, amigos, bailar, noche
regalo: envolver, cumpleaños, sorpresa, dar, lazo
tarta: cumpleaños, velas, pastel, dulce, nata
abeja: miel, picar, insecto, panal, zumbido
mariposa: alas, volar, colores, oruga, insecto
araña: patas, tela, ocho, bicho, miedo
tiburón: mar, dientes, pez, aleta, peligroso
pulpo: tentáculos, mar, ocho, tinta, gallega`.split('\n').map((l) => { const [w, r] = l.split(':'); return [w.trim(), r.split(',').map((x) => x.trim())]; });
// En la onda: escalas [izquierda, derecha]
const ONDA = [['Frío', 'Caliente'], ['Barato', 'Caro'], ['Feo', 'Bonito'], ['Aburrido', 'Divertido'], ['Fácil', 'Difícil'], ['Sano', 'Insano'],
  ['Pequeño', 'Grande'], ['Lento', 'Rápido'], ['Inútil', 'Útil'], ['Triste', 'Alegre'], ['Antiguo', 'Moderno'], ['Silencioso', 'Ruidoso'],
  ['Infravalorado', 'Sobrevalorado'], ['Cosa de niños', 'Cosa de mayores'], ['Huele mal', 'Huele bien'], ['Blando', 'Duro'],
  ['Peor comida', 'Mejor comida'], ['Normal', 'Raro'], ['Tranquilo', 'Peligroso'], ['Ligero', 'Pesado'], ['Seco', 'Mojado'],
  ['Para el invierno', 'Para el verano'], ['De pueblo', 'De ciudad'], ['Feo de decir', 'Bonito de decir'], ['Mal regalo', 'Buen regalo'],
  ['Prescindible', 'Imprescindible'], ['Poco famoso', 'Muy famoso'], ['Sencillo', 'Complicado'], ['Malo en una cita', 'Bueno en una cita'],
  ['Mal superpoder', 'Buen superpoder'], ['Sabe mal', 'Sabe bien'], ['Cutre', 'Elegante'], ['Real', 'Inventado'], ['Inofensivo', 'Da miedo'],
  ['Poco español', 'Muy español'], ['Mala película', 'Buena película'], ['Ocio barato', 'Ocio caro'], ['Fuera de moda', 'De moda'],
  ['Para un día', 'Para toda la vida'], ['Mal plan de domingo', 'Buen plan de domingo'], ['Mala mascota', 'Buena mascota'],
  ['Mal trabajo', 'Trabajo soñado'], ['Débil', 'Fuerte'], ['Desordenado', 'Ordenado'], ['Valiente', 'Cobarde'], ['Fácil de dibujar', 'Imposible de dibujar'],
  ['Casero', 'De restaurante'], ['Dulce', 'Salado'], ['Natural', 'Artificial'], ['Ruidoso de comer', 'Silencioso de comer']];
module.exports = { FAROL, TABU, ONDA };
