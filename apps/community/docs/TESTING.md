# Pruebas

```bash
npm ci
npm run verify
npm run build:netlify
```

- `check`: sintaxis, imports, bindings frontend, ciclos, rutas y límites backend.
- `test`: sesiones/roles, cookies, bcrypt, JSON/Origin, handlers, fulfillment de Stripe
  y renderizado de pantallas React con fixtures locales sin proveedores.
- `build`: compilación de producción de React/Vite en `dist/therobinplan/` (dentro del publish `dist/`).
- `docs:check`: mapas generados actualizados.
- `build:netlify`: build y empaquetado real de las 23 Functions, sin desplegar.

Las pruebas no usan credenciales ni llaman a proveedores. CI ejecuta el mismo conjunto
en Node 22. Para cambios de rutas/archivos, ejecutar antes `npm run docs:generate`.

Pruebas manuales de staging: login y logout, alta con errores, retorno de Checkout,
cambio/cancelación de plan, edición de perfil, mensajes entre amigos, envío/validación
de retos, avisos, administración y acceso denegado para usuarios sin permisos.
Las pruebas unitarias y el build no sustituyen esta validación con proveedores reales.
