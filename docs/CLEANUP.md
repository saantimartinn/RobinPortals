# Limpieza y migración

Origen: ZIP ROBIN SUBS V1 (1), comparado con los archivos locales antes de modificar;
no se encontraron diferencias entre las 103 entradas comparadas sin node_modules.

| Antes | Ahora |
|---|---|
| portal-source y app.jsx de 10.569 líneas | frontend con módulos por dominio |
| lib y netlify/functions mezclados en raíz | backend/lib y backend/functions |
| portal compilado y _to_delete | Build reproducible ignorado por Git |
| migrations con admin y demo automático | supabase/migrations y seeds separados |
| documentación dispersa | docs con mapas navegables como robin-platform |
| publish de toda la raíz | Solo dist público |
| dos instalaciones/lockfiles | npm workspaces y lockfile raíz |

Se retiraron 107 declaraciones frontend no alcanzables desde el portal de suscripción,
el cliente de APIs de alumnos, contratos duplicados y helpers Google/Holded/Zoom,
onboarding, OCR y pagos de cuotas. Se quitaron pdfkit y lambda-multipart-parser.
Se conserva mammoth porque la función CV procesa archivos DOCX.
Se actualizaron Vite, su plugin React y Netlify CLI, y se aplicaron actualizaciones
compatibles del lockfile. Los avisos pendientes están en KNOWN_LIMITATIONS.

El login deja de consultar users; la sesión rechaza roles ajenos. El checkout no
procesa cuotas/onboarding, los fallos persistentes de webhook devuelven 500 y el SQL
ya no crea una cuenta con contraseña conocida. El fallback de correo no almacena
texto/destinatarios y registra not_sent, sin fingir una cola de envío.

Los originales se preservaron localmente en `.maintenance/source-backup`, excluido
de Git, además del ZIP proporcionado. El Git padre y sus cambios no se modificaron.
No se migraron datos reales ni se cambió el diseño del producto intencionadamente.
