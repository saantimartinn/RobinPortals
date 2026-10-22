# Límites conocidos y trabajo pendiente

Esta reorganización no equivale a una auditoría integral ni a un despliegue verificado.

- Los endpoints no aplican de forma uniforme el estado de pago activo; definir una
  política de acceso por plan y aplicarla en servidor antes de abrir el producto.
- No hay rate limiting distribuido de login/alta/CV. Añadirlo antes de tráfico público.
- Las sesiones JWT duran 7 días y no se revocan al cambiar contraseña o rol.
- Los descuentos contabilizan usos con lectura/escritura no atómica: existe riesgo
  de carreras concurrentes. Requiere transacción/RPC y pruebas sobre PostgreSQL.
- El webhook no tiene registro único de eventos ni control de orden. La idempotencia
  actual es parcial por subscription_id; revisar reintentos y eventos fuera de orden.
- Los roles se almacenan como texto sin constraint específico en el esquema heredado.
- Algunos handlers conservan respuestas con detalles de error y logs amplios. Reducir
  exposición de PII y normalizar errores como tarea separada.
- La sección «Otros Robins» mantiene perfiles demo señalados como vista previa;
  varios servicios muestran contenido «próximamente». No son datos de producción.
- No se han ejecutado migraciones ni cobros reales. Faltan pruebas end-to-end en
  staging con Supabase, Stripe, Resend y Anthropic configurados.
- Auditoría de dependencias del 26/08/2026: los avisos de herramientas de desarrollo
  se redujeron de 53 a 9 (8 altos y 1 moderado, ninguno crítico). Persisten en la
  cadena de Netlify Dev; no se aplicaron downgrades forzados ni overrides incompatibles.
  Mantener los servidores de desarrollo en localhost. Revisar `npm audit` al actualizar.

Las comprobaciones del repositorio cubren la separación y regresiones seleccionadas;
no afirmar que todos los riesgos de seguridad o de negocio están resueltos.
