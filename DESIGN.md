---
version: alpha
name: Project Robin
description: Acompañamiento a estudiantes que se van a estudiar al extranjero; la marca transmite confianza y profesionalidad con un punto fresco, cercano y en movimiento.
source: "PROJECT ROBIN DRAFT MANUAL.pdf (borrador del manual de marca)"
colors:
  navy: "#2D3A64"    # Azul marino: color base; tono oscuro de la paleta
  orange: "#ECB450"  # Naranja intenso: acento; energía, optimismo y cercanía
  cream: "#FEFBE5"   # Amarillo claro: tono claro de la paleta
  # Derivados para los portales: azul marino mezclado sobre amarillo claro
  ink-50: "#F6F3E0"   # fondos suaves, filas, estados hover
  ink-100: "#EDECDB"
  ink-200: "#DFDED2"  # líneas y bordes
  ink-300: "#C3C5C1"
  ink-400: "#8B919E"  # iconos y placeholders (3:1)
  ink-500: "#687088"  # texto secundario (4,7:1)
  ink-600: "#4E5979"
  ink-700: "#3C486D"
  orange-50: "#FCF2D3"  # naranja mezclado sobre amarillo claro, solo rellenos
  orange-100: "#FAE9C0"
  orange-200: "#F6DBA2"
  on-navy: "#FEFBE5"        # texto sobre azul marino
  on-navy-muted: "#C9CBC4"
  success: "#2F7D5B"   # funcional, solo estados
  danger: "#B4424F"    # funcional, solo estados
typography:
  display:
    fontFamily: Champion
    fallback: Oswald
    role: titulares y cifras
    fontWeight: 600
  subtitle:
    fontFamily: Almoneda
    fallback: Bodoni Moda
    role: subtítulos, rótulos y nombre del espacio
    fontWeight: 400
  body:
    fontFamily: Theinhardt
    fallback: Archivo
    role: cuerpo de texto e interfaz
    fontSize: 0.9375rem
rounded:
  control: 0.625rem
  card: 1rem
  photo: 1.5rem
components:
  top-bar:
    height: 4.75rem
    backgroundColor: "{colors.cream}"
    borderColor: "{colors.ink-200}"
    activeMarker: "4px {colors.orange}"
  sidebar:
    width: 15rem
    backgroundColor: "{colors.navy}"
    textColor: "{colors.on-navy-muted}"
    activeMarker: "inset 4px 0 {colors.orange}"
  identity-stamp:
    backgroundColor: "{colors.cream}"
    edge: perforated
---

## Overview

Project Robin es un servicio de asesoramiento para estudiar en el extranjero. Su primer destino fue Holanda, desde donde los fundadores crearon la marca. Habla a un público joven y a sus familias. Tiene que inspirar confianza, porque es un servicio académico serio, y a la vez cercanía y ganas, porque irse fuera es una aventura.

La marca se apoya en cinco cosas, en este orden de importancia:
1. Una paleta corta: un oscuro, un claro y un acento.
2. Un sistema tipográfico de tres familias, cada una con un papel.
3. Un logo atrevido pero legible.
4. **Robin**, el petirrojo en monopatín, como personaje principal.
5. Un lenguaje de viaje (sellos, postales, coordenadas), fotografía auténtica e ilustración expresiva.

## Colors

> "Una paleta de colores sencilla y bien definida es clave para asegurarnos consistencia y reconocimiento. Es fundamental contar con un tono oscuro y uno claro dentro de la paleta, así garantizamos legibilidad y contraste sobre cualquier fondo."

| Color | Hex | Papel |
|---|---|---|
| **Azul marino** | `#2D3A64` | Color base. Transmite **confianza, seguridad y profesionalidad**, imprescindibles en un servicio de asesoramiento académico. Aporta estabilidad visual y es el tono oscuro que asegura legibilidad y contraste. |
| **Naranja intenso** | `#ECB450` | La parte fresca y vital: **energía, optimismo y cercanía**. Conecta con el público joven y da el punto dinámico y alegre que equilibra la seriedad del azul. |
| **Amarillo claro** | `#FEFBE5` | El tono claro de la paleta. Es el fondo habitual de las piezas del manual, alternando con el azul marino. |

**Combinaciones (contraste WCAG):**

| Combinación | Contraste | Uso |
|---|---|---|
| Azul marino sobre amarillo claro (y al revés) | **10,6:1** | Texto de cualquier tamaño. |
| Naranja sobre azul marino (y al revés) | **5,9:1** | Texto y elementos destacados (cumple AA). |
| Naranja sobre amarillo claro | **1,8:1** | **Nunca para texto ni iconos con significado**: solo rellenos y decoración (por ejemplo, el pecho de Robin). |

Las piezas se construyen sobre **fondo amarillo claro con azul** o **fondo azul con amarillo claro**. El naranja es siempre el acento, nunca el fondo dominante.

## Typography

> "No es solo un recurso estético, es un código visual de tono, carácter y coherencia. Lo mejor es trabajar con un sistema tipográfico reducido y bien definido: fuerza y personalidad para titulares, matizar con los subtítulos y fluidez y claridad para los cuerpos de texto y no cansar la lectura."

| Familia | Papel | Por qué |
|---|---|---|
| **Champion** | Titulares | Aporta fuerza y atrae la atención, "mirando de frente". Es condensada y de palo seco, en mayúsculas y minúsculas. |
| **Almoneda** | Subtítulos | Con serifa y trazo fino. Introduce contraste y frescura, un guiño de carácter. |
| **Theinhardt** | Cuerpo de texto | Moderna y neutra. Garantiza claridad y lectura sin esfuerzo. |

Juntas transmiten **dinamismo, accesibilidad y personalidad**, "una combinación pensada para llegar a todos los públicos de todas las edades".

- No se añaden más familias. Si un texto no es titular ni subtítulo, va en Theinhardt.
- Champion se reserva para titulares y palabras grandes, como los nombres de ciudad sobre las fotos. No se usa para párrafos.

## Logo

> "Un logo creado para ser conceptualmente atrevido y divertido, pero sin abandonar la franqueza y el compromiso de la marca por ser clara y directa, manteniendo la legibilidad. […] En el mismo logo convive y se divierte nuestro icono, Robin."

- **Versión principal:** Robin en monopatín, con birrete y gafas de sol, sobre la palabra ROBIN. La O lleva el ojo de Robin.
- **Versión más sencilla:** la R con Robin.
- **Versión tipográfica:** solo ROBIN.
- **Colores:** cada versión existe en amarillo claro sobre azul marino y en azul marino sobre amarillo claro. El naranja solo aparece en el pecho de Robin.

## Robin, el key asset

> "Robin, nuestro petirrojo. Una mezcla de viaje, resiliencia, identidad, calidez y guía. Es un símbolo perfecto para transmitir que estudiar en el extranjero es un vuelo retador, pero lleno de apoyo."

- **Carácter:** es **carismático** y **siempre está moviéndose**. Lo tiene todo **bajo control**: disfrutón, seguro y fresco. Representa al estudiante relajado que ya tiene quien le ayude.
- **El monopatín:** es la metáfora de un **movimiento inteligente y libre**. Representa la migración desde la idea de fluir y avanzar ligero, en un viaje ágil, divertido y sin fricciones.
- **El tulipán:** honra a Holanda, el primer destino. Es también una mano que ofrece una flor como ayuda y acompañamiento.
- **Dibujo:** línea continua de grosor uniforme. Gafas de sol rellenas y pecho naranja; sin más rellenos.
- **Colores:** contorno azul marino sobre claro, o contorno amarillo claro sobre azul. En las composiciones ilustradas el contorno puede tomar otros colores (verde, rojo, azul claro).
- **Versatilidad:** su fuerza está en sus versiones (con tulipán, café, durmiendo, leyendo, bailando, graduado, haciendo surf, comiendo pasta, con una cerveza…). Es un **vehículo narrativo** para acompañar cualquier contenido, dar dinamismo, mantener la cohesión y conectar con el estudiante en cada momento de su viaje.
- **Tamaño:** en grande puede salirse del encuadre y acompañar a las fotos por el borde de la composición.

## Elementos visuales

> "Tener iconos o elementos refuerza el reconocimiento inmediato más allá de los colores o el logo; son pequeñas piezas que, repetidas con coherencia, crean un lenguaje visual propio […] que cualquier soporte, desde una web hasta una publicación en redes, se identifique al instante."

La estética evoca el **viaje y la aventura** y transmite **autenticidad y recuerdo**:
- **Sellos:** marco con borde dentado, con Robin y un texto en Champion (por ejemplo, "NUEVO WEBINAR").
- **Postales:** la forma de la postal como marco.
- **Coordenadas:** en pequeño, sobre las fotos.
- **Nombres de ciudad en grande:** en Champion, a sangre sobre la foto (BARCELONA, NEW YORK, LONDRES, HOLANDA).
- **Esquinas redondeadas** y generosas en fotos, tarjetas y muestras de color.

Este lenguaje conecta con la idea de empezar una nueva etapa fuera de casa y hace que la comunicación sea viva y personal.

## Estilo fotográfico

> "La fotografía es clave, transmite la personalidad y gran parte del carácter de la marca y, además, ayuda a mantener coherencia visual."

- **Fotos no turísticas ni prototípicas** de los destinos: escenas cotidianas, inesperadas o auténticas. "Menos postal y más experiencia real."
- Que despierten la curiosidad y miren el lugar con frescura, "como lo haría un estudiante joven que busca descubrir y aprender más allá de lo obvio".
- Calles, terrazas, fachadas, gente real y luz natural. Color cálido, o blanco y negro cuando la foto lleva encima un elemento gráfico (sello, nombre de ciudad).

## Ilustración

> "También utilizaremos ilustraciones para introducir un lenguaje visual flexible y creativo que nos construye una identidad propia."

- Sirven para contar conceptos abstractos, emociones o ideas que la foto sola no captura. Rompen la seriedad con un tono **más cercano, joven y expresivo**.
- **Referencias del manual:** lápiz, gouache, tinta de línea y patrones; objetos y escenas de los destinos (sardinas, aceitunas, alpargatas, ventanas mediterráneas, rascacielos, montaña); color plano y vivo.
- Las ilustraciones pueden traer colores fuera de la paleta. La paleta de marca sigue mandando en todo lo demás.

## Do's and Don'ts

- **Do:**
  - construir cada pieza con un oscuro (azul marino) y un claro (amarillo claro), con el naranja como acento;
  - usar las tres familias tipográficas, cada una solo en su papel;
  - usar a Robin en sus versiones oficiales, siempre en movimiento;
  - usar fotos auténticas de los destinos;
  - repetir los mismos elementos (sellos, postales, coordenadas) para que todo se reconozca.
- **Don't:**
  - añadir colores o tipografías fuera del sistema (salvo dentro de una ilustración);
  - poner texto naranja sobre amarillo claro;
  - deformar o recolorear el logo fuera de sus dos combinaciones;
  - usar fotos de guía turística;
  - dibujar a Robin quieto o fuera de su estilo de línea.
- **Don't change:** la paleta (`#2D3A64`, `#ECB450`, `#FEFBE5`), las tres tipografías y sus papeles, el logo y Robin.

## Aplicación en los portales

Portal del alumno, RobinJr, Robin Community y admin (no la web, que es un proyecto aparte).

- **Código:**
  - `packages/brand/brand.css`: fuentes, tokens y base de página. Cada app lo importa el primero.
  - `packages/brand/tailwind-preset.cjs`: escala de color y tipografías para Tailwind. Remapea `slate`, `gray`, `sky` y `blue` a la escala ink; `amber` y `yellow` al naranja; `white` al amarillo claro; `black` al azul marino.
  - `packages/portal-nav/cross-portal-nav.css`: barra superior de los portales.
  - `packages/portal-nav/robin-shell.css`: menú lateral, títulos y superficies de los portales.
  - `apps/admin/src/styles/brand-shell.css`: lo mismo para el admin.
- **Fondo y superficies:**
  - Página en amarillo claro. Tarjetas planas en amarillo claro con línea `ink-200`, sin sombras ni degradados.
  - Solo flotan, con sombra, los elementos que se superponen: avisos, modales, chat y desplegables.
- **Barra superior:**
  - Amarillo claro, con el logo tipográfico y el nombre del espacio en la letra de subtítulos.
  - La pestaña activa se marca con una barra naranja debajo.
- **Menú lateral:**
  - Azul marino con texto amarillo claro. La opción activa lleva fondo translúcido y una barra naranja a la izquierda.
  - Quién ha entrado se muestra como un **sello** (borde dentado, elemento de viaje de la marca).
  - Al pie, una nota con Robin leyendo (`packages/brand/assets/robin-reading.png`).
- **Tipografía:**
  - Títulos de página en display a 2.5rem. Rótulos sobre el título en subtítulo, en minúscula inicial.
  - No se usan rótulos en mayúsculas espaciadas.
- **Naranja:**
  - Marca lo activo y rellena (pestaña, opción, avatar, barras de progreso, tarjetas destacadas).
  - Sobre naranja el texto es azul marino. Nunca hay texto naranja sobre amarillo claro.
- **Gráficos:** series en azul marino y naranja; si hacen falta más, los tonos ink. Los colores de estado solo indican estado.

## Notas

- El manual es un **borrador**:
  - falta el índice (página 2);
  - la numeración salta de 05 a 07, así que la sección 06 no está;
  - no fija tamaños, interlineados, radios ni márgenes. Se definirán en el rediseño y se añadirán aquí como tokens.
- **Licencias de fuentes:** Champion, Almoneda y Theinhardt hay que licenciarlas para web y alojar sus archivos (al menos Champion y Theinhardt son comerciales). Hasta entonces los portales usan sustitutas libres (Oswald, Bodoni Moda y Archivo, licencia SIL OFL) bajo los nombres `Robin Display`, `Robin Subtitle` y `Robin Text`. Para usar las de verdad basta cambiar las tres líneas `src` de `packages/brand/brand.css`.
