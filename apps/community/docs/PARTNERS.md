# Partners del Pack Llegada

El catálogo procede de la carpeta `partners robin` facilitada por el usuario:
`Partners Robin.docx` y sus once logos PNG. Los nombres, orden y enlaces se
contrastaron con [project-robin.com](https://project-robin.com/) el 19/11/2026.
El código local antiguo de la web solo enumeraba ocho; se utiliza la lista
completa del documento y de la web publicada.

Orden de presentación en Llegada: Translayte, Revolut, The Social Hub, British
Council, CJP, Linkmaas, The Circo, Student Experience, Scope Maastricht, Hispania
Groningen y Swapfiets. Los cuatro primeros tienen prioridad; los demás conservan
el orden configurado en el catálogo.
Se conserva el Instagram de Linkmaas, la página Amsterdam NDSM de Student
Experience y el referido `ref=281516` de Translayte. El aviso de Swapfiets ofrece
el código público ROBIN y los 20 € adicionales indicados por la fuente. No se
añaden descuentos, prestaciones o condiciones no documentadas.

## Datos y permisos

La fuente operativa sigue siendo la tabla `partners` y su administración
existente. Los logos originales se versionan en `frontend/public/partner-logos/`.
`supabase/migrations/008_website_partners.sql` incorpora los nueve partners que
faltan y completa los dos existentes, sin duplicarlos ni sustituir sus IDs.
Conserva categorías, descripciones, beneficios y estados de activación previos.
Los nombres equivalentes se reconocen de forma normalizada; una coincidencia
ambigua detiene y revierte la transacción para revisión.

Por petición del usuario, **las nuevas incorporaciones son solo para Pack
Llegada por ahora**. Los partners existentes mantienen sus permisos de Community
y también se habilitan para Llegada. El campo `products` se controla en la
administración de partners; las filas antiguas conservan Community por defecto.
El servidor verifica la identidad Llegada y filtra por producto antes de enviar
los datos. Los parámetros de URL no pueden ampliar ese acceso.
Si un cliente también tiene Community, conserva ambos grupos de partners tras
verificar su producto Llegada con la sesión común del Portal del Alumno.

`ArrivalPartners` reutiliza `SubPartners` con la presentación de logos/enlaces
del catálogo web. La presentación anterior de Community completo se conserva.
El aviso de Swapfiets utiliza el diálogo nativo y permite copiar el código o
abrir su enlace original.

## Descripciones y enlaces de Llegada

`backend/lib/arrival-partners.js` añade una descripción breve de los once
partners mediante `arrival_description`. Esta presentación se aplica después
del filtro de permisos y solo a las sesiones Llegada. No modifica las filas de
la base de datos ni las descripciones, el orden o los enlaces de Community y
administración. Las descripciones tienen su traducción en `packages/i18n/en.json`.

Revolut y The Social Hub no devuelven enlaces de contacto o reserva a Llegada.
Tanto el logo como el botón abren el diálogo «El link único aún no está
disponible.», que se cierra con el botón, Escape o el fondo. El resto conserva
sus enlaces y el comportamiento de Swapfiets. Este ajuste no requiere migración.

Las descripciones se contrastaron el 24/11/2026 con las fuentes de cada partner:

- [Translayte](https://translayte.com/certified-translations),
  [Revolut](https://www.revolut.com/),
  [The Social Hub](https://news.thesocialhub.co/en/about/) y
  [British Council](https://www.britishcouncil.es/).
- [CJP](https://www.cjp.nl/),
  [Linkmaas: presentación de su cofundador](https://es.linkedin.com/posts/noelcorteslink_no-soy-de-publicar-cada-d%C3%ADa-en-linkedin-activity-7260059244727586816-r6s7),
  [The Circo](https://www.thecirco.nl/) y
  [Student Experience](https://studentexperience.com/locations/4/amsterdam-ndsm).
- [Scope Maastricht](https://www.scope-maastricht.nl/),
  [Hispania Groningen](https://www.hispaniagroningen.com/) y
  [Swapfiets](https://swapfiets.nl/en-NL/students).

Linkmaas ofrece apoyo académico universitario; no se presenta como una
asociación de estudiantes. No se prometen nuevas condiciones comerciales,
descuentos o disponibilidad de alojamiento.

## Importación inicial

Primero deben publicarse los logos y el código, y después ejecutarse la migración
008 en la base de Community. El API conserva la lectura de los partners antiguos
si todavía no existe la columna `products`, y no los expone a Llegada por defecto.
La importación se puede repetir sin duplicar filas. No elimina otros partners.
No requiere nuevos secretos ni proveedores.

La migración inicial se comprobó con PostgreSQL aislado (PGlite), incluyendo
repetición, conservación de registros, permisos por producto y rollback ante
duplicados. Para la revisión de descripciones se consultó el catálogo real de
once partners sin escribir datos. El preview local utiliza una copia de esos
datos públicos y los logos originales, sin dirigir operaciones a las APIs reales.
