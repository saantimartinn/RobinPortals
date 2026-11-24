# Avatares privados de Community

El código guarda los avatares de suscriptores y retratos de mentores en el bucket privado `community-private-images`. La tabla `public.subscribers` guarda `avatar_path`; los retratos de mentor guardan `meta.photo_path` en `community_events`. El navegador nunca usa una URL pública de Storage. Las funciones autentican al usuario y emiten URLs firmadas temporales para el perfil, el directorio social, las conversaciones y el catálogo de mentores.

## Activar el flujo

El proyecto Supabase de Community es independiente del Supabase Admin y del Portal. Antes de desplegar el código nuevo:

1. Confirma que estás en el proyecto Supabase de The Robin Plan / Community.
2. Ejecuta `supabase/migrations/009_community_private_images.sql`.
3. En un terminal local, configura `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` con los valores del proyecto Community. La clave de servicio solo debe usarse en el terminal o backend, nunca en el navegador ni en Git.
4. Haz una previsualización desde la carpeta `apps/community`:

   ```bash
   node scripts/migrate-subscriber-avatars.mjs
   ```

   El modo por defecto no escribe. Revisa que los registros detectados sean avatares del perfil y que `invalid` sea cero. El resumen no incluye rutas, IDs ni imágenes.
5. Ejecuta el traslado solo después de revisar la previsualización:

   ```bash
   node scripts/migrate-subscriber-avatars.mjs --apply
   ```

   Cada objeto se sube y se verifica antes de actualizar su fila. El script vacía el valor antiguo solo si el objeto quedó vinculado correctamente. Puede repetirse; las filas ya migradas no se vuelven a subir.
6. Confirma que no quedan valores data URL en `subscribers.avatar_url` ni `community_events.meta.photo`, y que cada archivo tiene su ruta (`avatar_path` o `meta.photo_path`). Si el resumen indica `invalid` o `failed`, conserva esos valores y resuelve cada caso antes de declarar el traslado completo.

El script procesa ambas tablas en modo de vista previa por defecto. Usa `--apply` solo tras revisar el resumen. Requiere `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en un entorno seguro; no incluyas esas credenciales en el repositorio ni en logs compartidos. Los logos de partners y las imágenes de marca siguen sus flujos actuales.
7. Despliega el código de Community después de aplicar el esquema y completar el traslado.

Si la ejecución se interrumpe, vuelve a correr el script. Los objetos que se subieron pero no se enlazaron a una fila se eliminan como parte del manejo de errores cuando es posible. Mantén el reporte y los exports fuera de Git.

## Acceso y exposición

La visibilidad social se mantiene para miembros con sesión válida. Cada respuesta genera enlaces firmados con caducidad de cinco minutos; son enlaces al portador y no deben copiarse a logs ni documentos públicos. El bucket debe seguir privado en Supabase. La migración local configura `public = false`, pero solo el panel de Supabase puede confirmar el estado efectivo del proyecto desplegado.

Los logos de partners y otros recursos pensados para páginas públicas usan un flujo distinto y pueden seguir en buckets o assets públicos según sus licencias.
