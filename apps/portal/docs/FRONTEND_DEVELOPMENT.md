# Portal Robin

Código fuente del portal, desarrollado con Vite, React y Tailwind.

## Desarrollo local

```bash
npm --prefix portal-source ci --include=dev
npm --prefix portal-source run dev
```

## Compilación

```bash
npm --prefix portal-source run build
```

La compilación se genera en `portal-source/dist/`. Durante el despliegue,
Netlify copia el resultado a `deploy/portal/` y publica únicamente `deploy/`.
Ninguna carpeta generada debe guardarse en Git.

El frontend consume las rutas `/api/*` definidas en `netlify.toml`, que se
redirigen a las funciones serverless de `netlify/functions/`.
