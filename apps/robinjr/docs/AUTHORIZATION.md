# Autenticación y autorización

La interfaz solo decide qué mostrar; nunca concede acceso. Cada Function protegida valida
la cookie JWT mediante `readSessionFromEvent` y comprueba rol, principal y ownership antes
de consultar o mutar recursos.

## Principales

| Principal | Persistencia | Gate backend | Alcance |
|---|---|---|---|
| Alumno/cliente | `users` | sesión autenticada | Expediente propio |
| Advisor | `users` + email en `lib/admins.js` | `isApplicationAdmin` | Clientes asignados o alcance histórico del endpoint |
| Admin/Supervisor | `users.role IN (admin, supervisor)` | `isApplicationAdmin` | Administración de aplicación, sin diferencias entre ambos valores |
| Proveedor/sistema | no aplica | firma, secreto o schedule | Webhooks y trabajos técnicos concretos |

No existe un rol persistido `superadmin`. La etiqueta histórica de `admin-chat` no debe
interpretarse como uno.

`admin` y `supervisor` son alias funcionales: pasan exactamente los mismos gates y no
puede condicionarse una capacidad a uno de esos valores por separado. La regla canónica
vive en `shared/application-roles.cjs` y se comparte entre backend y frontend.

## Reglas por superficie

| Superficie | Público | Alumno | Advisor | Admin/Supervisor | Condición adicional |
|---|---:|---:|---:|---:|---|
| Login | Sí | — | — | — | Credencial válida en `users` |
| Expediente/onboarding/pagos | — | Propio | Según endpoint | Según endpoint | `session.uid` u ownership admin |
| Documentos/carreras/reservas | — | Propio | Asignado/global según matriz | Global o asignado según endpoint | Ownership backend |
| Administración | — | No | Sí | Sí | `isApplicationAdmin`; algunos filtros `assigned_to` |
| Webhooks/schedules | Secreto | No | No | No | Firma, secreto configurado o evento programado |

- Los flujos de alumno usan por defecto `session.uid`.
- Documentos, pagos, onboarding, carreras, chat y reservas exigen ownership salvo bypass
  administrativo documentado.
- Las rutas administrativas llaman a `isApplicationAdmin`; algunas vistas se limitan por
  `users.assigned_to` y otras son globales por diseño histórico.
- Webhooks no aceptan una sesión de usuario como sustituto de su firma o secreto.

## Excepciones vigentes

- `admin-clients-list`, `admin-dashboard` y `admin-assistant` filtran por advisor asignado.
- En `admin-chat`, los advisors de la lista pueden acceder globalmente; un usuario con rol
  `admin` o `supervisor` queda sujeto a asignación.
- En `admin-historial-add`, ocurre lo inverso: `admin` y `supervisor` evitan el filtro y un
  advisor listado necesita estar asignado.

Cambiar estas reglas es una modificación funcional y requiere tests por principal y
revisión de seguridad. El inventario vivo está en [API_INVENTORY.md](API_INVENTORY.md).

## Sesiones y secretos

- La cookie es `HttpOnly`, `Secure` en producción y está firmada con `JWT_SECRET`.
- El rol firmado dura hasta que la sesión expira o se cierra; no existe revocación central.
- Service role, claves de proveedor y secretos de webhook son exclusivamente servidor.
- Las contraseñas nuevas siguen [PASSWORD_POLICY.md](PASSWORD_POLICY.md).
