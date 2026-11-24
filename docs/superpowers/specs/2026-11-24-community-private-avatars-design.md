# Community: avatares en Supabase Storage privado

## Objetivo

Guardar fotos de perfil de Community como objetos en Supabase Storage privado, sin conservar data URLs en la fila de suscriptores. Mantener las fotos visibles en vistas sociales a miembros autenticados, como hoy.

## Alcance

- Subida autorizada para el titular de la cuenta mediante URL de subida firmada.
- Guardar en la base de datos solo la ruta del objeto.
- Entregar URLs firmadas temporales desde funciones de servidor que ya verifican la sesión.
- Actualizar las respuestas de perfil, social y mensajes que devuelven `avatar_url`.
- Incluir un flujo de migración para avatares data URL ya guardados, manteniendo fuera de Git cualquier archivo exportado o informe.
- Usar un bucket privado y verificar que no haya URLs públicas ni rutas accesibles sin sesión.

## Fuera de alcance

- Cambiar logos de socios o imágenes de producto diseñadas para páginas públicas.
- Cambiar la visibilidad de los perfiles sociales o la información textual del suscriptor.
- Ejecutar una migración con credenciales de producción desde esta sesión.

## Alternativas consideradas

1. **Bucket privado con URLs firmadas para miembros autenticados (elegida):** conserva el uso social actual con vencimiento y control del servidor.
2. **Bucket privado solo para el propietario y administradores:** reduce la visibilidad y eliminaría las fotos de las vistas sociales.
3. **Bucket público con URLs permanentes:** simplifica la entrega, pero no evita que cualquier visitante descargue las fotos; no cumple el objetivo de privacidad.

Se eligió la primera opción, según la preferencia del usuario de mantener la visibilidad social.

## Decisiones que faltan en implementación

El implementador puede elegir nombres de columnas, rutas y duración breve de las URLs firmadas siguiendo las convenciones ya usadas por Portal y Robin Jr. El backfill debe ser repetible, validar tipo/tamaño, reemplazar el valor solo después de confirmar la subida y permitir continuar tras un error por fila.
