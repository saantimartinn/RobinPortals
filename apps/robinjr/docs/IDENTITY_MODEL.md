# Modelo de identidad

La aplicación usa una única raíz de identidad propia: `users`, con credenciales en
`password_hash`. Los alumnos, advisors y administradores se distinguen mediante rol,
asignación y la lista administrativa central.

Los valores persistidos `admin` y `supervisor` representan el mismo principal de
aplicación. Comparten autorización, alcance y portal mediante la regla canónica de
`shared/application-roles.cjs`; ninguno puede recibir capacidades exclusivas.

`auth.users` es infraestructura gestionada y no es la fuente del login de la aplicación.
`lib/identity.js` busca identificadores en `users`; `/api/me`, cambio de contraseña y
notificaciones operan sobre esa misma tabla.

## Restricciones conocidas

- `lead_id` y `username` son únicos en el snapshot documentado.
- La unicidad de email se protege en los flujos de alta/importación aunque el snapshot no
  documenta un constraint equivalente.
- Las sesiones no tienen revocación central y dependen de expiración/cierre.

## Evolución futura

Adoptar un proveedor de identidad gestionado sería una migración funcional completa:
afectaría sesiones, bootstrap, recuperación de contraseña, roles y enlaces de perfil. No
debe ejecutarse como una limpieza automática. Cualquier cambio exige inventario de claves,
ensayo no productivo, migración reanudable y rollback.

No se realizó acceso ni modificación de base de datos para esta revisión.
