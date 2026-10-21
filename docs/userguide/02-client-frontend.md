# 02 · API cliente y frontend

## Fachada HTTP

`portal-source/src/api.js` mantiene exports públicos y distribuye operaciones a `portal-source/src/api/`: `core.js` configura `request()`/`api`, `auth-onboarding.js` concentra auth y progreso de alta; módulos por área exponen perfiles, pagos, reservas, documents, notifications, careers, FAQs, uploads, chat y administración. Evitar saltarse la fachada desde las pantallas; preserve la lista de exports existente si se cambia una implementación interna.

El cliente envía credenciales same-origin y serializa JSON excepto `postForm`. En `/project-robin.com`, el helper central aplica prefijos de path para API de Platform y Plan según el módulo. `preview-api.js` es utilería de vista previa; `session.js`, `client-utils.js` y `browser-utils.js` contienen adaptación específica de navegador.

## Entrada y estado global

| Archivo | Funciones principales |
|---|---|
| `portal-source/src/main.jsx` | Montaje React y CSS raíz. |
| `portal-source/src/app.jsx` | Carga `/api/me`, login, refresh, logout, selección de rol/portal, onboarding y callback de pago. |
| `portal-source/src/session.js` | Predicados de roles/principals del frontend. |
| `portal-source/src/admin-permissions.js` | Catálogo de claves y visibilidad de secciones de administrador. |
| `portal-source/src/application-steps.js` | Definiciones de fases del expediente. |
| `portal-source/src/questionnaire-data.js` | Esquema de preguntas y opciones de perfil. |
| `portal-source/src/theme.js`, `ui.jsx` | Tokens de tema y primitives compartidas. |

## Organización visual

- `application/`: composición de shells admin y alumno, selección de portal y componentes cross-portal.
- `application/onboarding/`: pasos modulares para perfil, DNI, origen, contrato, pagos y campos compartidos.
- `application/admin/`: dashboard, detalle cliente, pagos, documentos, carreras, chat, notificaciones y funciones administrativas.
- `application/careers/`: línea de requisitos de carrera y su presentación.
- `application/payments/`: pagos y recibos.
- `application/documents/`: labels y reglas de documentos.
- `shared/`: widgets comunes.
- `assets/`, `public/recursos/`: imágenes importadas y recursos descargables.

La tabla fuente completa de módulos e imports está en [COMPONENT_MAP](../COMPONENT_MAP.md) y el árbol [portal-source](../codebase/portal-source/README.md).


## Recorrido de una acción clienteRecorrido de una acción cliente

La fachada `portal-source/src/api.js` protege a los consumidores del detalle de organización interna: exporta símbolos que delegan en `src/api/*`. Antes de mover un export busca imports en todas las features; conserva el export mientras exista consumidor. La respuesta de API atraviesa tres decisiones que conviene inspeccionar por separado: normalización en el cliente, estado del componente/hook y render de estados vacíos/errores.

Para cambiar una interacción:

1. Encuentra el owner visual bajo `portal-source/src/features/` y sus componentes compartidos.
2. Localiza el método API importado desde la fachada y registra método, URL, body y shape usado.
3. Comprueba cancelación de solicitudes, doble submit, optimistic updates y actualización de datos derivados.
4. Ajusta el estado de carga, error y éxito; evita mostrar una mutación como guardada antes de respuesta confirmada.
5. Confirma la ruta directa/refresh y los enlaces que incluyen prefijo `/portal`.

Si cambia una respuesta, busca también formularios, vistas de resumen y consumidores no visuales: una exportación puede tener más de un call site.

---

**USERGUIDE:** [Índice](../../USERGUIDE.md) · [← Anterior](./01-runtime-and-identity.md) · [Siguiente documento de lectura →](./03-application-and-admin-ui.md) · [READMELONG](../../READMELONG.md)
