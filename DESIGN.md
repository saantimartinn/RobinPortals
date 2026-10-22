---
version: alpha
name: Project Robin
description: Plataforma de Project Robin (portal del alumno, RobinJr, Robin Community y admin) para estudiantes que se van a estudiar fuera y para el equipo que los acompaña; debe transmitir confianza y cercanía a la vez.
colors:
  # Marca (manual "PROJECT ROBIN DRAFT MANUAL", 01. Paleta)
  brand-navy: "#2D3A64"      # Azul marino: color base, confianza y profesionalidad
  brand-orange: "#ECB450"    # Naranja intenso: energía, optimismo y cercanía
  brand-cream: "#FEFBE5"     # Amarillo claro: el claro de la paleta (piezas de marca, web)
  # Aplicaciones (implementado en apps/admin y packages/portal-nav)
  canvas: "#FFFFFF"          # fondo de página de todas las apps
  ink: "#17263D"             # texto
  heading: "#19375F"         # títulos
  muted: "#67768A"           # texto secundario y pestañas inactivas
  line: "#E0E6ED"            # bordes de tarjetas y barras
  soft: "#EDF3FA"            # estados seleccionados y cajas de iconos
  sidebar-top: "#102B4B"     # degradado del menú lateral
  sidebar-bottom: "#0C213A"
  sidebar-text: "#AEBFD2"
  accent: "#DDA348"          # pestaña/opción activa, avatar, contadores
  eyebrow: "#A6752E"         # rótulos pequeños sobre los títulos
typography:
  # Marca: Champion (titulares), Almoneda (subtítulos), Theinhardt (cuerpo).
  # Aplicaciones hoy: Georgia para títulos y cifras, Inter para el resto (ver "Pendiente").
  display:
    fontFamily: Georgia, serif
    fontSize: 2rem
    fontWeight: 700
  title:
    fontFamily: Georgia, serif
    fontSize: 0.95rem
    fontWeight: 700
  body:
    fontFamily: Inter, ui-sans-serif, system-ui, sans-serif
    fontSize: 0.8125rem
    lineHeight: 1.5
  eyebrow:
    fontFamily: Inter, ui-sans-serif, system-ui, sans-serif
    fontSize: 0.63rem
    fontWeight: 800
    letterSpacing: 0.13em
rounded:
  sm: 0.58rem
  md: 0.72rem
  lg: 0.85rem
spacing:
  sm: 0.55rem
  md: 1rem
  lg: 2rem
components:
  top-bar:
    height: 5.25rem
    backgroundColor: "{colors.canvas}"
    borderColor: "{colors.line}"
  sidebar:
    width: 14.6875rem
    backgroundColor: "linear-gradient(180deg, {colors.sidebar-top}, {colors.sidebar-bottom})"
    textColor: "{colors.sidebar-text}"
  nav-item-active:
    backgroundColor: "#FFFFFF12"
    textColor: "#FFFFFF"
    marker: "inset 3px 0 {colors.accent}"
---

## Overview

Project Robin acompaña a estudiantes jóvenes que se van a estudiar al extranjero (el primer destino fue Holanda) y a sus familias; el equipo de Robin trabaja con ellos desde el admin. El manual de marca (`PROJECT ROBIN DRAFT MANUAL.pdf`, borrador) es la fuente de la marca: un azul que da confianza, un amarillo/naranja que da energía y cercanía, y Robin, un petirrojo en monopatín que representa al estudiante que se mueve con libertad porque ya tiene quien le ayude.

Las aplicaciones (`apps/portal`, `apps/robinjr`, `apps/community`, `apps/admin`) son herramientas de trabajo y se ven como **un solo producto**: la misma barra superior, el mismo menú lateral azul marino y la misma tipografía en las cuatro. La referencia visual es el admin ("Inicio"); los portales la toman de `packages/portal-nav/cross-portal-nav.css` y `packages/portal-nav/robin-shell.css`.

## Colors

**Marca (manual):**
- **Azul marino `#2D3A64`:** color base. Transmite confianza, seguridad y profesionalidad; es el tono oscuro que asegura legibilidad y contraste.
- **Naranja intenso `#ECB450`:** la parte fresca y vital (energía, optimismo, cercanía). Equilibra la seriedad del azul.
- **Amarillo claro `#FEFBE5`:** el claro de la paleta. Con el azul garantiza contraste sobre cualquier fondo.

**Aplicaciones:**
- **Fondo blanco (`canvas`)** en todas las pantallas: páginas, cargas, onboarding, login y selección de plan. Decisión expresa: en las apps no se usa fondo amarillo/crema.
- **Azul marino del menú** (`sidebar-top` → `sidebar-bottom`) y **azul de títulos** (`heading`).
- **Dorado (`accent`)** solo para marcar lo activo o importante: pestaña activa, opción activa del menú, avatar, contadores. Una función, no decoración.
- **Neutros** `line` para bordes y `soft` para estados seleccionados; superficies planas, sin sombras.

## Typography

**Marca (manual, 02. Tipografías):** Champion en titulares (fuerza, mira de frente), Almoneda en subtítulos (contraste y un guiño de carácter), Theinhardt en el cuerpo (moderna, neutra, lectura sin esfuerzo). Un sistema reducido: tres familias, cada una con un papel.

**Aplicaciones hoy:** Georgia para títulos de página, de tarjeta y cifras; Inter para texto, navegación y rótulos. Escala: título de página 2rem, título de tarjeta/menú 0.95rem, texto 0.8125rem, pestañas 0.75rem, rótulos 0.63rem en mayúsculas con 0.13em de espaciado.

## Layout

- **Barra superior** de 5.25rem, blanca, con el logo (84×43px) y el nombre del espacio a la izquierda, las pestañas entre portales y la cuenta a la derecha. Idéntica en las cuatro apps.
- **Menú lateral** azul marino de 14.6875rem, pegado al borde izquierdo y de arriba abajo bajo la barra: quién ha entrado (nombre en Georgia, subtítulo dorado), rótulo de sección, opciones y una nota al pie.
- **Área de trabajo** blanca con 2rem de margen y un máximo de 100rem.
- En pantallas de menos de 1024px el menú lateral pasa a ser una franja horizontal azul marino bajo la barra.

## Elevation & Depth

Plano. Las superficies se separan con bordes (`line`), no con sombras. Solo los elementos flotantes (avisos, asistente, modales) llevan sombra.

## Shapes

Radios moderados: botones e iconos 0.58rem, opciones del menú 0.72rem, tarjetas 0.8–0.85rem. Nada completamente cuadrado ni píldoras salvo en etiquetas de estado.

## Components

- **Barra superior:** `packages/portal-nav/cross-portal-nav.css` (portales) y `.top`/`.workspace-tabs` en `apps/admin/src/styles/global.css` (admin). Mismas medidas; si cambia una, cambia la otra.
- **Menú lateral y tipografía de los portales:** `packages/portal-nav/robin-shell.css`, importado el último en cada app.
- **Enlaces entre portales:** `packages/portal-nav/links.js`.
- **Logo:** versión principal (Robin en monopatín sobre ROBIN), versión sencilla (R + Robin) y versión tipográfica (solo ROBIN), en azul sobre claro o en claro sobre azul. En la barra se usa la tipográfica.

## Elementos de marca

- **Robin, el petirrojo:** carismático y siempre en movimiento; el monopatín es el movimiento libre e inteligente, el tulipán recuerda a Holanda. Tiene muchas versiones (estudiando, comiendo, durmiendo, bailando…) para acompañar cualquier momento del estudiante. En las apps aparece como asistente; úsalo con moderación y en sus versiones oficiales.
- **Viaje y recuerdo:** sellos, postales, coordenadas y nombres de ciudad en grande. Son de marca y web; en las apps solo si una pantalla trata de un destino.
- **Fotografía:** escenas cotidianas y auténticas de los destinos, nunca la foto turística típica.
- **Ilustración:** lenguaje libre y expresivo para ideas abstractas, sin sustituir la paleta.

## Do's and Don'ts

- Do reutilizar la barra superior, el menú lateral y los tokens de este archivo en cualquier pantalla nueva, sin cambiarlos.
- Do añadir aquí un token antes de usarlo en una pantalla. Nada de colores o tamaños sueltos.
- Do mantener el dorado para una sola función: señalar lo activo o lo importante.
- Don't change: la paleta y las tipografías del manual de marca, el fondo blanco de las apps, el menú lateral azul marino y la barra superior compartida.
- Don't use: fondos crema/amarillos en las apps, sombras como separador, degradados decorativos fuera del menú lateral y de las tarjetas de progreso, un estilo distinto por portal.

## Pendiente de decidir

Las aplicaciones todavía no siguen el manual en tres puntos. Hasta que se decida, manda lo implementado:

1. **Tipografías:** el manual pide Champion, Almoneda y Theinhardt; las apps usan Georgia e Inter. Hacen falta los archivos web y la licencia (al menos Champion y Theinhardt son comerciales).
2. **Azul:** marca `#2D3A64`; apps `#102B4B`/`#0C213A` (menú) y `#19375F`/`#1F416F` (títulos y texto activo).
3. **Naranja:** marca `#ECB450`; apps `#DDA348`/`#D69B3B`.
