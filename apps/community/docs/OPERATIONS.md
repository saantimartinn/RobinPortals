# Operación y despliegue

## Preparar un entorno nuevo

1. Crear un proyecto Supabase exclusivo de The Robin Plan.
2. Ejecutar `supabase/migrations/001_robin_plan_schema.sql`.
3. Solo en desarrollo, ejecutar opcionalmente `supabase/seeds/demo.sql`.
4. Configurar `.env` local y variables del sitio Netlify desde `.env.example`.
5. Crear un administrador explícitamente con `node --env-file=.env scripts/create-admin.cjs`.
   Requiere ADMIN_EMAIL y una contraseña única de al menos 16 caracteres, máximo
   72 bytes UTF-8. No sobrescribe cuentas. Retirar ADMIN_PASSWORD tras usarlo.
6. Conectar este repositorio a Netlify. Base: raíz; build: `npm run build`;
   publish: `dist`; Functions: `backend/functions`. Configuración en `netlify.toml`.
7. Configurar el webhook Stripe en `https://<dominio>/api/stripe/webhook`, sus eventos
   según INTEGRATIONS y el signing secret en STRIPE_WEBHOOK_SECRET.
8. Verificar en staging alta, login, checkout test, webhook, perfil, comunidad y admin.

No desplegar arrastrando el código fuente: este proyecto necesita build y empaquetado
de Functions. No se han creado ni modificado recursos Netlify/Supabase/Stripe durante
la reorganización del repositorio.

## Cuenta admin antigua

Si ya se aplicó el SQL original, eliminar el seed del repositorio no cambia esa cuenta.
Rotar su contraseña y cualquier credencial compartida antes de exponer el sitio.
No reutilizar el JWT_SECRET del portal de alumnos.

## Rollback

Restaurar el commit/despliegue anterior en Netlify. Las migraciones de base de datos
no se revierten con Git: requieren backup y un plan independiente. Revisar eventos
Stripe pendientes antes de reactivar tráfico. El ZIP original sigue siendo la copia
de origen, no una versión segura para producción.
