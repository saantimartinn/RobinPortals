# Desarrollo frontend

Desde la raíz: `npm ci`, después `npm run dev` para frontend y API. Para cambios
visuales sin backend: `npm run dev:frontend`. Todos los paquetes se resuelven con
el único `package-lock.json` raíz mediante npm workspaces.

Crear componentes de dominio en `frontend/src/features/<dominio>/`. Reutilizar
`shared/ui.jsx` y `shared/theme.js`. Añadir llamadas HTTP a `api/index.js` y registrar
rutas nuevas en `netlify.toml`. No introducir acceso a proveedores desde React.

`npm run check` comprueba imports, referencias no declaradas y rutas API. Antes de
integrar, ejecutar `npm run verify` y revisar la interfaz a anchura móvil y escritorio.
