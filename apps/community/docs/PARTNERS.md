# Partners del Pack Llegada

El catálogo procede de la carpeta `partners robin` facilitada por el usuario:
`Partners Robin.docx` y sus once logos PNG. Los nombres, orden y enlaces se
contrastaron con [project-robin.com](https://project-robin.com/) el 19/11/2026.
El código local antiguo de la web solo enumeraba ocho; se utiliza la lista
completa del documento y de la web publicada.

Orden: CJP, Revolut, The Social Hub, Linkmaas, The Circo, Student Experience,
Scope Maastricht, Hispania Groningen, Swapfiets, Translayte y British Council.
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

## Publicación

Primero deben publicarse los logos y el código, y después ejecutarse la migración
008 en la base de Community. El API conserva la lectura de los partners antiguos
si todavía no existe la columna `products`, y no los expone a Llegada por defecto.
La importación se puede repetir sin duplicar filas. No elimina otros partners.
No requiere nuevos secretos ni proveedores.

Durante este trabajo solo se consultó el catálogo real, que contenía The Circo
y LinkMaas. No se escribieron datos ni se desplegó código en producción. La
migración se comprobó con PostgreSQL aislado (PGlite), incluyendo repetición,
conservación de registros, permisos por producto y rollback ante duplicados.
El preview local utiliza el resultado de esa importación aislada y los logos
originales, sin redirigir operaciones a las APIs reales.
